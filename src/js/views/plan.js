// Week plan: switch between this week and next, a day picker that keeps the
// chosen day in view, the day's meals with photos and a swap button, then
// shopping and guided prep for that week. Details live in sheets.
const CHEV = '<svg class="tip-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
const SWAP_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4 3 8l4 4"/><path d="M3 8h13a4 4 0 0 1 4 4"/><path d="m17 20 4-4-4-4"/><path d="M21 16H8a4 4 0 0 1-4-4"/></svg>';
const PREP_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z"/><path d="M2 11h2M20 11h2M9 7c0-1.5 1-2 1-3.5M14 7c0-1.5 1-2 1-3.5"/></svg>';

function weekRange(weekOf){
  const mon = fromKey(weekOf), sun = new Date(mon); sun.setDate(sun.getDate() + 6);
  const f = d => d.toLocaleDateString(undefined, { day:'numeric', month:'short' });
  return `${f(mon)} – ${f(sun)}`;
}

function vPlan(){
  const next = S.planWeek === 1, P = curPlan(), weekOf = next ? nextMonday() : mondayOf();
  const switcher = `<div class="weeksw" role="group" aria-label="Week">
    <button class="wk-arrow" data-act="planweek" data-v="0" aria-label="This week" ${next ? '' : 'disabled'}>‹</button>
    <div class="weeksw-t"><b>${next ? 'Next week' : 'This week'}</b><span class="muted">${weekRange(weekOf)}</span></div>
    <button class="wk-arrow" data-act="planweek" data-v="1" aria-label="Next week" ${next ? 'disabled' : ''}>›</button></div>`;
  const head = `<div class="head"><div><div class="label">Seven days, prepped ahead</div><h1>Week plan</h1></div></div>`;
  const notes = `${statusBanner()}${S.err.plan ? `<div class="notice warn">${esc(S.err.plan)}</div>` : ''}`;
  if (S.busy.plan) return head + switcher + notes + `<section class="card empty"><div class="blob pulse-blob" aria-hidden="true"><span class="mascot">${MASCOT}</span></div><h2>${esc(S.busy.plan)}</h2><p>Picking meals around your targets, tastes and how often you like to cook.</p></section>`;
  if (!P) return head + switcher + notes + emptyWeek(next);

  const di = Math.min(S.planDay, P.days.length - 1), day = P.days[di];
  const tot = day.meals.reduce((a, m) => ({kcal:a.kcal+r0(m.kcal), p:a.p+r0(m.p), c:a.c+r0(m.c), f:a.f+r0(m.f)}), {kcal:0,p:0,c:0,f:0});
  const mon = fromKey(P.weekOf), todayIdx = (new Date().getDay() + 6) % 7;
  return head + switcher + notes + `
  <div class="daypick" role="tablist" aria-label="Day">${P.days.map((d, i) => { const date = new Date(mon); date.setDate(date.getDate() + i); return `<button class="dp" role="tab" data-act="day" data-i="${i}" aria-selected="${i === di}"><span>${esc(d.day)}</span><b>${date.getDate()}</b>${!next && i === todayIdx ? '<i aria-label="today"></i>' : ''}</button>`; }).join('')}</div>
  <section class="card plan-day">
    <div class="day-sum"><b class="num">${tot.kcal.toLocaleString()} kcal</b>${pfc(tot)}</div>
    ${day.meals.map((m, j) => { const k = di + '-' + j, busy = S.busy.swap === k; return `<div class="prow${busy ? ' swapping' : ''}">
      <button class="prow-main" data-act="planmeal" data-i="${di}" data-j="${j}">
        ${dishThumb(P, k, m)}
        <span class="prow-txt"><span class="label">${esc(m.slot)} · ${m.prep === 'fresh' ? 'cook fresh' : 'prepped'}</span><b>${busy ? 'Finding a swap…' : esc(m.name)}</b></span>
        <span class="num">${r0(m.kcal)}</span>
      </button>
      <button class="swap-btn" data-act="swapmeal" data-i="${di}" data-j="${j}" aria-label="Swap ${esc(m.name)}" ${S.busy.swap ? 'disabled' : ''}>${busy ? '<span class="spinner"></span>' : SWAP_IC}</button>
    </div>`; }).join('')}
  </section>
  ${weekTools(P)}
  ${!next && !S.planNext?.days ? `<button class="tipcard" data-act="planweek" data-v="1"><span class="tip-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v4M10 15h4"/></svg></span><span class="tip-txt"><b>Plan next week</b><span>Get it ready now. This week stays as it is.</span></span>${CHEV}</button>` : ''}
  ${S.planSheet ? planMealSheet() : ''}
  ${S.shopOpen ? shopSheet() : ''}
  ${S.prep ? prepMode() : ''}`;
}

function emptyWeek(next){
  const src = next ? thisWeekPlan() : S.plan?.days ? S.plan : null;
  return `<section class="card empty"><div class="blob" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg></div>
    <h2>${next ? 'Next week isn\'t planned yet' : 'No plan for this week'}</h2>
    <p>${next ? 'Plan it now and shop at the weekend. This week\'s plan stays as it is.' : 'Seven days of meals around the food you like, your targets and how often you want to cook, plus one shopping list.'}</p>
    ${!S.profile.onboarded ? '<p class="muted" style="font-size:.86rem">Finish your consultation first for a plan that fits you better.</p>' : ''}
    <button class="btn primary big-btn" data-act="genplan">${next ? 'Plan next week' : 'Plan this week'}</button>
    ${src ? `<button class="btn ghost" data-act="repeatweek">Repeat ${next ? 'this' : 'last'} week's meals</button>` : ''}
  </section>`;
}

// Shopping list and guided prep for the week shown.
function weekTools(P){
  const rows = shopRows(P), left = rows.filter(r => !r.done).length, prep = P.prep?.[0];
  const steps = (P.prep || []).reduce((n, p) => n + (p.tasks || []).length, 0);
  return `<div class="duo week-tools">
    <button class="tile mini tool-tile" data-act="shopopen"><span class="tool-ic" aria-hidden="true">${CART}</span><b>Shopping list</b><span class="muted">${S.busy.shop ? 'Writing it…' : !P.grocery?.length ? 'Make it for your store' : P.listStale ? 'Meals changed · update' : left ? `${left} to buy` : 'All in the basket'}</span></button>
    <button class="tile mini tool-tile" data-act="prepstart" ${P.grocery?.length ? '' : 'aria-describedby="prepNeedsList"'}><span class="tool-ic prep" aria-hidden="true">${PREP_IC}</span><b>Prep together</b><span class="muted" id="prepNeedsList">${prep ? `${steps} steps${prep.minutes ? ' · ' + esc(prep.minutes) : ''}` : 'Comes with the list'}</span></button>
  </div>`;
}

function planMealSheet(){
  const P = curPlan(); if (!P) return '';
  const { i, j } = S.planSheet, m = P.days[i]?.meals[j]; if (!m) return '';
  const key = i + '-' + j, rec = P.recipes?.[key], enter = S.planSheet.enter ? ' enter' : '', busy = S.busy.swap === key;
  return `<div class="scrim${enter}" data-act="closeplan"></div>
  <div class="sheet${enter}" role="dialog" aria-modal="true" aria-label="${esc(m.name)}">
    <div class="grip" aria-hidden="true"></div>
    <div class="sheet-head"><div style="min-width:0;flex:1"><div class="label">${esc(P.days[i].day)} · ${esc(m.slot)}</div><h2>${esc(m.name)}</h2></div><button class="x close" data-act="closeplan" aria-label="Close">×</button></div>
    ${dishPhoto(P, key, m)}
    <div class="review-total"><span class="big num">${r0(m.kcal)}</span><span class="muted">kcal</span><span class="pfc" style="margin-left:auto">${pfc(m)}</span></div>
    <dl class="facts"><dt>Portion</dt><dd>${esc(m.portion)}</dd>${m.swap ? `<dt>Swap</dt><dd>${esc(m.swap)}</dd>` : ''}</dl>
    ${rec ? `<details class="plan-notes" open><summary>Recipe${rec.time ? ' · ' + esc(rec.time) : ''}</summary><div class="recipe-body"><div class="label">Ingredients</div><ul>${(rec.ingredients || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul><div class="label">Method</div><ol>${(rec.steps || []).map(x => `<li>${esc(x)}</li>`).join('')}</ol>${rec.storage ? `<p class="muted">${esc(rec.storage)}</p>` : ''}</div></details>` : ''}
    <div class="sheet-actions meal-actions">
      <button class="swap-btn big" data-act="swapmeal" data-i="${i}" data-j="${j}" aria-label="Swap for another meal" title="Swap for another meal" ${S.busy.swap ? 'disabled' : ''}>${busy ? '<span class="spinner"></span>' : SWAP_IC}</button>
      ${rec ? (S.planWeek === 1 ? '' : `<button class="btn primary big-btn" data-act="logmeal" data-i="${i}" data-j="${j}">I ate this</button>`)
        : `<button class="btn primary big-btn" data-act="recipe" data-k="${key}" data-i="${i}" data-j="${j}" ${S.busy.recipe === key ? 'disabled' : ''}>${S.busy.recipe === key ? '<span class="spinner"></span> Writing the recipe…' : 'Show recipe'}</button>`}
    </div>
    ${!rec && S.planWeek !== 1 ? `<button class="btn ghost" data-act="logmeal" data-i="${i}" data-j="${j}">I ate this</button>` : ''}
  </div>`;
}

// Photo of the dish, or the meal's own colour and icon while there is none.
const mealGlyph = (m, w) => SLOTS.includes(m.slot) ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MEAL_ICON[m.slot]}</svg>` : '';
function dishThumb(P, key, m){
  const p = mealPic(P, m);
  if (p?.thumb) return `<span class="pthumb"><img src="${esc(p.thumb)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('ph');this.remove()"></span>`;
  return `<span class="pthumb ph${p === undefined && navigator.onLine ? ' loading' : ''}" style="--c:${MEAL_COLOR[m.slot] || 'var(--accent)'}">${mealGlyph(m, 2)}</span>`;
}
function dishPhoto(P, key, m){
  const p = mealPic(P, m);
  if (!p?.src) return `<figure class="dish ph" style="--c:${MEAL_COLOR[m.slot] || 'var(--accent)'}">${mealGlyph(m, 1.6)}</figure>`;
  return `<figure class="dish"><img src="${esc(p.src)}" alt="${esc(p.page)}, a dish like this one" loading="lazy"><figcaption><a href="${esc(p.url || '')}" target="_blank" rel="noopener">${esc(p.page)} · ${esc(p.by || 'Wikimedia')}${p.lic ? ' · ' + esc(p.lic) : ''}</a></figcaption></figure>`;
}

// Keep the chosen day visible in the day picker after every redraw.
function keepDayInView(){
  const el = document.querySelector('.dp[aria-selected="true"]'); if (!el) return;
  const row = el.parentElement;
  row.scrollLeft = el.offsetLeft - row.offsetLeft - (row.clientWidth - el.offsetWidth) / 2;
}
