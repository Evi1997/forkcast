// Today: calorie ring, macros, focus tips, food logging, streak
function vToday(){
  const day = vday(), isToday = day === dkey(), t = targets(), log = S.logs[day] || {items:[]}, eaten = sumItems(log.items);
  const kcalT = t?.kcal || 0, left = kcalT - eaten.kcal, pct = kcalT ? Math.min(eaten.kcal / kcalT, 1) : 0;
  const C = 2 * Math.PI * 78;
  const now = new Date();
  const overdue = S.profile.onboarded && (() => { const last = S.progress.checkins.slice(-1)[0]?.date || S.profile.onboardedAt; return last && daysBetween(last, dkey()) >= 7; })();
  const bar = (label, val, tgt, color) => `<div class="macro"><div class="top"><b>${label}</b><span class="num">${r0(val)}${tgt ? ` <span class="muted">/ ${tgt} g</span>` : ' g'}</span></div><div class="bar"><span style="width:${tgt ? Math.min(val/tgt*100,100) : 0}%;background:${color}"></span></div></div>`;
  return `
  <div class="head"><div><div class="label">${fromKey(day).toLocaleDateString(undefined,{weekday:'long', day:'numeric', month:'long'})}</div><h1>${isToday ? (eaten.kcal ? 'Today\'s fuel' : 'What\'s on the plate today?') : fromKey(day).toLocaleDateString(undefined,{weekday:'long'}) + '\'s food'}</h1></div>
  ${streakPill(day)}</div>
  ${statusBanner()}
  ${!S.profile.onboarded ? `<div class="notice accent row" style="justify-content:space-between"><span><b>Start with a first consultation.</b> Your dietitian will ask about your body, health, routine and tastes before setting any targets.</span><button class="btn primary small" data-act="nav" data-v="coach">${S.chat.turns.length ? 'Continue consultation' : 'Begin'}</button></div>` : ''}
  ${overdue ? `<div class="notice accent row" style="justify-content:space-between"><span><b>It's check-in week.</b> A two-minute follow-up so your plan keeps fitting your life.</span><button class="btn primary small" data-act="startcheckin">Check in</button></div>` : ''}
    <section class="card hero fuel" aria-label="Calories and macros">
      <div class="ring">
        <svg viewBox="0 0 176 176"><circle cx="88" cy="88" r="78" fill="none" stroke="var(--hero-track)" stroke-width="16"/>
        <circle cx="88" cy="88" r="78" fill="none" stroke="var(--accent)" stroke-width="16" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" style="transition:stroke-dashoffset .6s ease"/></svg>
        <div class="center">${t ? `<span class="big">${Math.abs(left).toLocaleString()}</span><span class="label">${left >= 0 ? (isToday ? 'kcal left' : 'kcal under target') : 'kcal above target'}</span><span class="muted num" style="font-size:.8rem;margin-top:6px">${eaten.kcal} / ${kcalT}</span>` : `<span class="big">${eaten.kcal}</span><span class="label">kcal eaten</span>`}</div>
      </div>
      <div class="macros">
        ${bar('Protein', eaten.protein, t?.protein, 'var(--pink)')}
        ${bar('Carbs', eaten.carbs, t?.carbs, 'var(--amber)')}
        ${bar('Fat', eaten.fat, t?.fat, 'var(--blue)')}
        ${bar('Fiber', eaten.fiber, t?.fiber, 'var(--accent)')}
        <p class="muted" style="font-size:.8rem">${t ? `<span class="tag est">Estimated</span> ${S.profile.targets ? 'Targets set with your dietitian.' : 'Mifflin-St Jeor estimate from your profile.'}` : 'Targets appear once your dietitian knows your age, height, weight and goal.'}</p>
      </div>
    </section>
  ${isToday ? focusCard() : ''}
  ${mealsSection(t)}
  ${S.sheet ? logSheet() : ''}
`;
}

// Meal icons: sunrise, sun, apple, moon
const MEAL_ICON = {
  Breakfast:'<path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 6v3M5.6 10.6l1.6 1.6M18.4 10.6l-1.6 1.6"/>',
  Lunch:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  Snack:'<path d="M12 7c-1.5-2-5-2.2-6.2.6C4.6 10.4 6.3 18 9.5 18c1 0 1.6-.6 2.5-.6s1.5.6 2.5.6c3.2 0 4.9-7.6 3.7-10.4C17 4.8 13.5 5 12 7z"/><path d="M12 7c0-1.5.6-3 2-4"/>',
  Dinner:'<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>'
};
const MEAL_SHARE = { Breakfast:.25, Lunch:.35, Snack:.10, Dinner:.30 };
const MEAL_COLOR = { Breakfast:'var(--paprika)', Lunch:'var(--accent)', Snack:'var(--pink)', Dinner:'var(--violet)' };
const mealIcon = s => `<span class="meal-ic" style="--c:${MEAL_COLOR[s]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${MEAL_ICON[s]}</svg></span>`;

function mealsSection(t){
  const items = S.logs[vday()]?.items || [];
  return `<section class="card meals" aria-label="Meals">
    <h2>Meals</h2>
    ${SLOTS.map(s => {
      const its = items.filter(i => i.slot === s), k = sumItems(its).kcal, open = S.openMeal === s;
      const sub = its.length ? `${k} kcal · ${its.length} item${its.length > 1 ? 's' : ''}` : t ? `Suggested ~${Math.round(t.kcal * MEAL_SHARE[s] / 10) * 10} kcal` : 'Nothing yet';
      return `<div class="meal-row ${its.length ? 'has' : ''}">
        <button class="meal-main" data-act="togglemeal" data-s="${s}" ${its.length ? `aria-expanded="${open}"` : 'disabled'}>
          ${mealIcon(s)}<span class="meal-txt"><b>${s}${its.length ? `<svg class="chev ${open ? 'up' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>` : ''}</b><span>${sub}</span></span>
        </button>
        <button class="addbtn" data-act="openlog" data-s="${s}" aria-label="Add food to ${s}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
        ${open && its.length ? `<div class="meal-list">
          <div class="meal-macros">${pfc(sumItems(its))}<button class="btn ghost small" data-act="editmeal" data-s="${s}">Edit</button></div>
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
      <div class="review-total"><span class="big num" id="revKcal">${tot.kcal}</span><span class="muted">kcal</span><span class="pfc" id="revPfc" style="margin-left:auto">${pfc(tot)}</span></div>
      ${r.review.map((i, n) => r.editing === n ? `<div class="mi-edit" data-n="${n}">
          <div class="fields two"><div class="field"><label for="e-name-${n}">Food</label><input type="text" id="e-name-${n}" data-edit="${n}.name" value="${esc(i.name)}" placeholder="e.g. Olive oil"></div>
          <div class="field"><label for="e-amount-${n}">Amount</label><input type="text" id="e-amount-${n}" data-edit="${n}.amount" value="${esc(i.amount)}" placeholder="e.g. 1 tbsp"></div></div>
          <div class="fields four"><div class="field"><label for="e-kcal-${n}">kcal</label><input type="number" inputmode="numeric" id="e-kcal-${n}" data-edit="${n}.kcal" value="${r0(i.kcal)}"></div>
          <div class="field"><label for="e-p-${n}">Protein</label><input type="number" inputmode="decimal" id="e-p-${n}" data-edit="${n}.protein" value="${r0(i.protein)}"></div>
          <div class="field"><label for="e-c-${n}">Carbs</label><input type="number" inputmode="decimal" id="e-c-${n}" data-edit="${n}.carbs" value="${r0(i.carbs)}"></div>
          <div class="field"><label for="e-f-${n}">Fat</label><input type="number" inputmode="decimal" id="e-f-${n}" data-edit="${n}.fat" value="${r0(i.fat)}"></div></div>
          <div class="row" style="justify-content:space-between"><button class="btn ghost small" data-act="dropitem" data-n="${n}">Remove</button><button class="btn small" data-act="doneedit">Done</button></div>
        </div>` : `<button class="mi mi-btn" data-act="edititem" data-n="${n}" aria-label="Edit ${esc(i.name || 'item')}"><span><span class="name">${esc(i.name || 'New item')}</span><span class="meta">${esc(i.amount || '')}${i.amount ? ' · ' : ''}${pfc(i)}</span></span><span class="num">${r0(i.kcal)}</span><svg class="pen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button>`).join('')}
      ${r.adding || S.busy.addItem ? `<form class="additem" id="moreForm"><input type="text" id="moreText" placeholder="e.g. 1 tbsp olive oil" aria-label="Item to add" autocomplete="off"><button class="btn small" type="submit" ${S.busy.addItem ? 'disabled' : ''}>${S.busy.addItem ? '<span class="spinner"></span>' : 'Add'}</button></form>`
        : `<button class="add-row" data-act="addrow"><span aria-hidden="true">+</span> Add item</button>`}
    </div>
    <div class="sheet-actions"><button class="btn primary big-btn" data-act="confirmlog" ${r.review.length ? '' : 'disabled'}>${r.replaceIds ? 'Save changes' : `Add to ${slot}`}</button>${r.replaceIds ? '' : '<button class="btn ghost" data-act="editlog">Start over</button>'}</div>`;
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
    const mine = savedFor(slot), all = S.sheet.allMeals;
    body = `<div class="stack">
      ${mine.length ? `<div class="mymeals"><div class="row" style="justify-content:space-between"><span class="label">My meals</span>${mine.length > 3 ? `<button class="btn ghost small" data-act="allmeals">${all ? 'Show less' : `See all ${mine.length}`}</button>` : ''}</div>
        ${(all ? mine : mine.slice(0, 3)).map(m => `<div class="saved"><button class="saved-main" data-act="usesaved" data-id="${m.id}"><b>${esc(m.name)}</b><span class="muted">${sumItems(m.items).kcal} kcal · ${m.items.length} item${m.items.length > 1 ? 's' : ''}</span></button>${all ? `<button class="x small-x" data-act="forgetsaved" data-id="${m.id}" aria-label="Delete ${esc(m.name)} from My meals">×</button>` : '<span class="saved-plus" aria-hidden="true">+</span>'}</div>`).join('')}
      </div><div class="or"><span>or add something new</span></div>` : ''}
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
    ${r?.review && !r.replaceIds ? `<div class="sheet-head">${mealIcon(slot)}<div class="title-edit"><span class="label">${slot}${vday() !== dkey() ? ' · ' + fromKey(vday()).toLocaleDateString(undefined,{weekday:'short', day:'numeric', month:'short'}) : ''}</span><input type="text" id="mealName" value="${esc(r.name || '')}" placeholder="Name this meal" aria-label="Meal name"></div>
      <button class="bookmark" data-act="togglesave" aria-pressed="${!!r.save}" aria-label="${r.save ? 'Saved to My meals. Tap to not save' : 'Save to My meals'}" title="${r.save ? 'Saved to My meals' : 'Save to My meals'}"><svg viewBox="0 0 24 24" fill="${r.save ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg></button>
      <button class="x close" data-act="closesheet" aria-label="Close">×</button></div>`
    : `<div class="sheet-head">${mealIcon(slot)}<h2>${r?.replaceIds ? `Edit ${slot}` : `Add to ${slot}`}${vday() !== dkey() ? `<small class="sheet-date">${fromKey(vday()).toLocaleDateString(undefined,{weekday:'short', day:'numeric', month:'short'})}</small>` : ''}</h2><button class="x close" data-act="closesheet" aria-label="Close">×</button></div>`}
    ${S.err.log ? `<div class="notice warn">${esc(S.err.log)}</div>` : ''}
    ${body}
  </div>`;
}

// One short, timely tip instead of a big static card. Picked on the device from
// the time of day, the day of the week and what's been eaten: no AI call.
function smartTip(){
  const t = targets(), items = S.logs[dkey()]?.items || [], eaten = sumItems(items); // tips are always about today
  const now = new Date(), h = now.getHours(), dow = now.getDay(), weekend = dow === 0 || dow === 6 || (dow === 5 && h >= 16);
  const f = S.profile.focus, dayN = Math.floor(now / 864e5);
  const pick = arr => arr[dayN % arr.length];
  const pLeft = t ? t.protein - eaten.protein : 0, kLeft = t ? t.kcal - eaten.kcal : 0;
  if (!t) return null;
  if (t && kLeft < -150) return { title:'A little above today\'s target', text:'Totally fine once in a while. A lighter, veggie-heavy next meal keeps the week balanced.', q:'I went a bit over my calories today. What would be a good light next meal?' };
  if (f && weekend && f.tips?.length) return { title:`Weekend focus: ${f.weak_point}`, text: pick(f.tips), q:`It's the weekend. Help me with my weak point (${f.weak_point}) today.` };
  if (h >= 16 && pLeft > 30) return { title:`${r0(pLeft)} g protein to go`, text:`About ${pLeft > 45 ? 'two palm-sized portions' : 'a palm-sized portion'} of chicken, fish, tofu or Greek yogurt at dinner gets you there.`, q:`I still need about ${r0(pLeft)} g protein today. What could I have?` };
  if (!items.length && h < 11) return { title:'Start with breakfast', text:'Logging as you eat takes seconds; remembering later is harder.', q:'Give me a quick breakfast idea that fits my targets.' };
  if (h >= 14 && t.fiber && eaten.fiber < t.fiber * 0.4) return { title:'Room for more fibre', text:'Beans, lentils, berries, oats or a big side of veg all help, and keep you full.', q:'How can I add more fibre to the rest of today?' };
  if (f?.tips?.length) return { title:`Your focus: ${f.weak_point}`, text: pick(f.tips), q:`Let's talk about my weak point (${f.weak_point}). What else could help?` };
  if (!f && S.profile.onboarded) return { title:'What holds you back most?', text:'Weekends, evenings, eating out… tell your dietitian and the plan will work around it.', q:'I want to talk about what I think holds me back.' };
  return null;
}
function focusCard(){
  const tip = smartTip(); if (!tip) return '';
  return `<button class="tipcard" data-act="askquick" data-q="${esc(tip.q)}" aria-label="${esc(tip.title)}. Talk it through with your dietitian">
    <span class="tip-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg></span>
    <span class="tip-txt"><b>${esc(tip.title)}</b><span>${esc(tip.text)}</span></span>
    <svg class="tip-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
  </button>`;
}

// "x/7 days logged" with the week's days as circles (green = logged).
// Tap a circle to open that day; the dark ring marks the day shown.
// The small arrows move a week back or forward.
function streakPill(day){
  const today = dkey(), days = new Set(S.profile.loggedDays || []), mon = fromKey(mondayOf(fromKey(day)));
  const cells = DAYS.map((l, i) => { const d = new Date(mon); d.setDate(d.getDate() + i); return { l, k:dkey(d) }; });
  const week = cells.filter(c => days.has(c.k)).length, thisWeek = cells.some(c => c.k === today);
  const dots = cells.map(c => `<button class="${days.has(c.k) ? 'on' : ''}" data-act="gotoday" data-k="${c.k}" aria-pressed="${c.k === day}" ${c.k > today ? 'disabled' : ''} aria-label="${fromKey(c.k).toLocaleDateString(undefined,{weekday:'long', day:'numeric', month:'long'})}${days.has(c.k) ? ', logged' : ''}">${c.l[0]}</button>`).join('');
  return `<div class="streak" aria-label="${week} of 7 days logged ${thisWeek ? 'this week' : 'that week'}">
    <div><div class="n">${week}<span class="muted" style="font-size:.9rem;font-weight:700">/7</span></div><div class="label" style="font-size:.7rem">days logged</div></div>
    <div class="week-nav"><button class="wk-arrow" data-act="prevweek" aria-label="Previous week">‹</button><div class="week-dots">${dots}</div><button class="wk-arrow" data-act="nextweek" aria-label="Next week" ${thisWeek ? 'disabled' : ''}>›</button></div>
  </div>`;
}
