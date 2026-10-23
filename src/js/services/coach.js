// Dietitian chat: sends the conversation, applies profile, targets, focus and log updates
async function sendChat(text){
  text = text.trim();
  if (!text || S.busy.chat) return;
  if (!S.sampleOK) { S.err.chat = 'Sign in to talk to your dietitian.'; render(); return; }
  if (!S.chat.turns.length) S.chat.turns.push({ role:'assistant', content:GREETING, at:Date.now() });
  S.chat.turns.push({ role:'user', content:text, at:Date.now() });
  S.chat.history = false; S.draft.chat = ''; S.draft.ask = ''; S.err.chat = null; S.busy.chat = true;
  save.chat(); render(); scrollChat();
  const history = S.chat.turns.slice(S.chat.start || 0).slice(-20).map(t => ({ role:t.role, content:t.content }));
  const input = PROMPTS.coach(appState(), history);
  try {
    const r = await S.sample.json(input, { cache:false });
    const reply = String(r?.reply || '').trim() || 'Could you tell me a bit more?';
    if (isObj(r.profile_patch)) S.profile.data = merge(S.profile.data, r.profile_patch);
    if (isObj(r.targets) && r.targets.kcal) { S.profile.targets = { kcal:r0(r.targets.kcal), protein:r0(r.targets.protein), carbs:r0(r.targets.carbs), fat:r0(r.targets.fat), fiber:r0(r.targets.fiber) }; S.profile.targetsSource = 'coach'; }
    if (r.onboarding_complete && !S.profile.onboarded) { S.profile.onboarded = true; S.profile.onboardedAt = dkey(); }
    if (isObj(r.focus) && r.focus.weak_point) S.profile.focus = { weak_point:String(r.focus.weak_point), why:String(r.focus.why || ''), tips:(Array.isArray(r.focus.tips) ? r.focus.tips : []).slice(0,5).map(String), at:dkey() };
    if (r.medical_flag) S.profile.flags = [...new Set([...(S.profile.flags || []), String(r.medical_flag)])].slice(-5);
    const q = reply.split(/(?<=[.!?])\s+/).reverse().find(s => s.includes('?'));
    S.profile.nextQuestion = q ? q.replace(/\*\*/g,'') : null;
    S.profile.quick = Array.isArray(r.quick_replies) ? r.quick_replies.slice(0,4).map(String) : [];
    let logged = 0;
    if (Array.isArray(r.log_items) && r.log_items.length) { addItems(r.log_items.map(i => ({...i, slot: SLOTS.includes(i.slot) ? i.slot : slotNow()})), dkey()); logged = r.log_items.length; }
    S.chat.turns.push({ role:'assistant', content:reply, quick:S.profile.quick, flag:r.medical_flag || null, logged, at:Date.now() });
    save.profile(); save.chat();
  } catch (e) {
    hardFail(e); S.err.chat = errText(e);
  }
  S.busy.chat = false; render(); scrollChat();
}
function scrollChat(){ const m = $('.msgs'); if (m) m.scrollTop = m.scrollHeight; }

// A fresh conversation each day (or after 6 quiet hours): a short greeting that
// fits the moment, with suggestions. Earlier messages stay available on request.
// The greeting is written on the device, so it costs no AI call.
function maybeNewSession(force){
  const turns = S.chat.turns, last = turns[turns.length - 1];
  if (!force && (!turns.length || !S.profile.onboarded)) return;
  const lastAt = last?.at || 0, stale = !lastAt || dkey(new Date(lastAt)) !== dkey() || Date.now() - lastAt > 6 * 36e5;
  if (!force && !stale) return;
  if (last?.fresh) turns.pop(); // an untouched old greeting: refresh it instead of stacking
  const h = new Date().getHours(), hi = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const t = targets(), eaten = sumItems(S.logs[dkey()]?.items || []);
  const checkDue = (() => { const l = S.progress.checkins.slice(-1)[0]?.date || S.profile.onboardedAt; return l && daysBetween(l, dkey()) >= 7; })();
  const line = !S.profile.onboarded ? 'Shall we pick up your consultation where we left off?'
    : checkDue ? 'It\'s been a week, so a quick check-in would help me fine-tune your plan.'
    : eaten.kcal && t ? `So far today: ${eaten.kcal} of ${t.kcal} kcal and ${eaten.protein} g protein. How can I help?`
    : 'What would you like to work on today?';
  const quick = !S.profile.onboarded ? ['Let\'s continue'] : [
    ...(checkDue ? ['Weekly check-in'] : []),
    h < 11 ? 'Ideas for breakfast' : h < 16 ? 'Ideas for lunch' : 'What should I have for dinner?',
    'How am I doing this week?', 'I have a question'
  ].slice(0, 4);
  S.chat.start = turns.length;
  turns.push({ role:'assistant', content:`${hi}! ${line}`, quick, at:Date.now(), fresh:true });
  S.chat.history = false;
  save.chat();
}
