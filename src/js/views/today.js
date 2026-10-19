// Today: calorie ring, macros, focus tips, food logging, streak
function vToday(){
  const t = targets(), log = S.logs[dkey()] || {items:[]}, eaten = sumItems(log.items);
  const kcalT = t?.kcal || 0, left = kcalT - eaten.kcal, pct = kcalT ? Math.min(eaten.kcal / kcalT, 1) : 0;
  const C = 2 * Math.PI * 78;
  const now = new Date();
  const overdue = S.profile.onboarded && (() => { const last = S.progress.checkins.slice(-1)[0]?.date || S.profile.onboardedAt; return last && daysBetween(last, dkey()) >= 7; })();
  const bar = (label, val, tgt, color) => `<div class="macro"><div class="top"><b>${label}</b><span class="num">${r0(val)}${tgt ? ` <span class="muted">/ ${tgt} g</span>` : ' g'}</span></div><div class="bar"><span style="width:${tgt ? Math.min(val/tgt*100,100) : 0}%;background:${color}"></span></div></div>`;
  return `
  <div class="head"><div><div class="label">${now.toLocaleDateString(undefined,{weekday:'long', day:'numeric', month:'long'})}</div><h1>${eaten.kcal ? 'Today\'s fuel' : 'What\'s on the plate today?'}</h1></div>
  ${streakPill()}</div>
  ${statusBanner()}
  ${!S.profile.onboarded ? `<div class="notice accent row" style="justify-content:space-between"><span><b>Start with a first consultation.</b> Your dietitian will ask about your body, health, routine and tastes before setting any targets.</span><button class="btn primary small" data-act="nav" data-v="coach">${S.chat.turns.length ? 'Continue consultation' : 'Begin'}</button></div>` : ''}
  ${overdue ? `<div class="notice accent row" style="justify-content:space-between"><span><b>It's check-in week.</b> A two-minute follow-up so your plan keeps fitting your life.</span><button class="btn primary small" data-act="nav" data-v="progress">Check in</button></div>` : ''}
    <section class="card hero fuel" aria-label="Calories and macros">
      <div class="ring">
        <svg viewBox="0 0 176 176"><circle cx="88" cy="88" r="78" fill="none" stroke="var(--hero-track)" stroke-width="16"/>
        <circle cx="88" cy="88" r="78" fill="none" stroke="${left < 0 ? 'var(--amber)' : 'var(--accent)'}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" style="transition:stroke-dashoffset .6s ease"/></svg>
        <div class="center">${t ? `<span class="big">${Math.abs(left).toLocaleString()}</span><span class="label">${left >= 0 ? 'kcal left' : 'kcal over'}</span><span class="muted num" style="font-size:.8rem;margin-top:6px">${eaten.kcal} / ${kcalT}</span>` : `<span class="big">${eaten.kcal}</span><span class="label">kcal eaten</span>`}</div>
      </div>
      <div class="macros">
        ${bar('Protein', eaten.protein, t?.protein, 'var(--pink)')}
        ${bar('Carbs', eaten.carbs, t?.carbs, 'var(--amber)')}
        ${bar('Fat', eaten.fat, t?.fat, 'var(--blue)')}
        ${bar('Fiber', eaten.fiber, t?.fiber, 'var(--accent)')}
        <p class="muted" style="font-size:.8rem">${t ? `<span class="tag est">Estimated</span> ${S.profile.targets ? 'Targets set with your dietitian.' : 'Mifflin-St Jeor estimate from your profile.'}` : 'Targets appear once your dietitian knows your age, height, weight and goal.'}</p>
      </div>
    </section>
  ${focusCard()}
  <section class="card stack" aria-label="Log food">
    <h2>Log what you ate</h2>
    <div class="segmented" role="group" aria-label="Meal">${SLOTS.map(s => `<button data-act="slot" data-s="${s}" aria-pressed="${S.logSlot === s}">${s}</button>`).join('')}</div>
    <div class="logbox">
      <textarea id="logText" rows="3" placeholder="What did you have? e.g. 2 eggs, avocado toast and a cappuccino" aria-label="What you ate"></textarea>
      ${S.logPhoto ? `<div class="logphoto"><img class="thumb" alt="Meal photo" src="${URL.createObjectURL(S.logPhoto)}"><span>Photo added</span><button class="x" data-act="nophoto" aria-label="Remove photo">×</button></div>` : ''}
      <div class="logbar">
        ${S.canImages ? `<label class="iconbtn" for="photo" title="Add a photo" aria-label="Add a photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.5"/></svg></label><input class="hidden-file" type="file" id="photo" accept="image/*">` : ''}
        <button class="btn primary logsend" data-act="log" ${S.busy.log ? 'disabled' : ''}>${S.busy.log ? '<span class="spinner"></span> Counting…' : 'Count it'}</button>
      </div>
    </div>
    ${S.err.log ? `<div class="notice warn">${esc(S.err.log)}</div>` : ''}
    ${S.logResult?.clarify ? `<div class="notice accent stack"><b>${esc(S.logResult.clarify)}</b><div class="row">${S.logResult.options.map(o => `<button class="chip" data-act="clarify" data-o="${esc(o)}">${esc(o)}</button>`).join('')}${S.logResult.items.length ? `<button class="btn ghost small" data-act="bestguess">Log the best guess</button>` : ''}</div></div>` : ''}
    ${S.logResult?.feedback ? `<div class="notice">${S.logResult.added ? `<b>Logged ${S.logResult.added} item${S.logResult.added > 1 ? 's' : ''}.</b> ` : ''}${esc(S.logResult.feedback)}</div>` : ''}
    <details><summary class="muted" style="cursor:pointer;font-size:.9rem">Add manually</summary>
      <div class="fields" style="margin-top:10px">
        <div class="field" style="grid-column:span 2"><label for="mName">Food</label><input type="text" id="mName" placeholder="Protein bar"></div>
        <div class="field"><label for="mK">kcal</label><input type="number" id="mK" inputmode="numeric"></div>
        <div class="field"><label for="mP">Protein g</label><input type="number" id="mP" inputmode="numeric"></div>
        <div class="field"><label for="mC">Carbs g</label><input type="number" id="mC" inputmode="numeric"></div>
        <div class="field"><label for="mF">Fat g</label><input type="number" id="mF" inputmode="numeric"></div>
      </div>
      <div class="row" style="margin-top:10px"><button class="btn" data-act="manual">Add to ${S.logSlot}</button></div>
    </details>
  </section>`;
}

function focusCard(){
  const f = S.profile.focus;
  if (!f) return S.profile.data.basics?.age ? `<section class="card row" style="justify-content:space-between"><span><span class="label">Your focus</span><br><b>What do you think holds you back most?</b> <span class="muted">Weekends, evenings, eating out… naming it lets your dietitian plan around it.</span></span><button class="btn small" data-act="askweak">Tell my dietitian</button></section>` : '';
  return `<section class="card stack focus" aria-label="Your focus"><div class="row" style="justify-content:space-between"><div><div class="label">Your focus this week</div><h2>${esc(f.weak_point)}</h2></div><button class="btn small" data-act="askweak">Talk it through</button></div>
  ${f.why ? `<p class="muted">${esc(f.why)}</p>` : ''}
  <ol class="tips">${f.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ol></section>`;
}

function streakPill(){
  const days = new Set(S.profile.loggedDays || []), mon = fromKey(mondayOf()), n = streak();
  const dots = DAYS.map((l, i) => { const d = new Date(mon); d.setDate(d.getDate() + i); const k = dkey(d); return `<span class="${days.has(k) ? 'on' : ''} ${k === dkey() ? 'today' : ''}" title="${l}">${l[0]}</span>`; }).join('');
  return `<div class="streak" aria-label="${n} day logging streak"><span class="flame" aria-hidden="true">🔥</span><div><div class="n">${n}</div><div class="label" style="font-size:.7rem">day streak</div></div><div class="week-dots">${dots}</div></div>`;
}
