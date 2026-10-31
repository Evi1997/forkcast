// Food diary: adding items and estimating meals from text or photos
function addItems(items, k = vday()){
  S.logs[k] = S.logs[k] || {items:[]};
  for (const i of items) S.logs[k].items.push({ id:uid(), slot:i.slot || S.logSlot, name:String(i.name || 'Food'), amount:String(i.amount || ''), kcal:r0(i.kcal), protein:r0(i.protein ?? i.p), carbs:r0(i.carbs ?? i.c), fat:r0(i.fat ?? i.f), fiber:r0(i.fiber), at:Date.now() });
  save.log(k);
  const days = new Set(S.profile.loggedDays || []);
  if (!days.has(k)) { S.profile.leaves = leafCount() + 1; S.leafPop = Date.now(); days.add(k); S.profile.loggedDays = [...days].sort().slice(-90); save.profile(); }
}

async function analyseFood(text, clarification){
  if (S.busy.log) return;
  if (!S.sampleOK) { S.err.log = 'Sign in to count meals automatically, or tap “I know the calories”.'; render(); return; }
  if (!text.trim() && !S.logPhoto) return;
  S.busy.log = true; S.err.log = null; render();
  const t = targets(), eaten = sumItems(S.logs[vday()]?.items || []);
  const prompt = PROMPTS.food({ text, slot:S.logSlot, country:S.profile.data.shopping?.country, eaten,
    targets: t && { kcal:t.kcal, protein:t.protein, carbs:t.carbs, fat:t.fat, fiber:t.fiber },
    hasPhoto: !!S.logPhoto, hasAfter: !!(S.logPhoto && S.logPhotoAfter), clarification });
  try {
    const opts = { modelTier:'quick' }; // fast model, minimal thinking: a meal estimate doesn't need more
    if (S.logPhoto && S.canImages) opts.images = S.logPhotoAfter ? [S.logPhoto, S.logPhotoAfter] : [S.logPhoto];
    const r = await S.sample.json(prompt, opts);
    const items = Array.isArray(r?.items) ? r.items : [];
    if (r?.clarify && !clarification) {
      S.logResult = { text, clarify:String(r.clarify), options:(r.options || []).slice(0,4).map(String), items };
    } else {
      S.logResult = { review: items.map(cleanItem), leftNote: S.logPhoto && S.logPhotoAfter ? 'Counted from your after photo' : null, feedback: r?.feedback ? String(r.feedback) : null, name: String(r?.meal_name || '').slice(0, 40), save: true };
    }
  } catch (e) { hardFail(e); S.err.log = errText(e); }
  S.busy.log = false; render();
}

// After photo on a meal that's already in the review: count only what was eaten.
async function leftoversFromPhoto(file){
  const r = S.logResult; if (!r?.review?.length || !file || S.busy.leftover) return;
  if (!S.sampleOK) { S.err.log = 'Sign in to count leftovers from a photo.'; render(); return; }
  S.busy.leftover = true; S.err.log = null; render();
  try {
    const out = await S.sample.json(PROMPTS.leftovers(r.review), { modelTier:'quick', images:[file] });
    const items = Array.isArray(out?.items) ? out.items.map(cleanItem) : [];
    if (items.length) { r.review = items; r.leftNote = out?.note ? String(out.note) : 'Counted from your after photo'; }
  } catch (e) { hardFail(e); S.err.log = errText(e); }
  S.busy.leftover = false; render();
}

const cleanItem = i => ({ name:String(i.name || 'Food'), amount:String(i.amount || ''), kcal:r0(i.kcal), protein:r0(i.protein ?? i.p), carbs:r0(i.carbs ?? i.c), fat:r0(i.fat ?? i.f), fiber:r0(i.fiber) });

// Save the reviewed (and possibly edited) items to the open meal, remember the
// combination under "My meals", and close the sheet.
function confirmLog(){
  const r = S.logResult, items = (r?.review || []).filter(i => i.name.trim());
  if (!items.length) return;
  const slot = S.sheet.slot;
  if (r.replaceIds) { const L = S.logs[vday()]; L.items = L.items.filter(i => !r.replaceIds.includes(i.id)); }
  addItems(items.map(i => ({...i, slot})));
  if (r.save && items.length) rememberMeal(r, items, slot);
  showToast(S.leafPop && Date.now() - S.leafPop < 1000 ? `Added to ${slot} · a new leaf grew` : `${r.replaceIds ? 'Updated' : 'Added to'} ${slot} · ${sumItems(items).kcal} kcal${r.save && !r.replaceIds ? ' · saved' : ''}`);
  closeSheet();
}

// "My meals": reusable combinations, most used first for each meal slot.
function rememberMeal(r, items, slot){
  const meals = S.profile.savedMeals || [];
  const name = (r.name || items.map(i => i.name).slice(0, 2).join(' & ')).trim().slice(0, 40);
  const sig = items.map(i => i.name.toLowerCase()).sort().join('|');
  let m = meals.find(x => x.id === r.savedId) || meals.find(x => x.items.map(i => i.name.toLowerCase()).sort().join('|') === sig);
  if (!m) { m = { id:uid(), uses:0, slots:{} }; meals.unshift(m); }
  Object.assign(m, { name, items: items.map(cleanItem), last: Date.now(), uses: (m.uses || 0) + 1 });
  m.slots[slot] = (m.slots[slot] || 0) + 1;
  S.profile.savedMeals = meals.slice(0, 40); save.profile();
}
function savedFor(slot){
  return [...(S.profile.savedMeals || [])].sort((a, b) => ((b.slots?.[slot] || 0) - (a.slots?.[slot] || 0)) || (b.last - a.last));
}
function useSaved(id){
  const m = (S.profile.savedMeals || []).find(x => x.id === id); if (!m) return;
  S.logResult = { review: m.items.map(i => ({...i})), name: m.name, savedId: m.id, save: true, feedback: null };
  render();
}
function forgetSaved(id){
  const before = S.profile.savedMeals || [], gone = before.find(x => x.id === id);
  S.profile.savedMeals = before.filter(x => x.id !== id); save.profile();
  if (gone) showToast(`Removed ${gone.name}`, () => { S.profile.savedMeals = before; save.profile(); });
  render();
}
// Re-open a logged meal in the editor; saving replaces those items.
function editMeal(slot){
  const its = (S.logs[vday()]?.items || []).filter(i => i.slot === slot);
  openSheet(slot);
  S.logResult = { review: its.map(cleanItem), replaceIds: its.map(i => i.id), name: '', save: false, feedback: null };
  render();
}
// Add a forgotten item to the review: estimated by the AI, or blank to fill in.
async function addToReview(text){
  text = text.trim(); const r = S.logResult; if (!r) return;
  if (!text) { r.review.push(cleanItem({ name:'', kcal:0 })); r.editing = r.review.length - 1; render(); return; }
  S.busy.addItem = true; render();
  try {
    const out = await S.sample.json(PROMPTS.food({ text, slot:S.sheet.slot, country:S.profile.data.shopping?.country, eaten:{}, targets:null, hasPhoto:false, clarification:'use a typical portion' }), { modelTier:'quick' });
    (Array.isArray(out?.items) ? out.items : []).forEach(i => r.review.push(cleanItem(i)));
    S.draft.more = ''; r.adding = false;
  } catch (e) { hardFail(e); S.err.log = errText(e); }
  S.busy.addItem = false; render();
}
function openSheet(slot){ S.sheet = { slot, enter:true }; S.logSlot = slot; S.logResult = null; S.err.log = null; document.body.classList.add('sheet-open'); render(); S.sheet.enter = false; setTimeout(() => $('#logText')?.focus(), 250); }
function closeSheet(){ S.sheet = null; S.logResult = null; S.err.log = null; S.draft.log = ''; S.logPhoto = null; S.logPhotoAfter = null; document.body.classList.remove('sheet-open'); render(); }
let toastTimer;
function showToast(text, undo){ S.toast = text; S.toastUndo = undo || null; clearTimeout(toastTimer); toastTimer = setTimeout(() => { S.toast = null; S.toastUndo = null; render(); }, undo ? 5000 : 2600); }

// Show another day on Today; its food log loads from the device, then the account.
async function gotoDay(k){
  const today = dkey(); if (k > today) k = today;
  S.day = k === today ? null : k; S.openMeal = null;
  if (!S.logs[k]) S.logs[k] = Store.local('log-' + k) || { items:[] };
  render(); window.scrollTo(0, 0);
  const v = await Store.remote('log-' + k);
  if (v && vday() === k) { S.logs[k] = v; render(); }
}
function shiftDay(n){ const d = fromKey(vday()); d.setDate(d.getDate() + n); gotoDay(dkey(d)); }
