// Week plan view
function vPlan(){
  const head = `<div class="head"><div><div class="label">${S.plan ? `Week of ${fromKey(S.plan.weekOf).toLocaleDateString(undefined,{day:'numeric',month:'long'})}` : 'Seven days, prepped ahead'}</div><h1>Week plan</h1></div>
    <button class="btn ${S.plan ? 'small' : 'primary'}" data-act="genplan" ${S.busy.plan ? 'disabled' : ''}>${S.busy.plan ? `<span class="spinner"></span> ${esc(S.busy.plan)}` : S.plan ? '↻ New week' : 'Plan my week'}</button></div>`;
  const notes = `${statusBanner()}${S.err.plan ? `<div class="notice warn">${esc(S.err.plan)}</div>` : ''}${!S.profile.onboarded && !S.plan ? `<div class="notice accent">Your plan is built from your consultation. Finish it first for a plan that fits your tastes, schedule and supermarket. You can still plan now with what's known.</div>` : ''}`;
  if (!S.plan?.days) return head + notes + `<section class="card empty"><div class="blob" aria-hidden="true">🥗</div><h2>No plan yet</h2><p>Forkcast writes seven days of meals around the food you like, your targets and how often you want to cook, then turns them into one shopping list and a prep schedule.</p></section>`;
  const di = Math.min(S.planDay, S.plan.days.length - 1), day = S.plan.days[di], t = targets();
  const tot = day.meals.reduce((a, m) => ({kcal:a.kcal+r0(m.kcal), p:a.p+r0(m.p), c:a.c+r0(m.c), f:a.f+r0(m.f)}), {kcal:0,p:0,c:0,f:0});
  return head + notes + `
  ${S.plan.grocery?.length ? '' : askForList()}
  ${S.plan.notes ? `<details class="plan-notes"><summary>How this week works</summary><p>${esc(S.plan.notes)}</p></details>` : ''}
  <div class="days" role="group" aria-label="Day">${S.plan.days.map((d, i) => { const k = d.meals.reduce((a, m) => a + r0(m.kcal), 0); return `<button class="day-btn" data-act="day" data-i="${i}" aria-pressed="${i === di}"><b>${esc(d.day)}</b><span class="num" style="font-size:.74rem;opacity:.75">${k} kcal</span></button>`; }).join('')}</div>
  <section class="card">
    ${day.meals.map((m, j) => { const key = di + '-' + j, rec = S.plan.recipes?.[key], open = S.openRecipe === key; return `
      <div class="meal ${S.plan.photos?.[key] ? 'with-photo' : ''}">
        ${dishPhoto(key, m)}
        <div class="meal-body">
          <div class="meal-tags"><span class="label">${esc(m.slot)}</span><span class="prep-pill ${m.prep === 'fresh' ? 'fresh' : ''}">${m.prep === 'fresh' ? 'Cook fresh' : 'Prepped'}</span></div>
          <div class="title">${esc(m.name)}</div><div style="margin-top:4px"><span class="num" style="font-size:.85rem">${r0(m.kcal)} kcal</span> &nbsp;${pfc(m)}</div>
        </div>
        <div class="acts"><button class="btn small" data-act="recipe" data-k="${key}" data-i="${di}" data-j="${j}">${S.busy.recipe === key ? '<span class="spinner"></span>' : open ? 'Hide' : 'Details'}</button><button class="btn small" data-act="logmeal" data-i="${di}" data-j="${j}">I ate this</button></div>
        ${open ? `<div class="recipe"><div class="recipe-top"><div><div class="label">Portion</div><p>${esc(m.portion)}</p></div>${m.swap ? `<div><div class="label">Swap</div><p>${esc(m.swap)}</p></div>` : ''}</div>${rec ? `<div><div class="label">Ingredients · ${esc(rec.serves || '')}</div><ul>${(rec.ingredients || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div><div><div class="label">Method · ${esc(rec.time || '')}</div><ol>${(rec.steps || []).map(x => `<li>${esc(x)}</li>`).join('')}</ol>${rec.storage ? `<p class="muted" style="font-size:.88rem;margin-top:8px">${esc(rec.storage)}</p>` : ''}</div>` : `<div class="muted" style="font-size:.9rem"><span class="spinner"></span> Loading the recipe…</div>`}</div>` : ''}
      </div>`; }).join('')}
    <div class="totals"><span><span class="label">Day total</span> <span class="num">${tot.kcal} kcal</span></span><span class="num" style="color:var(--pink)">P ${tot.p} g</span><span class="num" style="color:var(--amber)">C ${tot.c} g</span><span class="num" style="color:var(--blue)">F ${tot.f} g</span></div>
    ${Object.values(S.plan.photos || {}).some(Boolean) ? `<p class="photo-credit">Photos from <a href="https://www.pexels.com" target="_blank" rel="noopener">Pexels</a>. They show a similar dish, not your exact recipe.</p>` : ''}
  </section>`;
}

function dishPhoto(key, m){
  const p = S.plan.photos?.[key];
  if (!p) return '';
  return `<figure class="dish"><img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy"><figcaption><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.by)} · Pexels</a></figcaption></figure>`;
}
