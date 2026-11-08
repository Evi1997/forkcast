// Dietitian: a messaging-app style chat. On phones it fills the screen and
// "What I know about you" opens as a sheet; on desktop it sits beside the chat.
const STAR = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 2.5c.4 0 .7.3.8.7l.9 3.4a5 5 0 0 0 3.6 3.6l3.4.9a.8.8 0 0 1 0 1.6l-3.4.9a5 5 0 0 0-3.6 3.6l-.9 3.4a.8.8 0 0 1-1.6 0l-.9-3.4a5 5 0 0 0-3.6-3.6l-3.4-.9a.8.8 0 0 1 0-1.6l3.4-.9a5 5 0 0 0 3.6-3.6l.9-3.4c.1-.4.4-.7.8-.7z"/><path d="M18.5 1.5c.2 0 .4.1.4.3l.3 1.1c.2.6.6 1 1.2 1.2l1.1.3a.4.4 0 0 1 0 .8l-1.1.3c-.6.2-1 .6-1.2 1.2l-.3 1.1a.4.4 0 0 1-.8 0l-.3-1.1c-.2-.6-.6-1-1.2-1.2l-1.1-.3a.4.4 0 0 1 0-.8l1.1-.3c.6-.2 1-.6 1.2-1.2l.3-1.1c0-.2.2-.3.4-.3z" opacity=".55"/></svg>';
const SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg>';

function vCoach(){
  fixChatStart();
  const all = S.chat.turns.length ? S.chat.turns : [{ role:'assistant', content:greeting() }];
  const start = S.chat.history ? 0 : Math.min(S.chat.start || 0, all.length - 1);
  const turns = all.slice(start), last = all[all.length - 1];
  const done = SECTIONS.filter(([k]) => sectionDone(k)).length;
  const status = S.profile.onboarded ? 'Follow-up' : `Consultation · ${done}/${SECTIONS.length}`;
  const aiRow = (inner) => `<div class="msg-row"><span class="ai-dot mascot" aria-hidden="true">${MASCOT}</span><div class="msg ai">${inner}</div></div>`;
  return `
  <div class="coach">
    <section class="card chat" aria-label="Conversation with your dietitian">
      <header class="chat-head">
        <span class="ai-avatar mascot" aria-hidden="true">${MASCOT}</span>
        <div class="chat-title"><b>${esc(coachName())}</b><span>${S.busy.chat ? 'Typing…' : status}</span></div>
        <button class="newchat-btn" data-act="newchat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>New chat</button>
        ${avatarBtn()}
      </header>
      ${!S.profile.onboarded ? `<div class="consult-bar" aria-hidden="true"><span style="width:${Math.max(4, done / SECTIONS.length * 100)}%"></span></div>` : ''}
      <div class="msgs" aria-live="polite">
        ${statusBanner()}
        ${start > 0 ? `<button class="earlier" data-act="history">Show earlier messages</button>` : ''}
        ${turns.map(m => m.role === 'user' ? `<div class="msg me">${esc(m.content)}</div>` :
          aiRow(`${md(m.content)}${m.flag ? `<div class="flag"><span class="tag med">Needs medical review</span> ${esc(m.flag)}</div>` : ''}${m.logged ? `<div class="logged">✓ Added ${m.logged} item${m.logged > 1 ? 's' : ''} to today's meals</div>` : ''}`)).join('')}
        ${S.busy.chat ? (S.chat.live ? `<div class="msg-row"><span class="ai-dot mascot" aria-hidden="true">${MASCOT}</span><div class="msg ai" id="liveMsg">${md(S.chat.live)}</div></div>` : aiRow(`<span class="typing" aria-label="Thinking"><span></span><span></span><span></span></span>`)) : ''}
      </div>
      ${!S.busy.chat && last.role === 'assistant' && last.done ? `<div class="wrapup"><button class="btn ghost small" data-act="newchat">Start a new chat</button></div>` : ''}
      ${!S.busy.chat && last.role === 'assistant' && last.quick?.length ? `<div class="quick">${last.quick.map(q => `<button class="chip" data-act="quick" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
      ${S.err.chat ? `<div class="notice warn chat-err">${esc(S.err.chat)}</div>` : ''}
      <div class="chatbar">
        <textarea id="chatText" rows="1" placeholder="Message your dietitian" aria-label="Message your dietitian"></textarea>
        <button class="sendbtn" data-act="send" aria-label="Send" ${S.busy.chat ? 'disabled' : ''}>${SEND}</button>
      </div>
    </section>
  </div>
`;
}

// Grow the message box with its text, up to about five lines.
function fitChatBox(){
  const t = $('#chatText'); if (!t) return;
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight, 132) + 'px';
  t.style.overflowY = t.scrollHeight > 132 ? 'auto' : 'hidden';
}

// Appearance: follow the phone (auto) or force light or dark. Kept on this device.
const themePref = () => { try { return localStorage.getItem('forkcast:theme') || 'auto'; } catch { return 'auto'; } };
function setTheme(v){
  try { v === 'auto' ? localStorage.removeItem('forkcast:theme') : localStorage.setItem('forkcast:theme', v); } catch {}
  const root = document.documentElement;
  if (v === 'auto') delete root.dataset.theme; else root.dataset.theme = v;
  const metas = document.querySelectorAll('meta[name=theme-color]');
  metas.forEach((m, i) => { m.content = v === 'dark' ? '#0F0D18' : v === 'light' ? '#FFF8F3' : (i ? '#0F0D18' : '#FFF8F3'); });
}
