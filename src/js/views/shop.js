// Shop & prep: the list first (what's left to buy), ticked items fold away,
// supermarket as a small switch, prep plan on its own tab, cost at the bottom.
const CART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.3 11.2a1 1 0 0 1-1 .8H7.3a1 1 0 0 1-1-.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';

function vShop(){
  const store = S.plan?.store, err = S.err.shop ? `<div class="notice warn">${esc(S.err.shop)}</div>` : '';
  const head = (sub) => `<div class="head"><div><div class="label">${sub}</div><h1>Shop & prep</h1></div>
    ${S.plan?.grocery?.length ? `<button class="store-btn" data-act="storesheet" aria-label="Supermarket: ${esc(store || 'choose')}. Change">${CART}<span>${esc(store || 'Supermarket')}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>` : ''}</div>`;
  if (!S.plan?.days) return head('One trip, one prep session') + `<section class="card empty"><div class="blob" aria-hidden="true">${CART}</div><h2>No list yet</h2><p>Plan your week first. Then Forkcast turns it into one shopping list for your supermarket.</p><button class="btn primary" data-act="nav" data-v="plan">Plan my week</button></section>`;
  if (S.busy.shop) return head('Writing your list') + `<section class="card empty"><div class="blob pulse-blob" aria-hidden="true">${CART}</div><h2>Writing your list…</h2><p>Adding up every ingredient in your week${S.shopStore ? ` for ${esc(S.shopStore)}` : ''}.</p></section>`;
  if (!S.plan.grocery?.length) return head('One trip, one prep session') + err + askForList();

  const tab = S.shopTab || 'list';
  const ch = S.plan.checked || {}, extra = S.plan.extra || [];
  const rows = [
    ...extra.map(x => ({ k:'x-' + x.id, group:'My items', name:x.name, qty:'', note:'', done:!!x.done, mine:true })),
    ...S.plan.grocery.flatMap((g, gi) => (g.items || []).map((it, ii) => ({ k:gi + '-' + ii, group:g.group, name:it.name, qty:it.qty, note:it.note, done:!!ch[gi + '-' + ii] })))
  ];
  const todo = rows.filter(r => !r.done), done = rows.filter(r => r.done);
  const groups = [...new Set(todo.map(r => r.group))];
  const row = r => `<div class="gi ${r.done ? 'done' : ''}"><label><input type="checkbox" data-act="check" data-k="${r.k}" ${r.done ? 'checked' : ''}><span class="gname">${esc(r.name)}</span></label><span class="gq">${esc(r.qty || '')}</span>${r.mine ? `<button class="x small-x" data-act="delextra" data-k="${r.k}" aria-label="Remove ${esc(r.name)}">×</button>` : ''}</div>`;

  return head(`${todo.length ? `${todo.length} to buy` : 'All in the basket'}`) + err + `
  <div class="seg" role="tablist" aria-label="Shop & prep">
    <button role="tab" data-act="shoptab" data-t="list" aria-selected="${tab === 'list'}">List <span class="num">${todo.length}</span></button>
    <button role="tab" data-act="shoptab" data-t="prep" aria-selected="${tab === 'prep'}">Prep plan</button>
  </div>
  ${tab === 'list' ? `
  <section class="card shoplist">
    <div class="basket"><div class="basket-bar"><span style="width:${rows.length ? done.length / rows.length * 100 : 0}%"></span></div><span class="muted num">${done.length}/${rows.length}</span></div>
    <form class="additem" id="addItemForm"><input type="text" id="extraName" placeholder="Add an item, e.g. coffee" aria-label="Add an item" autocomplete="off"><button class="sendbtn" type="submit" aria-label="Add item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></form>
    ${groups.map(g => `<div class="grp"><h3>${esc(g)}</h3>${todo.filter(r => r.group === g).map(row).join('')}</div>`).join('')}
    ${!todo.length ? `<div class="empty" style="padding:18px 0"><h3>All done</h3><p>Everything's in the basket.</p></div>` : ''}
    ${done.length ? `<details class="basket-done"><summary>In the basket · ${done.length}</summary>${done.map(row).join('')}<button class="btn ghost small" data-act="clearchecks">Untick all</button></details>` : ''}
  </section>
  ${S.plan.budget_note ? `<p class="foot-note"><span class="tag est">Estimated</span> ${esc(S.plan.budget_note)} Products and prices for ${esc(store || 'your supermarket')} are estimates, not checked live.</p>` : ''}`
  : prepPlan()}
  ${S.storeSheet ? storeSheet() : ''}`;
}

function prepPlan(){
  const prep = S.plan.prep || [];
  if (!prep.length) return `<section class="card empty"><h2>No prep plan</h2><p>Rebuild your list to get a prep schedule with it.</p></section>`;
  return `<div class="stack">${prep.map(p => `<section class="card prep">
    <div class="row" style="justify-content:space-between"><h2>${esc(p.when)}</h2>${p.minutes ? `<span class="trend-pill">${esc(p.minutes)}</span>` : ''}</div>
    <ol class="steps">${(p.tasks || []).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
    ${p.fridge || p.freeze || p.fresh ? `<details class="plan-notes"><summary>Storage</summary><dl class="facts" style="margin-top:8px">${p.fridge ? `<dt>Fridge</dt><dd>${esc(p.fridge)}</dd>` : ''}${p.freeze ? `<dt>Freeze</dt><dd>${esc(p.freeze)}</dd>` : ''}${p.fresh ? `<dt>Fresh</dt><dd>${esc(p.fresh)}</dd>` : ''}</dl></details>` : ''}
  </section>`).join('')}</div>`;
}

// "Shall I create your shopping list?" card, used when there's a plan but no list.
function askForList(){
  return `<section class="card stack ask-list">
    <div class="asker"><span class="ai-avatar" aria-hidden="true">${STAR}</span><div class="bubble">Your week is planned. Shall I create your shopping list?</div></div>
    <div><div class="label" style="margin-bottom:8px">Where are you shopping?</div>${storeChips(S.shopStore || S.plan?.store || storeOptions()[0])}</div>
    <button class="btn primary big-btn" data-act="genshop">Create my shopping list</button>
  </section>`;
}

function storeChips(pick){
  return `<div class="stores" role="group" aria-label="Supermarket">
      ${storeOptions().map(s => `<button class="chip" data-act="store" data-s="${esc(s)}" aria-pressed="${s === pick}">${esc(s)}</button>`).join('')}
      <button class="chip" data-act="storeother" aria-pressed="${!!S.storeOther}">Other…</button>
    </div>
    ${S.storeOther ? `<form class="additem" id="storeForm" style="margin-top:8px"><input type="text" id="storeName" placeholder="Supermarket name" aria-label="Supermarket name" autocomplete="off"><button class="btn small" type="submit">Use</button></form>` : ''}`;
}

// Switch supermarket: pick one, then rebuild the list for it.
function storeSheet(){
  const cur = S.plan.store, pick = S.shopStore || cur, enter = S.storeSheet === 'enter' ? ' enter' : '';
  return `<div class="scrim${enter}" data-act="storesheet"></div>
  <div class="sheet${enter}" role="dialog" aria-modal="true" aria-label="Supermarket">
    <div class="grip" aria-hidden="true"></div>
    <div class="sheet-head"><h2>Supermarket</h2><button class="x close" data-act="storesheet" aria-label="Close">×</button></div>
    ${storeChips(pick)}
    <p class="muted" style="font-size:.88rem">Rebuilding uses that store's products and package sizes. Your own items stay; ticks are cleared.</p>
    <div class="sheet-actions"><button class="btn primary big-btn" data-act="genshop" ${pick && pick !== cur ? '' : 'disabled'}>${pick && pick !== cur ? `Rebuild for ${esc(pick)}` : `Using ${esc(cur || '')}`}</button></div>
  </div>`;
}
