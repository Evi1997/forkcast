// Week plan, shopping list, prep schedule and recipes
function planContext(){
  const t = targets();
  return { profile:S.profile.data, targets: t && { kcal:t.kcal, protein:t.protein, carbs:t.carbs, fat:t.fat, fiber:t.fiber },
    focus: S.profile.focus || S.profile.data.obstacles, checkin: S.progress.checkins.slice(-1)[0] };
}
// Two weeks side by side: S.plan is this week's (or the most recent past one)
// and S.planNext is next week's, so planning ahead never replaces this week.
const nextMonday = () => { const d = fromKey(mondayOf()); d.setDate(d.getDate() + 7); return dkey(d); };
const thisWeekPlan = () => S.plan?.days && S.plan.weekOf >= mondayOf() ? S.plan : null;
const curPlan = () => S.planWeek === 1 ? (S.planNext?.days ? S.planNext : null) : thisWeekPlan();
function rollWeeks(){
  // When next week arrives, its plan becomes this week's.
  if (S.planNext?.weekOf && S.planNext.weekOf <= mondayOf()) { S.plan = S.planNext; S.planNext = null; Store.save('plan', S.plan); Store.save('plan-next', null); }
}
function setCurPlan(p){ if (S.planWeek === 1) S.planNext = p; else S.plan = p; save.plan(); }

async function generatePlan(){
  if (S.busy.plan) return;
  if (!S.sampleOK) { S.err.plan = 'Sign in to plan your week.'; render(); return; }
  const next = S.planWeek === 1;
  S.busy.plan = next ? 'Planning next week…' : 'Writing your 7 days…'; S.err.plan = null; render();
  try {
    // For next week, steer away from this week's dishes so it doesn't repeat.
    const avoid = next && thisWeekPlan() ? thisWeekPlan().days.flatMap(d => d.meals.map(m => m.name)) : [];
    const plan = await S.sample.json(PROMPTS.plan({ ...planContext(), avoid }), { modelTier:'default', cache:false });
    if (!Array.isArray(plan?.days) || !plan.days.length) throw { code:'invalid_json' };
    setCurPlan({ weekOf: next ? nextMonday() : mondayOf(), created: Date.now(), days: plan.days.slice(0,7), recipes:{}, photos:{}, checked:{} });
    S.planDay = next ? 0 : (new Date().getDay() + 6) % 7;
  } catch (e) { hardFail(e); S.err.plan = errText(e); }
  S.busy.plan = false; render();
}

// Same meals again for the week being viewed: copies the latest other plan (no AI call).
function repeatWeek(){
  const src = S.planWeek === 1 ? thisWeekPlan() : S.plan; if (!src?.days) return;
  const copy = JSON.parse(JSON.stringify(src));
  setCurPlan({ ...copy, weekOf: S.planWeek === 1 ? nextMonday() : mondayOf(), created: Date.now(), checked:{}, extra:[] });
  showToast('Same meals as before. Your shopping list is ready too.'); render();
}

// Swap one meal for another with about the same calories and protein.
async function swapMeal(i, j){
  const P = curPlan(), m = P?.days?.[i]?.meals?.[j]; if (!m || S.busy.swap) return;
  if (!S.sampleOK) { S.err.plan = 'Sign in to swap meals.'; render(); return; }
  S.busy.swap = i + '-' + j; S.err.plan = null; render();
  try {
    const others = P.days.flatMap(d => d.meals.map(x => x.name));
    const r = await S.sample.json(PROMPTS.swapMeal(planContext(), m, others), { modelTier:'quick', cache:false });
    if (!r?.name || !r.kcal) throw { code:'invalid_json' };
    const key = i + '-' + j, before = { meal:m, recipe:P.recipes?.[key], photo:P.photos?.[key], stale:P.listStale };
    P.days[i].meals[j] = { ...r, slot:m.slot };
    if (P.recipes) delete P.recipes[key]; if (P.photos) delete P.photos[key];
    if (P.grocery?.length) P.listStale = true;
    save.plan();
    showToast(`Swapped for ${r.name}`, () => { P.days[i].meals[j] = before.meal; if (before.recipe) P.recipes[key] = before.recipe; if (before.photo !== undefined) P.photos[key] = before.photo; P.listStale = before.stale; save.plan(); });
  } catch (e) { hardFail(e); S.err.plan = errText(e); }
  S.busy.swap = null; render();
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
  const sh = S.profile.data.shopping || {};
  const own = [...String(sh.supermarkets || '').split(/,|\/| and /), ...String(sh.supermarkets_other || '').split(/,|\/| and /)].map(s => s.trim()).filter(s => s && s !== 'Other');
  const country = String(S.profile.data.shopping?.country || '').toLowerCase().trim();
  const local = STORES_BY_COUNTRY[country] || ['Lidl','Aldi','Carrefour'];
  const list = [...own, ...local, ...(curPlan()?.store ? [curPlan().store] : [])];
  return [...new Map(list.map(s => [s.toLowerCase(), s])).values()].slice(0, 8);
}

// Build the shopping list and prep schedule from the current week plan, for one supermarket.
async function generateShopping(store){
  const P = curPlan();
  if (!P?.days || S.busy.shop) return;
  if (!S.sampleOK) { S.err.shop = 'Sign in to create your shopping list.'; render(); return; }
  store = store || P.store || storeOptions()[0] || '';
  S.busy.shop = true; S.err.shop = null; render();
  try {
    const shop = await S.sample.json(PROMPTS.shopping(planContext(), P.days, store), { modelTier:'default', cache:false });
    if (!Array.isArray(shop?.grocery) || !shop.grocery.length) throw { code:'invalid_json' };
    Object.assign(P, { store, grocery: shop.grocery, prep: Array.isArray(shop?.prep) ? shop.prep : [], budget_note: shop?.budget_note || '', checked:{}, listStale:false });
    save.plan();
  } catch (e) { hardFail(e); S.err.shop = errText(e); }
  S.busy.shop = false; render();
}
async function loadRecipe(key, meal){
  const P = curPlan(); if (!P) return;
  if (P.recipes?.[key]) { render(); return; }
  if (!S.sampleOK) { S.err.plan = 'Sign in to see recipes.'; render(); return; }
  S.busy.recipe = key; S.openRecipe = key; render();
  try {
    const r = await S.sample.json(PROMPTS.recipe(meal, { prefs:S.profile.data.preferences, cooking:S.profile.data.cooking, country:S.profile.data.shopping?.country }), { modelTier:'quick', cache:{gcTime:864e5} });
    P.recipes = P.recipes || {}; P.recipes[key] = r; save.plan();
  } catch (e) { hardFail(e); S.err.plan = errText(e); S.openRecipe = null; }
  S.busy.recipe = null; render();
}

// Dish photos: free, openly licensed photos from Openverse (no key, called
// straight from the phone). Each result is scored against the dish name so an
// unrelated photo is never shown; no good match falls back to the meal icon.
// Fetched once per meal for the day being viewed and kept inside the plan.
const photoBusy = new Set();
const PHOTO_STOP = new Set(['with','and','the','a','of','in','on','fresh','homemade','easy','bowl','plate']);
async function findPhoto(q){
  const words = String(q).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !PHOTO_STOP.has(w));
  if (!words.length) return null;
  const res = await fetch('https://api.openverse.org/v1/images/?page_size=10&category=photograph&mature=false&q=' + encodeURIComponent(words.slice(0, 4).join(' ')));
  if (res.status === 429) { S.photosOff = true; return undefined; }
  if (!res.ok) return undefined;
  const body = await res.json();
  const food = /food|dish|meal|breakfast|lunch|dinner|cuisine|recipe|salad|soup|bowl|plate/;
  let best = null, bestScore = 0;
  (body.results || []).forEach(r => {
    const text = (r.title + ' ' + (r.tags || []).map(t => t.name).join(' ')).toLowerCase();
    const hits = words.filter(w => text.includes(w.replace(/s$/, ''))).length;
    const score = hits / words.length + (food.test(text) ? .25 : 0);
    if (score > bestScore) { best = r; bestScore = score; }
  });
  if (!best || bestScore < .5) return null;
  const flickr = /staticflickr\.com/.test(best.url), size = s => best.url.replace(/(_[a-z])?\.jpg$/, s + '.jpg');
  return { src: flickr ? size('_z') : best.url, thumb: flickr ? size('_q') : best.thumbnail, by: best.creator || 'Unknown', url: best.foreign_landing_url, lic: ('CC ' + (best.license || '').toUpperCase() + ' ' + (best.license_version || '')).trim() };
}
async function loadDayPhotos(di){
  const P = curPlan();
  if (S.photosOff || !navigator.onLine || !P?.days?.[di]) return;
  P.photos = P.photos || {};
  const todo = P.days[di].meals.map((m, j) => [di + '-' + j, m]).filter(([k]) => !(k in P.photos) && !photoBusy.has(k));
  if (!todo.length) return;
  todo.forEach(([k]) => photoBusy.add(k));
  let changed = false;
  await Promise.all(todo.map(async ([k, m]) => {
    try { const p = await findPhoto(m.photo || m.name); if (p !== undefined) { P.photos[k] = p; changed = true; } } catch {}
    photoBusy.delete(k);
  }));
  if (changed) { save.plan(); if (S.view === 'plan') render(); }
}
