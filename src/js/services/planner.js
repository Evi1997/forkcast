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
    setCurPlan({ weekOf: next ? nextMonday() : mondayOf(), created: Date.now(), days: plan.days.slice(0,7), recipes:{}, checked:{} });
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

// Swap: three options with about the same calories and protein; pick one,
// or ask for three more. S.swap = { i, j, options, pick, busy, seen }.
function openSwap(i, j){
  const P = curPlan(); if (!P?.days?.[i]?.meals?.[j]) return;
  if (!S.sampleOK) { S.err.plan = 'Sign in to swap meals.'; render(); return; }
  S.planSheet = null;
  S.swap = { i, j, options:[], pick:0, seen:[], enter:true }; document.body.classList.add('sheet-open');
  moreSwaps();
}
async function moreSwaps(){
  const sw = S.swap, P = curPlan(); if (!sw || sw.busy || !P) return;
  const m = P.days[sw.i].meals[sw.j];
  sw.busy = true; sw.err = null; render(); sw.enter = false;
  try {
    const avoid = [...P.days.flatMap(d => d.meals.map(x => x.name)), ...sw.seen];
    const r = await S.sample.json(PROMPTS.swapOptions(planContext(), m, avoid), { modelTier:'quick', cache:false });
    const opts = (r?.options || []).filter(o => o?.name && o.kcal).slice(0, 3);
    if (!opts.length) throw { code:'invalid_json' };
    if (S.swap !== sw) return;
    sw.options = opts; sw.pick = 0; sw.seen.push(...opts.map(o => o.name));
    sw.busy = false; render();
    // Photos for the options: one quick lookup, shared with the plan.
    const titles = DISH_PHOTOS ? opts.map(o => o.wiki).filter(t => t && picFor(P, t) === undefined) : [];
    if (titles.length) { const got = await wikiPhotos(titles); P.pics = { ...(P.pics || {}), ...got }; rememberPics(got); if (S.swap === sw) render(); }
  } catch (e) { hardFail(e); sw.err = errText(e); sw.busy = false; render(); }
}
function useSwap(){
  const sw = S.swap, P = curPlan(), o = sw?.options?.[sw.pick]; if (!o) return;
  const { i, j } = sw, key = i + '-' + j, m = P.days[i].meals[j], before = { meal:m, recipe:P.recipes?.[key], stale:P.listStale };
  P.days[i].meals[j] = { ...o, slot:m.slot };
  if (P.recipes) delete P.recipes[key];
  if (P.grocery?.length) P.listStale = true;
  save.plan();
  S.swap = null; document.body.classList.remove('sheet-open');
  showToast(`Swapped for ${o.name}`, () => { P.days[i].meals[j] = before.meal; if (before.recipe) P.recipes[key] = before.recipe; P.listStale = before.stale; save.plan(); });
  render();
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

// Dish photos: the lead photo of the Wikipedia article for the closest classic
// dish (e.g. "Chili con carne" for a turkey chili). The AI names the article,
// so the photo always shows the right kind of dish; Wikipedia and Wikimedia
// Commons are free, need no key and allow calls straight from the phone.
// Plans keep P.wiki (meal name -> article) and P.pics (article -> photo or null).
const WIKI = 'https://en.wikipedia.org/w/api.php?format=json&origin=*&';
const mealWiki = (P, m) => m.wiki || P.wiki?.[m.name];
// Photos found once are remembered on this phone for every plan, so a dish
// that comes back another week shows its photo straight away.
// Off for now: matching photos by dish name kept showing the wrong dish.
const DISH_PHOTOS = false;
const PIC_KEY = 'forkcast:pics';
let picCache = (() => { try { return JSON.parse(localStorage.getItem(PIC_KEY)) || {}; } catch { return {}; } })();
function rememberPics(got){ picCache = { ...picCache, ...got }; try { localStorage.setItem(PIC_KEY, JSON.stringify(picCache)); } catch {} }
const picFor = (P, t) => t in (P?.pics || {}) ? P.pics[t] : picCache[t];
const mealPic = (P, m) => { if (!DISH_PHOTOS) return null; const t = mealWiki(P, m); return t ? picFor(P, t) : undefined; };
const stripHtml = h => { const d = document.createElement('div'); d.innerHTML = h || ''; return d.textContent.trim(); };

async function wikiPhotos(titles){
  const out = {};
  const q = (await (await fetch(WIKI + 'action=query&redirects=1&prop=pageimages&piprop=name|thumbnail&pithumbsize=500&titles=' + encodeURIComponent(titles.join('|')))).json()).query || {};
  const follow = (t, list) => (list || []).reduce((x, n) => n.from === x ? n.to : x, t);
  const pages = Object.values(q.pages || {});
  titles.forEach(t => {
    const p = pages.find(p => p.title === follow(follow(t, q.normalized), q.redirects));
    out[t] = p?.thumbnail?.source && /\.(jpe?g|png|webp)$/i.test(p.pageimage || '') ? { src:p.thumbnail.source, thumb:p.thumbnail.source.replace(/\/\d+px-/, '/120px-'), file:p.pageimage, page:p.title } : null;
  });
  // Author and licence for the credit line.
  const files = [...new Set(Object.values(out).filter(Boolean).map(x => 'File:' + x.file))];
  if (files.length) {
    const m = (await (await fetch(WIKI + 'action=query&prop=imageinfo&iiprop=extmetadata|url&iiextmetadatafilter=Artist|LicenseShortName&titles=' + encodeURIComponent(files.join('|')))).json()).query || {};
    Object.values(m.pages || {}).forEach(pg => {
      const info = pg.imageinfo?.[0]; if (!info) return;
      const name = pg.title.replace(/^File:/, '').replace(/ /g, '_');
      Object.values(out).forEach(x => { if (x && x.file.replace(/ /g, '_') === name) { const by = stripHtml(info.extmetadata?.Artist?.value); x.by = by && !/^no machine-readable/i.test(by) ? by.replace(/\s*\(.*?\)\s*/g, ' ').trim().slice(0, 32) : 'Wikimedia Commons'; x.lic = info.extmetadata?.LicenseShortName?.value || ''; x.url = info.descriptionurl; } });
    });
  }
  return out;
}

let photosBusy = false;
async function loadWeekPhotos(){
  const P = curPlan();
  if (!DISH_PHOTOS || photosBusy || !P?.days || !navigator.onLine) return;
  photosBusy = true;
  try {
    // Plans made before photos came from Wikipedia: ask once for the article names.
    const missing = [...new Set(P.days.flatMap(d => d.meals).filter(m => !mealWiki(P, m)).map(m => m.name))];
    if (missing.length && S.sampleOK && !(P.wikiAsked > Date.now() - 864e5)) {
      P.wikiAsked = Date.now();
      try { const r = await S.sample.json(PROMPTS.photoTitles(missing), { modelTier:'quick', cache:{gcTime:864e5} }); P.wiki = { ...(P.wiki || {}), ...(r?.titles || {}) }; } catch {}
      save.plan();
    }
    P.pics = P.pics || {};
    const todo = [...new Set(P.days.flatMap(d => d.meals).map(m => mealWiki(P, m)).filter(t => t && picFor(P, t) === undefined))];
    for (let i = 0; i < todo.length; i += 40) { const got = await wikiPhotos(todo.slice(i, i + 40)); Object.assign(P.pics, got); rememberPics(got); }
    if (todo.length) save.plan();
    delete P.photos; // old keyword-search photos, often the wrong dish
  } catch {}
  photosBusy = false;
  if (S.view === 'plan') render();
}
