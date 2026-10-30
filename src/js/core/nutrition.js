// Nutrition maths: Mifflin-St Jeor targets, consultation progress, streaks
const ACT = { sedentary:1.2, light:1.375, moderate:1.55, very:1.725, extra:1.9 };
// Goal-first targets (see skill/ai-dietitian, "Goal-first nutrition assessment"):
// a deficit only when fat loss is the clear goal and it's appropriate; "toned"
// means recomposition at maintenance unless the person chose fat loss.
const STRATEGY = {
  deficit:        { label:'Fat loss',        short:'a modest deficit' },
  recomposition:  { label:'Recomposition',   short:'maintenance calories with strength training' },
  surplus:        { label:'Muscle gain',     short:'a small surplus' },
  maintenance:    { label:'Maintenance',     short:'maintenance calories' }
};
function chooseStrategy(d, bmi){
  const b = d.basics || {}, goal = String(b.goal || ''), toned = String(b.toned_focus || '');
  const h = JSON.stringify(d.health || {}) + JSON.stringify(d.wellbeing || {});
  const redFlags = /eating disorder|missed periods|irregular|pregnan|breastfeed|unexplained weight loss/i.test(h);
  const bf = +b.body_fat_pct, female = !String(b.sex).startsWith('m');
  const lean = bmi < (female ? 20 : 20.5) || (bf && bf < (female ? 20 : 12));
  const wantsLoss = goal.includes('loss') || (goal === 'toned' && toned === 'fat');
  if (wantsLoss) {
    if (+b.age < 18 || redFlags || lean) return { key:'maintenance', why: +b.age < 18 ? 'under 18: no calorie deficit' : redFlags ? 'a health answer needs review before any deficit' : 'you\'re already lean, so a deficit isn\'t advised' };
    return { key:'deficit', why:'fat loss is your goal' };
  }
  if (goal === 'toned' || goal.includes('recomp')) return { key:'recomposition', why:'definition comes mostly from building muscle, not eating less' };
  if (goal.includes('gain')) return { key: redFlags ? 'maintenance' : 'surplus', why:'muscle grows best with enough energy' };
  return { key:'maintenance', why:'your goal doesn\'t need a deficit' };
}
function calcTargets(d){
  const b = d.basics || {};
  const age = +b.age, h = +b.height_cm, w = +b.weight_kg;
  if (!age || !h || !w || !b.sex) return null;
  const bmr = 10*w + 6.25*h - 5*age + (String(b.sex).startsWith('m') ? 5 : -161);
  const tdee = bmr * (ACT[b.activity] || 1.375), bmi = w / ((h/100) ** 2);
  const strat = chooseStrategy(d, bmi), goal = String(b.goal || '');
  let kcal = tdee;
  if (strat.key === 'deficit') kcal = Math.max(tdee - 500, tdee * 0.85, bmr * 1.1);
  if (strat.key === 'surplus') kcal = tdee + Math.min(300, Math.max(150, tdee * 0.08));
  const kidney = /kidney|renal|ckd/i.test(JSON.stringify(d.health || {}));
  // Protein within ~1.4–2.0 g/kg for active adults; lower with kidney disease.
  const perKg = kidney ? 0.8 : ['deficit','recomposition','surplus'].includes(strat.key) ? 1.8 : goal.includes('perform') ? 1.6 : 1.4;
  const refW = bmi > 30 ? (+b.goal_weight_kg || 25 * (h/100) ** 2) : w;
  kcal = Math.round(kcal / 10) * 10;
  const protein = Math.round(perKg * refW);
  const fat = Math.max(Math.round(kcal * 0.28 / 9), Math.round(0.7 * w));
  const carbs = Math.max(0, Math.round((kcal - protein*4 - fat*9) / 4));
  return { kcal, protein, carbs, fat, fiber: Math.round(kcal/1000*14), bmr: Math.round(bmr), tdee: Math.round(tdee), kidney, strategy: strat.key, why: strat.why };
}
const targets = () => S.profile.targets || calcTargets(S.profile.data);
function sectionDone(key){
  const v = S.profile.data[key];
  if (key === 'basics') return !!(v && v.age && v.height_cm && v.weight_kg && v.sex && v.goal);
  return !!(v && Object.values(v).some(x => x !== '' && x != null));
}

function streak(){
  const days = new Set(S.profile.loggedDays || []); let n = 0; const d = new Date();
  if (!days.has(dkey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dkey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
