// Sign-in with Supabase (email + password). Keeps the session on the device,
// so you stay signed in until you sign out.
const Auth = {
  sb: null,
  init(){
    const c = window.FORKCAST_CONFIG || {};
    if (!window.supabase || !c.supabaseUrl || !c.supabaseAnonKey) { S.auth = { status:'unconfigured' }; return false; }
    this.sb = supabase.createClient(c.supabaseUrl, c.supabaseAnonKey, { auth:{ persistSession:true, autoRefreshToken:true } });
    Store.sb = this.sb;
    this.sb.auth.onAuthStateChange((event, session) => {
      if (session?.user && Store.uid !== session.user.id) setTimeout(() => this.enter(session.user), 0);
      if (event === 'SIGNED_OUT') this.leave();
    });
    return true;
  },
  async start(){
    const { data } = await this.sb.auth.getSession();
    if (data.session?.user) this.enter(data.session.user);
    else { S.auth = { status:'signed-out', mode:'signin' }; render(); }
  },
  async token(){ const { data } = await this.sb.auth.getSession(); return data.session?.access_token || null; },
  enter(user){
    Store.uid = user.id;
    S.auth = { status:'signed-in', email:user.email };
    resetState(); loadLocal(); render(); syncRemote();
  },
  leave(){ Store.uid = null; resetState(); S.auth = { status:'signed-out', mode:'signin' }; render(); },
  async submit(mode, email, password){
    S.auth.busy = true; S.auth.error = null; S.auth.info = null; render();
    const redirect = location.origin + location.pathname;
    const { data, error } = mode === 'signup'
      ? await this.sb.auth.signUp({ email, password, options:{ emailRedirectTo:redirect } })
      : await this.sb.auth.signInWithPassword({ email, password });
    S.auth.busy = false;
    if (error) S.auth.error = error.message;
    else if (mode === 'signup' && !data.session) { S.auth.info = 'Check your email and tap the confirmation link, then sign in here.'; S.auth.mode = 'signin'; }
    render();
  },
  async reset(email){
    if (!email) { S.auth.error = 'Type your email first, then tap “Forgot password”.'; render(); return; }
    const { error } = await this.sb.auth.resetPasswordForEmail(email, { redirectTo:location.origin + location.pathname });
    S.auth.error = error ? error.message : null; S.auth.info = error ? null : 'We sent you an email with a link to set a new password.'; render();
  },
  async signOut(){ await this.sb.auth.signOut(); }
};
