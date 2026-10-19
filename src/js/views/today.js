// Today: calorie ring, macros, focus tips, food logging, streak
function vToday(){
  const t = targets(), log = S.logs[dkey()] || {items:[]}, eaten = sumItems(log.items);
  const kcalT = t?.kcal || 0, left = kcalT - eaten.kcal, pct = kcalT ? Math.min(eaten.kcal / kcalT, 1) : 0;
  const C = 2 * Math.PI * 78;
  const now = new Date();
  const overdue = S.profile.onboarded && (() => { const last = S.progress.checkins.slice(-1)[0]?.date || S.profile.onboardedAt; return last && daysBetween(last, dkey()) >= 7; })();
  const bar = (label, val, tgt, color) => `<div class="macro"><div class="top"><b>${label}</b><span class="num">${r0(val)}${tgt ? ` <span class="muted">/ ${tgt} g</span>` : ' g'}</span></div><div class="bar"><span style="width:${tgt ? Math.min(val/tgt*100,100) : 0}%;background:${color}"></span></div></div>`;
  return `
  <div class="head"><div><div class="label">${now.toLocaleDateString(undefined,{weekday:'long', day:'numeric', month:'long'})}</div><h1>${eaten.kcal ? 'Today\'s fuel' : 'What\'s on the plate today?'}</h1></div>
  ${streakPill()}</div>
  ${statusBanner()}
  ${!S.profile.onboarded ? `<div class="notice accent row" style="justify-content:space-between"><span><b>Start with a first consultation.</b> Your dietitian will ask about your body, health, routine and tastes before setting any targets.</span><button class="btn primary small" data-act="nav" data-v="coach">${S.chat.turns.length ? 'Continue consultation' : 'Begin'}</button></div>` : ''}
  ${overdue ? `<div class="notice accent row" style="justify-content:space-between"><span><b>It's check-in week.</b> A two-minute follow-up so your plan keeps fitting your life.</span><button class="btn primary small" data-act="nav" data-v="progress">Check in</button></div>` : ''}
    <section class="card hero fuel" aria-label="Calories and macros">
      <div class="ring">
        <svg viewBox="0 0 176 176"><circle cx="88" cy="88" r="78" fill="none" stroke="var(--hero-track)" stroke-width="16"/>
        <circle cx="88" cy="88" r="78" fill="none" stroke="${left < 0 ? 'var(--amber)' : 'var(--accent)'}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" style="transition:stroke-dashoffset .6s ease"/></svg>
        <div class="center">${t ? `<span class="big">${Math.abs(left).toLocaleString()}</span><span class="label">${left >= 0 ? 'kcal left' : 'kcal over'}</span><span class="muted num" style="font-size:.8rem;margin-top:6px">${eaten.kcal} / ${kcalT}</span>` : `<span class="big">${eaten.kcal}</span><span class="label">kcal eaten</span>`}</div>
      </div>
      <div class="macros">
        ${bar('Protein', eaten.protein, t?.protein, 'var(--pink)')}
        ${bar('Carbs', eaten.carbs, t?.carbs, 'var(--amber)')}
        ${bar('Fat', eaten.fat, t?.fat, 'var(--blue)')}
        ${bar('Fiber', eaten.fiber, t?.fiber, 'var(--accent)')}
        <p class="muted" style="font-size:.8rem">${t ? `<span class="tag est">Estimated</span> ${S.profile.targets ? 'Targets set with your dietitian.' : 'Mifflin-St Jeor estimate from your profile.'}` : 'Targets appear once your dietitian knows your age, height, weight and goal.'}</p>
      </div>
    </section>
  ${mealsSection(t)}
  ${focusCard()}
  ${S.sheet ? logSheet() : ''}
  ${S.toast ? `<div class="toast" role="status">${esc(S.toast)}</div>` : ''}`;
}

// Meal icons: sunrise, sun, apple, moon
const MEAL_ICON = {
  Breakfast:'<path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 6v3M5.6 10.6l1.6 1.6M18.4 10.6l-1.6 1.6"/>',
  Lunch:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  Snack:'<path d="M12 7c-1.5-2-5-2.2-6.2.6C4.6 10.4 6.3 18 9.5 18c1 0 1.6-.6 2.5-.6s1.5.6 2.5.6c3.2 0 4.9-7.6 3.7-10.4C17 4.8 13.5 5 12 7z"/><path d="M12 7c0-1.5.6-3 2-4"/>',
  Dinner:'<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>'
};
const MEAL_SHARE = { Breakfast:.25, Lunch:.35, Snack:.10, Dinner:.30 };
const MEAL_COLOR = { Breakfast:'var(--amber)', Lunch:'var(--accent)', Snack:'var(--pink)', Dinner:'var(--violet)' };
const mealIcon = s => `<span class="meal-ic" style="--c:${MEAL_COLOR[s]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${MEAL_ICON[s]}</svg></span>`;

function mealsSection(t){
  const items = S.logs[dkey()]?.items || [];
  return `<section class="card meals" aria-label="Meals">
    <div class="row" style="justify-content:space-between"><h2>Meals</h2><span class="muted" style="font-size:.85rem">Tap + to add food</span></div>
    ${SLOTS.map(s => {
      const its = items.filter(i => i.slot === s), k = sumItems(its).kcal, open = S.openMeal === s;
      const sub = its.length ? `${k} kcal · ${its.length} item${its.length > 1 ? 's' : ''}` : t ? `Suggested ~${Math.round(t.kcal * MEAL_SHARE[s] / 10) * 10} kcal` : 'Nothing yet';
      return `<div class="meal-row ${its.length ? 'has' : ''}">
        <button class="meal-main" data-act="togglemeal" data-s="${s}" ${its.length ? `aria-expanded="${open}"` : 'disabled'}>
          ${mealIcon(s)}<span class="meal-txt"><b>${s}${its.length ? `<svg class="chev ${open ? 'up' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>` : ''}</b><span>${sub}</span></span>
        </button>
        <button class="addbtn" data-act="openlog" data-s="${s}" aria-label="Add food to ${s}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
        ${open && its.length ? `<div class="meal-list">
          <div class="meal-macros">${pfc(sumItems(its))}<span class="muted">Tap × to remove</span></div>
          ${its.map(i => `<div class="mrow"><span class="mname">${esc(i.name)}${i.amount ? ` <span class="muted">· ${esc(i.amount)}</span>` : ''}</span><span class="num">${r0(i.kcal)}</span><button class="x small-x" data-act="del" data-id="${i.id}" aria-label="Remove ${esc(i.name)}">×</button></div>`).join('')}
        </div>` : ''}
      </div>`;
    }).join('')}
  </section>`;
}

const EXAMPLES = {
  Breakfast:['2 eggs and toast','Greek yogurt with fruit','Cappuccino'],
  Lunch:['Chicken salad','Pasta with tomato sauce','Sandwich and an apple'],
  Snack:['A banana','Handful of almonds','Protein bar'],
  Dinner:['Salmon, rice and veggies','2 slices of pizza','Lentil soup']
};

function logSheet(){
  const slot = S.sheet.slot, r = S.logResult, busy = S.busy.log;
  let body;
  if (busy) {
    body = `<div class="sheet-wait"><div class="pulse">${mealIcon(slot)}</div><b>Counting your ${slot.toLowerCase()}…</b><span class="muted">This takes a few seconds.</span></div>`;
  } else if (r?.review) {
    const tot = sumItems(r.review);
    body = `<div class="review">
      <div class="review-total"><span class="label">Total</span><span class="big num">${tot.kcal}</span><span class="muted">kcal</span><span class="pfc" style="margin-left:auto">${pfc(tot)}</span></div>
      ${r.review.map((i, n) => `<div class="mi"><div><div class="name">${esc(i.name)}</div><div class="meta">${esc(i.amount || '')}${i.amount ? ' · ' : ''}${pfc(i)}</div></div><span class="num">${r0(i.kcal)}</span><button class="x" data-act="dropitem" data-n="${n}" aria-label="Remove ${esc(i.name)}">×</button></div>`).join('')}
      ${r.feedback ? `<div class="notice">${esc(r.feedback)}</div>` : ''}
      <p class="muted" style="font-size:.8rem"><span class="tag est">Estimated</span> Numbers are close estimates, not exact.</p>
    </div>
    <div class="sheet-actions"><button class="btn primary big-btn" data-act="confirmlog" ${r.review.length ? '' : 'disabled'}>Add to ${slot}</button><button class="btn ghost" data-act="editlog">Change description</button></div>`;
  } else if (r?.clarify) {
    body = `<div class="stack"><div class="bubble">${esc(r.clarify)}</div>
      <div class="opts">${r.options.map(o => `<button class="opt" data-act="clarify" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      ${r.items.length ? `<button class="btn ghost" data-act="bestguess">Skip, use a typical portion</button>` : ''}</div>`;
  } else if (S.sheet.manual) {
    body = `<div class="stack">
      <div class="field"><label for="mName">Food</label><input type="text" id="mName" placeholder="e.g. Protein bar"></div>
      <div class="fields"><div class="field"><label for="mK">Calories (kcal)</label><input type="number" id="mK" inputmode="numeric"></div>
      <div class="field"><label for="mP">Protein (g)</label><input type="number" id="mP" inputmode="numeric"></div>
      <div class="field"><label for="mC">Carbs (g)</label><input type="number" id="mC" inputmode="numeric"></div>
      <div class="field"><label for="mF">Fat (g)</label><input type="number" id="mF" inputmode="numeric"></div></div>
    </div>
    <div class="sheet-actions"><button class="btn primary big-btn" data-act="manual">Add to ${slot}</button><button class="btn ghost" data-act="manualmode">Back to describing</button></div>`;
  } else {
    body = `<div class="stack">
      ${S.canImages ? `<label class="snap" for="photo">${S.logPhoto ? `<img alt="Meal photo" src="${URL.createObjectURL(S.logPhoto)}"><span><b>Photo added</b><span class="muted">Add a few words below if you like</span></span><button class="x" data-act="nophoto" aria-label="Remove photo">×</button>` : `<span class="snap-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.5"/></svg></span><span><b>Take a photo</b><span class="muted">We'll recognise the food for you</span></span>`}</label><input class="hidden-file" type="file" id="photo" accept="image/*">
      <div class="or"><span>or describe it</span></div>` : ''}
      <textarea id="logText" class="describe" rows="3" placeholder="Type what you ate, in your own words" aria-label="What you ate"></textarea>
      <div class="examples">${EXAMPLES[slot].map(e => `<button class="chip" data-act="example" data-t="${esc(e)}">${esc(e)}</button>`).join('')}</div>
    </div>
    <div class="sheet-actions"><button class="btn primary big-btn" data-act="log">Count calories</button><button class="btn ghost" data-act="manualmode">I know the calories</button></div>`;
  }
  const enter = S.sheet.enter ? ' enter' : '';
  return `<div class="scrim${enter}" data-act="closesheet"></div>
  <div class="sheet${enter}" role="dialog" aria-modal="true" aria-label="Add food to ${slot}">
    <div class="grip" aria-hidden="true"></div>
    <div class="sheet-head">${mealIcon(slot)}<h2>Add to ${slot}</h2><button class="x close" data-act="closesheet" aria-label="Close">×</button></div>
    ${S.err.log ? `<div class="notice warn">${esc(S.err.log)}</div>` : ''}
    ${body}
  </div>`;
}

function focusCard(){
  const f = S.profile.focus;
  if (!f) return S.profile.data.basics?.age ? `<section class="card row" style="justify-content:space-between"><span><span class="label">Your focus</span><br><b>What do you think holds you back most?</b> <span class="muted">Weekends, evenings, eating out… naming it lets your dietitian plan around it.</span></span><button class="btn small" data-act="askweak">Tell my dietitian</button></section>` : '';
  return `<section class="card stack focus" aria-label="Your focus"><div class="row" style="justify-content:space-between"><div><div class="label">Your focus this week</div><h2>${esc(f.weak_point)}</h2></div><button class="btn small" data-act="askweak">Talk it through</button></div>
  ${f.why ? `<p class="muted">${esc(f.why)}</p>` : ''}
  <ol class="tips">${f.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ol></section>`;
}

function streakPill(){
  const days = new Set(S.profile.loggedDays || []), mon = fromKey(mondayOf()), n = streak();
  const dots = DAYS.map((l, i) => { const d = new Date(mon); d.setDate(d.getDate() + i); const k = dkey(d); return `<span class="${days.has(k) ? 'on' : ''} ${k === dkey() ? 'today' : ''}" title="${l}">${l[0]}</span>`; }).join('');
  return `<div class="streak" aria-label="${n} day logging streak"><span class="flame" aria-hidden="true">🔥</span><div><div class="n">${n}</div><div class="label" style="font-size:.7rem">day streak</div></div><div class="week-dots">${dots}</div></div>`;
}
