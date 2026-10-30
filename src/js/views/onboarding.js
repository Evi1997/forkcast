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
    ${obChips('basics.goal', 'Pick one', [['fat loss','Lose weight and body fat'],['toned','Look more toned and defined'],['muscle gain','Build muscle'],['maintenance','Maintain my weight, get fitter'],['healthier eating','Better health, energy or digestion'],['performance','Better sports performance'],['other','Something else']], true)}
    ${obGet('basics.goal') === 'toned' ? obChips('basics.toned_focus', '“Toned” can mean different things. What matters most?', [['muscle','Mainly build muscle'],['fat','Mainly lose body fat'],['both','Both: lose fat and build muscle']]) : ''}
    ${['muscle gain','toned'].includes(obGet('basics.goal')) ? obMulti('basics.muscle_areas', 'Which areas?', ['Glutes','Legs','Shoulders','Arms','Back','Core','Whole body']) : ''}
    ${obGet('basics.goal') === 'other' ? obText('basics.goal_other', 'Tell us your goal', 'e.g. more energy for a marathon') : ''}` },
  { key:'basics', title:'About you', sub:'Used to estimate your energy needs.', need:['basics.sex','basics.age','basics.height_cm','basics.weight_kg'], body: () => `
    ${obChips('basics.sex', 'Sex (for the energy formula)', [['female','Female'],['male','Male']])}
    <div class="fields three">
      ${obNum('basics.age', 'Age', 'years')}
      ${obNum('basics.height_cm', 'Height', 'cm')}
      ${obNum('basics.weight_kg', 'Weight', 'kg', 0.1)}
    </div>
    ${obChips('basics.trend', 'Your weight in the last 3 months', [['losing','Lost 2+ kg'],['stable','Stable (±1 kg)'],['gaining','Gained 2+ kg'],['unsure','Not sure']], true)}
    ${['fat loss','toned'].includes(obGet('basics.goal')) ? obNum('basics.goal_weight_kg', 'Goal weight', 'kg', 0.1) : ''}
    <div class="fields two">${obNum('basics.body_fat_pct', 'Body fat', '%', 0.1)}${obChips('basics.body_fat_method', 'Measured with', [['scan','InBody / smart scale'],['dexa','DEXA'],['guess','Estimate']])}</div>` },
  { key:'health', title:'Health', sub:'So advice stays safe. Pick all that apply.', body: () => `
    ${obMulti('health.conditions', 'Conditions', ['None','Pregnant','Breastfeeding','Diabetes','PCOS','Thyroid condition','High blood pressure','High cholesterol','Heart condition','Kidney disease','Liver disease','Anaemia','IBS / digestive issues','Eating disorder (past or present)','Recent unexplained weight loss','Other'])}
    ${obGet('basics.sex') === 'female' ? obChips('health.cycle', 'Your period (helps spot low energy)', [['regular','Regular'],['irregular','Irregular'],['missed periods','Missed for 3+ months'],['hormonal contraception','On hormonal contraception'],['n/a','Not applicable / skip']]) : ''}
    ${obMulti('health.allergies', 'Allergies or intolerances', ['None','Nuts','Peanuts','Gluten','Lactose','Eggs','Shellfish','Fish','Soy','Other'])}
    ${obText('health.medications', 'Medications that affect appetite, blood sugar or weight', 'e.g. none, metformin…')}` },
  { key:'lifestyle', title:'Your routine', sub:'This sets how much energy you burn, so it matters.', need:['lifestyle.job','lifestyle.training'], body: () => `
    ${obChips('lifestyle.job', 'Work', [['desk job','Desk / remote'],['on my feet','On my feet (shop, teaching…)'],['physical job','Physical work'],['student','Student'],['not working','Not working']])}
    ${obChips('lifestyle.steps', 'Daily steps', [['under 5k','Under 5,000'],['5-8k','5–8,000'],['8-12k','8–12,000'],['12k+','12,000+'],['unknown','Don\'t know']])}
    ${obChips('lifestyle.training', 'Workouts per week', [['none','None'],['1-2 sessions','1–2'],['3-4 sessions','3–4'],['5+ sessions','5+']])}
    ${obGet('lifestyle.training') && obGet('lifestyle.training') !== 'none' ? `
      ${obMulti('lifestyle.training_type', 'Type of exercise', ['Gym / weights','Running','Walking','Yoga / pilates','Team sport','Cycling','Swimming','Other'])}
      ${obChips('lifestyle.intensity', 'How hard are your workouts?', [['light','Light'],['moderate','Moderate'],['hard','Hard']])}
      ${obMulti('lifestyle.train_time', 'When do you usually train?', ['Morning','Midday','Evening'])}` : ''}
    ${obChips('lifestyle.energy', 'Energy and recovery lately', [['good','Good'],['ok','OK'],['often tired','Often tired'],['slow recovery','Slow to recover from training']])}
    ${obChips('lifestyle.sleep', 'Sleep', [['under 6 h','Under 6 h'],['6-7 h','6–7 h'],['7-8 h','7–8 h'],['8+ h','8 h+']])}
    ${obChips('lifestyle.stress', 'Stress', [['low','Low'],['medium','Medium'],['high','High']])}` },
  { key:'current_diet', title:'How you eat now', sub:'Your plan builds on what you already do.', body: () => `
    ${obChips('current_diet.meals', 'Meals per day', [['2','2'],['3','3'],['3 + snacks','3 + snacks'],['grazing','I graze all day']])}
    ${obChips('current_diet.breakfast', 'Breakfast', [['every day','Every day'],['sometimes','Sometimes'],['skip it','Usually skip']])}
    ${obChips('current_diet.takeout', 'Takeaway or eating out', [['rarely','Rarely'],['1-2 times a week','1–2× a week'],['3+ times a week','3+× a week']])}
    ${obChips('current_diet.alcohol', 'Alcohol', [['none','None'],['occasionally','Occasionally'],['weekends','Weekends'],['most days','Most days']])}
    ${obMulti('current_diet.drinks', 'Drinks', ['Mostly water','Coffee with milk','Black coffee / tea','Sugary drinks','Juice','Diet / zero drinks'])}
    ${obText('current_diet.typical_day', 'A normal day of eating', 'e.g. coffee, toast, chicken salad at lunch, pasta for dinner…', true)}` },
  { key:'obstacles', title:'What gets in the way?', sub:'Your dietitian will focus on this with you.', body: () => `
    ${obMulti('obstacles.weak_point', 'Pick what feels true', ['Weekends','Evening snacking','Hunger between meals','Eating out','Stress eating','Sweets & desserts','Alcohol','Big portions','Skipping meals then overeating','Not enough protein','No time to cook','Travel','Cravings before my period','Other'])}
    ${(() => { const picks = String(obGet('obstacles.weak_point') || '').split(', ').filter(x => x && x !== 'Other'); return picks.length > 1 ? obChips('obstacles.biggest', 'Which is the biggest one?', picks.map(p => [p, p])) : ''; })()}` },
  { key:'preferences', title:'Food you love', sub:'No “diet food” you don\'t enjoy.', body: () => `
    ${obMulti('preferences.pattern', 'Eating style', ['Everything','Pescatarian','Vegetarian','Vegan','Halal','Kosher','Gluten-free','Lactose-free'])}
    ${obMulti('preferences.proteins', 'Proteins you like', ['Chicken','Turkey','Fish','Seafood','Eggs','Beef','Pork','Tofu / tempeh','Beans & lentils','Greek yogurt / skyr','Cottage cheese'])}
    ${obMulti('preferences.cuisines', 'Favourite cuisines', ['Mediterranean','Middle Eastern & North African','East Asian','Southeast Asian','South Asian / Indian','Latin American','North American','Northern & Central European'])}
    ${obText('preferences.likes', 'Other foods you love', 'e.g. rice, berries, dark chocolate')}
    ${obText('preferences.dislikes', 'Foods you never want', 'e.g. mushrooms, coriander')}` },
  { key:'cooking', title:'Cooking', sub:'So the plan fits your kitchen and time.', body: () => `
    ${obChips('cooking.level', 'Cooking skill', [['beginner','Beginner'],['comfortable','Comfortable'],['love cooking','I love cooking']])}
    ${obChips('cooking.prep_style', 'How do you like to cook?', [['A: cook fresh most days','Fresh most days'],['B: meal prep twice a week','Prep 2× a week'],['C: meal prep once a week','Prep once a week'],['D: very little cooking','As little as possible']])}
    ${obChips('cooking.max_weekday_minutes', 'Max cooking time on weekdays', [['15','15 min'],['30','30 min'],['45','45 min'],['60','1 hour']])}
    ${obMulti('cooking.appliances', 'Appliances', ['Hob / stove','Oven','Air fryer','Microwave','Rice cooker','Slow cooker','Blender'])}
    ${obChips('cooking.people', 'Cooking for', [['1','Just me'],['2','2 people'],['3-4','3–4'],['5+','5+']])}
    ${obChips('cooking.leftovers_ok', 'Leftovers and repeats', [['yes','Fine by me'],['some','A little'],['no','I want variety']])}` },
  { key:'shopping', title:'Shopping', sub:'Your list uses products from your store.', body: () => { const cur = currencyFor(obGet('shopping.country')); return `
    <div class="fields two">${obText('shopping.country', 'Country', 'e.g. Spain')}${obText('shopping.city', 'City', 'e.g. Barcelona')}</div>
    ${obMulti('shopping.supermarkets', 'Where do you shop?', [...storesFor(obGet('shopping.country')), 'Other'])}
    ${obChips('shopping.budget', 'Weekly food budget (per person)', [[`under ${cur}50`, `Under ${cur}50`], [`${cur}50-80`, `${cur}50–80`], [`${cur}80-120`, `${cur}80–120`], [`${cur}120+`, `${cur}120+`]])}
    ${obMulti('shopping.priority', 'What matters most?', ['Price','Convenience','Organic','Quality','Less waste'])}`; } }
];

const OB_ICONS = [
  STAR,
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".5"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="7"/><circle cx="12" cy="13" r="3"/><path d="M3 4v6M21 4v16"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V4h12l-2 4 2 4H4"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 13c0-5 3-9 6-9s6 4 6 9a6 6 0 0 1-12 0z"/><path d="M12 4v5"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z"/><path d="M2 10h20M9 6c0-1 1-2 3-2s3 1 3 2"/></svg>',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.3 11.2a1 1 0 0 1-1 .8H7.3a1 1 0 0 1-1-.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>'
];

// Supermarket chips for the country typed in the step above, and its currency.
function storesFor(country){
  const c = String(country || '').toLowerCase().trim();
  return STORES_BY_COUNTRY[c] || ['Lidl','Aldi','Carrefour'];
}
function currencyFor(country){
  const c = String(country || '').toLowerCase();
  return /united kingdom|^uk$|england|scotland|wales/.test(c) ? '£' : /united states|^usa?$|america|canada|australia/.test(c) ? '$' : /switzerland/.test(c) ? 'CHF ' : '€';
}

// --- field helpers (value lives at a "section.key" path in S.ob.data) ---
const obGet = path => { const [a, b] = path.split('.'); return S.ob.data[a]?.[b]; };
function obSet(path, v){ const [a, b] = path.split('.'); S.ob.data[a] = { ...(S.ob.data[a] || {}), [b]: v }; }
// Anything the targets don't strictly need is marked "(optional)" automatically.
function obNeeded(path){
  const need = OB_STEPS[S.ob.step]?.need || [];
  return need.includes(path) || (path === 'basics.toned_focus' && obGet('basics.goal') === 'toned');
}
const obLabel = (path, label) => `<span class="q-title">${label}${obNeeded(path) ? '' : ' <span class="opt-tag">(optional)</span>'}</span>`;
function obChips(path, label, opts, stacked){
  const cur = String(obGet(path) ?? '');
  stacked = stacked || opts.some(([, l]) => l.length > 20);
  return `<fieldset class="ob-q"><legend>${obLabel(path, label)}</legend><div class="ob-chips${stacked ? ' stacked' : ''}" role="radiogroup">${opts.map(([v, l]) => `<button type="button" class="chip" role="radio" data-ob="${path}" data-v="${esc(v)}" aria-checked="${cur === String(v)}" aria-pressed="${cur === String(v)}">${esc(l)}${stacked ? '<i class="radio" aria-hidden="true"></i>' : ''}</button>`).join('')}</div></fieldset>`;
}
// Multi-select; picking "Other" opens a text box for it.
function obMulti(path, label, opts){
  const cur = String(obGet(path) || '').split(', ').filter(Boolean);
  return `<fieldset class="ob-q"><legend>${obLabel(path, label)}<span class="hint">Pick all that apply</span></legend><div class="ob-chips">${opts.map(o => `<button type="button" class="chip" data-obm="${path}" data-v="${esc(o)}" aria-pressed="${cur.includes(o)}">${cur.includes(o) ? '✓ ' : ''}${esc(o)}</button>`).join('')}</div>
    ${cur.includes('Other') ? `<input type="text" class="other-input" id="ob-${path.replace('.', '-')}-other" data-field="${path}_other" value="${esc(obGet(path + '_other') ?? '')}" placeholder="Type it here" aria-label="${esc(label)}: other">` : ''}</fieldset>`;
}
function obNum(path, label, unit, step = 1){
  const id = 'ob-' + path.replace('.', '-'), v = obGet(path);
  return `<div class="field"><label for="${id}">${obLabel(path, label)}</label><div class="unit-input sm"><input type="number" id="${id}" data-field="${path}" enterkeyhint="next" inputmode="${step < 1 ? 'decimal' : 'numeric'}" step="${step}" value="${v ?? ''}"><span>${unit}</span></div></div>`;
}
function obText(path, label, ph, area){
  const id = 'ob-' + path.replace('.', '-') + (label.startsWith('Or type') ? '-own' : ''), v = esc(obGet(path) ?? '');
  return `<div class="field"><label for="${id}">${obLabel(path, label)}</label>${area ? `<textarea id="${id}" class="grow" data-field="${path}" rows="3" placeholder="${esc(ph)}">${v}</textarea>` : `<input type="text" id="${id}" data-field="${path}" placeholder="${esc(ph)}" value="${v}" enterkeyhint="next">`}</div>`;
}

const OB_LABELS = { 'basics.goal':'your goal', 'basics.toned_focus':'what “toned” means for you', 'basics.sex':'sex', 'basics.age':'age', 'basics.height_cm':'height', 'basics.weight_kg':'weight', 'lifestyle.job':'work', 'lifestyle.training':'workouts per week' };
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
      <div class="ob-segs" role="progressbar" aria-valuemin="1" aria-valuemax="${OB_STEPS.length}" aria-valuenow="${i + 1}" aria-label="Step ${i + 1} of ${OB_STEPS.length}">${OB_STEPS.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'now' : ''}"></i>`).join('')}</div>
      ${!st.need ? `<button class="ob-skip" data-act="obskip">${last ? 'Skip & finish' : 'Skip'}</button>` : ''}
    </header>
    <div class="ob-topic">
      <span class="ob-ic" aria-hidden="true">${OB_ICONS[i] || STAR}</span>
      <span class="ob-step">Step ${i + 1} of ${OB_STEPS.length}</span>
      <h1>${st.title}</h1>
      <p class="muted">${st.sub}</p>
    </div>
    <form class="ob-body" id="obForm" novalidate>${st.body()}</form>
    ${missing.length ? `<div class="notice warn">To continue, please answer: ${missing.join(', ')}.</div>` : ''}
    <div class="ob-actions">
      <div class="ob-nav">
        ${i > 0 ? `<button class="btn ob-prev" data-act="obback" aria-label="Back to the previous step">‹ Back</button>` : ''}
        <button class="btn primary big-btn" data-act="obnext">${last ? 'Finish' : 'Continue'}</button>
      </div>
    </div>
  </div>`;
}

// After "Finish": targets straight away (calculated on the phone), then the
// dietitian's personal review arrives from one AI call.
function vObDone(){
  const t = targets(), r = S.ob.review;
  return `<div class="onboard">
    <div class="ob-head"><span class="ai-avatar" aria-hidden="true">${STAR}</span><h1>You're all set</h1><p class="muted">Your starting plan. Every number is an estimate; we'll check it over the next 2–4 weeks.</p></div>
    ${t ? (() => {
      // The strategy shown always matches the numbers in use (the same ones Today shows):
      // the dietitian's only if it set its own targets, otherwise the device's.
      const ra = r?.assessment, coachSet = S.profile.targetsSource === 'coach' && S.profile.targets;
      const key = coachSet && ra?.strategy && STRATEGY[ra.strategy] ? ra.strategy : t.strategy;
      const a = ra && ra.strategy === key ? ra : (ra ? { training:ra.training, monitoring:ra.monitoring } : null), st = STRATEGY[key] || STRATEGY.maintenance;
      return `<section class="card strategy">
        <span class="label">Your strategy</span>
        <h2>${st.label}</h2>
        <p>${esc(a?.reasoning || (st.short[0].toUpperCase() + st.short.slice(1) + ', because ' + t.why + '.'))}</p>
        <dl class="facts"><dt>Maintenance</dt><dd>≈ ${(calcTargets(S.profile.data)?.tdee || t.tdee).toLocaleString()} kcal <span class="muted">(estimate)</span></dd><dt>Your target</dt><dd><b>${t.kcal.toLocaleString()} kcal</b> a day</dd>
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
