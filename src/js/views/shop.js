// Shopping list (a sheet over the week plan) and guided prep mode (a full
// screen you can read from the counter, one step at a time, with timers).
const CART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.3 11.2a1 1 0 0 1-1 .8H7.3a1 1 0 0 1-1-.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';

function shopRows(P){
  const ch = P.checked || {};
  return [
    ...(P.extra || []).map(x => ({ k:'x-' + x.id, group:'My items', name:x.name, qty:'', done:!!x.done, mine:true })),
    ...(P.grocery || []).flatMap((g, gi) => (g.items || []).map((it, ii) => ({ k:gi + '-' + ii, group:g.group, name:it.name, qty:it.qty, price:+it.price || 0, done:!!ch[gi + '-' + ii] })))
  ];
}

// Shopping list in three steps: how to start (week plan, last list or empty),
// your shop (store, weekly budget, what's already at home), then the list by
// aisle with an estimated cost against the budget and cheaper swaps.
// S.shopSetup = null | { step:'start'|'setup', store, budget, have:[] }
const PANTRY = ['Olive oil','Salt and pepper','Spices','Rice','Pasta','Oats','Flour','Eggs','Soy sauce','Honey','Garlic','Onions'];
function currency(){
  const c = String(S.profile.data.shopping?.country || '').toLowerCase();
  return /united kingdom|uk|england|scotland|wales/.test(c) ? '£' : /united states|usa|canada|australia|new zealand/.test(c) ? '$' : /switzerland/.test(c) ? 'CHF ' : /sweden|norway|denmark/.test(c) ? 'kr ' : '€';
}
const money = (n, cur) => (cur || currency()) + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0);
const hasList = P => !!(P.grocery?.length || P.manualList || P.extra?.length);
function shopSetupDefaults(P){
  const sh = S.profile.data.shopping || {};
  return { step: hasList(P) ? 'setup' : 'start', store: P.store || storeOptions()[0] || '', budget: P.budget || sh.week_budget || parseFloat(String(sh.budget || '').replace(/[^\d.]/g, '')) || '', have: [...(sh.pantry || ['Olive oil','Salt and pepper','Spices'])] };
}

function shopSheet(){
  const P = curPlan(); if (!P) return '';
  const enter = S.shopOpen === 'enter' ? ' enter' : '', store = P.store || '';
  const err = S.err.shop ? `<div class="notice warn">${esc(S.err.shop)}</div>` : '';
  const shell = (title, body, back) => `<div class="scrim${enter}" data-act="closeshop"></div>
  <div class="sheet shop-sheet${enter}" role="dialog" aria-modal="true" aria-label="Shopping list">
    <div class="grip" aria-hidden="true"></div>
    <div class="sheet-head">${back ? `<button class="x back-x" data-act="${back}" aria-label="Back"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg></button>` : ''}<div style="min-width:0;flex:1"><div class="label">${S.planWeek === 1 ? 'Next week' : 'This week'}</div><h2>${title}</h2></div>
      ${hasList(P) && !S.busy.shop && !S.shopSetup ? `<button class="store-btn" data-act="shopedit" aria-label="Change store, budget or what you have">${CART}<span><small>Shopping at</small>${esc(store || 'Choose store')}</span></button>` : ''}
      <button class="x close" data-act="closeshop" aria-label="Close">×</button></div>
    ${err}${body}
  </div>`;
  if (S.busy.shop) return shell('Writing your list…', `<div class="empty" style="padding:24px 0"><div class="blob pulse-blob" aria-hidden="true">${CART}</div><p>Adding up every ingredient in your week for ${esc(S.shopSetup?.store || store || 'your shop')}${S.shopSetup?.budget ? `, keeping it near ${money(+S.shopSetup.budget)}` : ''}, and writing a prep plan to go with it.</p></div>`);
  if (!S.shopSetup && !hasList(P)) S.shopSetup = shopSetupDefaults(P);
  const su = S.shopSetup;
  if (su?.step === 'start') return shell('New shopping list', shopStart(P));
  if (su?.step === 'setup') return shell('Your shop', shopSetupView(P), hasList(P) ? 'shopcancel' : 'shopstartback');
  return shell(shopTitle(P), shopList(P));
}

function shopStart(P){
  const last = S.profile.lastList, canRepeat = last?.grocery?.length && last.weekOf !== P.weekOf;
  const opt = (v, ic, t, sub) => `<button class="src-opt" data-act="shopsrc" data-v="${v}"><span class="src-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic}</svg></span><span><b>${t}</b><span class="muted">${sub}</span></span>${CHEV}</button>`;
  return `<p class="muted">How do you want to start?</p>
    <div class="src-list">
      ${opt('plan', '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', 'From my week plan', 'Everything for your 7 days of meals')}
      ${canRepeat ? opt('repeat', '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>', 'Repeat last list', `${last.grocery.reduce((n, g) => n + (g.items || []).length, 0)} items${last.store ? ' from ' + esc(last.store) : ''}`) : ''}
      ${opt('empty', '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>', 'Start empty', 'Add items yourself')}
    </div>`;
}

function shopSetupView(P){
  const su = S.shopSetup, cur = currency();
  return `<div class="pr-group"><span class="pr-label">Store</span>${storeChips(su.store)}</div>
    <div class="pr-group"><label class="pr-label" for="shopBudget">Weekly budget <span class="muted">(optional)</span></label>
      <label class="unit-input budget-in"><span>${esc(cur.trim())}</span><input type="text" id="shopBudget" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" enterkeyhint="done" autocomplete="off" placeholder="60" value="${esc(su.budget || '')}"><span>a week</span></label></div>
    <div class="pr-group"><span class="pr-label">Already at home? These are left off</span>
      <div class="stores" role="group" aria-label="Already at home">${PANTRY.map(x => `<button class="chip" data-act="pantry" data-v="${esc(x)}" aria-pressed="${su.have.includes(x)}">${su.have.includes(x) ? '✓ ' : ''}${esc(x)}</button>`).join('')}</div></div>
    <div class="sheet-actions"><button class="btn primary big-btn" data-act="genshop">${P.grocery?.length ? 'Rebuild my list' : 'Make my list'}</button></div>
    ${P.grocery?.length ? '<p class="muted" style="font-size:.84rem;text-align:center">Your own items and ticks on them stay.</p>' : ''}`;
}

function shopTitle(P){ const rows = shopRows(P), left = rows.filter(r => !r.done).length; return !rows.length ? 'Your list' : !left ? 'All in the basket' : `${left} to buy`; }

function shopList(P){
  const rows = shopRows(P), todo = rows.filter(r => !r.done), done = rows.filter(r => r.done);
  const groups = [...new Set(todo.map(r => r.group))], cur = P.currency || currency();
  const total = rows.reduce((n, r) => n + (r.price || 0), 0), budget = +P.budget || 0;
  const row = r => `<div class="gi ${r.done ? 'done' : ''}"><label><input type="checkbox" data-act="check" data-k="${r.k}" ${r.done ? 'checked' : ''}><span class="gname">${esc(r.name)}${r.qty ? `<small class="gqty">${esc(r.qty)}</small>` : ''}</span></label>${r.price ? `<span class="gq num">${money(r.price, cur)}</span>` : ''}${r.mine ? `<button class="x small-x" data-act="delextra" data-k="${r.k}" aria-label="Remove ${esc(r.name)}">×</button>` : ''}</div>`;
  const over = budget && total > budget;
  return `
    ${P.grocery?.length && !total && !P.manualList ? `<button class="src-opt upgrade" data-act="shopedit"><span class="src-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3"/></svg></span><span><b>Add a budget and prices</b><span class="muted">Pick your store, budget and what's at home, then rebuild this list.</span></span>${CHEV}</button>` : ''}
    ${P.listStale ? `<div class="notice accent row" style="gap:10px;justify-content:space-between"><span>You swapped meals since this list was made.</span><button class="btn small" data-act="genshop">Update</button></div>` : ''}
    ${total ? `<div class="budget-card${over ? ' over' : ''}"><div class="row" style="justify-content:space-between"><span>About <b class="num">${money(total, cur)}</b></span><span class="muted">${budget ? `of ${money(budget, cur)} budget` : 'estimated'}</span></div>
      ${budget ? `<div class="basket-bar"><span style="width:${Math.min(total / budget, 1) * 100}%"></span></div>` : ''}
      ${over ? `<p class="muted" style="font-size:.84rem">About ${money(total - budget, cur)} over. The swaps below help.</p>` : ''}</div>` : ''}
    ${(P.swaps || []).length ? `<div class="swaps-save">${P.swaps.slice(0, 3).map(w => `<p><b>${w.save ? 'Save ' + money(+w.save, cur) : 'Cheaper'}</b> ${esc(w.text)}</p>`).join('')}</div>` : ''}
    <form class="additem" id="addItemForm"><input type="text" id="extraName" placeholder="Add an item, e.g. coffee" aria-label="Add an item" autocomplete="off"><button class="sendbtn" type="submit" aria-label="Add item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></form>
    ${rows.length ? `<div class="basket"><div class="basket-bar"><span style="width:${done.length / rows.length * 100}%"></span></div><span class="muted num">${done.length}/${rows.length} in basket</span></div>` : '<p class="muted" style="text-align:center;padding:8px 0">Your list is empty. Add what you need above.</p>'}
    <div class="shoplist">
    ${groups.map(g => `<div class="grp"><h3>${esc(g)}</h3>${todo.filter(r => r.group === g).map(row).join('')}</div>`).join('')}
    ${rows.length && !todo.length ? `<div class="empty" style="padding:12px 0"><h3>All done</h3><p>Everything's in the basket.${P.prep?.length ? ' Ready to prep together?' : ''}</p>${P.prep?.length ? '<button class="btn primary" data-act="prepstart">Start prepping</button>' : ''}</div>` : ''}
    ${done.length ? `<details class="basket-done"><summary>In the basket · ${done.length}</summary>${done.map(row).join('')}<button class="btn ghost small" data-act="clearchecks">Untick all</button></details>` : ''}
    </div>
    ${total ? `<p class="foot-note"><span class="tag est">Estimated</span> Prices for ${esc(P.store || 'your supermarket')} are rough guesses, not checked live.</p>` : P.budget_note ? `<p class="foot-note"><span class="tag est">Estimated</span> ${esc(P.budget_note)}</p>` : ''}
    <button class="btn ghost small" data-act="shopnew" style="align-self:center">Start a new list</button>`;
}

function storeChips(pick){
  return `<div class="stores" role="group" aria-label="Supermarket">
      ${storeOptions().map(s => `<button class="chip" data-act="store" data-s="${esc(s)}" aria-pressed="${s === pick}">${s === pick ? '✓ ' : ''}${esc(s)}</button>`).join('')}
      <button class="chip" data-act="storeother" aria-pressed="${!!S.storeOther}">Other…</button>
    </div>
    ${S.storeOther ? `<form class="additem" id="storeForm" style="margin-top:8px"><input type="text" id="storeName" placeholder="Supermarket name" aria-label="Supermarket name" autocomplete="off"><button class="btn small" type="submit">Use</button></form>` : ''}`;
}

// ---- Guided prep ----
// S.prep = { s: session, i: step (-1 = before you start, tasks.length = done) }
const stepMinutes = t => { const m = String(t).match(/(\d+)(?:\s*[–-]\s*\d+)?\s*min/i); return m ? +m[1] : 0; };

function prepMode(){
  const P = curPlan(), sessions = P?.prep || [], p = sessions[S.prep.s]; if (!p) return '';
  const tasks = p.tasks || [], i = S.prep.i;
  const timers = (S.timers || []).filter(t => t.step !== S.prep.s + '-' + i).map(t => `<span class="tmr${t.end <= Date.now() ? ' up' : ''}" data-end="${t.end}"><b>${esc(t.label)}</b> <span class="num">${fmtLeft(t.end)}</span><button class="x small-x" data-act="deltimer" data-id="${t.id}" aria-label="Stop ${esc(t.label)} timer">×</button></span>`).join('');
  const top = `<div class="prep-top"><button class="x close" data-act="prepclose" aria-label="Close prep">×</button><span class="label">${i < 0 ? esc(p.when) + (p.minutes ? ' · ' + esc(p.minutes) : '') : i >= tasks.length ? 'Done' : `Step ${i + 1} of ${tasks.length}`}</span></div>
    ${i >= 0 && i < tasks.length ? `<div class="ps-dots" aria-hidden="true">${tasks.map((_, k) => `<span class="${k < i ? 'on' : k === i ? 'now' : ''}"></span>`).join('')}</div>` : ''}
    ${timers ? `<div class="tmrs" aria-live="polite">${timers}</div>` : ''}`;
  let body, foot;
  if (i < 0) {
    // What you'll make: the batch-cooked dishes of the week, with their photos.
    const seen = new Map();
    P.days.forEach((d, di) => d.meals.forEach((m, j) => { if (m.prep !== 'fresh') { const e = seen.get(m.name) || { m, key:di + '-' + j, n:0 }; e.n++; seen.set(m.name, e); } }));
    const dishes = [...seen.values()];
    body = `<h1 class="prep-h">You'll make</h1>
      ${sessions.length > 1 ? `<div class="stores" role="group" aria-label="Prep session">${sessions.map((x, k) => `<button class="chip" data-act="prepsession" data-s="${k}" aria-pressed="${k === S.prep.s}">${esc(x.when)}</button>`).join('')}</div>` : ''}
      <div class="prep-dishes">${dishes.slice(0, 6).map(e => `<div class="pdish">${dishThumb(P, e.key, e.m)}<span><b>${esc(e.m.name)}</b><span class="muted">${e.n} ${e.n === 1 ? 'meal' : 'meals'}</span></span></div>`).join('') || '<p class="muted">The batch-cooked meals of your week.</p>'}</div>
      ${p.kit ? `<div class="prep-kit"><span class="label">Get out</span><p>${esc(p.kit)}</p></div>` : ''}
      <p class="muted">${tasks.length} steps. The screen stays on, and timers keep running while you move on.</p>`;
    foot = `<button class="btn primary big-btn" data-act="prepnext">Start prepping</button>`;
  } else if (i >= tasks.length) {
    body = `<div class="prep-done"><span class="mascot" aria-hidden="true">${MASCOT}</span><h1 class="prep-h">All prepped</h1><p class="muted">Here's where it all goes.</p></div>
      <dl class="facts">${p.fridge ? `<dt>Fridge</dt><dd>${esc(p.fridge)}</dd>` : ''}${p.freeze ? `<dt>Freeze</dt><dd>${esc(p.freeze)}</dd>` : ''}${p.fresh ? `<dt>Fresh</dt><dd>${esc(p.fresh)}</dd>` : ''}</dl>`;
    foot = `<button class="btn primary big-btn" data-act="prepclose">Done</button>`;
  } else {
    // One step, centred: what it's for (icon), the action, a big timer, and what to do meanwhile.
    const t = tasks[i], mins = stepMinutes(t), stepId = S.prep.s + '-' + i, run = (S.timers || []).find(x => x.step === stepId);
    const [main, ...rest] = String(t).split(/\s*\bmeanwhile\b[,:]?\s*/i), meanwhile = rest.join(' ').trim();
    body = `<div class="ps-center">
        <span class="ps-ic" aria-hidden="true">${stepIcon(main)}</span>
        <p class="prep-step">${esc(main.replace(/[.;,]\s*$/, ''))}</p>
        ${run ? `<div class="ps-clock tmr${run.end <= Date.now() ? ' up' : ''}" data-end="${run.end}" aria-live="polite"><span class="num">${fmtLeft(run.end)}</span></div>`
          : mins ? `<button class="btn ps-timer" data-act="preptimer" data-m="${mins}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/></svg> Start ${mins} min timer</button>` : ''}
        ${meanwhile ? `<p class="ps-meanwhile"><b>Meanwhile</b> ${esc(meanwhile)}</p>` : ''}
      </div>`;
    foot = `<button class="btn" data-act="prepback">Back</button><button class="btn primary big-btn" data-act="prepnext">${i === tasks.length - 1 ? 'Finish' : 'Next step'}</button>`;
  }
  return `<div class="prepmode" role="dialog" aria-modal="true" aria-label="Prep together">${top}<div class="prep-body">${body}</div><div class="prep-foot">${foot}</div></div>`;
}

const STEP_IC = {
  heat:'<path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-7.5z"/><path d="M6 21h12"/>',
  pan:'<path d="M3 12h13a0 0 0 0 1 0 0 5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/><path d="M16 12h5M7 8c0-1 1-1 1-2M11 8c0-1 1-1 1-2"/>',
  knife:'<path d="M4 20 15 9l2 2c-2 4-6 7-10 8z"/><path d="m15 9 4-4a1.4 1.4 0 0 1 2 2l-4 4"/>',
  box:'<path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M3 5h18v3H3zM10 12h4"/>',
  bowl:'<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3"/>'
};
function stepIcon(t){
  const k = /oven|roast|bake|grill|preheat|air.?fry/i.test(t) ? 'heat' : /boil|simmer|fry|saut|cook|toast|steam|pan/i.test(t) ? 'pan'
    : /chop|slice|dice|cut|grate|peel|mince/i.test(t) ? 'knife' : /portion|pack|box|jar|container|store|fridge|freez|label|cool/i.test(t) ? 'box' : 'bowl';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${STEP_IC[k]}</svg>`;
}

const fmtLeft = end => { const s = Math.max(0, Math.round((end - Date.now()) / 1000)); return s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : 'Time’s up'; };

function startTimer(mins){
  const P = curPlan(), task = P.prep[S.prep.s].tasks[S.prep.i];
  const label = task.replace(/^(meanwhile,?\s*)/i, '').split(/\s+/).filter(w => !/\d|^(kg|g|ml|l|min|for|the|a)$/i.test(w)).slice(0, 3).join(' ');
  S.timers = [...(S.timers || []), { id:uid(), step:S.prep.s + '-' + S.prep.i, label, end:Date.now() + mins * 60000 }];
  clearInterval(startTimer.iv); startTimer.iv = setInterval(tickTimers, 1000);
  render();
}
function tickTimers(){
  document.querySelectorAll('.tmr[data-end]').forEach(el => { el.querySelector('.num').textContent = fmtLeft(+el.dataset.end); el.classList.toggle('up', +el.dataset.end <= Date.now()); });
  (S.timers || []).forEach(t => {
    if (t.end > Date.now() || t.rang) return;
    t.rang = true;
    try { navigator.vibrate?.([300, 150, 300]); } catch {}
    try { const a = new AudioContext(), o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.value = .15; o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + .6); } catch {}
    showToast(`Time’s up: ${t.label}`); render();
  });
  if (!(S.timers || []).some(t => !t.rang)) clearInterval(startTimer.iv);
}

// Keep the screen on while prepping (where the browser allows it).
async function prepWake(on){
  try {
    if (on && !prepWake.lock && navigator.wakeLock) prepWake.lock = await navigator.wakeLock.request('screen');
    if (!on && prepWake.lock) { await prepWake.lock.release(); prepWake.lock = null; }
  } catch {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.prep) { prepWake.lock = null; prepWake(true); } });
