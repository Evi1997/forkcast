// Shopping list (built from the week plan on request), your own extra items,
// supermarket picker, and the prep schedule.
function vShop(){
  const store = S.plan?.store;
  const head = `<div class="head"><div><div class="label">${store ? esc(store) : 'One trip, one prep session'}</div><h1>Shop & prep</h1></div>${S.plan?.grocery?.length ? `<button class="btn small" data-act="clearchecks">Untick all</button>` : ''}</div>`;
  const err = S.err.shop ? `<div class="notice warn">${esc(S.err.shop)}</div>` : '';
  if (!S.plan?.days) return head + `<section class="card empty"><div class="blob" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.3 11.2a1 1 0 0 1-1 .8H7.3a1 1 0 0 1-1-.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg></div><h2>No list yet</h2><p>Plan your week first. Then Forkcast turns it into one shopping list for your supermarket, so you buy only what the week needs.</p><button class="btn primary" data-act="nav" data-v="plan">Plan my week</button></section>`;
  if (S.busy.shop) return head + `<section class="card empty"><div class="blob pulse-blob" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.3 11.2a1 1 0 0 1-1 .8H7.3a1 1 0 0 1-1-.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg></div><h2>Writing your list…</h2><p>Adding up every ingredient in your week${S.shopStore ? ` for ${esc(S.shopStore)}` : ''}. This takes a few seconds.</p></section>`;
  if (!S.plan.grocery?.length) return head + err + askForList();

  const ch = S.plan.checked || {}, extra = S.plan.extra || [];
  const total = S.plan.grocery.reduce((a, g) => a + (g.items || []).length, 0) + extra.length;
  const got = Object.values(ch).filter(Boolean).length + extra.filter(x => x.done).length;
  const item = (k, name, qty, note, done, mine) => `<div class="gi ${done ? 'done' : ''}">
      <label><input type="checkbox" data-act="check" data-k="${k}" ${done ? 'checked' : ''}><span><span class="gname">${esc(name)}</span>${note ? `<br><span class="muted" style="font-size:.8rem">${esc(note)}</span>` : ''}</span></label>
      <span class="gq">${esc(qty || '')}</span>${mine ? `<button class="x" data-act="delextra" data-k="${k}" aria-label="Remove ${esc(name)}">×</button>` : ''}</div>`;
  return head + err + `
  <section class="card stack">
    <div class="row" style="justify-content:space-between"><h2>Shopping list</h2><span class="num muted" style="font-size:.85rem">${got} / ${total} in the basket</span></div>
    <div class="basket-bar"><span style="width:${total ? got / total * 100 : 0}%"></span></div>
    ${storePicker(store, true)}
    <form class="additem" id="addItemForm"><input type="text" id="extraName" placeholder="Add something else, e.g. coffee" aria-label="Add an item" autocomplete="off"><button class="sendbtn" type="submit" aria-label="Add item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></form>
    ${S.plan.budget_note ? `<p class="muted" style="font-size:.85rem"><span class="tag est">Estimated</span> ${esc(S.plan.budget_note)}</p>` : ''}
    <div class="groc">
      ${extra.length ? `<div class="grp"><h3>My items</h3>${extra.map(x => item('x-' + x.id, x.name, '', '', x.done, true)).join('')}</div>` : ''}
      ${S.plan.grocery.map((g, gi) => `<div class="grp"><h3>${esc(g.group)}</h3>${(g.items || []).map((it, ii) => item(gi + '-' + ii, it.name, it.qty, it.note, ch[gi + '-' + ii], false)).join('')}</div>`).join('')}
    </div>
    <p class="muted" style="font-size:.8rem">Products and prices are estimated for ${store ? esc(store) : 'your supermarket'}, not checked live.</p>
  </section>
  ${S.plan.prep?.length ? `<section class="card"><h2>Prep schedule</h2><div class="timeline">${S.plan.prep.map(p => `<div class="tl"><div><h3>${esc(p.when)}</h3><span class="num muted" style="font-size:.8rem">${esc(p.minutes || '')}</span></div><div><ul>${(p.tasks || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <dl class="kv" style="grid-template-columns:auto 1fr;margin-top:8px">${p.fridge ? `<dt>Fridge</dt><dd style="text-align:left;font-family:var(--body);font-size:.88rem">${esc(p.fridge)}</dd>` : ''}${p.freeze ? `<dt>Freeze</dt><dd style="text-align:left;font-family:var(--body);font-size:.88rem">${esc(p.freeze)}</dd>` : ''}${p.fresh ? `<dt>Fresh</dt><dd style="text-align:left;font-family:var(--body);font-size:.88rem">${esc(p.fresh)}</dd>` : ''}</dl></div></div>`).join('')}</div></section>` : ''}`;
}

// "Shall I create your shopping list?" card, used here and under the week plan.
function askForList(){
  return `<section class="card stack ask-list">
    <div class="asker"><span class="ai-avatar" aria-hidden="true">${STAR}</span><div class="bubble">Your week is planned. Shall I create your shopping list?</div></div>
    <div><div class="label" style="margin-bottom:8px">Where are you shopping?</div>${storePicker(S.shopStore || S.plan?.store || storeOptions()[0], false)}</div>
    <button class="btn primary big-btn" data-act="genshop">Create my shopping list</button>
  </section>`;
}

// Supermarket chips plus "Other". With rebuild, picking a different one offers to redo the list.
function storePicker(current, rebuild){
  const opts = storeOptions();
  const pick = S.shopStore || current;
  const changed = rebuild && S.shopStore && S.shopStore !== current;
  return `<div class="stores" role="group" aria-label="Supermarket">
      ${opts.map(s => `<button class="chip" data-act="store" data-s="${esc(s)}" aria-pressed="${s === pick}">${esc(s)}</button>`).join('')}
      <button class="chip" data-act="storeother" aria-pressed="${!!S.storeOther}">Other…</button>
    </div>
    ${S.storeOther ? `<form class="additem" id="storeForm" style="margin-top:8px"><input type="text" id="storeName" placeholder="Supermarket name" aria-label="Supermarket name" autocomplete="off"><button class="btn small" type="submit">Use</button></form>` : ''}
    ${changed ? `<div class="notice accent row" style="justify-content:space-between;margin-top:8px"><span>Rebuild the list for <b>${esc(S.shopStore)}</b>? Your ticks are cleared; your own items stay.</span><button class="btn primary small" data-act="genshop">Rebuild list</button></div>` : ''}`;
}
