// Onboarding, lesson-style: one question per screen. Your dietitian introduces
// each one; tapping a single-choice answer moves straight on; questions where
// you type or pick several have Continue. Optional questions can be skipped.
// Answers save after every question and use the same keys the dietitian uses.

const Y = 'yes';
const isTrain = () => obGet('lifestyle.training') && obGet('lifestyle.training') !== 'none';
const OB_SECTIONS = { coach:'Your dietitian', goal:'Your goal', body:'About you', health:'Health', routine:'Your routine', eating:'How you eat now', obstacles:'What gets in the way', food:'Food you love', cooking:'Cooking', shopping:'Shopping' };

const OB_QUESTIONS = [
  { sec:'coach', path:'coach.name', type:'name', say:'Hi! Before we start: what should I be called?', title:'Pick a name for your dietitian', opts: () => COACH_NAMES.map(n => [n, n]) },
  { sec:'coach', path:'coach.tone', type:'single', say:() => `Nice to meet you, I'm ${coachName()}.`, title:'How should I talk to you?', opts: () => COACH_TONES.map(([v, l]) => [v, l]) },
  { sec:'goal', short:'your goal', path:'basics.goal', type:'single', need:true, say:'Let\'s start with what matters most.', title:'What\'s your main goal with food and training?', opts: () => [['fat loss','Lose weight and body fat'],['toned','Look more toned and defined'],['muscle gain','Build muscle'],['maintenance','Maintain my weight, get fitter'],['healthier eating','Better health, energy or digestion'],['performance','Better sports performance'],['other','Something else']] },
  { sec:'goal', short:'what “toned” means for you', path:'basics.toned_focus', type:'single', need:true, when: () => obGet('basics.goal') === 'toned', say:'“Toned” means different things to different people.', title:'What matters most to you?', opts: () => [['muscle','Mainly build muscle'],['fat','Mainly lose body fat'],['both','Both: lose fat and build muscle']] },
  { sec:'goal', path:'basics.muscle_areas', type:'multi', when: () => ['muscle gain','toned'].includes(obGet('basics.goal')), say:'Any areas you\'d like to focus on?', title:'Which areas?', opts: () => ['Glutes','Legs','Shoulders','Arms','Back','Core','Whole body'] },
  { sec:'goal', path:'basics.goal_other', type:'text', when: () => obGet('basics.goal') === 'other', say:'Tell me in your own words.', title:'What\'s your goal?', ph:'e.g. more energy for a marathon' },
  { sec:'body', short:'sex', path:'basics.sex', type:'single', need:true, say:'A few basics, so I can estimate your energy needs.', title:'Sex (for the energy formula)', opts: () => [['female','Female'],['male','Male']] },
  { sec:'body', short:'age, height and weight', path:'basics.age', type:'numbers', need:true, say:'Just the numbers. Nobody else sees them.', title:'Age, height and weight', fields:[['basics.age','Age','years',1],['basics.height_cm','Height','cm',1],['basics.weight_kg','Weight','kg',0.1]] },
  { sec:'body', path:'basics.trend', type:'single', say:'This tells me where you\'re starting from.', title:'Your weight in the last 3 months', opts: () => [['losing','Lost 2+ kg'],['stable','Stable (±1 kg)'],['gaining','Gained 2+ kg'],['unsure','Not sure']] },
  { sec:'body', path:'basics.goal_weight_kg', type:'numbers', when: () => ['fat loss','toned'].includes(obGet('basics.goal')), say:'Only if you have one in mind.', title:'Goal weight', fields:[['basics.goal_weight_kg','Goal weight','kg',0.1]] },
  { sec:'body', path:'basics.body_fat_pct', type:'bodyfat', say:'Know your body fat? Great, otherwise skip.', title:'Body fat', fields:[['basics.body_fat_pct','Body fat','%',0.1]], opts: () => [['scan','InBody / smart scale'],['dexa','DEXA'],['guess','Estimate']] },
  { sec:'health', path:'health.conditions', type:'multi', none:true, say:'Now a few health questions, so my advice stays safe.', title:'Any of these?', opts: () => ['None','Pregnant','Breastfeeding','Diabetes','PCOS','Thyroid condition','High blood pressure','High cholesterol','Heart condition','Kidney disease','Liver disease','Anaemia','IBS / digestive issues','Eating disorder (past or present)','Recent unexplained weight loss','Other'] },
  { sec:'health', path:'health.cycle', type:'single', when: () => obGet('basics.sex') === 'female', say:'This helps me spot if you\'re not eating enough.', title:'Your period', opts: () => [['regular','Regular'],['irregular','Irregular'],['missed periods','Missed for 3+ months'],['hormonal contraception','On hormonal contraception'],['n/a','Not applicable / prefer not to say']] },
  { sec:'health', path:'health.allergies', type:'multi', none:true, say:'Anything you can\'t eat?', title:'Allergies or intolerances', opts: () => ['None','Nuts','Peanuts','Gluten','Lactose','Eggs','Shellfish','Fish','Soy','Other'] },
  { sec:'health', path:'health.medications', type:'text', say:'Some medicines change appetite or blood sugar.', title:'Medications that affect appetite, blood sugar or weight', ph:'e.g. none, metformin…' },
  { sec:'routine', short:'your work', path:'lifestyle.job', type:'single', need:true, say:'Let\'s look at your day. This sets how much energy you burn.', title:'What\'s your work like?', opts: () => [['desk job','Desk / remote'],['on my feet','On my feet (shop, teaching…)'],['physical job','Physical work'],['student','Student'],['not working','Not working']] },
  { sec:'routine', path:'lifestyle.steps', type:'single', say:'Roughly is fine.', title:'Daily steps', opts: () => [['under 5k','Under 5,000'],['5-8k','5–8,000'],['8-12k','8–12,000'],['12k+','12,000+'],['unknown','Don\'t know']] },
  { sec:'routine', short:'workouts per week', path:'lifestyle.training', type:'single', need:true, say:'And workouts?', title:'Workouts per week', opts: () => [['none','None right now'],['1-2 sessions','1–2'],['3-4 sessions','3–4'],['5+ sessions','5 or more']] },
  { sec:'routine', path:'lifestyle.training_type', type:'multi', when:isTrain, say:'Nice! What kind?', title:'Type of exercise', opts: () => ['Gym / weights','Running','Walking','Yoga / pilates','Team sport','Cycling','Swimming','Other'] },
  { sec:'routine', path:'lifestyle.intensity', type:'single', when:isTrain, say:'Be honest, no judging.', title:'How hard are your workouts?', opts: () => [['light','Light'],['moderate','Moderate'],['hard','Hard']] },
  { sec:'routine', path:'lifestyle.train_time', type:'multi', when:isTrain, say:'So I can plan meals around them.', title:'When do you usually train?', opts: () => ['Morning','Midday','Evening'] },
  { sec:'routine', path:'lifestyle.energy', type:'single', title:'Energy and recovery lately', opts: () => [['good','Good'],['ok','OK'],['often tired','Often tired'],['slow recovery','Slow to recover from training']] },
  { sec:'routine', path:'lifestyle.sleep', type:'single', title:'How much do you sleep?', opts: () => [['under 6 h','Under 6 h'],['6-7 h','6–7 h'],['7-8 h','7–8 h'],['8+ h','8 h or more']] },
  { sec:'routine', path:'lifestyle.stress', type:'single', title:'Stress level', opts: () => [['low','Low'],['medium','Medium'],['high','High']] },
  { sec:'eating', path:'current_diet.meals', type:'single', say:'Now, how you eat today. Your plan builds on it.', title:'Meals per day', opts: () => [['2','2'],['3','3'],['3 + snacks','3 + snacks'],['grazing','I graze all day']] },
  { sec:'eating', path:'current_diet.breakfast', type:'single', title:'Breakfast', opts: () => [['every day','Every day'],['sometimes','Sometimes'],['skip it','Usually skip']] },
  { sec:'eating', path:'current_diet.takeout', type:'single', title:'Takeaway or eating out', opts: () => [['rarely','Rarely'],['1-2 times a week','1–2× a week'],['3+ times a week','3+× a week']] },
  { sec:'eating', path:'current_diet.alcohol', type:'single', title:'Alcohol', opts: () => [['none','None'],['occasionally','Occasionally'],['weekends','Weekends'],['most days','Most days']] },
  { sec:'eating', path:'current_diet.drinks', type:'multi', title:'What do you usually drink?', opts: () => ['Mostly water','Coffee with milk','Black coffee / tea','Sugary drinks','Juice','Diet / zero drinks'] },
  { sec:'eating', path:'current_diet.typical_day', type:'textarea', say:'Optional, but it helps me a lot.', title:'Describe a normal day of eating', ph:'e.g. coffee, toast, chicken salad at lunch, pasta for dinner…' },
  { sec:'obstacles', path:'obstacles.weak_point', type:'multi', say:'What makes it hard? We\'ll work on it together.', title:'What gets in the way?', opts: () => ['Weekends','Evening snacking','Hunger between meals','Eating out','Stress eating','Sweets & desserts','Alcohol','Big portions','Skipping meals then overeating','Not enough protein','No time to cook','Travel','Cravings before my period','Other'] },
  { sec:'obstacles', path:'obstacles.biggest', type:'single', when: () => String(obGet('obstacles.weak_point') || '').split(', ').filter(x => x && x !== 'Other').length > 1, say:'Let\'s focus on one first.', title:'Which is the biggest one?', opts: () => String(obGet('obstacles.weak_point') || '').split(', ').filter(x => x && x !== 'Other').map(p => [p, p]) },
  { sec:'food', path:'preferences.pattern', type:'multi', say:'The fun part: food you actually enjoy.', title:'Your eating style', opts: () => ['Everything','Pescatarian','Vegetarian','Vegan','Halal','Kosher','Gluten-free','Lactose-free'] },
  { sec:'food', path:'preferences.proteins', type:'multi', title:'Proteins you like', opts: () => ['Chicken','Turkey','Fish','Seafood','Eggs','Beef','Pork','Tofu / tempeh','Beans & lentils','Greek yogurt / skyr','Cottage cheese'] },
  { sec:'food', path:'preferences.cuisines', type:'multi', title:'Favourite cuisines', opts: () => ['Mediterranean','Middle Eastern & North African','East Asian','Southeast Asian','South Asian / Indian','Latin American','North American','Northern & Central European'] },
  { sec:'food', path:'preferences.likes', type:'text', title:'Other foods you love', ph:'e.g. rice, berries, dark chocolate' },
  { sec:'food', path:'preferences.dislikes', type:'text', say:'I\'ll never put these in your plan.', title:'Foods you never want', ph:'e.g. mushrooms, coriander' },
  { sec:'cooking', path:'cooking.level', type:'single', say:'Almost done! Let\'s talk kitchen.', title:'Cooking skill', opts: () => [['beginner','Beginner'],['comfortable','Comfortable'],['love cooking','I love cooking']] },
  { sec:'cooking', path:'cooking.prep_style', type:'single', title:'How do you like to cook?', opts: () => [['A: cook fresh most days','Fresh most days'],['B: meal prep twice a week','Meal prep twice a week'],['C: meal prep once a week','Meal prep once a week'],['D: very little cooking','As little as possible']] },
  { sec:'cooking', path:'cooking.max_weekday_minutes', type:'single', title:'Max cooking time on weekdays', opts: () => [['15','15 min'],['30','30 min'],['45','45 min'],['60','1 hour']] },
  { sec:'cooking', path:'cooking.appliances', type:'multi', title:'What\'s in your kitchen?', opts: () => ['Hob / stove','Oven','Air fryer','Microwave','Rice cooker','Slow cooker','Blender'] },
  { sec:'cooking', path:'cooking.people', type:'single', title:'Cooking for', opts: () => [['1','Just me'],['2','2 people'],['3-4','3–4'],['5+','5 or more']] },
  { sec:'cooking', path:'cooking.leftovers_ok', type:'single', title:'Leftovers and repeats', opts: () => [['yes','Fine by me'],['some','A little'],['no','I want variety']] },
  { sec:'shopping', path:'shopping.country', type:'texts', say:'Last bit: where you shop.', title:'Where do you live?', fields:[['shopping.country','Country','e.g. Spain'],['shopping.city','City','e.g. Barcelona']] },
  { sec:'shopping', path:'shopping.supermarkets', type:'multi', title:'Where do you shop?', opts: () => [...storesFor(obGet('shopping.country')), 'Other'] },
  { sec:'shopping', path:'shopping.budget', type:'single', title:'Weekly food budget (per person)', opts: () => { const c = currencyFor(obGet('shopping.country')); return [[`under ${c}50`, `Under ${c}50`], [`${c}50-80`, `${c}50–80`], [`${c}80-120`, `${c}80–120`], [`${c}120+`, `${c}120+`]]; } },
  { sec:'shopping', path:'shopping.priority', type:'multi', title:'What matters most when shopping?', opts: () => ['Price','Convenience','Organic','Quality','Less waste'] }
];
const obVisible = () => OB_QUESTIONS.filter(q => !q.when || q.when());

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
const OB_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';

function obMissing(q){
  if (!q.need) return false;
  if (q.fields) return q.fields.some(([p]) => obGet(p) === undefined || obGet(p) === '');
  return !obGet(q.path);
}
function obInput(path, label, unit, step, autofocus){
  const id = 'ob-' + path.replace('.', '-'), v = obGet(path);
  return `<div class="field"><label for="${id}">${label}</label><div class="unit-input"><input type="number" id="${id}" data-field="${path}" enterkeyhint="next" inputmode="${step < 1 ? 'decimal' : 'numeric'}" step="${step}" value="${v ?? ''}" ${autofocus ? 'autofocus' : ''}><span>${unit}</span></div></div>`;
}

function vOnboarding(){
  const list = obVisible(), i = Math.min(S.ob.q, list.length - 1), q = list[i], last = i === list.length - 1;
  const cur = obGet(q.path), say = typeof q.say === 'function' ? q.say() : q.say;
  const opts = q.opts ? q.opts() : [];
  let body = '';
  if (q.type === 'single' || q.type === 'name') {
    body = `<div class="ob-answers" role="radiogroup" aria-label="${esc(q.title)}">${opts.map(([v, l]) => `<button type="button" class="ob-ans" role="radio" aria-checked="${String(cur) === String(v)}" data-ob="${q.path}" data-v="${esc(v)}"><span>${esc(l)}</span><i class="radio" aria-hidden="true"></i></button>`).join('')}</div>
      ${q.type === 'name' ? `<div class="field"><label for="ob-own-name">Or type your own</label><input type="text" id="ob-own-name" data-field="${q.path}" value="${esc(COACH_NAMES.includes(cur) ? '' : (cur || ''))}" placeholder="e.g. Sofia" enterkeyhint="done" autocomplete="off"></div>` : ''}`;
  } else if (q.type === 'multi') {
    const sel = String(cur || '').split(', ').filter(Boolean);
    body = `<p class="ob-hint">Pick all that apply</p><div class="ob-chips">${opts.map(o => `<button type="button" class="chip" data-obm="${q.path}" data-v="${esc(o)}" aria-pressed="${sel.includes(o)}">${sel.includes(o) ? '✓ ' : ''}${esc(o)}</button>`).join('')}</div>
      ${sel.includes('Other') ? `<input type="text" class="other-input" id="ob-other" data-field="${q.path}_other" value="${esc(obGet(q.path + '_other') ?? '')}" placeholder="Type it here" aria-label="Other" enterkeyhint="done">` : ''}`;
  } else if (q.type === 'numbers' || q.type === 'bodyfat') {
    body = `<div class="ob-fields">${q.fields.map(([p, l, u, s], k) => obInput(p, l, u, s, k === 0 && !obGet(p))).join('')}</div>
      ${q.type === 'bodyfat' ? `<p class="ob-hint" style="margin-top:6px">Measured with</p><div class="ob-chips">${opts.map(([v, l]) => `<button type="button" class="chip" data-ob="basics.body_fat_method" data-v="${v}" aria-pressed="${obGet('basics.body_fat_method') === v}">${l}</button>`).join('')}</div>` : ''}`;
  } else if (q.type === 'texts') {
    body = `<div class="ob-fields">${q.fields.map(([p, l, ph]) => `<div class="field"><label for="ob-${p.replace('.', '-')}">${l}</label><input type="text" id="ob-${p.replace('.', '-')}" data-field="${p}" value="${esc(obGet(p) ?? '')}" placeholder="${esc(ph)}" enterkeyhint="next" autocomplete="off"></div>`).join('')}</div>`;
  } else {
    body = q.type === 'textarea'
      ? `<textarea id="ob-text" class="grow" data-field="${q.path}" rows="3" placeholder="${esc(q.ph || '')}">${esc(cur ?? '')}</textarea>`
      : `<input type="text" id="ob-text" data-field="${q.path}" value="${esc(cur ?? '')}" placeholder="${esc(q.ph || '')}" enterkeyhint="done" autocomplete="off">`;
  }
  const answered = !obMissing({ ...q, need:true });
  const dir = S.ob.dir === 'back' ? 'from-left' : 'from-right';
  return `<div class="onboard lesson">
    <header class="ob-top">
      ${i > 0 ? `<button class="ob-back" data-act="obback" aria-label="Back">${OB_ARROW}</button>` : '<span class="ob-back-space"></span>'}
      <div class="ob-bar" role="progressbar" aria-valuemin="1" aria-valuemax="${list.length}" aria-valuenow="${i + 1}" aria-label="Question ${i + 1} of ${list.length}"><span style="width:${(i + 1) / list.length * 100}%"></span></div>
      ${S.ob.edit ? `<button class="ob-skip" data-act="obfinish">Save</button>` : `<button class="ob-skip" data-act="obskip">Skip</button>`}
    </header>
    ${say ? `<div class="ob-say"><span class="ai-avatar" aria-hidden="true">${STAR}</span><div class="bubble">${esc(say)}</div></div>` : ''}
    <div class="ob-stack">
      <section class="ob-card ${S.ob.anim ? dir : ''}" aria-labelledby="obTitle">
        <div class="ob-sec">${OB_SECTIONS[q.sec]}</div>
        <h1 class="ob-q-title" id="obTitle">${esc(q.title)}${q.need ? '' : ' <span class="opt-tag">(optional)</span>'}</h1>
        <form class="ob-qbody" id="obForm" novalidate>${body}</form>
        ${S.ob.tried && obMissing(q) ? `<div class="notice warn">Answer this one, or tap Skip.</div>` : ''}
      </section>
    </div>
    <div class="ob-actions"><button class="btn ob-go ${answered || !q.need ? '' : 'waiting'}" data-act="obnext">${last ? 'Finish' : 'Continue'}</button></div>
  </div>`;
}

// After "Finish": targets straight away (calculated on the phone), then the
// dietitian's personal review arrives from one AI call.
function vObDone(){
  const t = targets(), r = S.ob.review;
  return `<div class="onboard">
    <div class="ob-head"><span class="ai-avatar" aria-hidden="true">${STAR}</span><h1>${t ? 'You\'re all set' : 'Almost there'}</h1><p class="muted">${t ? 'Your starting plan. Every number is an estimate; we\'ll check it over the next 2–4 weeks.' : 'Just a few answers left before I can set your targets.'}</p></div>
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
      <div class="row" style="gap:10px"><span class="ai-dot" aria-hidden="true">${STAR}</span><h3>${esc(coachName())}'s notes</h3></div>
      ${r?.error ? `<p class="muted">${esc(r.error)} You can ask anything in the Dietitian tab.</p>`
        : r ? `<div class="ob-notes">${md(r.summary || '')}</div>${r.flag ? `<div class="flag"><span class="tag med">Needs medical review</span> ${esc(r.flag)}</div>` : ''}`
        : `<p class="muted"><span class="spinner"></span> Reading your answers… you can already start using the app.</p>`}
    </section>
    <div class="ob-actions"><button class="btn primary big-btn" data-act="obclose">Start using Forkcast</button></div>
  </div>`;
}
