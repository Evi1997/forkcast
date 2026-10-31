// Storage: one row per document in Supabase (table user_docs), plus a
// per-account browser copy so the app opens instantly and works offline.
const LS = 'forkcast:v1:';
const Store = {
  sb: null, uid: null, pending: {}, writing: {},
  key(k){ return LS + (this.uid || 'anon') + ':' + k; },
  local(k){ try { return JSON.parse(localStorage.getItem(this.key(k))); } catch { return null; } },
  async remote(k){
    if (!this.sb || !this.uid) return null;
    const { data, error } = await this.sb.from('user_docs').select('data').eq('key', k).maybeSingle();
    if (error) { console.warn('load failed', k, error.message); return null; }
    return data ? data.data : null;
  },
  // Every document whose key starts with a prefix, in one request (e.g. all food logs).
  async remoteAll(prefix){
    if (!this.sb || !this.uid) return [];
    const { data, error } = await this.sb.from('user_docs').select('key,data').like('key', prefix + '%');
    if (error) { console.warn('load failed', prefix, error.message); return []; }
    return data || [];
  },
  save(k, v){
    if (v && typeof v === 'object') v._at = Date.now(); // newest copy wins when syncing
    try { localStorage.setItem(this.key(k), JSON.stringify(v)); } catch {}
    if (!this.sb || !this.uid) return;
    this.pending[k] = v; this.flush(k);
  },
  async flush(k){
    if (this.writing[k]) return;
    this.writing[k] = true;
    while (this.pending[k]) {
      const v = this.pending[k]; this.pending[k] = null;
      const { error } = await this.sb.from('user_docs').upsert({ user_id:this.uid, key:k, data:JSON.parse(JSON.stringify(v)), updated_at:new Date().toISOString() });
      if (error) { console.warn('save failed', k, error.message); S.saveError = true; render(); }
      else if (S.saveError) { S.saveError = false; render(); }
    }
    this.writing[k] = false;
  },
  async remove(k){
    try { localStorage.removeItem(this.key(k)); } catch {}
    if (this.sb && this.uid) await this.sb.from('user_docs').delete().eq('key', k);
  }
};
