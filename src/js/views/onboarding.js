// Onboarding: eight short steps, mostly taps, no AI until the very end.
// Answers are written straight into the profile (same keys the dietitian uses)
// and saved after every step, so leaving halfway loses nothing.

const OB_STEPS = [
  { key:'coach', title:'Meet your dietitian', sub:'Pick a name and a style. You can change both later.', body: () => `
    ${obChips('coach.name', 'Name', COACH_NAMES.map(n => [n, n]))}
    ${obText('coach.name', 'Or type your own', 'e.g. Sofia')}
    ${obChips('coach.tone', 'How should they talk to you?', COACH_TONES.map(([v, l]) => [v, l]))}` },
  // Goal first: nothing is calculated until we know what you actually want.
  { key:'basics', title:'What\'s your main goal?', sub:'With food and training. This decides your whole plan.', need:['basics.goal'], body: () => `
    ${obChips('basics.goal', 'Pick one', [['fat loss','Lose weight and body fat'],['toned','Look more toned and defined'],['muscle gain','Build muscle (e.g. glutes, legs, shoulders)'],['maintenance','Maintain my weight, get fitter'],['healthier eating','Better health, energy or digestion'],['performance','Better sports performance'],['other','Something else']], true)}
    ${obGet('basics.goal') === 'toned' ? obChips('basics.toned_focus', '“Toned” can mean different things. What matters most?', [['muscle','Building muscle'],['fat','Losing some body fat'],['both','Both / not sure']]) : ''}
    ${obGet('basics.goal') === 'other' ? obText('basics.goal_other', 'Tell us your goal', 'e.g. more energy for a marathon') : ''}` },
  { key:'basics', title:'About you', sub:'Used to estimate your energy needs.', need:['basics.sex','basics.age','basics.height_cm','basics.weight_kg','basics.activity'], body: () => `
    ${obChips('basics.sex', 'Sex (for the energy formula)', [['female','Female'],['male','Male']])}
    <div class="fields three">
      ${obNum('basics.age', 'Age', 'years')}
      ${obNum('basics.height_cm', 'Height', 'cm')}
      ${obNum('basics.weight_kg', 'Weight', 'kg', 0.1)}
    </div>
    ${obChips('basics.activity', 'Daily activity (outside workouts)', [['sedentary','Mostly sitting'],['light','Light: some walking'],['moderate','Moderate: on my feet a lot'],['very','Very active'],['extra','Physical job + training']])}
    ${obChips('basics.trend', 'Your weight lately', [['losing','Going down'],['stable','Stable'],['gaining','Going up'],['unsure','Not sure']])}
    ${['fat loss','toned'].includes(obGet('basics.goal')) ? obNum('basics.goal_weight_kg', 'Goal weight (optional)', 'kg', 0.1) : ''}
    <div class="fields two">${obNum('basics.body_fat_pct', 'Body fat (optional)', '%', 0.1)}${obChips('basics.body_fat_method', 'Measured with', [['scan','InBody / scale'],['dexa','DEXA'],['guess','Estimate']])}</div>` },
  { key:'health', title:'Health', sub:'So advice stays safe. Pick all that apply.', body: () => `
    ${obMulti('health.conditions', 'Conditions', ['None','Pregnant or breastfeeding','Diabetes','Kidney disease','Liver disease','Heart condition','IBS / digestive issues','Thyroid condition','Eating disorder (past or present)','Recent unexplained weight loss'])}
    ${obGet('basics.sex') === 'female' ? obChips('health.cycle', 'Your period (helps spot low energy)', [['regular','Regular'],['irregular','Irregular'],['missed periods','Missed for 3+ months'],['n/a','Not applicable / skip']]) : ''}
    ${obMulti('health.allergies', 'Allergies or intolerances', ['None','Nuts','Peanuts','Gluten','Lactose','Eggs','Shellfish','Fish','Soy'])}
    ${obText('health.medications', 'Medications that affect appetite, blood sugar or weight (optional)', 'e.g. none, metformin…')}` },
  { key:'lifestyle', title:'Your routine', sub:'Helps fit meals around your day.', body: () => `
    ${obChips('lifestyle.job', 'Work', [['desk job','Desk / remote'],['on my feet','On my feet'],['physical job','Physical work'],['student','Student'],['not working','Not working']])}
    ${obChips('lifestyle.training', 'Exercise per week', [['none','None'],['1-2 sessions','1–2'],['3-4 sessions','3–4'],['5+ sessions','5+']])}
    ${obMulti('lifestyle.training_type', 'Type of exercise', ['Gym / weights','Running','Walking','Yoga / pilates','Team sport','Cycling','Swimming'])}
    ${obChips('lifestyle.steps', 'Daily steps', [['under 5k','Under 5,000'],['5-8k','5–8,000'],['8-12k','8–12,000'],['12k+','12,000+'],['unknown','Don\'t know']])}
    ${obChips('lifestyle.energy', 'Energy and recovery lately', [['good','Good'],['ok','OK'],['often tired','Often tired'],['slow recovery','Slow to recover from training']])}
    ${obChips('lifestyle.sleep', 'Sleep', [['under 6 h','Under 6 h'],['6-7 h','6–7 h'],['7-8 h','7–8 h'],['8+ h','8 h+']])}
    ${obChips('lifestyle.stress', 'Stress', [['low','Low'],['medium','Medium'],['high','High']])}` },
  { key:'current_diet', title:'How you eat now', sub:'Your plan builds on what you already do.', body: () => `
    ${obChips('current_diet.breakfast', 'Breakfast', [['every day','Every day'],['sometimes','Sometimes'],['skip it','Usually skip']])}
    ${obChips('current_diet.takeout', 'Takeaway or eating out', [['rarely','Rarely'],['1-2 times a week','1–2× a week'],['3+ times a week','3+× a week']])}
    ${obChips('current_diet.alcohol', 'Alcohol', [['none','None'],['occasionally','Occasionally'],['weekends','Weekends'],['most days','Most days']])}
    ${obText('current_diet.typical_day', 'A normal day of eating (optional)', 'e.g. coffee, toast, chicken salad at lunch, pasta for dinner…', true)}` },
  { key:'obstacles', title:'What gets in the way?', sub:'Your dietitian will focus on this with you.', body: () => `
    ${obMulti('obstacles.weak_point', 'Pick what feels true', ['Weekends','Evening snacking','Eating out','Stress eating','Sweets & desserts','Alcohol','Big portions','Skipping meals then overeating','Not enough protein','No time to cook'])}
    ${obText('obstacles.triggers', 'Anything else? (optional)', 'e.g. Sunday brunches always get out of hand')}` },
  { key:'preferences', title:'Food you love', sub:'No “diet food” you don\'t enjoy.', body: () => `
    ${obChips('preferences.pattern', 'Eating style', [['omnivore','Everything'],['pescatarian','Pescatarian'],['vegetarian','Vegetarian'],['vegan','Vegan'],['halal','Halal'],['kosher','Kosher'],['gluten-free','Gluten-free']])}
    ${obMulti('preferences.cuisines', 'Favourite cuisines', ['Mediterranean','Greek','Italian','Spanish','Asian','Mexican','Middle Eastern','Indian'])}
    ${obText('preferences.likes', 'Foods you love', 'e.g. salmon, eggs, rice, berries, dark chocolate')}
    ${obText('preferences.dislikes', 'Foods you never want', 'e.g. tofu, mushrooms')}` },
  { key:'cooking', title:'Cooking', sub:'So the plan fits your kitchen and time.', body: () => `
    ${obChips('cooking.prep_style', 'How do you like to cook?', [['A: cook fresh most days','Fresh most days'],['B: meal prep twice a week','Prep 2× a week'],['C: meal prep once a week','Prep once a week'],['D: very little cooking','As little as possible']])}
    ${obChips('cooking.max_weekday_minutes', 'Max cooking time on weekdays', [['15','15 min'],['30','30 min'],['45','45 min'],['60','1 hour']])}
    ${obMulti('cooking.appliances', 'Appliances', ['Oven','Air fryer','Microwave','Rice cooker','Slow cooker','Blender'])}
    ${obChips('cooking.people', 'Cooking for', [['1','Just me'],['2','2 people'],['3-4','3–4'],['5+','5+']])}
    ${obChips('cooking.leftovers_ok', 'Leftovers and repeats', [['yes','Fine by me'],['some','A little'],['no','I want variety']])}` },
  { key:'shopping', title:'Shopping', sub:'Your list uses products from your store.', body: () => `
    <div class="fields two">${obText('shopping.country', 'Country', 'e.g. Spain')}${obText('shopping.city', 'City (optional)', 'e.g. Barcelona')}</div>
    ${obText('shopping.supermarkets', 'Supermarket', 'e.g. Mercadona')}
    ${obChips('shopping.budget', 'Weekly food budget', [['low','Tight'],['medium','Moderate'],['high','Flexible']])}
    ${obChips('shopping.priority', 'What matters most?', [['cheapest','Price'],['convenience','Convenience'],['organic','Organic'],['balance','A balance']])}` }
];

// --- field helpers (value lives at a "section.key" path in S.ob.data) ---
const obGet = path => { const [a, b] = path.split('.'); return S.ob.data[a]?.[b]; };
function obSet(path, v){ const [a, b] = path.split('.'); S.ob.data[a] = { ...(S.ob.data[a] || {}), [b]: v }; }
function obChips(path, label, opts, stacked){
  const cur = String(obGet(path) ?? '');
  return `<fieldset class="ob-q"><legend>${label}</legend><div class="ob-chips${stacked ? ' stacked' : ''}">${opts.map(([v, l]) => `<button type="button" class="chip" data-ob="${path}" data-v="${esc(v)}" aria-pressed="${cur === String(v)}">${esc(l)}</button>`).join('')}</div></fieldset>`;
}
function obMulti(path, label, opts){
  const cur = String(obGet(path) || '').split(', ').filter(Boolean);
  return `<fieldset class="ob-q"><legend>${label}</legend><div class="ob-chips">${opts.map(o => `<button type="button" class="chip" data-obm="${path}" data-v="${esc(o)}" aria-pressed="${cur.includes(o)}">${cur.includes(o) ? '✓ ' : ''}${esc(o)}</button>`).join('')}</div></fieldset>`;
}
function obNum(path, label, unit, step = 1){
  const id = 'ob-' + path.replace('.', '-'), v = obGet(path);
  return `<div class="field"><label for="${id}">${label}</label><div class="unit-input sm"><input type="number" id="${id}" data-field="${path}" enterkeyhint="next" inputmode="${step < 1 ? 'decimal' : 'numeric'}" step="${step}" value="${v ?? ''}"><span>${unit}</span></div></div>`;
}
function obText(path, label, ph, area){
  const id = 'ob-' + path.replace('.', '-'), v = esc(obGet(path) ?? '');
  return `<div class="field"><label for="${id}">${label}</label>${area ? `<textarea id="${id}" data-field="${path}" rows="2" placeholder="${esc(ph)}">${v}</textarea>` : `<input type="text" id="${id}" data-field="${path}" placeholder="${esc(ph)}" value="${v}">`}</div>`;
}

const OB_LABELS = { 'basics.goal':'your goal', 'basics.toned_focus':'what “toned” means for you', 'basics.sex':'sex', 'basics.age':'age', 'basics.height_cm':'height', 'basics.weight_kg':'weight', 'basics.activity':'daily activity' };
function obMissing(){
  const st = OB_STEPS[S.ob.step], need = [...(st.need || [])];
  if (need.includes('basics.goal') && obGet('basics.goal') === 'toned') need.push('basics.toned_focus');
  return need.filter(p => !obGet(p)).map(p => OB_LABELS[p] || p);
}

function vOnboarding(){
  const i = S.ob.step, st = OB_STEPS[i], last = i === OB_STEPS.length - 1;
  const missing = st.need && S.ob.tried ? obMissing() : [];
  return `<div class="onboard">
    <header class="ob-top">
      ${i > 0 ? `<button class="ob-back" data-act="obback"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>Back</button>` : ''}
      <div class="ob-progress" aria-label="Step ${i + 1} of ${OB_STEPS.length}"><span style="width:${(i + 1) / OB_STEPS.length * 100}%"></span></div>
      <span class="muted num" style="font-size:.85rem">${i + 1}/${OB_STEPS.length}</span>
    </header>
    <div class="ob-head"><h1>${st.title}</h1><p class="muted">${st.sub}</p></div>
    <form class="ob-body" id="obForm" novalidate>${st.body()}</form>
    ${missing.length ? `<div class="notice warn">To continue, please answer: ${missing.join(', ')}.</div>` : ''}
    <div class="ob-actions">
      <div class="ob-nav">
        ${i > 0 ? `<button class="btn ob-prev" data-act="obback" aria-label="Back to the previous step">‹ Back</button>` : ''}
        <button class="btn primary big-btn" data-act="obnext">${last ? 'Finish' : 'Continue'}</button>
      </div>
      ${!st.need ? `<button class="btn ghost" data-act="obskip">${last ? 'Skip and finish' : 'Skip this step'}</button>` : ''}
    </div>
  </div>`;
}

// After "Finish": targets straight away (calculated on the phone), then the
// dietitian's personal review arrives from one AI call.
function vObDone(){
  const t = targets(), r = S.ob.review;
  return `<div class="onboard">
    <div class="ob-head"><span class="ai-avatar" aria-hidden="true">${STAR}</span><h1>You're all set</h1><p class="muted">Your starting plan. Every number is an estimate; we'll check it over the next 2–4 weeks.</p></div>
    ${t ? (() => { const a = r?.assessment, key = a?.strategy && STRATEGY[a.strategy] ? a.strategy : t.strategy, st = STRATEGY[key] || STRATEGY.maintenance;
      return `<section class="card strategy">
        <span class="label">Your strategy</span>
        <h2>${st.label}</h2>
        <p>${esc(a?.reasoning || (st.short[0].toUpperCase() + st.short.slice(1) + ', because ' + t.why + '.'))}</p>
        <dl class="facts"><dt>Maintenance</dt><dd>≈ ${(a?.maintenance_kcal ? r0(a.maintenance_kcal) : t.tdee).toLocaleString()} kcal <span class="muted">(estimate)</span></dd>
        ${a?.training ? `<dt>Training</dt><dd>${esc(a.training)}</dd>` : ''}${a?.monitoring ? `<dt>We'll watch</dt><dd>${esc(a.monitoring)}</dd>` : ''}</dl>
      </section>`; })() : ''}
    ${t ? `<section class="card ob-targets">
      <div class="review-total"><span class="big num">${t.kcal.toLocaleString()}</span><span class="muted">kcal a day</span></div>
      <div class="tiles">${[['Protein', t.protein, 'var(--pink)'], ['Carbs', t.carbs, 'var(--amber)'], ['Fat', t.fat, 'var(--blue)'], ['Fiber', t.fiber, 'var(--accent)']].map(([l, v, c]) => `<div class="tile"><span class="label">${l}</span><b class="num" style="color:${c}">${v}<small> g</small></b></div>`).join('')}</div>
    </section>` : ''}
    <section class="card stack">
      <div class="row" style="gap:10px"><span class="ai-dot" aria-hidden="true">${STAR}</span><h3>${esc(coachName())}'s notes</h3></div>
      ${r?.error ? `<p class="muted">${esc(r.error)} You can ask anything in the Dietitian tab.</p>`
        : r ? `<div class="ob-notes">${md(r.summary || '')}</div>${r.flag ? `<div class="flag"><span class="tag med">Needs medical review</span> ${esc(r.flag)}</div>` : ''}`
        : `<p class="muted"><span class="spinner"></span> Reading your answers… you can already start using the app.</p>`}
    </section>
    <div class="ob-actions"><button class="btn primary big-btn" data-act="obclose">Start using Forkcast</button></div>
  </div>`;
}
