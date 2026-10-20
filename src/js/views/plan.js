// Week plan: a slim day picker that keeps the chosen day in view, the day's
// meals as one-line rows, and the details (portion, swap, recipe) in a sheet.
function vPlan(){
  const head = `<div class="head"><div><div class="label">${S.plan ? `Week of ${fromKey(S.plan.weekOf).toLocaleDateString(undefined,{day:'numeric',month:'long'})}` : 'Seven days, prepped ahead'}</div><h1>Week plan</h1></div>
    <button class="btn ${S.plan ? 'small' : 'primary'}" data-act="genplan" ${S.busy.plan ? 'disabled' : ''}>${S.busy.plan ? `<span class="spinner"></span> ${esc(S.busy.plan)}` : S.plan ? '↻ New week' : 'Plan my week'}</button></div>`;
  const notes = `${statusBanner()}${S.err.plan ? `<div class="notice warn">${esc(S.err.plan)}</div>` : ''}${!S.profile.onboarded && !S.plan ? `<div class="notice accent">Your plan is built from your consultation. Finish it first for a plan that fits your tastes, schedule and supermarket. You can still plan now with what's known.</div>` : ''}`;
  if (!S.plan?.days) return head + notes + `<section class="card empty"><div class="blob" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg></div><h2>No plan yet</h2><p>Forkcast writes seven days of meals around the food you like, your targets and how often you want to cook, then turns them into one shopping list.</p></section>`;
  const di = Math.min(S.planDay, S.plan.days.length - 1), day = S.plan.days[di], t = targets();
  const tot = day.meals.reduce((a, m) => ({kcal:a.kcal+r0(m.kcal), p:a.p+r0(m.p), c:a.c+r0(m.c), f:a.f+r0(m.f)}), {kcal:0,p:0,c:0,f:0});
  const mon = fromKey(S.plan.weekOf), todayIdx = (new Date().getDay() + 6) % 7, thisWeek = S.plan.weekOf === mondayOf();
  const chevron = '<svg class="tip-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
  return head + notes + `
  ${S.plan.grocery?.length ? '' : `<button class="tipcard" data-act="nav" data-v="shop"><span class="tip-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.3 11.2a1 1 0 0 1-1 .8H7.3a1 1 0 0 1-1-.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg></span><span class="tip-txt"><b>Create your shopping list</b><span>One list for the whole week, for your supermarket.</span></span>${chevron}</button>`}
  <div class="daypick" role="tablist" aria-label="Day">${S.plan.days.map((d, i) => { const date = new Date(mon); date.setDate(date.getDate() + i); return `<button class="dp" role="tab" data-act="day" data-i="${i}" aria-selected="${i === di}"><span>${esc(d.day)}</span><b>${date.getDate()}</b>${thisWeek && i === todayIdx ? '<i aria-label="today"></i>' : ''}</button>`; }).join('')}</div>
  <section class="card plan-day">
    <div class="day-sum"><b class="num">${tot.kcal.toLocaleString()} kcal</b>${pfc(tot)}</div>
    ${day.meals.map((m, j) => `<button class="prow" data-act="planmeal" data-i="${di}" data-j="${j}">
      ${SLOTS.includes(m.slot) ? mealIcon(m.slot) : ''}
      <span class="prow-txt"><span class="label">${esc(m.slot)} · ${m.prep === 'fresh' ? 'cook fresh' : 'prepped'}</span><b>${esc(m.name)}</b></span>
      <span class="num">${r0(m.kcal)}</span>${chevron}
    </button>`).join('')}
  </section>
  ${S.plan.notes ? `<details class="plan-notes"><summary>How this week works</summary><p>${esc(S.plan.notes)}</p></details>` : ''}
  ${S.planSheet ? planMealSheet() : ''}`;
}

function planMealSheet(){
  const { i, j } = S.planSheet, m = S.plan.days[i]?.meals[j]; if (!m) return '';
  const key = i + '-' + j, rec = S.plan.recipes?.[key], enter = S.planSheet.enter ? ' enter' : '';
  return `<div class="scrim${enter}" data-act="closeplan"></div>
  <div class="sheet${enter}" role="dialog" aria-modal="true" aria-label="${esc(m.name)}">
    <div class="grip" aria-hidden="true"></div>
    <div class="sheet-head">${SLOTS.includes(m.slot) ? mealIcon(m.slot) : ''}<div style="min-width:0"><div class="label">${esc(S.plan.days[i].day)} · ${esc(m.slot)}</div><h2>${esc(m.name)}</h2></div><button class="x close" data-act="closeplan" aria-label="Close">×</button></div>
    ${dishPhoto(key, m)}
    <div class="review-total"><span class="big num">${r0(m.kcal)}</span><span class="muted">kcal</span><span class="pfc" style="margin-left:auto">${pfc(m)}</span></div>
    <dl class="facts"><dt>Portion</dt><dd>${esc(m.portion)}</dd>${m.swap ? `<dt>Swap</dt><dd>${esc(m.swap)}</dd>` : ''}</dl>
    ${rec ? `<details class="plan-notes" open><summary>Recipe${rec.time ? ' · ' + esc(rec.time) : ''}</summary><div class="recipe-body"><div class="label">Ingredients</div><ul>${(rec.ingredients || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul><div class="label">Method</div><ol>${(rec.steps || []).map(x => `<li>${esc(x)}</li>`).join('')}</ol>${rec.storage ? `<p class="muted">${esc(rec.storage)}</p>` : ''}</div></details>`
      : `<button class="btn" data-act="recipe" data-k="${key}" data-i="${i}" data-j="${j}" ${S.busy.recipe === key ? 'disabled' : ''}>${S.busy.recipe === key ? '<span class="spinner"></span> Writing the recipe…' : 'Show recipe'}</button>`}
    <div class="sheet-actions"><button class="btn primary big-btn" data-act="logmeal" data-i="${i}" data-j="${j}">I ate this</button></div>
  </div>`;
}

function dishPhoto(key, m){
  const p = S.plan.photos?.[key];
  if (!p) return '';
  return `<figure class="dish"><img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy"><figcaption><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.by)} · Pexels</a></figcaption></figure>`;
}

// Keep the chosen day visible in the day picker after every redraw.
function keepDayInView(){
  const el = document.querySelector('.dp[aria-selected="true"]'); if (!el) return;
  const row = el.parentElement;
  row.scrollLeft = el.offsetLeft - row.offsetLeft - (row.clientWidth - el.offsetWidth) / 2;
}
