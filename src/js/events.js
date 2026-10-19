// All user interactions, wired by data-act attributes
document.addEventListener('input', e => {
  const id = e.target.id;
  if (id === 'logText') S.draft.log = e.target.value;
  if (id === 'chatText') { S.draft.chat = e.target.value; fitChatBox(); }
  if (id === 'askText') S.draft.ask = e.target.value;
  if (e.target.dataset.ck) { S.ck[e.target.dataset.ck] = +e.target.value; e.target.previousElementSibling.lastElementChild.textContent = e.target.value + '/10'; }
});
document.addEventListener('change', e => {
  if (e.target.id === 'photo') { S.logPhoto = e.target.files?.[0] || null; render(); }
  if (e.target.dataset.act === 'check') { S.plan.checked = S.plan.checked || {}; S.plan.checked[e.target.dataset.k] = e.target.checked; save.plan(); render(); }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'authForm') return;
  e.preventDefault();
  const email = $('#authEmail').value.trim(), pass = $('#authPass').value;
  S.authDraft = { email, pass };
  if (!email || pass.length < 6) { S.auth.error = 'Enter your email and a password of at least 6 characters.'; render(); return; }
  Auth.submit(S.auth.mode, email, pass);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && S.sheet) { closeSheet(); return; }
  if (e.key === 'Escape' && S.aboutOpen) { S.aboutOpen = null; document.body.classList.remove('sheet-open'); render(); return; }
  if (e.key === 'Enter' && !e.shiftKey && ['chatText','askText','logText'].includes(e.target.id)) {
    e.preventDefault();
    if (e.target.id === 'chatText') sendChat(S.draft.chat);
    if (e.target.id === 'askText') { S.view = 'coach'; sendChat(S.draft.ask); }
    if (e.target.id === 'logText') { S.logResult = null; analyseFood(S.draft.log); }
  }
});
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.dataset.act === 'check') return;
  const a = el.dataset.act;
  const go = v => { S.view = v; render(); window.scrollTo(0, 0); };
  if (a === 'nav') { go(el.dataset.v); try { localStorage.setItem(LS + 'view', el.dataset.v); } catch {} }
  else if (a === 'send') sendChat(S.draft.chat);
  else if (a === 'quick') sendChat(el.dataset.q);
  else if (a === 'ask') { const t = S.draft.ask; go('coach'); sendChat(t); }
  else if (a === 'askquick') { go('coach'); sendChat(el.dataset.q); }
  else if (a === 'nophoto') { e.preventDefault(); S.logPhoto = null; render(); }
  else if (a === 'about') {
    if (S.aboutOpen) { S.aboutOpen = null; document.body.classList.remove('sheet-open'); render(); }
    else { S.aboutOpen = 'enter'; document.body.classList.add('sheet-open'); render(); S.aboutOpen = true; }
  }
  else if (a === 'openlog') openSheet(el.dataset.s);
  else if (a === 'closesheet') closeSheet();
  else if (a === 'togglemeal') { S.openMeal = S.openMeal === el.dataset.s ? null : el.dataset.s; render(); }
  else if (a === 'example') { S.draft.log = S.draft.log.trim() ? S.draft.log.trim() + ', ' + el.dataset.t.toLowerCase() : el.dataset.t; render(); $('#logText')?.focus(); }
  else if (a === 'manualmode') { S.sheet.manual = !S.sheet.manual; render(); }
  else if (a === 'confirmlog') confirmLog();
  else if (a === 'editlog') { S.logResult = null; render(); }
  else if (a === 'dropitem') { S.logResult.review.splice(+el.dataset.n, 1); render(); }
  else if (a === 'slot') { S.logSlot = el.dataset.s; render(); }
  else if (a === 'log') { S.logResult = null; analyseFood(S.draft.log); }
  else if (a === 'clarify') analyseFood(S.logResult.text, el.dataset.o);
  else if (a === 'bestguess') { S.logResult = { review:S.logResult.items, feedback:null }; render(); }
  else if (a === 'del') { const L = S.logs[dkey()]; L.items = L.items.filter(i => i.id !== el.dataset.id); save.log(); render(); }
  else if (a === 'manual') {
    const n = $('#mName').value.trim(); if (!n) { $('#mName').focus(); return; }
    const slot = S.sheet?.slot || S.logSlot;
    addItems([{ name:n, kcal:$('#mK').value, protein:$('#mP').value, carbs:$('#mC').value, fat:$('#mF').value, slot, amount:'manual entry' }]);
    showToast(`Added to ${slot} · ${r0($('#mK').value)} kcal`); closeSheet();
  }
  else if (a === 'genplan') generatePlan();
  else if (a === 'day') { S.planDay = +el.dataset.i; S.openRecipe = null; render(); }
  else if (a === 'recipe') loadRecipe(el.dataset.k, S.plan.days[+el.dataset.i].meals[+el.dataset.j]);
  else if (a === 'logmeal') {
    const m = S.plan.days[+el.dataset.i].meals[+el.dataset.j];
    addItems([{ name:m.name, amount:m.portion, kcal:m.kcal, protein:m.p, carbs:m.c, fat:m.f, slot:SLOTS.includes(m.slot) ? m.slot : slotNow() }]);
    el.textContent = '✓ Logged'; el.disabled = true;
  }
  else if (a === 'clearchecks') { S.plan.checked = {}; save.plan(); render(); }
  else if (a === 'weigh') {
    const kg = parseFloat($('#wKg').value), date = $('#wDate').value || dkey(), waist = parseFloat($('#wWaist').value);
    if (!kg || kg < 25 || kg > 350) { $('#wKg').focus(); return; }
    S.progress.weighins = S.progress.weighins.filter(x => x.date !== date).concat([{ date, weight: Math.round(kg*10)/10, ...(waist ? { waist } : {}) }]).sort((x, y) => x.date.localeCompare(y.date)).slice(-120);
    if (date === dkey()) { S.profile.data = merge(S.profile.data, { basics:{ weight_kg: Math.round(kg*10)/10 } }); save.profile(); }
    save.progress(); render();
  }
  else if (a === 'delw') { S.progress.weighins = S.progress.weighins.filter(x => x.date !== el.dataset.d); save.progress(); render(); }
  else if (a === 'checkin') {
    const v = id => $('#' + id).value.trim();
    const c = { date:dkey(), ...S.ck, sleep:v('ckSleep'), digestion:v('ckDig'), training:v('ckTrain'), loved:v('ckLoved'), disliked:v('ckDisliked'), changes:v('ckChange'), weak:v('ckWeak'), notes:v('ckNotes') };
    S.progress.checkins = S.progress.checkins.concat([c]).slice(-52); save.progress();
    const w = [...S.progress.weighins].slice(-6).map(x => `${x.date}: ${x.weight} kg${x.waist ? `, waist ${x.waist} cm` : ''}`).join('; ');
    const msg = `Weekly check-in.\nAdherence ${c.adherence}/10 · hunger ${c.hunger}/10 · energy ${c.energy}/10` +
      (c.sleep ? `\nSleep: ${c.sleep}` : '') + (c.digestion ? `\nDigestion: ${c.digestion}` : '') + (c.training ? `\nTraining: ${c.training}` : '') +
      (c.weak ? `\nWeak point${S.profile.focus ? ' (' + S.profile.focus.weak_point + ')' : ''}: ${c.weak}` : '') + (c.loved ? `\nLoved: ${c.loved}` : '') + (c.disliked ? `\nDisliked / tired of: ${c.disliked}` : '') + (c.changes ? `\nChanges: ${c.changes}` : '') +
      (c.notes ? `\nNotes: ${c.notes}` : '') + (w ? `\nRecent weigh-ins: ${w}` : '');
    S.ck = null; go('coach'); sendChat(msg);
  }
  else if (a === 'askweak') { go('coach'); sendChat(S.profile.focus ? `Let's talk about my weak point (${S.profile.focus.weak_point}). What else could help?` : 'I want to talk about what I think holds me back.'); }
  else if (a === 'authmode') { S.authDraft = { email: $('#authEmail')?.value || '' }; S.auth = { status:'signed-out', mode: S.auth.mode === 'signup' ? 'signin' : 'signup' }; render(); }
  else if (a === 'forgot') { const em = $('#authEmail')?.value.trim(); S.authDraft = { email: em }; Auth.reset(em); }
  else if (a === 'signout') { S.authDraft = { email: S.auth.email }; Auth.signOut(); }
  else if (a === 'reset') { S.confirmReset = true; render(); }
  else if (a === 'reset-no') { S.confirmReset = false; render(); }
  else if (a === 'reset-yes') {
    ['profile','chat','plan','progress','log-' + dkey()].forEach(k => Store.remove(k));
    S.profile = { data:{}, targets:null, targetsSource:null, nextQuestion:null, quick:[], onboarded:false, onboardedAt:null, flags:[] };
    S.chat = { turns:[] }; S.plan = null; S.progress = { weighins:[], checkins:[] }; S.logs = { [dkey()]: { items:[] } }; S.confirmReset = false; render();
  }
});
