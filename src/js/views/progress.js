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

function vProgress(){
  const w = [...S.progress.weighins].sort((a, b) => a.date.localeCompare(b.date));
  const avg = end => { const win = w.filter(y => { const d = daysBetween(y.date, end); return d >= 0 && d < 7; }); return win.reduce((a, y) => a + +y.weight, 0) / win.length; };
  const now = w.length ? avg(w[w.length - 1].date) : null;
  const diff = w.length > 1 ? now - +w[0].weight : null, span = w.length > 1 ? daysBetween(w[0].date, w[w.length - 1].date) : 0;
  const days = new Set(S.profile.loggedDays || []), mon = fromKey(mondayOf());
  const logged = DAYS.filter((l, i) => { const d = new Date(mon); d.setDate(d.getDate() + i); return days.has(dkey(d)); }).length;
  const lastCk = S.progress.checkins.slice(-1)[0]?.date || S.profile.onboardedAt, ckIn = lastCk ? 7 - daysBetween(lastCk, dkey()) : 0;
  const tile = (label, value, sub, act) => `<${act ? `button class="tile tile-btn" data-act="${act}"` : 'div class="tile"'}><span class="label">${label}</span><b class="num">${value}</b><span class="muted">${sub}</span></${act ? 'button' : 'div'}>`;
  return `
  <div class="head"><div><div class="label">Trends over single readings</div><h1>Progress</h1></div></div>
  <div class="tiles">
    ${tile('Weight', now ? now.toFixed(1) + '<small> kg</small>' : '–', now ? '7-day average' : 'Log your first weigh-in')}
    ${tile('Change', diff === null ? '–' : (Math.abs(diff) < 0.1 ? 'Steady' : (diff < 0 ? '↓ ' : '↑ ') + Math.abs(diff).toFixed(1) + '<small> kg</small>'), diff === null ? 'Needs 2 weigh-ins' : `over ${span >= 14 ? Math.round(span / 7) + ' weeks' : span + ' days'}`)}
    ${tile('Logged', logged + '<small>/7</small>', 'days this week')}
    ${tile('Check-in', ckIn <= 0 ? 'Due' : `${ckIn}<small> day${ckIn > 1 ? 's' : ''}</small>`, ckIn <= 0 ? 'Tap to start' : 'until the next one', 'cksheet')}
  </div>
  <section class="card stack">
    <div class="row" style="justify-content:space-between"><h2>Weight trend</h2><span class="muted" style="font-size:.8rem">Trend matters more than one day</span></div>
    ${weightChart()}
  </section>
  <section class="card stack">
    <h2>Log weight</h2>
    <div class="weigh-row"><div class="unit-input"><input type="number" id="wKg" step="0.1" inputmode="decimal" aria-label="Weight in kg" value="${w.length ? w[w.length-1].weight : (S.profile.data.basics?.weight_kg || '')}"><span>kg</span></div><button class="btn primary" data-act="weigh">Save</button></div>
    <details class="plan-notes"><summary>Another day or add waist</summary>
      <div class="fields two" style="margin-top:10px"><div class="field"><label for="wDate">Date</label><input type="date" id="wDate" value="${dkey()}" max="${dkey()}"></div>
      <div class="field"><label for="wWaist">Waist (cm)</label><input type="number" id="wWaist" step="0.5" inputmode="decimal"></div></div>
    </details>
    ${w.length ? `<details class="plan-notes"><summary>Recent weigh-ins</summary><div class="hist">${w.slice(-8).reverse().map(x => `<div class="mrow"><span class="mname">${fromKey(x.date).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'})}${x.waist ? ` <span class="muted">· waist ${x.waist} cm</span>` : ''}</span><span class="num">${x.weight} kg</span><button class="x small-x" data-act="delw" data-d="${x.date}" aria-label="Remove weigh-in">×</button></div>`).join('')}</div></details>` : ''}
  </section>
  ${S.ckSheet ? checkinSheet() : ''}`;
}

function checkinSheet(){
  const ck = S.ck || (S.ck = { adherence:7, hunger:5, energy:7 }), enter = S.ckSheet === 'enter' ? ' enter' : '';
  return `<div class="scrim${enter}" data-act="cksheet"></div>
  <div class="sheet${enter}" role="dialog" aria-modal="true" aria-label="Weekly check-in">
    <div class="grip" aria-hidden="true"></div>
    <div class="sheet-head"><h2>Weekly check-in</h2><button class="x close" data-act="cksheet" aria-label="Close">×</button></div>
    <p class="muted" style="font-size:.88rem">Two minutes. Your dietitian looks at the trend and adjusts the plan with you.</p>
    <div class="sliders">${[['adherence','Followed the plan'],['hunger','Hunger'],['energy','Energy']].map(([k, l]) => `<div class="sl"><label for="ck-${k}"><span>${l}</span><span class="num">${ck[k]}/10</span></label><input type="range" min="1" max="10" id="ck-${k}" data-ck="${k}" value="${ck[k]}"></div>`).join('')}</div>
    <div class="field"><label for="ckWeak">How did ${S.profile.focus ? esc(S.profile.focus.weak_point.toLowerCase()) : 'your weak point'} go?</label><input type="text" id="ckWeak" placeholder="e.g. Saturday was fine, Sunday brunch got away from me"></div>
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
