// Small pure helpers: DOM, escaping, dates, merging, light markdown
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const r0 = n => Math.round(Number(n) || 0);
const dkey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fromKey = k => { const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); };
const daysBetween = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 864e5);
const mondayOf = (d = new Date()) => { const x = new Date(d); const w = (x.getDay() + 6) % 7; x.setDate(x.getDate() - w); return dkey(x); };
const slotNow = () => { const h = new Date().getHours() + new Date().getMinutes()/60; return h < 10.5 ? 'Breakfast' : h < 15 ? 'Lunch' : h < 17.5 ? 'Snack' : 'Dinner'; };
const vday = () => S.day || dkey(); // the day shown on Today
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
function merge(a, b){ const o = {...(a||{})}; for (const k in (b||{})) { const v = b[k]; if (v === null || v === undefined || v === '') continue; o[k] = isObj(v) && isObj(o[k]) ? merge(o[k], v) : v; } return o; }
function md(s){
  const lines = esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').split('\n');
  let out = '', inList = false;
  for (const l of lines) {
    const m = l.match(/^\s*[-•]\s+(.*)/);
    if (m) { if (!inList) { out += '<ul>'; inList = true; } out += `<li>${m[1]}</li>`; continue; }
    if (inList) { out += '</ul>'; inList = false; }
    out += l.trim() ? l + '<br>' : '<br>';
  }
  if (inList) out += '</ul>';
  return out.replace(/(<br>)+$/,'').replace(/(<br>){3,}/g,'<br><br>');
}
const sumItems = items => items.reduce((t, i) => ({kcal:t.kcal+r0(i.kcal), protein:t.protein+r0(i.protein), carbs:t.carbs+r0(i.carbs), fat:t.fat+r0(i.fat), fiber:t.fiber+r0(i.fiber)}), {kcal:0,protein:0,carbs:0,fat:0,fiber:0});
const pfc = i => `<span class="pfc"><span class="p">P ${r0(i.protein ?? i.p)}</span> · <span class="c">C ${r0(i.carbs ?? i.c)}</span> · <span class="f">F ${r0(i.fat ?? i.f)}</span></span>`;
const uid = () => Math.random().toString(36).slice(2, 10);
