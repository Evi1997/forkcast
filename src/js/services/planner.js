// Week plan, shopping list, prep schedule and recipes
function planContext(){
  const t = targets();
  return { profile:S.profile.data, targets: t && { kcal:t.kcal, protein:t.protein, carbs:t.carbs, fat:t.fat, fiber:t.fiber },
    focus: S.profile.focus || S.profile.data.obstacles, checkin: S.progress.checkins.slice(-1)[0] };
}
async function generatePlan(){
  if (S.busy.plan) return;
  if (!S.sampleOK) { S.err.plan = 'Sign in to plan your week.'; render(); return; }
  S.busy.plan = 'Writing your 7 days…'; S.err.plan = null; render();
  try {
    const plan = await S.sample.json(PROMPTS.plan(planContext()), { modelTier:'default', cache:false });
    if (!Array.isArray(plan?.days) || !plan.days.length) throw { code:'invalid_json' };
    S.plan = { weekOf: mondayOf(), created: Date.now(), days: plan.days.slice(0,7), notes: plan.notes || '', recipes:{}, checked:{} };
    save.plan(); S.busy.plan = 'Building your shopping list and prep schedule…'; render();
    const shop = await S.sample.json(PROMPTS.shopping(planContext(), S.plan.days), { modelTier:'default', cache:false });
    S.plan.grocery = Array.isArray(shop?.grocery) ? shop.grocery : [];
    S.plan.prep = Array.isArray(shop?.prep) ? shop.prep : [];
    S.plan.budget_note = shop?.budget_note || '';
    save.plan();
  } catch (e) { hardFail(e); S.err.plan = errText(e); }
  S.busy.plan = false; render();
}
async function loadRecipe(key, meal){
  if (S.plan.recipes?.[key]) { S.openRecipe = S.openRecipe === key ? null : key; render(); return; }
  if (!S.sampleOK) { S.err.plan = 'Sign in to see recipes.'; render(); return; }
  S.busy.recipe = key; S.openRecipe = key; render();
  try {
    const r = await S.sample.json(PROMPTS.recipe(meal, { prefs:S.profile.data.preferences, cooking:S.profile.data.cooking, country:S.profile.data.shopping?.country }), { modelTier:'quick', cache:{gcTime:864e5} });
    S.plan.recipes = S.plan.recipes || {}; S.plan.recipes[key] = r; save.plan();
  } catch (e) { hardFail(e); S.err.plan = errText(e); S.openRecipe = null; }
  S.busy.recipe = null; render();
}

// Dish photos from Pexels via /api/photo. Fetched once per meal for the day
// being viewed, then saved inside the plan so they never load twice.
const photoBusy = new Set();
async function loadDayPhotos(di){
  if (S.photosOff || !S.plan?.days?.[di]) return;
  S.plan.photos = S.plan.photos || {};
  const todo = S.plan.days[di].meals.map((m, j) => [di + '-' + j, m]).filter(([k]) => !(k in S.plan.photos) && !photoBusy.has(k));
  if (!todo.length) return;
  const token = await Auth.token(); if (!token) return;
  todo.forEach(([k]) => photoBusy.add(k));
  let changed = false;
  await Promise.all(todo.map(async ([k, m]) => {
    try {
      const res = await fetch('/api/photo?q=' + encodeURIComponent(m.photo || m.name), { headers:{ Authorization:'Bearer ' + token } });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.src) { S.plan.photos[k] = body; changed = true; }
      else if (body.code === 'not_found') { S.plan.photos[k] = null; changed = true; }
      else if (body.code === 'not_configured') S.photosOff = true;
    } catch {}
    photoBusy.delete(k);
  }));
  if (changed) { save.plan(); if (S.view === 'plan') render(); }
}
