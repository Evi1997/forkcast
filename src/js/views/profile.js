// Profile: a round button with your initial, top-right on every tab, opens one
// sheet. Summary first (goal, weight, daily target), then grouped rows; each
// row opens its own page inside the sheet. S.aboutOpen = 'enter' | true,
// S.profilePage = null | 'targets' | 'known' | 'coach'.
const CHEV_R = '<svg class="pr-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
const PR_IC = {
  targets:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>',
  known:'<path d="M5 12.5 10 17l9-10"/>',
  shop:'<path d="M5 8h14l-1.3 11.2a1 1 0 0 1-1 .8H7.3a1 1 0 0 1-1-.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  coach:'<path d="M12 21a9 9 0 1 0-8-4.9L3 21l4.9-1A9 9 0 0 0 12 21z"/>',
  theme:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/>'
};
const prIcon = (k, tone) => `<span class="pr-ic ${tone}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PR_IC[k]}</svg></span>`;

function userInitial(){
  const n = String(S.profile.data.basics?.name || S.auth.email || '?').trim();
  return esc(n[0].toUpperCase());
}
const avatarBtn = () => `<button class="avatar-btn" data-act="about" aria-label="Your profile">${userInitial()}</button>`;

function profileSheet(){
  const enter = S.aboutOpen === 'enter' ? ' enter' : '', page = S.profilePage;
  const titles = { targets:'Targets and macros', known:'What I know about you', coach:'Your dietitian' };
  const head = page
    ? `<div class="sheet-head"><button class="x back-x" data-act="profpage" data-p="" aria-label="Back to your profile"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg></button><h2 style="flex:1">${titles[page]}</h2><button class="x close" data-act="about" aria-label="Close">×</button></div>`
    : `<div class="sheet-head"><span class="avatar-lg" aria-hidden="true">${userInitial()}</span><div style="flex:1;min-width:0"><h2>${esc(S.profile.data.basics?.name || 'Your profile')}</h2><span class="muted pr-mail">${esc(S.auth.email || '')}</span></div><button class="x close" data-act="about" aria-label="Close">×</button></div>`;
  return `<div class="scrim${enter}" data-act="about"></div>
  <div class="sheet profile-sheet${enter}" role="dialog" aria-modal="true" aria-label="${page ? titles[page] : 'Your profile'}">
    <div class="grip" aria-hidden="true"></div>${head}
    ${page === 'targets' ? profTargets() : page === 'known' ? profKnown() : page === 'coach' ? profCoach() : profHome()}
  </div>`;
}

function profHome(){
  const t = targets(), d = S.profile.data, b = d.basics || {};
  const done = SECTIONS.filter(([k]) => sectionDone(k)).length;
  const goal = b.goal ? String(b.goal)[0].toUpperCase() + String(b.goal).slice(1) : '–';
  const row = (act, p, ic, tone, label, value) => `<button class="pr-row" data-act="${act}" ${p ? `data-p="${p}"` : ''}>${prIcon(ic, tone)}<span class="pr-l">${label}</span>${value ? `<span class="pr-v">${value}</span>` : ''}${CHEV_R}</button>`;
  return `
    <div class="pr-tiles">
      <div class="pr-tile"><span class="muted">Goal</span><b>${esc(goal)}</b></div>
      <div class="pr-tile"><span class="muted">Weight</span><b class="num">${b.weight_kg ? esc(b.weight_kg) + '<small> kg</small>' : '–'}</b></div>
      <div class="pr-tile"><span class="muted">Daily</span><b class="num">${t ? t.kcal.toLocaleString() + '<small> kcal</small>' : '–'}</b></div>
    </div>
    ${S.profile.flags?.length ? `<div class="notice warn"><b>Needs medical review.</b> Some answers are best talked through with your doctor. <button class="linkbtn" data-act="profpage" data-p="known">See why</button></div>` : ''}
    <div class="pr-group"><span class="pr-label">Your plan</span><div class="pr-list">
      ${row('profpage', 'targets', 'targets', 'pink', 'Targets and macros', t ? `${t.protein} g protein` : '')}
      ${row('profpage', 'known', 'known', 'orange', 'What I know about you', `${done}/${SECTIONS.length}`)}
      ${row('editob', '', 'shop', 'violet', 'Shopping', esc(String(d.shopping?.supermarkets || 'Add your shop').split(',')[0]))}
    </div></div>
    <div class="pr-group"><span class="pr-label">App</span><div class="pr-list">
      ${row('profpage', 'coach', 'coach', 'green', 'Your dietitian', esc(coachName()))}
      <div class="pr-row pr-stack"><div class="row" style="gap:12px">${prIcon('theme', 'ink')}<span class="pr-l">Appearance</span></div>
        <div class="seg" role="group" aria-label="Appearance">${[['auto','Auto'],['light','Light'],['dark','Dark']].map(([v, l]) => `<button data-act="theme" data-v="${v}" aria-pressed="${themePref() === v}">${l}</button>`).join('')}</div></div>
    </div></div>
    <div class="pr-group"><div class="pr-list">
      <button class="pr-row" data-act="signout"><span class="pr-l">Sign out</span></button>
      ${S.confirmReset ? `<div class="pr-row pr-stack"><b>Erase everything?</b><span class="muted" style="font-size:.88rem">Your profile, conversation, plan, meals and progress are deleted. This can't be undone.</span><div class="row"><button class="btn small danger" data-act="reset-yes">Erase</button><button class="btn ghost small" data-act="reset-no">Keep</button></div></div>`
        : `<button class="pr-row" data-act="reset"><span class="pr-l pr-danger">Start over</span></button>`}
    </div></div>`;
}

function profTargets(){
  const t = targets();
  if (!t) return `<p class="muted">These appear once I know your age, sex, height, weight and goal.</p><button class="btn primary big-btn" data-act="editob">Answer a few questions</button>`;
  return `<div class="pr-tiles">
      <div class="pr-tile"><span class="muted">Energy</span><b class="num">${t.kcal.toLocaleString()}<small> kcal</small></b></div>
      <div class="pr-tile"><span class="muted">Protein</span><b class="num">${t.protein}<small> g</small></b></div>
    </div>
    <div class="pr-list">
      <div class="pr-row static"><span class="pr-l">Carbs</span><span class="pr-v num">${t.carbs} g</span></div>
      <div class="pr-row static"><span class="pr-l">Fat</span><span class="pr-v num">${t.fat} g</span></div>
      <div class="pr-row static"><span class="pr-l">Fiber</span><span class="pr-v num">${t.fiber} g</span></div>
      ${t.tdee ? `<div class="pr-row static"><span class="pr-l">Resting / daily burn</span><span class="pr-v num">${t.bmr} / ${t.tdee}</span></div>` : ''}
    </div>
    <p class="muted pr-note"><span class="tag est">Estimated</span> ${S.profile.targets ? 'Set during your consultation.' : 'Worked out from your answers. Real needs vary; they are fine-tuned from your weight trend.'}</p>`;
}

function profKnown(){
  const done = SECTIONS.filter(([k]) => sectionDone(k)).length;
  return `<div class="progressbar"><span style="width:${done / SECTIONS.length * 100}%"></span></div>
    <div class="pr-list">${SECTIONS.map(([k, l]) => `<div class="pr-row static"><span class="dot ${sectionDone(k) ? 'on' : ''}"></span><span class="pr-l">${l}</span></div>`).join('')}</div>
    ${S.profile.flags?.length ? `<div class="notice warn stack"><span class="tag med">Needs medical review</span>${S.profile.flags.map(f => `<p style="font-size:.88rem">${esc(f)}</p>`).join('')}<p class="muted" style="font-size:.8rem">Forkcast helps organise everyday eating. Changes for these points are best agreed with your doctor or a registered dietitian.</p></div>` : ''}
    <button class="btn primary big-btn" data-act="editob">Edit my answers</button>`;
}

function profCoach(){
  return `<div class="pr-hero"><span class="mascot" aria-hidden="true">${MASCOT}</span><b>${esc(coachName())}</b></div>
    <div class="pr-group"><label class="pr-label" for="coachName">Name</label><input type="text" id="coachName" value="${esc(coachName())}" maxlength="20" autocomplete="off"></div>
    <div class="pr-group"><span class="pr-label">How ${esc(coachName())} talks to you</span>
      <div class="pr-list" role="radiogroup">${COACH_TONES.map(([v, l]) => `<button class="pr-row" role="radio" aria-checked="${coachTone()[0] === v}" data-act="coachtone" data-v="${v}"><span class="pr-l">${l}</span><span class="sw-radio" aria-hidden="true"></span></button>`).join('')}</div>
      <p class="muted pr-note">The advice stays the same; only the tone changes.</p></div>`;
}
