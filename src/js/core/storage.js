// Storage: private per-person Claude db, with a browser copy as fallback
const LS = 'mise:v1:';
const Store = {
  db: null, uid: null, pending: {}, writing: {},
  local(k){ try { return JSON.parse(localStorage.getItem(LS + k)); } catch { return null; } },
  async init(){
    if (!window.claude?.use) return false;
    try {
      const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
      const id = user ? await user.id() : null;
      if (db && id) { this.db = db; this.uid = id; return true; }
    } catch {}
    return false;
  },
  ref(k){ return this.db.collection('data/users/' + this.uid).doc(k); },
  async remote(k){ if (!this.db) return null; try { const s = await this.ref(k).get(); return s.exists ? structuredClone(s.data()) : null; } catch { return null; } },
  save(k, v){
    try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch {}
    if (!this.db) return;
    this.pending[k] = v; this.flush(k);
  },
  async flush(k){
    if (this.writing[k]) return;
    this.writing[k] = true;
    while (this.pending[k]) {
      const v = this.pending[k]; this.pending[k] = null;
      try { await this.ref(k).set(JSON.parse(JSON.stringify(v))); } catch (e) { console.warn('save failed', k, e?.code); }
    }
    this.writing[k] = false;
  },
  async remove(k){ try { localStorage.removeItem(LS + k); } catch {} if (this.db) { try { await this.ref(k).delete(); } catch {} } }
};
