// Nutrition maths: Mifflin-St Jeor targets, consultation progress, streaks
const ACT = { sedentary:1.2, light:1.375, moderate:1.55, very:1.725, extra:1.9 };
function calcTargets(d){
  const b = d.basics || {};
  const age = +b.age, h = +b.height_cm, w = +b.weight_kg;
  if (!age || !h || !w || !b.sex) return null;
  const bmr = 10*w + 6.25*h - 5*age + (String(b.sex).startsWith('m') ? 5 : -161);
  const tdee = bmr * (ACT[b.activity] || 1.375);
  const goal = String(b.goal || 'maintenance');
  let kcal = tdee;
  if (goal.includes('loss') && age >= 18) kcal = Math.max(tdee - 500, tdee * 0.82, bmr);
  else if (goal.includes('gain')) kcal = tdee + 250;
  else if (goal.includes('recomp')) kcal = tdee - 200;
  const kidney = /kidney|renal|ckd/i.test(JSON.stringify(d.health || {}));
  const perKg = kidney ? 0.8 : goal.includes('loss') || goal.includes('gain') ? 1.8 : goal.includes('recomp') ? 2.0 : goal.includes('perform') ? 1.6 : 1.3;
  const refW = b.goal_weight_kg && goal.includes('loss') && w/((h/100)**2) > 30 ? +b.goal_weight_kg : w;
  kcal = Math.round(kcal / 10) * 10;
  const protein = Math.round(perKg * refW);
  const fat = Math.round(kcal * 0.3 / 9);
  const carbs = Math.max(0, Math.round((kcal - protein*4 - fat*9) / 4));
  return { kcal, protein, carbs, fat, fiber: Math.round(kcal/1000*14), bmr: Math.round(bmr), tdee: Math.round(tdee), kidney };
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
