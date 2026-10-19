// Food diary: adding items and estimating meals from text or photos
function addItems(items, k = dkey()){
  S.logs[k] = S.logs[k] || {items:[]};
  for (const i of items) S.logs[k].items.push({ id:uid(), slot:i.slot || S.logSlot, name:String(i.name || 'Food'), amount:String(i.amount || ''), kcal:r0(i.kcal), protein:r0(i.protein ?? i.p), carbs:r0(i.carbs ?? i.c), fat:r0(i.fat ?? i.f), fiber:r0(i.fiber), at:Date.now() });
  save.log(k);
  const days = new Set(S.profile.loggedDays || []); if (!days.has(k)) { days.add(k); S.profile.loggedDays = [...days].sort().slice(-90); save.profile(); }
}

async function analyseFood(text, clarification){
  if (S.busy.log) return;
  if (!S.sampleOK) { S.err.log = 'Sign in to count meals automatically. Use “Add manually” below in the meantime.'; render(); return; }
  if (!text.trim() && !S.logPhoto) return;
  S.busy.log = true; S.err.log = null; render();
  const t = targets(), eaten = sumItems(S.logs[dkey()]?.items || []);
  const prompt = PROMPTS.food({ text, slot:S.logSlot, country:S.profile.data.shopping?.country, eaten,
    targets: t && { kcal:t.kcal, protein:t.protein, carbs:t.carbs, fat:t.fat, fiber:t.fiber },
    hasPhoto: !!S.logPhoto, clarification });
  try {
    const opts = { modelTier:'default' };
    if (S.logPhoto && S.canImages) opts.images = [S.logPhoto];
    const r = await S.sample.json(prompt, opts);
    const items = Array.isArray(r?.items) ? r.items : [];
    if (r?.clarify && !clarification) {
      S.logResult = { text, clarify:String(r.clarify), options:(r.options || []).slice(0,4).map(String), items };
    } else {
      addItems(items.map(i => ({...i, slot:S.logSlot})));
      S.logResult = { feedback: r?.feedback ? String(r.feedback) : null, added: items.length };
      S.draft.log = ''; S.logPhoto = null;
    }
  } catch (e) { hardFail(e); S.err.log = errText(e); }
  S.busy.log = false; render();
}
