// Sign-in / create-account screen
function vAuth(){
  const a = S.auth;
  if (a.status === 'loading') return `<section class="auth"><div class="auth-brand"><i></i>forkcast</div><span class="spinner" aria-label="Loading"></span></section>`;
  if (a.status === 'unconfigured') return `<section class="auth card stack"><div class="auth-brand"><i></i>forkcast</div><h2>Almost there</h2><p class="muted">This copy of Forkcast isn't connected to its database yet. Add your Supabase URL and anon key to <b>config.js</b>, then reload. The setup guide in the README walks you through it.</p></section>`;
  const signup = a.mode === 'signup';
  return `<section class="auth card stack">
    <div class="auth-brand"><i></i>forkcast</div>
    <div><h1>${signup ? 'Create your account' : 'Welcome back'}</h1><p class="muted" style="margin-top:6px">${signup ? 'Your dietitian, food diary and meal plans, saved to your account.' : 'Sign in to pick up where you left off.'}</p></div>
    <form id="authForm" class="stack" novalidate>
      <div class="field"><label for="authEmail">Email</label><input type="email" id="authEmail" autocomplete="email" inputmode="email" required></div>
      <div class="field"><label for="authPass">Password</label><input type="password" id="authPass" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="6" required>${signup ? '<span class="muted" style="font-size:.8rem">At least 6 characters.</span>' : ''}</div>
      ${a.error ? `<div class="notice warn">${esc(a.error)}</div>` : ''}
      ${a.info ? `<div class="notice accent">${esc(a.info)}</div>` : ''}
      <button class="btn primary" type="submit" ${a.busy ? 'disabled' : ''}>${a.busy ? '<span class="spinner"></span>' : signup ? 'Create account' : 'Sign in'}</button>
    </form>
    <div class="row" style="justify-content:space-between">
      <button class="btn ghost small" data-act="authmode">${signup ? 'I already have an account' : 'New here? Create an account'}</button>
      ${signup ? '' : '<button class="btn ghost small" data-act="forgot">Forgot password</button>'}
    </div>
  </section>`;
}
function restoreAuthDraft(){
  const d = S.authDraft || {}, e = $('#authEmail'), p = $('#authPass');
  if (e && d.email) e.value = d.email;
  if (p && d.pass) p.value = d.pass;
}
