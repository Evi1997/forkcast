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
    save.plan();
  } catch (e) { hardFail(e); S.err.plan = errText(e); }
  S.busy.plan = false; render();
}

// Supermarkets to choose from: the person's own first, then common ones for their country.
const STORES_BY_COUNTRY = {
  spain:['Mercadona','Lidl','Carrefour','Aldi','Dia','Alcampo','Eroski'],
  greece:['Sklavenitis','AB Vassilopoulos','Lidl','My Market','Masoutis'],
  'united kingdom':['Tesco','Sainsbury\'s','Aldi','Lidl','Asda','Waitrose'],
  uk:['Tesco','Sainsbury\'s','Aldi','Lidl','Asda','Waitrose'],
  'united states':['Walmart','Trader Joe\'s','Whole Foods','Costco','Kroger','Aldi'],
  usa:['Walmart','Trader Joe\'s','Whole Foods','Costco','Kroger','Aldi'],
  france:['Carrefour','Leclerc','Lidl','Auchan','Intermarché'],
  germany:['Rewe','Edeka','Lidl','Aldi','Kaufland'],
  italy:['Esselunga','Coop','Conad','Lidl','Carrefour']
};
function storeOptions(){
  const own = String(S.profile.data.shopping?.supermarkets || '').split(/,|\/| and /).map(s => s.trim()).filter(Boolean);
  const country = String(S.profile.data.shopping?.country || '').toLowerCase().trim();
  const local = STORES_BY_COUNTRY[country] || ['Lidl','Aldi','Carrefour'];
  const list = [...own, ...local, ...(S.plan?.store ? [S.plan.store] : [])];
  return [...new Map(list.map(s => [s.toLowerCase(), s])).values()].slice(0, 8);
}

// Build the shopping list and prep schedule from the current week plan, for one supermarket.
async function generateShopping(store){
  if (!S.plan?.days || S.busy.shop) return;
  if (!S.sampleOK) { S.err.shop = 'Sign in to create your shopping list.'; render(); return; }
  store = store || S.plan.store || storeOptions()[0] || '';
  S.busy.shop = true; S.err.shop = null; render();
  try {
    const shop = await S.sample.json(PROMPTS.shopping(planContext(), S.plan.days, store), { modelTier:'default', cache:false });
    if (!Array.isArray(shop?.grocery) || !shop.grocery.length) throw { code:'invalid_json' };
    Object.assign(S.plan, { store, grocery: shop.grocery, prep: Array.isArray(shop?.prep) ? shop.prep : [], budget_note: shop?.budget_note || '', checked:{} });
    save.plan();
  } catch (e) { hardFail(e); S.err.shop = errText(e); }
  S.busy.shop = false; render();
}
async function loadRecipe(key, meal){
  if (S.plan.recipes?.[key]) { render(); return; }
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
  if (S.photosOff || !window.FORKCAST_CONFIG?.photoUrl || !S.plan?.days?.[di]) return;
  S.plan.photos = S.plan.photos || {};
  const todo = S.plan.days[di].meals.map((m, j) => [di + '-' + j, m]).filter(([k]) => !(k in S.plan.photos) && !photoBusy.has(k));
  if (!todo.length) return;
  const token = await Auth.token(); if (!token) return;
  todo.forEach(([k]) => photoBusy.add(k));
  let changed = false;
  await Promise.all(todo.map(async ([k, m]) => {
    try {
      const res = await fetch(window.FORKCAST_CONFIG.photoUrl + '?q=' + encodeURIComponent(m.photo || m.name), { headers:{ Authorization:'Bearer ' + token } });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.src) { S.plan.photos[k] = body; changed = true; }
      else if (body.code === 'not_found') { S.plan.photos[k] = null; changed = true; }
      else if (body.code === 'not_configured') S.photosOff = true;
    } catch {}
    photoBusy.delete(k);
  }));
  if (changed) { save.plan(); if (S.view === 'plan') render(); }
}
