// Weight chart, weigh-ins and weekly check-in
function weightChart(){
  const w = [...S.progress.weighins].sort((a, b) => a.date.localeCompare(b.date));
  if (w.length < 2) return `<div class="empty" style="padding:24px"><p>${w.length ? 'One weigh-in so far. Add a few more and the trend line appears; one reading on its own says little.' : 'Add your first weigh-in. Weighing 2–3 times a week, same time of day, gives a trend worth reading.'}</p></div>`;
  const W = 640, H = 220, L = 44, R = 14, T = 14, B = 30;
  const t0 = fromKey(w[0].date).getTime(), t1 = Math.max(fromKey(w[w.length-1].date).getTime(), t0 + 864e5);
  const vals = w.map(x => +x.weight); let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max((hi - lo) * 0.15, 0.5); lo = Math.floor((lo - pad) * 2) / 2; hi = Math.ceil((hi + pad) * 2) / 2;
  const X = d => L + (fromKey(d).getTime() - t0) / (t1 - t0) * (W - L - R);
  const Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  const avg = w.map(x => { const win = w.filter(y => daysBetween(y.date, x.date) >= 0 && daysBetween(y.date, x.date) < 7); return { date:x.date, v: win.reduce((a, y) => a + +y.weight, 0) / win.length }; });
  const ticks = [lo, (lo + hi) / 2, hi];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend">
    ${ticks.map(v => `<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="Plus Jakarta Sans, system-ui, sans-serif">${v.toFixed(1)}</text>`).join('')}
    <text x="${L}" y="${H-8}" font-size="11" fill="var(--muted)" font-family="Plus Jakarta Sans, system-ui, sans-serif">${fromKey(w[0].date).toLocaleDateString(undefined,{day:'numeric',month:'short'})}</text>
    <text x="${W-R}" y="${H-8}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="Plus Jakarta Sans, system-ui, sans-serif">${fromKey(w[w.length-1].date).toLocaleDateString(undefined,{day:'numeric',month:'short'})}</text>
    <path d="M${avg.map(a => `${X(a.date)},${Y(a.v)}`).join(' L')} L${X(avg[avg.length-1].date)},${H-B} L${X(avg[0].date)},${H-B}Z" fill="var(--accent)" opacity=".08"/>
    <polyline points="${avg.map(a => `${X(a.date)},${Y(a.v)}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>
    ${w.map(x => `<circle cx="${X(x.date)}" cy="${Y(+x.weight)}" r="3" fill="var(--muted)"/>`).join('')}
    <circle cx="${X(avg[avg.length-1].date)}" cy="${Y(avg[avg.length-1].v)}" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>
  </svg>
  <div class="row muted" style="font-size:.8rem"><span style="display:inline-block;width:14px;height:3px;background:var(--accent)"></span>7-day average <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--muted);margin-left:10px"></span>single weigh-ins</div>`;
}

function vProgress(){
  const w = [...S.progress.weighins].sort((a, b) => a.date.localeCompare(b.date));
  const ck = S.ck || (S.ck = { adherence:7, hunger:5, energy:7 });
  return `
  <div class="head"><div><div class="label">Trends over single readings</div><h1>Progress</h1></div></div>
  <div class="grid2">
    <section class="card stack"><h2>Weight trend</h2>${weightChart()}</section>
    <section class="card stack">
      <h2>Add a weigh-in</h2>
      <div class="fields">
        <div class="field"><label for="wDate">Date</label><input type="date" id="wDate" value="${dkey()}"></div>
        <div class="field"><label for="wKg">Weight (kg)</label><input type="number" id="wKg" step="0.1" inputmode="decimal" value="${w.length ? w[w.length-1].weight : (S.profile.data.basics?.weight_kg || '')}"></div>
        <div class="field"><label for="wWaist">Waist (cm, optional)</label><input type="number" id="wWaist" step="0.5" inputmode="decimal"></div>
      </div>
      <div class="row"><button class="btn ink" data-act="weigh">Save weigh-in</button></div>
      ${w.length ? `<div class="tablewrap"><table><thead><tr><th>Date</th><th>Weight</th><th>Waist</th><th></th></tr></thead><tbody>${w.slice(-6).reverse().map(x => `<tr><td>${fromKey(x.date).toLocaleDateString(undefined,{day:'numeric',month:'short'})}</td><td class="num">${x.weight} kg</td><td class="num">${x.waist ? x.waist + ' cm' : '–'}</td><td style="text-align:right"><button class="x" data-act="delw" data-d="${x.date}" aria-label="Remove weigh-in">×</button></td></tr>`).join('')}</tbody></table></div>` : ''}
    </section>
  </div>
  <section class="card stack">
    <div class="row" style="justify-content:space-between"><h2>Weekly check-in</h2><span class="muted" style="font-size:.85rem">${S.progress.checkins.length ? 'Last: ' + fromKey(S.progress.checkins.slice(-1)[0].date).toLocaleDateString(undefined,{day:'numeric',month:'short'}) : 'Like a follow-up appointment'}</span></div>
    <div class="sliders">${[['adherence','How closely did you follow the plan?'],['hunger','How hungry were you?'],['energy','How was your energy?']].map(([k, l]) => `<div class="sl"><label for="ck-${k}"><span>${l}</span><span class="num">${ck[k]}/10</span></label><input type="range" min="1" max="10" id="ck-${k}" data-ck="${k}" value="${ck[k]}"></div>`).join('')}</div>
    <div class="fields">
      <div class="field"><label for="ckSleep">Sleep</label><input type="text" id="ckSleep" placeholder="~7 h, waking at night"></div>
      <div class="field"><label for="ckDig">Digestion</label><input type="text" id="ckDig" placeholder="Fine / bloated / …"></div>
      <div class="field"><label for="ckTrain">Training</label><input type="text" id="ckTrain" placeholder="3 gym sessions, felt strong"></div>
      <div class="field" style="grid-column:1/-1"><label for="ckWeak">How did your weak point go${S.profile.focus ? ` (${esc(S.profile.focus.weak_point)})` : ''}?</label><input type="text" id="ckWeak" placeholder="e.g. Saturday was fine, Sunday brunch got away from me"></div>
      <div class="field"><label for="ckLoved">Meals you loved</label><input type="text" id="ckLoved"></div>
      <div class="field"><label for="ckDisliked">Meals you disliked or are tired of</label><input type="text" id="ckDisliked"></div>
      <div class="field"><label for="ckChange">Anything changed?</label><input type="text" id="ckChange" placeholder="Schedule, budget, supermarket…"></div>
    </div>
    <div class="field"><label for="ckNotes">Cravings, difficulties, social events</label><textarea id="ckNotes" rows="2"></textarea></div>
    <div class="row"><button class="btn primary" data-act="checkin">Send check-in to my dietitian</button><span class="muted" style="font-size:.85rem">Your dietitian reviews the trend and adjusts the plan with you.</span></div>
  </section>`;
}
