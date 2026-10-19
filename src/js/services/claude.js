// Claude connection, error copy and the app state snapshot sent to the dietitian
const ERR = {
  not_granted:'Claude access was declined for this page, so the dietitian is off for now. Reload the page to allow it.',
  sampling_disabled:'Claude isn\'t available on this account.',
  rate_limited:'Too many requests in a row. Give it a minute, then try again.',
  session_expired:'Your session expired. Sign in again, then retry.',
  refused:'Claude couldn\'t answer that one. Try rephrasing.',
  invalid_json:'The answer came back garbled. Try again.',
  image_rejected:'That photo couldn\'t be read. Try a JPEG or PNG under 20 MB.',
  prompt_too_large:'That was too much at once. Try a shorter message.'
};
const errText = e => ERR[e?.code] || 'Something went wrong reaching Claude. Try again.';
async function initSample(){
  if (!window.claude?.use) { S.sampleOK = false; render(); return; }
  try {
    S.sample = await claude.use('sample');
    S.sampleOK = !!S.sample;
    if (S.sample) { const lim = await S.sample.limits().catch(() => null); S.canImages = !!lim?.images; }
  } catch { S.sampleOK = false; }
  render();
}
function hardFail(e){ if (['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'].includes(e?.code)) { S.sampleOK = false; } }

function appState(){
  const t = targets(), today = sumItems(S.logs[dkey()]?.items || []);
  return {
    date: new Date().toDateString(),
    profile: S.profile.data,
    targets: t ? {kcal:t.kcal, protein:t.protein, carbs:t.carbs, fat:t.fat, fiber:t.fiber, source:S.profile.targets ? 'set by dietitian' : 'app Mifflin-St Jeor estimate'} : null,
    consultation: Object.fromEntries(SECTIONS.map(([k]) => [k, sectionDone(k) ? 'covered' : 'not yet'])),
    onboarding_complete: S.profile.onboarded,
    eaten_today: { ...today, items: (S.logs[dkey()]?.items || []).map(i => `${i.slot}: ${i.name} (${r0(i.kcal)} kcal)`) },
    recent_weighins: S.progress.weighins.slice(-8),
    weak_point_focus: S.profile.focus || null,
    last_checkins: S.progress.checkins.slice(-2),
    current_plan: S.plan?.days ? S.plan.days.map(d => `${d.day}: ` + d.meals.map(m => m.name).join(' / ')).join('\n') : 'none yet'
  };
}
