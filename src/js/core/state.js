// App state, local load, save helpers and sync with Supabase
const S = {
  view: 'today',
  auth: { status:'loading' },
  profile: { data:{}, targets:null, targetsSource:null, nextQuestion:null, quick:[], onboarded:false, onboardedAt:null, flags:[] },
  chat: { turns:[] },
  plan: null,
  progress: { weighins:[], checkins:[] },
  logs: {},
  busy: { chat:false, log:false, plan:false, recipe:null },
  draft: { chat:'', log:'', ask:'' },
  logSlot: slotNow(),
  logPhoto: null,
  logPhotoAfter: null,
  logResult: null,
  planDay: (new Date().getDay() + 6) % 7,
  openRecipe: null,
  err: {},
  sample: null, sampleOK: true, canImages: true, synced: false
};
function resetState(){
  Object.assign(S, {
    profile: { data:{}, targets:null, targetsSource:null, nextQuestion:null, quick:[], onboarded:false, onboardedAt:null, flags:[] },
    chat: { turns:[] }, plan: null, progress: { weighins:[], checkins:[] }, logs: {},
    busy: { chat:false, log:false, plan:false, recipe:null }, draft: { chat:'', log:'', ask:'' },
    logResult: null, logPhoto: null, logPhotoAfter: null, openRecipe: null, err: {}, synced: false, confirmReset: false,
    hist: null, histLoading: false, weekAsked: null, kRange: null, wRange: null
  });
}
function loadLocal(){
  S.profile = merge(S.profile, Store.local('profile') || {});
  S.chat = Store.local('chat') || S.chat;
  S.plan = Store.local('plan');
  S.progress = merge(S.progress, Store.local('progress') || {});
  const t = dkey(); S.logs[t] = Store.local('log-' + t) || {items:[]};
}
const save = {
  profile(){ Store.save('profile', S.profile); },
  chat(){
    // Keep the last 60 messages; move the start of today's conversation with them.
    const cut = Math.max(0, S.chat.turns.length - 60);
    if (cut) { S.chat.turns = S.chat.turns.slice(cut); S.chat.start = Math.max(0, (S.chat.start || 0) - cut); }
    Store.save('chat', S.chat);
  },
  plan(){ Store.save('plan', S.plan); },
  progress(){ Store.save('progress', S.progress); },
  log(k = dkey()){ Store.save('log-' + k, S.logs[k]); }
};
async function syncRemote(){
  const uid = Store.uid;
  const today = dkey(); S.logs[today] = S.logs[today] || Store.local('log-' + today) || { items:[] };
  const keys = ['profile','chat','plan','progress','log-' + today];
  const vals = await Promise.all(keys.map(k => Store.remote(k)));
  if (uid !== Store.uid) return; // signed out meanwhile
  // Whichever copy was saved last wins, as a whole: merging would let an older
  // copy bring back values that were deliberately cleared (e.g. old targets).
  const current = { profile:S.profile, chat:S.chat, plan:S.plan, progress:S.progress, ['log-' + today]:S.logs[today] };
  vals.forEach((v, i) => {
    const k = keys[i], local = current[k];
    const localAt = local?._at || 0, remoteAt = v?._at || 0;
    if (v && (remoteAt >= localAt || !localAt)) {
      if (k === 'profile') S.profile = { data:{}, targets:null, targetsSource:null, quick:[], onboarded:false, onboardedAt:null, flags:[], ...v };
      else if (k === 'chat') S.chat = v;
      else if (k === 'plan') S.plan = v;
      else if (k === 'progress') S.progress = { weighins:[], checkins:[], ...v };
      else S.logs[today] = v;
    } else if (local && localAt) {
      Store.save(k, local); // this device has the newer copy: send it up
    }
  });
  S.synced = true;
  if (!S.profile.onboarded && !S.ob) { startOnboarding(); return; } // new users start with the quick setup
  render();
}
