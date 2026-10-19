// Grocery list and prep schedule view
function vShop(){
  const head = `<div class="head"><div><div class="label">${S.profile.data.shopping?.supermarkets ? esc(S.profile.data.shopping.supermarkets) : 'One trip, one prep session'}</div><h1>Shop & prep</h1></div>${S.plan?.grocery ? `<button class="btn" data-act="clearchecks">Untick all</button>` : ''}</div>`;
  if (!S.plan?.grocery?.length) return head + `<section class="card empty"><div class="blob" aria-hidden="true">🛒</div><h2>No list yet</h2><p>Your shopping list and prep schedule come with your week plan, consolidated so you buy only what the week needs.</p><button class="btn primary" data-act="nav" data-v="plan">Go to week plan</button></section>`;
  const ch = S.plan.checked || {};
  const total = S.plan.grocery.reduce((a, g) => a + (g.items || []).length, 0), got = Object.values(ch).filter(Boolean).length;
  return head + `
  <section class="card stack">
    <div class="row" style="justify-content:space-between"><h2>Grocery list</h2><span class="num muted" style="font-size:.85rem">${got} / ${total} in the basket</span></div>
    ${S.plan.budget_note ? `<p class="muted" style="font-size:.88rem"><span class="tag est">Estimated</span> ${esc(S.plan.budget_note)}</p>` : ''}
    <div class="groc">${S.plan.grocery.map((g, gi) => `<div class="grp"><h3>${esc(g.group)}</h3>${(g.items || []).map((it, ii) => { const k = gi + '-' + ii; return `<label class="gi ${ch[k] ? 'done' : ''}"><input type="checkbox" data-act="check" data-k="${k}" ${ch[k] ? 'checked' : ''}><span><span class="gname">${esc(it.name)}</span>${it.note ? `<br><span class="muted" style="font-size:.8rem">${esc(it.note)}</span>` : ''}</span><span class="gq">${esc(it.qty)}</span></label>`; }).join('')}</div>`).join('')}</div>
    <p class="muted" style="font-size:.8rem">Availability and prices are estimated for your country, not checked live against your supermarket.</p>
  </section>
  ${S.plan.prep?.length ? `<section class="card"><h2>Prep schedule</h2><div class="timeline">${S.plan.prep.map(p => `<div class="tl"><div><h3>${esc(p.when)}</h3><span class="num muted" style="font-size:.8rem">${esc(p.minutes || '')}</span></div><div><ul>${(p.tasks || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <dl class="kv" style="grid-template-columns:auto 1fr;margin-top:8px">${p.fridge ? `<dt>Fridge</dt><dd style="text-align:left;font-family:var(--body);font-size:.88rem">${esc(p.fridge)}</dd>` : ''}${p.freeze ? `<dt>Freeze</dt><dd style="text-align:left;font-family:var(--body);font-size:.88rem">${esc(p.freeze)}</dd>` : ''}${p.fresh ? `<dt>Fresh</dt><dd style="text-align:left;font-family:var(--body);font-size:.88rem">${esc(p.fresh)}</dd>` : ''}</dl></div></div>`).join('')}</div></section>` : ''}`;
}
