// Onboarding flow: open, move between steps, save, finish, and the one AI review.
function startOnboarding(edit){
  S.ob = { step:0, data: JSON.parse(JSON.stringify(S.profile.data || {})), edit: !!edit };
  const b = S.ob.data.basics; if (b?.goal === 'recomposition') { b.goal = 'toned'; b.toned_focus = b.toned_focus || 'both'; } // older answer
  S.obDone = false; window.scrollTo(0, 0); render();
}
function obSave(){ S.profile.data = JSON.parse(JSON.stringify(S.ob.data)); save.profile(); }
function obNext(skip){
  const st = OB_STEPS[S.ob.step];
  if (st.need && obMissing().length) { S.ob.tried = true; render(); return; }
  obSave();
  if (S.ob.step < OB_STEPS.length - 1) { S.ob.step++; S.ob.tried = false; window.scrollTo(0, 0); render(); return; }
  finishOnboarding();
}
function obBack(){ if (S.ob.step > 0) { obSave(); S.ob.step--; window.scrollTo(0, 0); render(); } }

async function finishOnboarding(){
  obSave();
  if (!S.profile.onboarded) { S.profile.onboarded = true; S.profile.onboardedAt = dkey(); }
  S.profile.targets = null;            // use the fresh on-device estimate until the review says otherwise
  S.obDone = true; S.ob.review = null; save.profile(); window.scrollTo(0, 0); render();
  if (!S.sampleOK) { S.ob.review = { error:'Sign in to get your dietitian\'s notes.' }; render(); return; }
  const t = targets();
  try {
    const r = await S.sample.json(PROMPTS.onboardingReview(S.profile.data, t && { kcal:t.kcal, protein:t.protein, carbs:t.carbs, fat:t.fat, fiber:t.fiber, maintenance_kcal:t.tdee, strategy:t.strategy, why:t.why }), { modelTier:'default' });
    if (isObj(r?.assessment)) S.profile.assessment = { ...r.assessment, at:dkey() };
    if (isObj(r?.targets) && r.targets.kcal) { S.profile.targets = { kcal:r0(r.targets.kcal), protein:r0(r.targets.protein), carbs:r0(r.targets.carbs), fat:r0(r.targets.fat), fiber:r0(r.targets.fiber) }; S.profile.targetsSource = 'coach'; }
    if (isObj(r?.focus) && r.focus.weak_point) S.profile.focus = { weak_point:String(r.focus.weak_point), why:String(r.focus.why || ''), tips:(Array.isArray(r.focus.tips) ? r.focus.tips : []).slice(0,5).map(String), at:dkey() };
    if (r?.medical_flag) S.profile.flags = [...new Set([...(S.profile.flags || []), String(r.medical_flag)])].slice(-5);
    const summary = String(r?.summary || '').trim();
    if (S.ob) S.ob.review = { summary, flag: r?.medical_flag || null, assessment: isObj(r?.assessment) ? r.assessment : null };
    // The review also opens today's conversation in the Dietitian tab.
    if (summary) {
      S.chat.start = S.chat.turns.length;
      S.chat.turns.push({ role:'assistant', content:summary, quick:(Array.isArray(r.quick_replies) ? r.quick_replies : []).slice(0,4).map(String), flag:r?.medical_flag || null, at:Date.now() });
      save.chat();
    }
    save.profile();
  } catch (e) { hardFail(e); if (S.ob) S.ob.review = { error: errText(e) }; }
  render();
}
function closeOnboarding(){ S.ob = null; S.obDone = false; S.view = 'today'; window.scrollTo(0, 0); render(); }
