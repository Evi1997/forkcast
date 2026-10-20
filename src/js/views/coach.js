// Dietitian: a messaging-app style chat. On phones it fills the screen and
// "What I know about you" opens as a sheet; on desktop it sits beside the chat.
const STAR = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 2.5c.4 0 .7.3.8.7l.9 3.4a5 5 0 0 0 3.6 3.6l3.4.9a.8.8 0 0 1 0 1.6l-3.4.9a5 5 0 0 0-3.6 3.6l-.9 3.4a.8.8 0 0 1-1.6 0l-.9-3.4a5 5 0 0 0-3.6-3.6l-3.4-.9a.8.8 0 0 1 0-1.6l3.4-.9a5 5 0 0 0 3.6-3.6l.9-3.4c.1-.4.4-.7.8-.7z"/><path d="M18.5 1.5c.2 0 .4.1.4.3l.3 1.1c.2.6.6 1 1.2 1.2l1.1.3a.4.4 0 0 1 0 .8l-1.1.3c-.6.2-1 .6-1.2 1.2l-.3 1.1a.4.4 0 0 1-.8 0l-.3-1.1c-.2-.6-.6-1-1.2-1.2l-1.1-.3a.4.4 0 0 1 0-.8l1.1-.3c.6-.2 1-.6 1.2-1.2l.3-1.1c0-.2.2-.3.4-.3z" opacity=".55"/></svg>';
const SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg>';

function vCoach(){
  const all = S.chat.turns.length ? S.chat.turns : [{ role:'assistant', content:GREETING }];
  const start = S.chat.history ? 0 : Math.min(S.chat.start || 0, all.length - 1);
  const turns = all.slice(start), last = all[all.length - 1];
  const done = SECTIONS.filter(([k]) => sectionDone(k)).length;
  const status = S.profile.onboarded ? 'Follow-up' : `Consultation · ${done}/${SECTIONS.length}`;
  const aiRow = (inner) => `<div class="msg-row"><span class="ai-dot" aria-hidden="true">${STAR}</span><div class="msg ai">${inner}</div></div>`;
  const enter = S.aboutOpen === 'enter' ? ' enter' : '';
  return `
  <div class="coach">
    <section class="card chat" aria-label="Conversation with your dietitian">
      <header class="chat-head">
        <span class="ai-avatar" aria-hidden="true">${STAR}</span>
        <div class="chat-title"><b>Your dietitian</b><span>${S.busy.chat ? 'Typing…' : status}</span></div>
        <button class="iconbtn2" data-act="newchat" aria-label="New conversation" title="New conversation"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
        <button class="iconbtn2 about-btn" data-act="about" aria-label="About you" title="About you"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></button>
      </header>
      ${!S.profile.onboarded ? `<div class="consult-bar" aria-hidden="true"><span style="width:${Math.max(4, done / SECTIONS.length * 100)}%"></span></div>` : ''}
      <div class="msgs" aria-live="polite">
        ${statusBanner()}
        ${start > 0 ? `<button class="earlier" data-act="history">Show earlier messages</button>` : ''}
        ${turns.map(m => m.role === 'user' ? `<div class="msg me">${esc(m.content)}</div>` :
          aiRow(`${md(m.content)}${m.flag ? `<div class="flag"><span class="tag med">Needs medical review</span> ${esc(m.flag)}</div>` : ''}${m.logged ? `<div class="logged">✓ Added ${m.logged} item${m.logged > 1 ? 's' : ''} to today's meals</div>` : ''}`)).join('')}
        ${S.busy.chat ? aiRow(`<span class="typing" aria-label="Thinking"><span></span><span></span><span></span></span>`) : ''}
      </div>
      ${!S.busy.chat && last.role === 'assistant' && last.quick?.length ? `<div class="quick">${last.quick.map(q => `<button class="chip" data-act="quick" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
      ${S.err.chat ? `<div class="notice warn chat-err">${esc(S.err.chat)}</div>` : ''}
      <div class="chatbar">
        <textarea id="chatText" rows="1" placeholder="Message your dietitian" aria-label="Message your dietitian"></textarea>
        <button class="sendbtn" data-act="send" aria-label="Send" ${S.busy.chat ? 'disabled' : ''}>${SEND}</button>
      </div>
    </section>
    <aside class="stack about-side">${aboutYou(done)}</aside>
  </div>
  ${S.aboutOpen ? `<div class="scrim${enter}" data-act="about"></div><div class="sheet${enter}" role="dialog" aria-modal="true" aria-label="About you"><div class="grip" aria-hidden="true"></div><div class="sheet-head"><h2>About you</h2><button class="x close" data-act="about" aria-label="Close">×</button></div>${aboutYou(done)}</div>` : ''}`;
}

function aboutYou(done){
  const t = targets(), d = S.profile.data, b = d.basics || {};
  return `
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
        ${S.confirmReset ? `<div class="notice warn stack"><b>Erase everything?</b><span style="font-size:.88rem">Profile, conversation, plan, meals and progress are deleted.</span><div class="row"><button class="btn small" data-act="reset-yes">Erase</button><button class="btn ghost small" data-act="reset-no">Keep</button></div></div>` : `<button class="btn ghost small" data-act="reset">Start over</button>`}
      </section>`;
}

// Grow the message box with its text, up to about five lines.
function fitChatBox(){
  const t = $('#chatText'); if (!t) return;
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight, 132) + 'px';
  t.style.overflowY = t.scrollHeight > 132 ? 'auto' : 'hidden';
}
