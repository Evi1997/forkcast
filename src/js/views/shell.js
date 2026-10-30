// Top-level render: sign-in gate, nav tabs, current view, shared banners
function render(){
  const authed = S.auth.status === 'signed-in';
  document.body.classList.toggle('signed-out', !authed);
  if (S.view !== 'coach' && S.aboutOpen) { S.aboutOpen = null; document.body.classList.remove('sheet-open'); }
  if (!authed) { $('#tabs').innerHTML = ''; $('#view').innerHTML = vAuth(); restoreAuthDraft(); return; }
  document.body.classList.toggle('onboarding', !!S.ob);
  document.body.dataset.sec = S.ob && !S.obDone ? (obVisible()[Math.min(S.ob.q, obVisible().length - 1)]?.sec || '') : '';
  if (S.ob) { $('#tabs').innerHTML = ''; $('#view').innerHTML = S.obDone ? vObDone() : vOnboarding(); document.querySelectorAll('textarea.grow').forEach(growBox); return; }
  $('#tabs').innerHTML = TABS.map(([k, l]) => `<button class="tab" data-act="nav" data-v="${k}" ${S.view === k ? 'aria-current="page"' : ''}>${ICONS[k]}<span>${l}</span></button>`).join('');
  $('#railFoot').innerHTML = `<span class="muted">${esc(S.auth.email || '')}</span><button class="btn ghost small" data-act="signout">Sign out</button>`;
  if (S.view === 'coach' && !S.busy.chat) maybeNewSession();
  const v = { today:vToday, coach:vCoach, plan:vPlan, shop:vShop, progress:vProgress }[S.view]();
  const view = $('#view');
  if (render.last !== S.view) { render.last = S.view; view.classList.add('entering'); clearTimeout(render.t); render.t = setTimeout(() => view.classList.remove('entering'), 400); }
  view.innerHTML = v + (S.toast ? `<div class="toast" role="status"><span>${esc(S.toast)}</span>${S.toastUndo ? '<button data-act="undo">Undo</button>' : ''}</div>` : '');
  if (S.view === 'coach') scrollChat();
  const lt = $('#logText'); if (lt) lt.value = S.draft.log;
  const ct = $('#chatText'); if (ct) { ct.value = S.draft.chat; fitChatBox(); }
  document.body.classList.toggle('on-coach', S.view === 'coach');
  document.body.classList.toggle('on-today', S.view === 'today');
  if (S.view === 'plan') keepDayInView();
  if (S.view !== 'progress' && S.ckSheet) { S.ckSheet = null; document.body.classList.remove('sheet-open'); }
  if (S.view !== 'shop' && S.storeSheet) { S.storeSheet = null; document.body.classList.remove('sheet-open'); }
  if (S.view !== 'plan' && S.planSheet) { S.planSheet = null; document.body.classList.remove('sheet-open'); }
  if (S.view === 'plan' && S.plan?.days) loadDayPhotos(Math.min(S.planDay, S.plan.days.length - 1));
  const at = $('#askText'); if (at) at.value = S.draft.ask;
}

function statusBanner(){
  if (!navigator.onLine) return `<div class="notice warn">You're offline. Everything you log is kept on this phone and syncs when you're back online. The dietitian needs a connection.</div>`;
  if (S.saveError) return `<div class="notice warn">Couldn't save to your account just now. Your changes are kept on this device; they sync on the next save.</div>`;
  return '';
}
