// App state, local load, save helpers and sync with the Claude db
const S = {
  view: 'today',
  profile: { data:{}, targets:null, targetsSource:null, nextQuestion:null, quick:[], onboarded:false, onboardedAt:null, flags:[] },
  chat: { turns:[] },
  plan: null,
  progress: { weighins:[], checkins:[] },
  logs: {},
  busy: { chat:false, log:false, plan:false, recipe:null },
  draft: { chat:'', log:'', ask:'' },
  logSlot: slotNow(),
  logPhoto: null,
  logResult: null,
  planDay: (new Date().getDay() + 6) % 7,
  openRecipe: null,
  err: {},
  sample: null, sampleOK: null, canImages: false, synced: false
};
function loadLocal(){
  S.profile = merge(S.profile, Store.local('profile') || {});
  S.chat = Store.local('chat') || S.chat;
  S.plan = Store.local('plan');
  S.progress = merge(S.progress, Store.local('progress') || {});
  const t = dkey(); S.logs[t] = Store.local('log-' + t) || {items:[]};
}
const save = {
  profile(){ Store.save('profile', S.profile); },
  chat(){ S.chat.turns = S.chat.turns.slice(-60); Store.save('chat', S.chat); },
  plan(){ Store.save('plan', S.plan); },
  progress(){ Store.save('progress', S.progress); },
  log(k = dkey()){ Store.save('log-' + k, S.logs[k]); }
};
async function syncRemote(){
  const ok = await Store.init();
  if (!ok) { render(); return; }
  const keys = ['profile','chat','plan','progress','log-' + dkey()];
  const vals = await Promise.all(keys.map(k => Store.remote(k)));
  vals.forEach((v, i) => {
    const k = keys[i];
    if (v) {
      if (k === 'profile') S.profile = merge(S.profile, v);
      else if (k === 'chat') S.chat = v;
      else if (k === 'plan') S.plan = v;
      else if (k === 'progress') S.progress = merge({weighins:[],checkins:[]}, v);
      else S.logs[dkey()] = v;
    } else {
      const local = Store.local(k);
      if (local) Store.save(k, local);
    }
  });
  S.synced = true;
  render();
}
