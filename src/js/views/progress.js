// Weight chart, weigh-ins and weekly check-in
function weightChart(){
  const w = [...S.progress.weighins].sort((a, b) => a.date.localeCompare(b.date));
  if (w.length < 2) return `<div class="empty" style="padding:24px"><p>${w.length ? 'One weigh-in so far. Add a few more and the trend line appears; one reading on its own says little.' : 'Add your first weigh-in. Weighing 2–3 times a week, same time of day, gives a trend worth reading.'}</p></div>`;
  const W = 360, H = 190, L = 38, R = 12, T = 12, B = 26;
  const t0 = fromKey(w[0].date).getTime(), t1 = Math.max(fromKey(w[w.length-1].date).getTime(), t0 + 864e5);
  const vals = w.map(x => +x.weight); let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max((hi - lo) * 0.15, 0.5); lo = Math.floor((lo - pad) * 2) / 2; hi = Math.ceil((hi + pad) * 2) / 2;
  const X = d => L + (fromKey(d).getTime() - t0) / (t1 - t0) * (W - L - R);
  const Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  const avg = w.map(x => { const win = w.filter(y => daysBetween(y.date, x.date) >= 0 && daysBetween(y.date, x.date) < 7); return { date:x.date, v: win.reduce((a, y) => a + +y.weight, 0) / win.length }; });
  const ticks = [lo, (lo + hi) / 2, hi];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend">
    ${ticks.map(v => `<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end" font-size="11.5" fill="var(--muted)" font-family="Plus Jakarta Sans, system-ui, sans-serif">${v.toFixed(1)}</text>`).join('')}
    <text x="${L}" y="${H-8}" font-size="11.5" fill="var(--muted)" font-family="Plus Jakarta Sans, system-ui, sans-serif">${fromKey(w[0].date).toLocaleDateString(undefined,{day:'numeric',month:'short'})}</text>
    <text x="${W-R}" y="${H-8}" text-anchor="end" font-size="11.5" fill="var(--muted)" font-family="Plus Jakarta Sans, system-ui, sans-serif">${fromKey(w[w.length-1].date).toLocaleDateString(undefined,{day:'numeric',month:'short'})}</text>
    <path d="M${avg.map(a => `${X(a.date)},${Y(a.v)}`).join(' L')} L${X(avg[avg.length-1].date)},${H-B} L${X(avg[0].date)},${H-B}Z" fill="var(--accent)" opacity=".08"/>
    <polyline points="${avg.map(a => `${X(a.date)},${Y(a.v)}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>
    ${w.map(x => `<circle cx="${X(x.date)}" cy="${Y(+x.weight)}" r="3" fill="var(--muted)"/>`).join('')}
    <circle cx="${X(avg[avg.length-1].date)}" cy="${Y(avg[avg.length-1].v)}" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>
  </svg>
  <div class="row muted" style="font-size:.8rem"><span style="display:inline-block;width:14px;height:3px;background:var(--accent)"></span>7-day average <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--muted);margin-left:10px"></span>single weigh-ins</div>`;
}

// This week's food logs (Mon–Sun) for the story and the calorie bars: from the
// device first, then once from the account.
function weekLogs(){
  const mon = fromKey(mondayOf()), today = dkey();
  return DAYS.map((l, i) => {
    const d = new Date(mon); d.setDate(d.getDate() + i); const k = dkey(d);
    if (k <= today && !S.logs[k]) {
      S.logs[k] = Store.local('log-' + k) || { items:[] };
      S.weekAsked = S.weekAsked || {};
      if (!S.weekAsked[k]) { S.weekAsked[k] = true; Store.remote('log-' + k).then(v => { if (v?.items) { S.logs[k] = v; if (S.view === 'progress') render(); } }).catch(() => {}); }
    }
    const items = S.logs[k]?.items || [];
    return { l, k, future: k > today, today: k === today, logged: items.length > 0, ...sumItems(items) };
  });
}

// One sentence that answers "how is my week going?", led by what matters for
// the person's goal: protein for tone and muscle, calories for fat loss.
function weekStory(week, t){
  const done = week.filter(d => d.logged && !d.today), base = done.length ? done : week.filter(d => d.logged);
  const n = base.length, soFar = !done.length;
  if (!n) return { title:'A fresh week', sub:'Log a meal and this week\'s story starts here.' };
  if (!t) return { title:`You logged ${n} day${n > 1 ? 's' : ''} this week.`, sub:'Finish your setup to see calories and protein against your goals.' };
  const p = base.filter(d => d.protein >= t.protein * .9).length, r = base.filter(d => d.kcal >= t.kcal * .85 && d.kcal <= t.kcal * 1.1).length;
  const of = soFar ? 'so far today' : `${n} day${n > 1 ? 's' : ''}`, good = x => x >= Math.ceil(n * .7);
  const strat = S.profile.targets ? calcTargets(S.profile.data)?.strategy : t.strategy;
  if (['recomposition','recomp_cut','surplus'].includes(strat)) return soFar
    ? { title: p ? 'Protein on target today.' : `${r0(base[0].protein)} of ${t.protein} g protein so far.`, sub:'Protein is what turns your training into tone.' }
    : { title:`Protein on target ${p} of ${n} days.`, sub: good(p) ? (strat === 'surplus' ? 'That\'s what turns training into muscle.' : 'That\'s what builds tone.') : 'An easy win: add a protein to breakfast.' };
  if (strat === 'deficit') return soFar
    ? { title:`${r0(base[0].kcal).toLocaleString()} of ${t.kcal.toLocaleString()} kcal so far.`, sub:'Steady weeks beat perfect days.' }
    : { title:`Calories in your range ${r} of ${n} days.`, sub: good(r) ? 'Steady weeks beat perfect days.' : 'Your dietitian can suggest a few easy swaps.' };
  return soFar ? { title:'Good start to the week.', sub:`${r0(base[0].kcal).toLocaleString()} kcal and ${r0(base[0].protein)} g protein so far.` }
    : { title:`Balanced on ${r} of ${n} days.`, sub:`Protein on target ${p} day${p === 1 ? '' : 's'}.` };
}

function weekBars(week, t){
  const done = week.filter(d => d.logged && !d.today), avg = done.length ? Math.round(done.reduce((a, d) => a + d.kcal, 0) / done.length / 10) * 10 : null;
  const top = Math.max(t?.kcal ? t.kcal * 1.25 : 0, ...week.map(d => d.kcal), 1);
  const goalY = t?.kcal ? (1 - t.kcal / top) * 100 : null;
  // "Above goal" only matters when the plan is a deficit; for tone or muscle a bit more is fine.
  const strat = S.profile.targets ? calcTargets(S.profile.data)?.strategy : t?.strategy, flagOver = ['deficit','recomp_cut'].includes(strat);
  return `<section class="card week-card" aria-label="Calories this week">
    <div class="row" style="justify-content:space-between"><h2>Calories</h2><span class="muted num">${avg ? `avg ${avg.toLocaleString()}` : ''}</span></div>
    ${!week.some(d => d.logged) ? `<div class="wbars ghost" aria-hidden="true">${[46,62,54,70,58,40,50].map((h, i) => `<span class="wbar"><span class="col"><span class="fill" style="height:${h}%"></span></span><span class="dl">${DAYS[i][0]}</span></span>`).join('')}</div><p class="muted" style="font-size:.84rem">Each day you log becomes a bar here, with a dot when protein is on target.</p>` : `
    <div class="wbars">${goalY !== null ? `<span class="wgoal" style="top:${goalY.toFixed(1)}%"></span>` : ''}
      ${week.map(d => { const h = d.kcal ? Math.max(4, d.kcal / top * 100) : 0, over = flagOver && t?.kcal && d.kcal > t.kcal * 1.15, hit = t?.protein && d.protein >= t.protein * .9;
        const lab = `${fromKey(d.k).toLocaleDateString(undefined,{weekday:'long'})}: ${d.future ? 'still to come' : d.logged ? `${r0(d.kcal)} kcal, ${r0(d.protein)} g protein${hit ? ', protein on target' : ''}` : 'nothing logged'}`;
        return `<button class="wbar${d.today ? ' now' : ''}" ${d.future ? 'disabled' : `data-act="progday" data-k="${d.k}"`} aria-label="${lab}"><span class="col">${hit ? '<i class="pdot" aria-hidden="true"></i>' : ''}<span class="fill${over ? ' over' : ''}${!d.logged ? ' none' : ''}" style="height:${h}%"></span></span><span class="dl">${d.l[0]}</span></button>`; }).join('')}
    </div>
    <div class="wlegend muted">${t?.kcal ? '<span><i class="lg-goal"></i>Goal</span>' : ''}${t?.protein ? '<span><i class="lg-dot"></i>Protein on target</span>' : ''}${flagOver ? '<span><i class="lg-over"></i>Above goal</span>' : ''}</div>`}
  </section>`;
}

function vProgress(){
  const w = [...S.progress.weighins].sort((a, b) => a.date.localeCompare(b.date));
  const avg = end => { const win = w.filter(y => { const d = daysBetween(y.date, end); return d >= 0 && d < 7; }); return win.reduce((a, y) => a + +y.weight, 0) / win.length; };
  const now = w.length ? avg(w[w.length - 1].date) : null;
  const diff = w.length > 1 ? now - +w[0].weight : null, span = w.length > 1 ? daysBetween(w[0].date, w[w.length - 1].date) : 0;
  const t = targets(), week = weekLogs(), story = weekStory(week, t), n = leafCount();
  const lastCk = S.progress.checkins.slice(-1)[0]?.date || S.profile.onboardedAt, ckIn = lastCk ? 7 - daysBetween(lastCk, dkey()) : 0;
  const mon = fromKey(mondayOf()), sun = new Date(mon); sun.setDate(sun.getDate() + 6);
  const range = `${mon.toLocaleDateString(undefined,{day:'numeric',month:'short'})} – ${sun.toLocaleDateString(undefined,{day:'numeric',month:'short'})}`;
  const change = diff === null ? '' : Math.abs(diff) < 0.2 ? 'steady' : `${diff < 0 ? '↓' : '↑'} ${Math.abs(diff).toFixed(1)} kg`;
  return `
  <div class="head"><div><div class="label">${range}</div><h1>Progress</h1></div></div>
  <section class="story" aria-live="polite"><span class="label">This week</span><p class="story-t">${esc(story.title)}</p><p class="story-s">${esc(story.sub)}</p></section>
  ${weekBars(week, t)}
  <div class="duo">
    <a class="tile mini" href="#weight"><span class="label">Weight trend</span>${now ? `<b class="num">${now.toFixed(1)}<small> kg</small></b>${change ? `<span class="chip-s">${change}${span ? ` · ${span >= 14 ? Math.round(span / 7) + ' wk' : span + ' d'}` : ''}</span>` : '<span class="muted">Add one more for a trend</span>'}` : '<b class="num">–</b><span class="muted">Add a weigh-in</span>'}</a>
    <button class="tile mini plant-tile" data-act="plant" aria-label="Your plant: ${n} leaves">${plantSVG(n, 40)}<span><b class="num">${n}</b><span class="muted">${n === 1 ? 'leaf' : 'leaves'}</span></span></button>
  </div>
  <button class="focus-row" data-act="cksheet"><span class="fr-txt"><b>Weekly check-in</b><span class="muted">Two minutes to fine-tune your plan.</span></span><span class="ck-pill${ckIn <= 0 ? ' due' : ''}">${ckIn <= 0 ? 'Check in' : `in ${ckIn} day${ckIn > 1 ? 's' : ''}`}</span></button>
  <section class="card stack" id="weight">
    <div class="row" style="justify-content:space-between"><h2>Weight</h2><span class="muted" style="font-size:.8rem">${w.length > 1 ? '7-day average' : 'Same time of day works best'}</span></div>
    ${w.length > 1 ? weightChart() : `<p class="muted" style="font-size:.9rem">${w.length ? 'One weigh-in so far. Add a couple more this week and the trend line appears.' : 'Weigh in 2–3 times a week. The trend line appears after two.'}</p>`}
    <div class="weigh-row"><div class="unit-input"><input type="number" id="wKg" step="0.1" inputmode="decimal" aria-label="Weight in kg" value="${w.length ? w[w.length-1].weight : (S.profile.data.basics?.weight_kg || '')}"><span>kg</span></div><button class="btn primary" data-act="weigh">Save</button></div>
    ${w.length ? `<div class="wlist"><span class="label">Recent</span>${w.slice(-4).reverse().map((x, i, arr) => {
      const prev = w[w.length - 2 - i], d = prev ? +x.weight - +prev.weight : null;
      return `<div class="wrow"><span class="wdate"><b>${fromKey(x.date).toLocaleDateString(undefined,{weekday:'short'})}</b> ${fromKey(x.date).toLocaleDateString(undefined,{day:'numeric',month:'short'})}</span>${d === null ? '' : `<span class="wdelta">${Math.abs(d) < 0.05 ? 'same' : (d < 0 ? '↓ ' : '↑ ') + Math.abs(d).toFixed(1)}</span>`}<b class="num wkg">${x.weight}<small> kg</small></b><button class="x small-x" data-act="delw" data-d="${x.date}" aria-label="Remove weigh-in of ${fromKey(x.date).toLocaleDateString(undefined,{day:'numeric',month:'long'})}">×</button></div>`; }).join('')}</div>` : ''}
  </section>
  ${S.ckSheet ? checkinSheet() : ''}
  ${S.plantOpen ? plantSheet() : ''}`;
}

function checkinSheet(){
  const ck = S.ck || (S.ck = { adherence:7, hunger:5, energy:7 }), enter = S.ckSheet === 'enter' ? ' enter' : '';
  return `<div class="scrim${enter}" data-act="cksheet"></div>
  <div class="sheet${enter}" role="dialog" aria-modal="true" aria-label="Weekly check-in">
    <div class="grip" aria-hidden="true"></div>
    <div class="sheet-head"><h2>Weekly check-in</h2><button class="x close" data-act="cksheet" aria-label="Close">×</button></div>
    <p class="muted" style="font-size:.88rem">Two minutes. Your dietitian looks at the trend and adjusts the plan with you.</p>
    <div class="sliders">${[['adherence','Followed the plan'],['hunger','Hunger'],['energy','Energy']].map(([k, l]) => `<div class="sl"><label for="ck-${k}"><span>${l}</span><span class="num">${ck[k]}/10</span></label><input type="range" min="1" max="10" id="ck-${k}" data-ck="${k}" value="${ck[k]}"></div>`).join('')}</div>
    <div class="field"><label for="ckWeak">What made this week harder? (optional)</label><input type="text" id="ckWeak" placeholder="e.g. Saturday was fine, Sunday brunch got away from me"></div>
    <details class="plan-notes"><summary>More details (optional)</summary>
      <div class="stack" style="margin-top:10px">
        <div class="field"><label for="ckSleep">Sleep</label><input type="text" id="ckSleep" placeholder="~7 h, waking at night"></div>
        <div class="field"><label for="ckDig">Digestion</label><input type="text" id="ckDig" placeholder="Fine / bloated / …"></div>
        <div class="field"><label for="ckTrain">Training</label><input type="text" id="ckTrain" placeholder="3 gym sessions, felt strong"></div>
        <div class="field"><label for="ckLoved">Meals you loved</label><input type="text" id="ckLoved"></div>
        <div class="field"><label for="ckDisliked">Meals you're tired of</label><input type="text" id="ckDisliked"></div>
        <div class="field"><label for="ckChange">Anything changed?</label><input type="text" id="ckChange" placeholder="Schedule, budget, supermarket…"></div>
        <div class="field"><label for="ckNotes">Cravings, difficulties, social events</label><textarea id="ckNotes" rows="2"></textarea></div>
      </div>
    </details>
    <div class="sheet-actions"><button class="btn primary big-btn" data-act="checkin">Send to my dietitian</button></div>
  </div>`;
}

// The answer first: current 7-day average and change since the first weigh-in.
function trendSummary(){
  const w = [...S.progress.weighins].sort((a, b) => a.date.localeCompare(b.date));
  if (w.length < 2) return '';
  const avg = end => { const win = w.filter(y => { const d = daysBetween(y.date, end); return d >= 0 && d < 7; }); return win.reduce((a, y) => a + +y.weight, 0) / win.length; };
  const now = avg(w[w.length - 1].date), first = +w[0].weight, diff = now - first, days = daysBetween(w[0].date, w[w.length - 1].date);
  const span = days >= 14 ? `${Math.round(days / 7)} weeks` : `${days} days`;
  const dir = Math.abs(diff) < 0.1 ? 'steady' : (diff < 0 ? '↓ ' : '↑ ') + Math.abs(diff).toFixed(1) + ' kg';
  return `<div class="trend-head"><span class="big num">${now.toFixed(1)}<span class="muted" style="font-size:1rem;font-weight:700"> kg</span></span><span class="trend-pill">${dir} in ${span}</span></div>
  <p class="muted" style="font-size:.82rem">7-day average. Day-to-day changes are mostly water, so the trend matters more than any single weigh-in.</p>`;
}
