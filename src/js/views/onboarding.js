// Onboarding, lesson-style: one question per screen. Your dietitian introduces
// each one; tapping a single-choice answer moves straight on; questions where
// you type or pick several have Continue. Optional questions can be skipped.
// Answers save after every question and use the same keys the dietitian uses.

const isTrain = () => obGet('lifestyle.training') && obGet('lifestyle.training') !== 'none';
const OB_SECTIONS = { coach:'Your dietitian', goal:'Your goal', body:'About you', health:'Health', routine:'Your routine', eating:'How you eat now', obstacles:'What gets in the way', food:'Food you love', cooking:'Cooking', shopping:'Shopping' };

// ~20 screens. A screen has one or more parts; a part is one answer.
// need: required for the targets. when: only shown if it applies.
const OB_SCREENS = [
  { sec:'coach', say:'Hi! I\'ll be your dietitian. What should I be called?', title:'Name your dietitian', parts:[
    { path:'coach.name', type:'name', opts: () => COACH_NAMES.slice(0, 3).map(n => [n, n]) },
    { path:'coach.tone', type:'single', label:'How should I talk to you?', opts: () => COACH_TONES.map(([v, l]) => [v, l]) } ] },
  { sec:'goal', short:'your goal', say:'Let\'s start with what matters most.', title:'What\'s your main goal with food and training?', parts:[
    { path:'basics.goal', type:'single', need:true, opts: () => [['fat loss','Lose weight and body fat'],['toned','Look more toned and defined'],['muscle gain','Build muscle'],['maintenance','Maintain my weight, get fitter'],['healthier eating','Better health, energy or digestion'],['performance','Better sports performance'],['other','Something else']] },
    { path:'basics.goal_other', type:'text', label:'Tell me in your own words', when: () => obGet('basics.goal') === 'other', ph:'e.g. more energy for a marathon' } ] },
  { sec:'goal', short:'what “toned” means for you', when: () => ['toned','muscle gain'].includes(obGet('basics.goal')), say:'Let\'s make that more specific.', title:'Tell me more about your goal', parts:[
    { path:'basics.toned_focus', type:'single', need:true, label:'What matters most?', when: () => obGet('basics.goal') === 'toned', opts: () => [['muscle','Mainly build muscle'],['fat','Mainly lose body fat'],['both','Both: lose fat and build muscle']] },
    { path:'basics.muscle_areas', type:'multi', label:'Areas to focus on', opts: () => ['Glutes','Legs','Shoulders','Arms','Back','Core','Whole body'] } ] },
  { sec:'body', short:'sex, age, height and weight', say:'A few basics, so I can estimate your energy needs.', title:'About you', parts:[
    { path:'basics.sex', type:'single', need:true, label:'Sex (for the energy formula)', opts: () => [['female','Female'],['male','Male']] },
    { path:'basics.age', type:'numbers', need:true, fields:[['basics.age','Age','years',1],['basics.height_cm','Height','cm',1],['basics.weight_kg','Weight','kg',0.1]] } ] },
  { sec:'body', say:'This tells me where you\'re starting from.', title:'Where you\'re starting', parts:[
    { path:'basics.trend', type:'single', label:'Your weight in the last 3 months', opts: () => [['losing','Lost 2+ kg'],['stable','Stable (±1 kg)'],['gaining','Gained 2+ kg'],['unsure','Not sure']] },
    { path:'basics.goal_weight_kg', type:'numbers', when: () => ['fat loss','toned'].includes(obGet('basics.goal')), fields:[['basics.goal_weight_kg','Goal weight','kg',0.1]] },
    { path:'basics.body_fat_pct', type:'numbers', fields:[['basics.body_fat_pct','Body fat, if you know it','%',0.1]] },
    { path:'basics.body_fat_method', type:'single', label:'Measured with', when: () => !!obGet('basics.body_fat_pct'), opts: () => [['scan','InBody / smart scale'],['dexa','DEXA'],['guess','Estimate']] } ] },
  { sec:'health', say:'A few health questions, so my advice stays safe.', title:'Any health conditions?', parts:[
    { path:'health.conditions', type:'multi', opts: () => ['None','Pregnant','Breastfeeding','Diabetes','PCOS','Thyroid condition','High blood pressure','High cholesterol','Heart condition','Kidney disease','Liver disease','Anaemia','IBS / digestive issues','Eating disorder (past or present)','Recent unexplained weight loss','Other'] },
    { path:'health.cycle', type:'single', label:'Your period', when: () => obGet('basics.sex') === 'female', opts: () => [['regular','Regular'],['irregular','Irregular'],['missed periods','Missed 3+ months'],['hormonal contraception','Hormonal contraception'],['n/a','Prefer not to say']] } ] },
  { sec:'health', say:'Anything you can\'t eat or take?', title:'Allergies and medication', parts:[
    { path:'health.allergies', type:'multi', label:'Allergies or intolerances', opts: () => ['None','Nuts','Peanuts','Gluten','Lactose','Eggs','Shellfish','Fish','Soy','Other'] },
    { path:'health.medications', type:'text', label:'Medication that affects appetite, blood sugar or weight', ph:'e.g. none, metformin…' } ] },
  { sec:'routine', short:'your work', say:'Let\'s look at your day. This sets how much energy you burn.', title:'Your day', parts:[
    { path:'lifestyle.job', type:'single', need:true, label:'Work', opts: () => [['desk job','Desk / remote'],['on my feet','On my feet (shop, teaching…)'],['physical job','Physical work'],['student','Student'],['not working','Not working']] },
    { path:'lifestyle.steps', type:'single', label:'Daily steps', opts: () => [['under 5k','Under 5k'],['5-8k','5–8k'],['8-12k','8–12k'],['12k+','12k+'],['unknown','Don\'t know']] } ] },
  { sec:'routine', short:'workouts per week', say:'And workouts? Be honest, no judging.', title:'Your workouts', parts:[
    { path:'lifestyle.training', type:'single', need:true, label:'Workouts per week', opts: () => [['none','None'],['1-2 sessions','1–2'],['3-4 sessions','3–4'],['5+ sessions','5+']] },
    { path:'lifestyle.training_type', type:'multi', label:'Type', when:isTrain, opts: () => ['Gym / weights','Running','Walking','Yoga / pilates','Team sport','Cycling','Swimming','Other'] },
    { path:'lifestyle.intensity', type:'single', label:'How hard', when:isTrain, opts: () => [['light','Light'],['moderate','Moderate'],['hard','Hard']] },
    { path:'lifestyle.train_time', type:'multi', label:'When', when:isTrain, opts: () => ['Morning','Midday','Evening'] } ] },
  { sec:'routine', say:'How are you feeling lately?', title:'Energy, sleep and stress', parts:[
    { path:'lifestyle.energy', type:'single', label:'Energy and recovery', opts: () => [['good','Good'],['ok','OK'],['often tired','Often tired'],['slow recovery','Slow to recover']] },
    { path:'lifestyle.sleep', type:'single', label:'Sleep', opts: () => [['under 6 h','< 6 h'],['6-7 h','6–7 h'],['7-8 h','7–8 h'],['8+ h','8 h+']] },
    { path:'lifestyle.stress', type:'single', label:'Stress', opts: () => [['low','Low'],['medium','Medium'],['high','High']] } ] },
  { sec:'eating', say:'Now, how you eat today. Your plan builds on it.', title:'Your meals', parts:[
    { path:'current_diet.meals', type:'single', label:'Meals per day', opts: () => [['2','2'],['3','3'],['3 + snacks','3 + snacks'],['grazing','I graze']] },
    { path:'current_diet.breakfast', type:'single', label:'Breakfast', opts: () => [['every day','Every day'],['sometimes','Sometimes'],['skip it','Usually skip']] },
    { path:'current_diet.takeout', type:'single', label:'Eating out or takeaway', opts: () => [['rarely','Rarely'],['1-2 times a week','1–2× a week'],['3+ times a week','3+× a week']] } ] },
  { sec:'eating', say:'Almost through this part.', title:'Drinks', parts:[
    { path:'current_diet.alcohol', type:'single', label:'Alcohol', opts: () => [['none','None'],['occasionally','Occasionally'],['weekends','Weekends'],['most days','Most days']] },
    { path:'current_diet.drinks', type:'multi', label:'What do you usually drink?', opts: () => ['Mostly water','Coffee with milk','Black coffee / tea','Sugary drinks','Juice','Diet / zero drinks'] } ] },
  { sec:'eating', say:'Optional, but it helps me a lot.', title:'A normal day of eating', parts:[
    { path:'current_diet.typical_day', type:'textarea', ph:'e.g. coffee, toast, chicken salad at lunch, pasta for dinner…' } ] },
  { sec:'obstacles', say:'What makes it hard? We\'ll work on it together.', title:'What gets in the way?', parts:[
    { path:'obstacles.weak_point', type:'multi', opts: () => ['Weekends','Evening snacking','Hunger between meals','Eating out','Stress eating','Sweets & desserts','Alcohol','Big portions','Skipping meals then overeating','Not enough protein','No time to cook','Travel','Cravings before my period','Other'] },
    { path:'obstacles.biggest', type:'single', label:'Which is the biggest one?', when: () => String(obGet('obstacles.weak_point') || '').split(', ').filter(x => x && x !== 'Other').length > 1, opts: () => String(obGet('obstacles.weak_point') || '').split(', ').filter(x => x && x !== 'Other').map(p => [p, p]) } ] },
  { sec:'food', say:'The fun part: food you actually enjoy.', title:'How you like to eat', parts:[
    { path:'preferences.pattern', type:'multi', label:'Eating style', opts: () => ['Everything','Pescatarian','Vegetarian','Vegan','Halal','Kosher','Gluten-free','Lactose-free'] },
    { path:'preferences.proteins', type:'multi', label:'Proteins you like', opts: () => ['Chicken','Turkey','Fish','Seafood','Eggs','Beef','Pork','Tofu / tempeh','Beans & lentils','Greek yogurt / skyr','Cottage cheese'] } ] },
  { sec:'food', say:'I\'ll never put the second list in your plan.', title:'Flavours you love', parts:[
    { path:'preferences.cuisines', type:'multi', label:'Favourite cuisines', opts: () => ['Mediterranean','Middle Eastern & North African','East Asian','Southeast Asian','South Asian / Indian','Latin American','North American','Northern & Central European'] },
    { path:'preferences.likes', type:'text', label:'Other foods you love', ph:'e.g. rice, berries, dark chocolate' },
    { path:'preferences.dislikes', type:'text', label:'Foods you never want', ph:'e.g. mushrooms, coriander' } ] },
  { sec:'cooking', say:'Almost done! Let\'s talk kitchen.', title:'How you cook', parts:[
    { path:'cooking.level', type:'single', label:'Cooking skill', opts: () => [['beginner','Beginner'],['comfortable','Comfortable'],['love cooking','I love cooking']] },
    { path:'cooking.prep_style', type:'single', label:'Cooking style', opts: () => [['A: cook fresh most days','Fresh most days'],['B: meal prep twice a week','Prep 2× a week'],['C: meal prep once a week','Prep once a week'],['D: very little cooking','As little as possible']] },
    { path:'cooking.max_weekday_minutes', type:'single', label:'Max time on weekdays', opts: () => [['15','15 min'],['30','30 min'],['45','45 min'],['60','1 hour']] } ] },
  { sec:'cooking', say:'So the plan fits your kitchen.', title:'Your kitchen', parts:[
    { path:'cooking.appliances', type:'multi', label:'Appliances', opts: () => ['Hob / stove','Oven','Air fryer','Microwave','Rice cooker','Slow cooker','Blender'] },
    { path:'cooking.people', type:'single', label:'Cooking for', opts: () => [['1','Just me'],['2','2'],['3-4','3–4'],['5+','5+']] },
    { path:'cooking.leftovers_ok', type:'single', label:'Leftovers and repeats', opts: () => [['yes','Fine'],['some','A little'],['no','I want variety']] } ] },
  { sec:'shopping', say:'Last bit: where you shop.', title:'Where you shop', parts:[
    { path:'shopping.country', type:'texts', fields:[['shopping.country','Country','e.g. Spain'],['shopping.city','City','e.g. Barcelona']] },
    { path:'shopping.supermarkets', type:'multi', label:'Supermarkets', opts: () => [...storesFor(obGet('shopping.country')), 'Other'] } ] },
  { sec:'shopping', say:'And that\'s it!', title:'Budget', parts:[
    { path:'shopping.budget', type:'single', label:'Weekly food budget (per person)', opts: () => { const c = currencyFor(obGet('shopping.country')); return [[`under ${c}50`, `Under ${c}50`], [`${c}50-80`, `${c}50–80`], [`${c}80-120`, `${c}80–120`], [`${c}120+`, `${c}120+`]]; } },
    { path:'shopping.priority', type:'multi', label:'What matters most', opts: () => ['Price','Convenience','Organic','Quality','Less waste'] } ] }
];
const obParts = sc => sc.parts.filter(p => !p.when || p.when());
OB_SCREENS.forEach(sc => { sc.need = sc.parts.some(p => p.need); });
const obVisible = () => OB_SCREENS.filter(sc => !sc.when || sc.when());
const OB_QUESTIONS = OB_SCREENS; // used by the finish screen's "missing answers" list

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
const MASCOT = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M33 13c3-7 11-9 15-6-2 6-8 9-15 6z" fill="#1F7A4F"/><path d="M32 14c-1-3-1-6 0-8" stroke="#17603D" stroke-width="2.4" stroke-linecap="round" fill="none"/><ellipse cx="32" cy="38" rx="22" ry="21" fill="#4CC38A"/><ellipse cx="32" cy="44" rx="13" ry="10" fill="#7FD6AC"/><ellipse cx="24.5" cy="34" rx="5" ry="5.6" fill="#fff"/><ellipse cx="39.5" cy="34" rx="5" ry="5.6" fill="#fff"/><circle cx="25.5" cy="35" r="2.6" fill="#10140F"/><circle cx="40.5" cy="35" r="2.6" fill="#10140F"/><circle cx="26.4" cy="34" r=".9" fill="#fff"/><circle cx="41.4" cy="34" r=".9" fill="#fff"/><ellipse cx="18" cy="42" rx="3.2" ry="2" fill="#F48FB1" opacity=".75"/><ellipse cx="46" cy="42" rx="3.2" ry="2" fill="#F48FB1" opacity=".75"/><path d="M27 43.5c2.8 3 7.2 3 10 0" stroke="#10140F" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`;
const OB_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';

function obMissing(sc){
  return obParts(sc).some(p => p.need && (p.fields ? p.fields.some(([f]) => obGet(f) === undefined || obGet(f) === '') : !obGet(p.path)));
}
function obInput(path, label, unit, step){
  const id = 'ob-' + path.replace('.', '-'), v = obGet(path);
  return `<div class="field"><label for="${id}">${label}</label><div class="unit-input"><input type="number" id="${id}" data-field="${path}" enterkeyhint="next" inputmode="${step < 1 ? 'decimal' : 'numeric'}" step="${step}" value="${v ?? ''}"><span>${unit}</span></div></div>`;
}

// One answer block. Big radio rows when it's the only question on the screen; chips otherwise.
function obPart(p, alone){
  const cur = obGet(p.path), opts = p.opts ? p.opts() : [];
  const head = p.label ? `<div class="part-label">${esc(p.label)}${p.type === 'multi' ? ' <span>· pick any</span>' : ''}</div>` : (p.type === 'multi' ? '<div class="part-label"><span>Pick all that apply</span></div>' : '');
  if (p.type === 'single' && alone) return `${head}<div class="ob-answers" role="radiogroup">${opts.map(([v, l]) => `<button type="button" class="ob-ans" role="radio" aria-checked="${String(cur) === String(v)}" data-ob="${p.path}" data-v="${esc(v)}"><span>${esc(l)}</span><i class="radio" aria-hidden="true"></i></button>`).join('')}</div>`;
  if (p.type === 'single') return `${head}<div class="ob-chips" role="radiogroup">${opts.map(([v, l]) => `<button type="button" class="chip" role="radio" aria-checked="${String(cur) === String(v)}" aria-pressed="${String(cur) === String(v)}" data-ob="${p.path}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
  if (p.type === 'name') return `<div class="ob-chips">${opts.map(([v, l]) => `<button type="button" class="chip" aria-pressed="${cur === v}" data-ob="${p.path}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>
    <input type="text" id="ob-own-name" data-field="${p.path}" value="${esc(opts.some(([v]) => v === cur) ? '' : (cur || ''))}" placeholder="Or write your own" aria-label="Or write your own name" maxlength="20" enterkeyhint="done" autocomplete="off">`;
  if (p.type === 'multi') { const sel = String(cur || '').split(', ').filter(Boolean);
    return `${head}<div class="ob-chips">${opts.map(o => `<button type="button" class="chip" data-obm="${p.path}" data-v="${esc(o)}" aria-pressed="${sel.includes(o)}">${sel.includes(o) ? '✓ ' : ''}${esc(o)}</button>`).join('')}</div>
      ${sel.includes('Other') ? `<input type="text" class="other-input" data-field="${p.path}_other" value="${esc(obGet(p.path + '_other') ?? '')}" placeholder="Type it here" aria-label="Other" enterkeyhint="done">` : ''}`; }
  if (p.type === 'numbers') return `${head}<div class="ob-fields cols-${p.fields.length}">${p.fields.map(([f, l, u, st]) => obInput(f, l, u, st)).join('')}</div>`;
  if (p.type === 'texts') return `${head}<div class="ob-fields cols-2">${p.fields.map(([f, l, ph]) => `<div class="field"><label for="ob-${f.replace('.', '-')}">${l}</label><input type="text" id="ob-${f.replace('.', '-')}" data-field="${f}" value="${esc(obGet(f) ?? '')}" placeholder="${esc(ph)}" enterkeyhint="next" autocomplete="off"></div>`).join('')}</div>`;
  if (p.type === 'textarea') return `${head}<textarea class="grow" data-field="${p.path}" rows="4" placeholder="${esc(p.ph || '')}" aria-label="${esc(p.label || 'Your answer')}">${esc(cur ?? '')}</textarea>`;
  return `${head}<input type="text" data-field="${p.path}" value="${esc(cur ?? '')}" placeholder="${esc(p.ph || '')}" aria-label="${esc(p.label || 'Your answer')}" enterkeyhint="done" autocomplete="off">`;
}

function vOnboarding(){
  const list = obVisible(), i = Math.min(S.ob.q, list.length - 1), sc = list[i], last = i === list.length - 1;
  const parts = obParts(sc), dir = S.ob.dir === 'back' ? 'from-left' : 'from-right';
  return `<div class="onboard lesson">
    <header class="ob-top">
      ${i > 0 ? `<button class="ob-back" data-act="obback" aria-label="Back">${OB_ARROW}</button>` : '<span class="ob-back-space"></span>'}
      <div class="ob-bar" role="progressbar" aria-valuemin="1" aria-valuemax="${list.length}" aria-valuenow="${i + 1}" aria-label="Step ${i + 1} of ${list.length}"><span style="width:${(i + 1) / list.length * 100}%"></span></div>
      <span class="ob-count num">${i + 1}/${list.length}</span>
    </header>
    ${i === 0 ? `<div class="ob-hero" aria-hidden="true">${MASCOT}</div>` : ''}
    <div class="ob-say">${i === 0 ? '' : `<span class="mascot-sm" aria-hidden="true">${MASCOT}</span>`}<div class="bubble">${esc(typeof sc.say === 'function' ? sc.say() : sc.say)}</div></div>
    <div class="ob-stack">
      <section class="ob-card ${S.ob.anim ? dir : ''}" aria-labelledby="obTitle">
        <div class="ob-card-head"><div class="ob-sec">${OB_SECTIONS[sc.sec]}</div><h1 class="ob-q-title" id="obTitle">${esc(sc.title)}</h1></div>
        <form class="ob-qbody" id="obForm" novalidate>${parts.map(p => `<div class="ob-part">${obPart(p, parts.length === 1)}</div>`).join('')}</form>
        ${S.ob.tried && obMissing(sc) ? `<div class="notice warn">Answer the first question, or tap Skip.</div>` : ''}
      </section>
    </div>
    <div class="ob-actions">
      <button class="btn ob-skip-btn" data-act="obskip">Skip</button>
      <button class="btn ob-go ${obMissing(sc) ? 'waiting' : ''}" data-act="obnext">${last ? 'Finish' : 'Next'}</button>
    </div>
  </div>`;
}

// After "Finish": targets straight away (calculated on the phone), then the
// dietitian's personal review arrives from one AI call.
function vObDone(){
  const t = targets(), r = S.ob.review;
  return `<div class="onboard">
    <div class="ob-head"><span class="ob-hero sm" aria-hidden="true">${MASCOT}</span><h1>${t ? 'You\'re all set' : 'Almost there'}</h1><p class="muted">${t ? 'Your starting plan. Every number is an estimate; we\'ll check it over the next 2–4 weeks.' : 'Just a few answers left before I can set your targets.'}</p></div>
    ${!t ? (() => { const miss = OB_QUESTIONS.filter(q => q.need && obVisible().includes(q) && obMissing(q)); return `<section class="card stack strategy">
      <h2>A few answers are missing</h2>
      <p>To set your calories and macros I need: ${miss.map(q => esc(q.short || q.title)).join(', ')}.</p>
      <button class="btn primary" data-act="obfix">Add them now</button></section>`; })() : ''}
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
      <div class="row" style="gap:10px"><span class="mascot-sm" aria-hidden="true">${MASCOT}</span><h3>${esc(coachName())}'s notes</h3></div>
      ${r?.error ? `<p class="muted">${esc(r.error)} You can ask anything in the Dietitian tab.</p>`
        : r ? `<div class="ob-notes">${md(r.summary || '')}</div>${r.flag ? `<div class="flag"><span class="tag med">Needs medical review</span> ${esc(r.flag)}</div>` : ''}`
        : `<p class="muted"><span class="spinner"></span> Reading your answers… you can already start using the app.</p>`}
    </section>
    <div class="ob-actions"><button class="btn primary big-btn" data-act="obclose">Start using Forkcast</button></div>
  </div>`;
}
