// Top-level render: sign-in gate, nav tabs, current view, shared banners
function render(){
  const authed = S.auth.status === 'signed-in';
  document.body.classList.toggle('signed-out', !authed);
  if (!authed) { $('#tabs').innerHTML = ''; $('#view').innerHTML = vAuth(); restoreAuthDraft(); return; }
  $('#tabs').innerHTML = TABS.map(([k, l]) => `<button class="tab" data-act="nav" data-v="${k}" ${S.view === k ? 'aria-current="page"' : ''}>${ICONS[k]}<span>${l}</span></button>`).join('');
  $('#railFoot').innerHTML = `<span class="muted">${esc(S.auth.email || '')}</span><button class="btn ghost small" data-act="signout">Sign out</button>`;
  const v = { today:vToday, coach:vCoach, plan:vPlan, shop:vShop, progress:vProgress }[S.view]();
  $('#view').innerHTML = v;
  if (S.view === 'coach') scrollChat();
  const lt = $('#logText'); if (lt) lt.value = S.draft.log;
  const ct = $('#chatText'); if (ct) ct.value = S.draft.chat;
  const at = $('#askText'); if (at) at.value = S.draft.ask;
}

function statusBanner(){
  if (!navigator.onLine) return `<div class="notice warn">You're offline. Everything you log is kept on this phone and syncs when you're back online. The dietitian needs a connection.</div>`;
  if (S.saveError) return `<div class="notice warn">Couldn't save to your account just now. Your changes are kept on this device; they sync on the next save.</div>`;
  return '';
}
