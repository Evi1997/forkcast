// Shopping list (a sheet over the week plan) and guided prep mode (a full
// screen you can read from the counter, one step at a time, with timers).
const CART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.3 11.2a1 1 0 0 1-1 .8H7.3a1 1 0 0 1-1-.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';

function shopRows(P){
  const ch = P.checked || {};
  return [
    ...(P.extra || []).map(x => ({ k:'x-' + x.id, group:'My items', name:x.name, qty:'', done:!!x.done, mine:true })),
    ...(P.grocery || []).flatMap((g, gi) => (g.items || []).map((it, ii) => ({ k:gi + '-' + ii, group:g.group, name:it.name, qty:it.qty, done:!!ch[gi + '-' + ii] })))
  ];
}

function shopSheet(){
  const P = curPlan(); if (!P) return '';
  const enter = S.shopOpen === 'enter' ? ' enter' : '', store = P.store || storeOptions()[0] || '';
  const err = S.err.shop ? `<div class="notice warn">${esc(S.err.shop)}</div>` : '';
  const shell = (title, body) => `<div class="scrim${enter}" data-act="closeshop"></div>
  <div class="sheet shop-sheet${enter}" role="dialog" aria-modal="true" aria-label="Shopping list">
    <div class="grip" aria-hidden="true"></div>
    <div class="sheet-head"><div style="min-width:0;flex:1"><div class="label">${S.planWeek === 1 ? 'Next week' : 'This week'}</div><h2>${title}</h2></div>
      ${P.grocery?.length && !S.busy.shop ? `<button class="store-btn" data-act="storepick" aria-expanded="${!!S.storePick}">${CART}<span><small>Shopping at</small>${esc(store || 'Choose store')}</span></button>` : ''}
      <button class="x close" data-act="closeshop" aria-label="Close">×</button></div>
    ${err}${body}
  </div>`;
  if (S.busy.shop) return shell('Writing your list…', `<div class="empty" style="padding:24px 0"><div class="blob pulse-blob" aria-hidden="true">${CART}</div><p>Adding up every ingredient in your week${S.shopStore ? ` for ${esc(S.shopStore)}` : ''}, and writing a prep plan to go with it.</p></div>`);
  if (!P.grocery?.length) return shell('Shopping list', askForList(P));

  const rows = shopRows(P), todo = rows.filter(r => !r.done), done = rows.filter(r => r.done);
  const groups = [...new Set(todo.map(r => r.group))];
  const row = r => `<div class="gi ${r.done ? 'done' : ''}"><label><input type="checkbox" data-act="check" data-k="${r.k}" ${r.done ? 'checked' : ''}><span class="gname">${esc(r.name)}</span></label><span class="gq">${esc(r.qty || '')}</span>${r.mine ? `<button class="x small-x" data-act="delextra" data-k="${r.k}" aria-label="Remove ${esc(r.name)}">×</button>` : ''}</div>`;
  return shell(todo.length ? `${todo.length} to buy` : 'All in the basket', `
    ${S.storePick ? `<div class="store-pick">${storeChips(S.shopStore || store)}
      <button class="btn primary" data-act="genshop" ${S.shopStore && S.shopStore !== store ? '' : 'disabled'}>${S.shopStore && S.shopStore !== store ? `Rebuild for ${esc(S.shopStore)}` : `Using ${esc(store)}`}</button>
      <p class="muted" style="font-size:.84rem">Rebuilding uses that store's products and pack sizes. Your own items stay.</p></div>` : ''}
    ${P.listStale ? `<div class="notice accent row" style="gap:10px;justify-content:space-between"><span>You swapped meals since this list was made.</span><button class="btn small" data-act="genshop">Update</button></div>` : ''}
    <div class="basket"><div class="basket-bar"><span style="width:${rows.length ? done.length / rows.length * 100 : 0}%"></span></div><span class="muted num">${done.length}/${rows.length}</span></div>
    <form class="additem" id="addItemForm"><input type="text" id="extraName" placeholder="Add an item, e.g. coffee" aria-label="Add an item" autocomplete="off"><button class="sendbtn" type="submit" aria-label="Add item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></form>
    <div class="shoplist">
    ${groups.map(g => `<div class="grp"><h3>${esc(g)}</h3>${todo.filter(r => r.group === g).map(row).join('')}</div>`).join('')}
    ${!todo.length ? `<div class="empty" style="padding:12px 0"><h3>All done</h3><p>Everything's in the basket. Ready to prep together?</p><button class="btn primary" data-act="prepstart">Start prepping</button></div>` : ''}
    ${done.length ? `<details class="basket-done"><summary>In the basket · ${done.length}</summary>${done.map(row).join('')}<button class="btn ghost small" data-act="clearchecks">Untick all</button></details>` : ''}
    </div>
    ${P.budget_note ? `<p class="foot-note"><span class="tag est">Estimated</span> ${esc(P.budget_note)} Prices for ${esc(store || 'your supermarket')} are estimates, not checked live.</p>` : ''}`);
}

// No list yet: pick a supermarket and make it (the prep plan comes with it).
function askForList(P){
  return `<div class="stack ask-list">
    <div class="asker"><span class="ai-avatar mascot" aria-hidden="true">${MASCOT}</span><div class="bubble">One list for the whole week, and a prep plan to cook it together. Where are you shopping?</div></div>
    ${storeChips(S.shopStore || P.store || storeOptions()[0])}
    <button class="btn primary big-btn" data-act="genshop">Make my shopping list</button>
  </div>`;
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
  const timers = (S.timers || []).map(t => `<span class="tmr${t.end <= Date.now() ? ' up' : ''}" data-end="${t.end}"><b>${esc(t.label)}</b> <span class="num">${fmtLeft(t.end)}</span><button class="x small-x" data-act="deltimer" data-id="${t.id}" aria-label="Stop ${esc(t.label)} timer">×</button></span>`).join('');
  const top = `<div class="prep-top"><button class="x close" data-act="prepclose" aria-label="Close prep">×</button><span class="label">${i < 0 ? esc(p.when) + (p.minutes ? ' · ' + esc(p.minutes) : '') : i >= tasks.length ? 'Done' : `Step ${i + 1} of ${tasks.length}`}</span></div>
    ${i >= 0 && i < tasks.length ? `<div class="prep-bar" aria-hidden="true"><span style="width:${(i + 1) / tasks.length * 100}%"></span></div>` : ''}
    ${timers ? `<div class="tmrs" aria-live="polite">${timers}</div>` : ''}`;
  let body, foot;
  if (i < 0) {
    // What you'll make: the batch-cooked dishes of the week, with their photos.
    const seen = new Map();
    P.days.forEach((d, di) => d.meals.forEach((m, j) => { if (m.prep !== 'fresh') { const k = di + '-' + j, e = seen.get(m.name) || { m, key:k, n:0 }; e.n++; if (P.photos?.[k]?.thumb && !P.photos?.[e.key]?.thumb) e.key = k; seen.set(m.name, e); } }));
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
    const t = tasks[i], mins = stepMinutes(t), running = (S.timers || []).some(x => x.step === S.prep.s + '-' + i);
    body = `<p class="prep-step">${esc(t)}</p>
      ${mins ? `<button class="btn prep-timer" data-act="preptimer" data-m="${mins}" ${running ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/></svg> ${running ? 'Timer running' : `Start ${mins} min timer`}</button>` : ''}`;
    foot = `<button class="btn" data-act="prepback">Back</button><button class="btn primary big-btn" data-act="prepnext">${i === tasks.length - 1 ? 'Finish' : 'Next step'}</button>`;
  }
  return `<div class="prepmode" role="dialog" aria-modal="true" aria-label="Prep together">${top}<div class="prep-body">${body}</div><div class="prep-foot">${foot}</div></div>`;
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
  document.querySelectorAll('.tmr[data-end]').forEach(el => { el.querySelector('.num').textContent = fmtLeft(+el.dataset.end); });
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
