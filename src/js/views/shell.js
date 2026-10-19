// Top-level render: nav tabs, current view, shared banners
function render(){
  $('#tabs').innerHTML = TABS.map(([k, l]) => `<button class="tab" data-act="nav" data-v="${k}" ${S.view === k ? 'aria-current="page"' : ''}>${ICONS[k]}<span>${l}</span></button>`).join('');
  $('#railFoot').textContent = Store.db ? 'Saved privately to your Claude account.' : 'Saved in this browser only.';
  const v = { today:vToday, coach:vCoach, plan:vPlan, shop:vShop, progress:vProgress }[S.view]();
  $('#view').innerHTML = v;
  if (S.view === 'coach') scrollChat();
  const lt = $('#logText'); if (lt) lt.value = S.draft.log;
  const ct = $('#chatText'); if (ct) ct.value = S.draft.chat;
  const at = $('#askText'); if (at) at.value = S.draft.ask;
}

function claudeBanner(){
  if (S.sampleOK !== false) return '';
  return `<div class="notice warn">Your dietitian runs on Claude. Open this page on claude.ai while signed in and allow Claude when it asks. Manual logging, plans you already have and progress tracking keep working without it.</div>`;
}
