// AI: calls our /api/ai server function, which checks sign-in and asks Gemini.
// S.sample.json(input, {modelTier, images}) keeps the same shape the rest of the app uses.
const ERR = {
  rate_limited:'The free AI limit is used up for now. Try again in a minute, or tomorrow if it\'s the daily limit.',
  unauthorized:'Your session expired. Sign in again, then retry.',
  refused:'The AI couldn\'t answer that one. Try rephrasing.',
  invalid_json:'The answer came back garbled. Try again.',
  empty_completion:'The AI returned nothing. Try again.',
  prompt_too_large:'That was too much at once. Try a shorter message or a smaller photo.',
  not_configured:'The AI isn\'t set up on the server yet (missing keys in Vercel).',
  offline:'You\'re offline. Connect to the internet and try again.'
};
const errText = e => ERR[e?.code] || e?.message || 'Something went wrong reaching the AI. Try again.';
function hardFail(e){ if (e?.code === 'unauthorized') Auth.signOut(); }

// Shrink a photo to ~1024 px JPEG so uploads stay small and fast.
function photoToBase64(file){
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve({ mime:'image/jpeg', data:c.toDataURL('image/jpeg', 0.85).split(',')[1] });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject({ code:'image_rejected', message:'That photo couldn\'t be read. Try a JPEG or PNG.' }); };
    img.src = url;
  });
}

const AI = {
  async json(input, opts = {}){
    if (!navigator.onLine) throw { code:'offline' };
    const token = await Auth.token();
    if (!token) throw { code:'unauthorized' };
    const images = opts.images ? await Promise.all([...opts.images].map(photoToBase64)) : [];
    let res;
    try {
      res = await fetch('/api/ai', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + token },
        body: JSON.stringify({ input, images, tier: opts.modelTier === 'quick' ? 'quick' : 'default', json:true }) });
    } catch { throw { code:'offline' }; }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw { code: body.code || 'upstream_error', message: body.message };
    return body.json;
  }
};

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
