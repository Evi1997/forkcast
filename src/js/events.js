// All user interactions, wired by data-act attributes
document.addEventListener('input', e => {
  const id = e.target.id;
  if (id === 'logText') S.draft.log = e.target.value;
  if (id === 'chatText') { S.draft.chat = e.target.value; fitChatBox(); }
  if (id === 'askText') S.draft.ask = e.target.value;
  if (id === 'mealName' && S.logResult) S.logResult.name = e.target.value;
  if (id === 'coachName') { S.profile.data.coach = { ...(S.profile.data.coach || {}), name: e.target.value.slice(0, 20) }; clearTimeout(window._cn); window._cn = setTimeout(() => { save.profile(); const t = $('.chat-title b'); if (t) t.textContent = coachName(); }, 500); }
  if (e.target.classList?.contains('grow')) growBox(e.target);
  if (e.target.dataset.field && S.ob) { const v = e.target.value; obSet(e.target.dataset.field, e.target.type === 'number' ? (v === '' ? '' : Number(v)) : v); }
  if (e.target.dataset.edit && S.logResult?.review) {
    // Live edit of a reviewed item; totals update without redrawing the form.
    const [n, f] = e.target.dataset.edit.split('.'), it = S.logResult.review[+n];
    it[f] = ['kcal','protein','carbs','fat'].includes(f) ? Math.max(0, Number(e.target.value) || 0) : e.target.value;
    const tot = sumItems(S.logResult.review); const k = $('#revKcal'), p = $('#revPfc');
    if (k) k.textContent = tot.kcal; if (p) p.innerHTML = pfc(tot);
  }
  if (e.target.dataset.ck) { S.ck[e.target.dataset.ck] = +e.target.value; e.target.previousElementSibling.lastElementChild.textContent = e.target.value + '/10'; }
});
document.addEventListener('change', e => {
  if (e.target.id === 'photo') { S.logPhoto = e.target.files?.[0] || null; render(); }
  if (e.target.id === 'photoAfter') { S.logPhotoAfter = e.target.files?.[0] || null; render(); }
  if (e.target.id === 'photoLeft') { leftoversFromPhoto(e.target.files?.[0]); e.target.value = ''; }
  if (e.target.id === 'saveMeal' && S.logResult) S.logResult.save = e.target.checked;
  if (e.target.dataset.act === 'check') {
    const k = e.target.dataset.k;
    const P = curPlan(); if (!P) return;
    if (k.startsWith('x-')) { const x = (P.extra || []).find(x => 'x-' + x.id === k); if (x) x.done = e.target.checked; }
    else { P.checked = P.checked || {}; P.checked[k] = e.target.checked; }
    save.plan(); render();
  }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'obForm') {
    // Return moves to the next box; the step only advances with Continue.
    e.preventDefault();
    const fields = [...e.target.querySelectorAll('input,textarea')], i = fields.indexOf(document.activeElement);
    if (i >= 0 && fields[i + 1]) fields[i + 1].focus(); else obNext();
    return;
  }
  if (e.target.id === 'moreForm') { e.preventDefault(); addToReview($('#moreText').value); return; }
  if (e.target.id === 'addItemForm') {
    e.preventDefault();
    const name = $('#extraName').value.trim(); if (!name) return;
    const P = curPlan(); if (!P) return; P.extra = [...(P.extra || []), { id:uid(), name, done:false }]; save.plan(); render(); $('#extraName')?.focus(); return;
  }
  if (e.target.id === 'storeForm') {
    e.preventDefault();
    const name = $('#storeName').value.trim(); if (!name) return;
    S.shopStore = name; S.storeOther = false;
    const sh = S.profile.data.shopping || {};
    if (!String(sh.supermarkets || '').toLowerCase().includes(name.toLowerCase())) { S.profile.data = merge(S.profile.data, { shopping:{ supermarkets: [sh.supermarkets, name].filter(Boolean).join(', ') } }); save.profile(); }
    render(); return;
  }
  if (e.target.id !== 'authForm') return;
  e.preventDefault();
  const email = $('#authEmail').value.trim(), pass = $('#authPass').value;
  S.authDraft = { email, pass };
  if (!email || pass.length < 6) { S.auth.error = 'Enter your email and a password of at least 6 characters.'; render(); return; }
  Auth.submit(S.auth.mode, email, pass);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && S.sheet) { closeSheet(); return; }
  if (e.key === 'Escape' && S.appleOpen) { S.appleOpen = null; document.body.classList.remove('sheet-open'); render(); return; }
  if (e.key === 'Escape' && S.prep) { closePrep(); return; }
  if (e.key === 'Escape' && S.shopOpen) { S.shopOpen = null; S.storePick = false; document.body.classList.remove('sheet-open'); render(); return; }
  if (e.key === 'Escape' && S.swap) { S.swap = null; document.body.classList.remove('sheet-open'); render(); return; }
  if (e.key === 'Escape' && S.planSheet) { S.planSheet = null; document.body.classList.remove('sheet-open'); render(); return; }
  if (e.key === 'Escape' && S.aboutOpen) { if (S.profilePage) { S.profilePage = null; render(); return; } S.aboutOpen = null; document.body.classList.remove('sheet-open'); render(); return; }
  if (e.key === 'Enter' && !e.shiftKey && ['chatText','askText','logText'].includes(e.target.id)) {
    e.preventDefault();
    if (e.target.id === 'chatText') sendChat(S.draft.chat);
    if (e.target.id === 'askText') { S.view = 'coach'; sendChat(S.draft.ask); }
    if (e.target.id === 'logText') { S.logResult = null; analyseFood(S.draft.log); }
  }
});
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act],[data-ob],[data-obm]'); if (!el || el.dataset.act === 'check') return;
  const a = el.dataset.act;
  const go = v => { S.view = v; render(); window.scrollTo(0, 0); };
  if (a === 'nav') { go(el.dataset.v); try { localStorage.setItem(LS + 'view', el.dataset.v); } catch {} }
  else if (a === 'send') sendChat(S.draft.chat);
  else if (a === 'quick') { if (el.dataset.q === 'Weekly check-in') { go('progress'); S.ckSheet = 'enter'; document.body.classList.add('sheet-open'); render(); S.ckSheet = true; } else sendChat(el.dataset.q); }
  else if (a === 'ask') { const t = S.draft.ask; go('coach'); sendChat(t); }
  else if (a === 'askquick') { go('coach'); sendChat(el.dataset.q); }
  else if (a === 'nophoto') { e.preventDefault(); S.logPhoto = null; S.logPhotoAfter = null; render(); }
  else if (a === 'noafter') { e.preventDefault(); S.logPhotoAfter = null; render(); }
  else if (a === 'about') {
    if (S.aboutOpen) { S.aboutOpen = null; S.profilePage = null; S.confirmReset = false; document.body.classList.remove('sheet-open'); render(); }
    else { S.profilePage = null; S.aboutOpen = 'enter'; document.body.classList.add('sheet-open'); render(); S.aboutOpen = true; }
  }
  else if (a === 'newchat') { maybeNewSession(true); render(); scrollChat(); }
  else if (a === 'history') { S.chat.history = true; render(); $('.msgs')?.scrollTo(0, 0); }
  else if (a === 'profpage') { S.profilePage = el.dataset.p || null; S.confirmReset = false; render(); $('.profile-sheet')?.scrollTo(0, 0); }
  else if (a === 'coachtone') { S.profile.data.coach = { ...(S.profile.data.coach || {}), tone: el.dataset.v }; save.profile(); render(); }
  else if (a === 'startob') startOnboarding();
  else if (a === 'editob') { S.aboutOpen = null; S.profilePage = null; document.body.classList.remove('sheet-open'); startOnboarding(true); }
  else if (a === 'obnext') obNext();
  else if (a === 'obskip') obNext(true);
  else if (a === 'obfinish') finishOnboarding();
  else if (a === 'obfix') obFix();
  else if (a === 'obback') obBack();
  else if (a === 'obclose') closeOnboarding();
  else if (el.dataset.ob) {
    // Single-choice answers move straight on (lesson-style); a short pause shows the tick.
    obSet(el.dataset.ob, el.dataset.v); S.ob.tried = false; render();
  }
  else if (el.dataset.obm) {
    // Multi-choice: "None" clears the others, picking anything clears "None".
    const path = el.dataset.obm, v = el.dataset.v; let cur = String(obGet(path) || '').split(', ').filter(Boolean);
    cur = cur.includes(v) ? cur.filter(x => x !== v) : v === 'None' ? ['None'] : [...cur.filter(x => x !== 'None'), v];
    obSet(path, cur.join(', ')); render();
  }
  else if (a === 'hidetip') { try { localStorage.setItem(LS + 'tipHidden', dkey()); } catch {} render(); }
  else if (a === 'gotoday') gotoDay(el.dataset.k);
  else if (a === 'krange') { S.kRange = el.dataset.v; render(); }
  else if (a === 'wrange') { S.wRange = el.dataset.v; render(); }
  else if (a === 'progday') { S.view = 'today'; try { localStorage.setItem(LS + 'view', 'today'); } catch {} gotoDay(el.dataset.k); }
  else if (a === 'prevweek') shiftDay(-7);
  else if (a === 'nextweek') shiftDay(7);
  else if (a === 'openlog') openSheet(el.dataset.s);
  else if (a === 'closesheet') closeSheet();
  else if (a === 'apple') {
    if (S.appleOpen) { S.appleOpen = null; document.body.classList.remove('sheet-open'); render(); }
    else { S.appleOpen = 'enter'; document.body.classList.add('sheet-open'); render(); S.appleOpen = true; }
  }
  else if (a === 'togglemeal') { S.openMeal = S.openMeal === el.dataset.s ? null : el.dataset.s; render(); }
  else if (a === 'example') { S.draft.log = S.draft.log.trim() ? S.draft.log.trim() + ', ' + el.dataset.t.toLowerCase() : el.dataset.t; render(); $('#logText')?.focus(); }
  else if (a === 'manualmode') { S.sheet.manual = !S.sheet.manual; render(); }
  else if (a === 'confirmlog') confirmLog();
  else if (a === 'editlog') { S.logResult = null; render(); }
  else if (a === 'dropitem') { S.logResult.review.splice(+el.dataset.n, 1); S.logResult.editing = null; render(); }
  else if (a === 'edititem') { S.logResult.editing = +el.dataset.n; render(); $(`#e-amount-${el.dataset.n}`)?.focus(); }
  else if (a === 'addrow') { S.logResult.adding = true; render(); $('#moreText')?.focus(); }
  else if (a === 'togglesave') { S.logResult.save = !S.logResult.save; render(); }
  else if (a === 'doneedit') { S.logResult.editing = null; render(); }
  else if (a === 'usesaved') useSaved(el.dataset.id);
  else if (a === 'forgetsaved') forgetSaved(el.dataset.id);
  else if (a === 'allmeals') { S.sheet.allMeals = !S.sheet.allMeals; render(); }
  else if (a === 'editmeal') editMeal(el.dataset.s);
  else if (a === 'slot') { S.logSlot = el.dataset.s; render(); }
  else if (a === 'log') { S.logResult = null; analyseFood(S.draft.log); }
  else if (a === 'clarify') analyseFood(S.logResult.text, el.dataset.o);
  else if (a === 'bestguess') { S.logResult = { review:S.logResult.items, feedback:null }; render(); }
  else if (a === 'del') {
    const day = vday(), L = S.logs[day], idx = L.items.findIndex(i => i.id === el.dataset.id); if (idx < 0) return;
    const [gone] = L.items.splice(idx, 1); save.log(day);
    showToast(`Removed ${gone.name}`, () => { L.items.splice(idx, 0, gone); save.log(day); }); render();
  }
  else if (a === 'undo') { const u = S.toastUndo; S.toast = null; S.toastUndo = null; if (u) u(); render(); }
  else if (a === 'manual') {
    const n = $('#mName').value.trim(); if (!n) { $('#mName').focus(); return; }
    const slot = S.sheet?.slot || S.logSlot;
    addItems([{ name:n, kcal:$('#mK').value, protein:$('#mP').value, carbs:$('#mC').value, fat:$('#mF').value, slot, amount:'manual entry' }]);
    showToast(`Added to ${slot} · ${r0($('#mK').value)} kcal`); closeSheet();
  }
  else if (a === 'theme') { setTheme(el.dataset.v); render(); }
  else if (a === 'genplan') generatePlan();
  else if (a === 'planweek') { S.planWeek = +el.dataset.v; S.planDay = S.planWeek ? 0 : (new Date().getDay() + 6) % 7; S.err.plan = null; render(); window.scrollTo(0, 0); }
  else if (a === 'repeatweek') repeatWeek();
  else if (a === 'swapmeal') openSwap(+el.dataset.i, +el.dataset.j);
  else if (a === 'swappick') { S.swap.pick = +el.dataset.n; render(); }
  else if (a === 'swapmore') moreSwaps();
  else if (a === 'swapuse') useSwap();
  else if (a === 'closeswap') { S.swap = null; document.body.classList.remove('sheet-open'); render(); }
  else if (a === 'shopopen') { S.shopOpen = 'enter'; document.body.classList.add('sheet-open'); render(); S.shopOpen = true; }
  else if (a === 'closeshop') { S.shopOpen = null; S.storePick = false; S.shopStore = null; S.storeOther = false; document.body.classList.remove('sheet-open'); render(); }
  else if (a === 'storepick') { S.storePick = !S.storePick; S.shopStore = null; render(); }
  else if (a === 'prepstart') {
    if (!curPlan()?.prep?.length) { S.shopOpen = 'enter'; document.body.classList.add('sheet-open'); render(); S.shopOpen = true; return; }
    S.shopOpen = null; S.prep = { s:0, i:-1 }; document.body.classList.add('sheet-open', 'prepping'); prepWake(true); render();
  }
  else if (a === 'prepsession') { S.prep.s = +el.dataset.s; render(); }
  else if (a === 'prepnext') { S.prep.i++; render(); $('.prep-body')?.scrollTo(0, 0); }
  else if (a === 'prepback') { S.prep.i = Math.max(-1, S.prep.i - 1); render(); }
  else if (a === 'prepclose') closePrep();
  else if (a === 'preptimer') startTimer(+el.dataset.m);
  else if (a === 'deltimer') { S.timers = (S.timers || []).filter(t => t.id !== el.dataset.id); render(); }
  else if (a === 'day') { S.planDay = +el.dataset.i; render(); }
  else if (a === 'planmeal') { S.planSheet = { i:+el.dataset.i, j:+el.dataset.j, enter:true }; document.body.classList.add('sheet-open'); render(); S.planSheet.enter = false; }
  else if (a === 'closeplan') { S.planSheet = null; document.body.classList.remove('sheet-open'); render(); }
  else if (a === 'recipe') loadRecipe(el.dataset.k, curPlan().days[+el.dataset.i].meals[+el.dataset.j]);
  else if (a === 'logmeal') {
    const m = curPlan().days[+el.dataset.i].meals[+el.dataset.j];
    const slot = SLOTS.includes(m.slot) ? m.slot : slotNow();
    addItems([{ name:m.name, amount:m.portion, kcal:m.kcal, protein:m.p, carbs:m.c, fat:m.f, slot }], dkey());
    S.planSheet = null; document.body.classList.remove('sheet-open');
    showToast(`Added to today's ${slot.toLowerCase()} · ${r0(m.kcal)} kcal`); render();
  }
  else if (a === 'clearchecks') { const P = curPlan(); P.checked = {}; (P.extra || []).forEach(x => x.done = false); save.plan(); render(); }
  else if (a === 'genshop') { const st = S.shopStore || curPlan()?.store || storeOptions()[0]; S.shopStore = st; S.storeOther = false; S.storePick = false; generateShopping(st).then(() => { S.shopStore = null; render(); }); }
  else if (a === 'store') { S.shopStore = el.dataset.s; S.storeOther = false; render(); }
  else if (a === 'storeother') { S.storeOther = !S.storeOther; render(); $('#storeName')?.focus(); }
  else if (a === 'delextra') {
    const P = curPlan(), before = P.extra || [], gone = before.find(x => 'x-' + x.id === el.dataset.k);
    P.extra = before.filter(x => x !== gone); save.plan();
    if (gone) showToast(`Removed ${gone.name}`, () => { P.extra = before; save.plan(); }); render();
  }
  else if (a === 'weigh') {
    const kg = parseFloat($('#wKg').value), date = $('#wDate')?.value || dkey(), waist = parseFloat($('#wWaist')?.value);
    if (!kg || kg < 25 || kg > 350) { $('#wKg').focus(); return; }
    S.progress.weighins = S.progress.weighins.filter(x => x.date !== date).concat([{ date, weight: Math.round(kg*10)/10, ...(waist ? { waist } : {}) }]).sort((x, y) => x.date.localeCompare(y.date)).slice(-120);
    if (date === dkey()) { S.profile.data = merge(S.profile.data, { basics:{ weight_kg: Math.round(kg*10)/10 } }); save.profile(); }
    save.progress(); showToast(`Saved ${Math.round(kg*10)/10} kg`); render();
  }
  else if (a === 'delw') {
    const before = S.progress.weighins; S.progress.weighins = before.filter(x => x.date !== el.dataset.d); save.progress();
    showToast('Removed weigh-in', () => { S.progress.weighins = before; save.progress(); }); render();
  }
  else if (a === 'startcheckin') { go('progress'); S.ckSheet = 'enter'; document.body.classList.add('sheet-open'); render(); S.ckSheet = true; }
  else if (a === 'cksheet') {
    if (S.ckSheet) { S.ckSheet = null; document.body.classList.remove('sheet-open'); }
    else { S.ckSheet = 'enter'; document.body.classList.add('sheet-open'); }
    render(); if (S.ckSheet) S.ckSheet = true;
  }
  else if (a === 'checkin') {
    const v = id => $('#' + id).value.trim();
    const c = { date:dkey(), ...S.ck, sleep:v('ckSleep'), digestion:v('ckDig'), training:v('ckTrain'), loved:v('ckLoved'), disliked:v('ckDisliked'), changes:v('ckChange'), weak:v('ckWeak'), notes:v('ckNotes') };
    S.progress.checkins = S.progress.checkins.concat([c]).slice(-52); save.progress();
    const w = [...S.progress.weighins].slice(-6).map(x => `${x.date}: ${x.weight} kg${x.waist ? `, waist ${x.waist} cm` : ''}`).join('; ');
    const msg = `Weekly check-in.\nAdherence ${c.adherence}/10 · hunger ${c.hunger}/10 · energy ${c.energy}/10` +
      (c.sleep ? `\nSleep: ${c.sleep}` : '') + (c.digestion ? `\nDigestion: ${c.digestion}` : '') + (c.training ? `\nTraining: ${c.training}` : '') +
      (c.weak ? `\nWeak point${S.profile.focus ? ' (' + S.profile.focus.weak_point + ')' : ''}: ${c.weak}` : '') + (c.loved ? `\nLoved: ${c.loved}` : '') + (c.disliked ? `\nDisliked / tired of: ${c.disliked}` : '') + (c.changes ? `\nChanges: ${c.changes}` : '') +
      (c.notes ? `\nNotes: ${c.notes}` : '') + (w ? `\nRecent weigh-ins: ${w}` : '');
    S.ck = null; S.ckSheet = null; document.body.classList.remove('sheet-open'); go('coach'); sendChat(msg);
  }
  else if (a === 'askweak') { go('coach'); sendChat(S.profile.focus ? `Let's talk about my weak point (${S.profile.focus.weak_point}). What else could help?` : 'I want to talk about what I think holds me back.'); }
  else if (a === 'authmode') { S.authDraft = { email: $('#authEmail')?.value || '' }; S.auth = { status:'signed-out', mode: S.auth.mode === 'signup' ? 'signin' : 'signup' }; render(); }
  else if (a === 'forgot') { const em = $('#authEmail')?.value.trim(); S.authDraft = { email: em }; Auth.reset(em); }
  else if (a === 'signout') { S.authDraft = { email: S.auth.email }; Auth.signOut(); }
  else if (a === 'reset') { S.confirmReset = true; render(); }
  else if (a === 'reset-no') { S.confirmReset = false; render(); }
  else if (a === 'reset-yes') {
    ['profile','chat','plan','plan-next','progress','log-' + dkey()].forEach(k => Store.remove(k));
    S.profile = { data:{}, targets:null, targetsSource:null, nextQuestion:null, quick:[], onboarded:false, onboardedAt:null, flags:[] };
    S.chat = { turns:[] }; S.plan = null; S.planNext = null; S.progress = { weighins:[], checkins:[] }; S.logs = { [dkey()]: { items:[] } }; S.confirmReset = false; render();
  }
});
// Hide the bottom menu only while the on-screen keyboard is really open.
// (On iPhone a text box can stay focused after the keyboard closes, so focus
// alone isn't a reliable signal; the visible viewport shrinking is.)
function syncKeyboard(){
  const vv = window.visualViewport;
  const open = !!vv && window.innerWidth <= 820 && vv.height < window.innerHeight * 0.78;
  document.body.classList.toggle('kb-open', open);
}
window.visualViewport?.addEventListener('resize', () => {
  syncKeyboard();
  const f = document.activeElement;
  if (document.body.classList.contains('kb-open') && f && f.closest('.onboard')) f.scrollIntoView({ block:'center', behavior:'instant' });
});
document.addEventListener('focusout', () => setTimeout(syncKeyboard, 300));

// Text boxes that grow with their content (no clipped lines).
function growBox(t){ t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; }

function closePrep(){ S.prep = null; document.body.classList.remove('sheet-open', 'prepping'); prepWake(false); render(); }
