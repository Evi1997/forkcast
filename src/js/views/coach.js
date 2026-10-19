// Dietitian chat view and profile sidebar
function vCoach(){
  const turns = S.chat.turns.length ? S.chat.turns : [{ role:'assistant', content:GREETING }];
  const last = turns[turns.length - 1];
  const t = targets(), d = S.profile.data, b = d.basics || {};
  const done = SECTIONS.filter(([k]) => sectionDone(k)).length;
  return `
  <div class="head"><div><div class="label">${S.profile.onboarded ? 'Follow-up appointment' : `First consultation · ${done} of ${SECTIONS.length} covered`}</div><h1>Your dietitian</h1></div></div>
  ${statusBanner()}
  <div class="coach">
    <section class="card chat" aria-label="Conversation">
      <div class="msgs" aria-live="polite">
        ${turns.map(m => m.role === 'user' ? `<div class="msg me">${esc(m.content)}</div>` :
          `<div class="msg ai">${md(m.content)}${m.flag ? `<div class="flag"><span class="tag med">Needs medical review</span> ${esc(m.flag)}</div>` : ''}${m.logged ? `<div class="logged">✓ Added ${m.logged} item${m.logged > 1 ? 's' : ''} to today's diary</div>` : ''}</div>`).join('')}
        ${S.busy.chat ? `<div class="msg ai"><span class="typing" aria-label="Thinking"><span></span><span></span><span></span></span></div>` : ''}
      </div>
      ${!S.busy.chat && last.role === 'assistant' && last.quick?.length ? `<div class="quick">${last.quick.map(q => `<button class="chip" data-act="quick" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
      ${S.err.chat ? `<div class="notice warn" style="margin:0 16px 10px">${esc(S.err.chat)}</div>` : ''}
      <div class="composer"><textarea id="chatText" rows="2" placeholder="Type your answer, or tell me what you ate…" aria-label="Message your dietitian"></textarea><button class="btn primary" data-act="send" ${S.busy.chat ? 'disabled' : ''}>Send</button></div>
    </section>
    <aside class="stack">
      <section class="card stack">
        <div class="row" style="justify-content:space-between"><h3>What I know about you</h3><span class="num muted" style="font-size:.85rem">${done}/${SECTIONS.length}</span></div>
        <div class="progressbar"><span style="width:${done / SECTIONS.length * 100}%"></span></div>
        <div class="sections">${SECTIONS.map(([k, l]) => `<div class="sec"><span class="dot ${sectionDone(k) ? 'on' : ''}"></span>${l}</div>`).join('')}</div>
      </section>
      <section class="card stack">
        <div class="row" style="justify-content:space-between"><h3>Daily targets</h3><span class="tag est">Estimated</span></div>
        ${t ? `<dl class="kv"><dt>Energy</dt><dd>${t.kcal} kcal</dd><dt>Protein</dt><dd>${t.protein} g</dd><dt>Carbs</dt><dd>${t.carbs} g</dd><dt>Fat</dt><dd>${t.fat} g</dd><dt>Fiber</dt><dd>${t.fiber} g</dd>${t.tdee ? `<dt>BMR / TDEE</dt><dd>${t.bmr} / ${t.tdee}</dd>` : ''}</dl>
        <p class="muted" style="font-size:.8rem">${S.profile.targets ? 'Set during your consultation.' : 'Mifflin-St Jeor, adjusted for activity and goal. Real needs vary; we refine from your weight trend.'}</p>` : `<p class="muted" style="font-size:.88rem">Appear once I know your age, sex, height, weight and goal.</p>`}
        ${b.weight_kg ? `<dl class="kv"><dt>Weight</dt><dd>${esc(b.weight_kg)} kg</dd>${b.goal ? `<dt>Goal</dt><dd>${esc(b.goal)}</dd>` : ''}${d.shopping?.supermarkets ? `<dt>Shops at</dt><dd>${esc(d.shopping.supermarkets)}</dd>` : ''}</dl>` : ''}
      </section>
      ${S.profile.flags?.length ? `<section class="card stack"><span class="tag med">Needs medical review</span>${S.profile.flags.map(f => `<p style="font-size:.88rem">${esc(f)}</p>`).join('')}<p class="muted" style="font-size:.8rem">Forkcast helps organise everyday eating. Changes for these points are best agreed with your doctor or a registered dietitian.</p></section>` : ''}
      <section class="stack" style="padding:0 4px">
        <div class="row" style="justify-content:space-between"><span class="muted" style="font-size:.85rem">Signed in as ${esc(S.auth.email || '')}</span><button class="btn ghost small" data-act="signout">Sign out</button></div>
        ${S.confirmReset ? `<div class="notice warn stack"><b>Erase everything?</b><span style="font-size:.88rem">Profile, conversation, plan, diary and progress are deleted.</span><div class="row"><button class="btn small" data-act="reset-yes">Erase</button><button class="btn ghost small" data-act="reset-no">Keep</button></div></div>` : `<button class="btn ghost small" data-act="reset">Start over</button>`}
      </section>
    </aside>
  </div>`;
}
