// ── Authentication Module ─────────────────────────────────────────
// Handles sign-in / sign-out via Supabase Auth or local demo accounts.

window.Auth = (function() {
  // Demo accounts for offline / demo mode
  const DEMO_ACCOUNTS = {
    'admin@locmaster.ai':      { password: 'admin1234',      role: 'admin',      name: 'Admin User' },
    'pm@locmaster.ai':         { password: 'pm1234',         role: 'pm',         name: 'Project Manager' },
    'reviewer@locmaster.ai':   { password: 'reviewer1234',   role: 'reviewer',   name: 'Reviewer' },
    'translator@locmaster.ai': { password: 'translator1234', role: 'translator', name: 'Translator' }
  };

  let _user = null;
  let _role = null;

  function _showApp() {
    const authScreen = document.getElementById('auth-screen');
    const appEl      = document.getElementById('app');
    if (authScreen) authScreen.classList.add('hidden');
    if (appEl)      appEl.classList.remove('hidden');
  }

  function _showAuth() {
    const authScreen = document.getElementById('auth-screen');
    const appEl      = document.getElementById('app');
    if (authScreen) authScreen.classList.remove('hidden');
    if (appEl)      appEl.classList.add('hidden');
  }

  return {
    /** Initialise Auth: check for an existing session and restore it. */
    async init() {
      // Try Supabase session first
      const client = window.SupabaseClient && SupabaseClient.getClient();
      if (client) {
        const { data: { session } } = await client.auth.getSession().catch(() => ({ data: {} }));
        if (session?.user) {
          _user = session.user;
          _role = session.user.user_metadata?.role || 'translator';
          _showApp();
          if (window.navigate) navigate('dashboard');
          return;
        }
      }
      // Restore demo session from localStorage
      const stored = localStorage.getItem('lm_session');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          _user = parsed.user;
          _role = parsed.role;
          _showApp();
          if (window.navigate) navigate('dashboard');
          return;
        } catch (_) { /* invalid session */ }
      }
      _showAuth();
    },

    /** Sign in with email + password. Returns { error } on failure. */
    async login(email, password) {
      // Attempt Supabase login
      const client = window.SupabaseClient && SupabaseClient.getClient();
      if (client) {
        const { data, error } = await client.auth.signInWithPassword({ email, password }).catch(e => ({ error: e }));
        if (!error && data?.user) {
          _user = data.user;
          _role = data.user.user_metadata?.role || 'translator';
          localStorage.setItem('lm_session', JSON.stringify({ user: _user, role: _role }));
          _showApp();
          if (window.navigate) navigate('dashboard');
          return {};
        }
      }
      // Fall back to demo accounts
      const demo = DEMO_ACCOUNTS[email.toLowerCase()];
      if (demo && demo.password === password) {
        _user = { id: email, email, user_metadata: { name: demo.name, role: demo.role } };
        _role = demo.role;
        localStorage.setItem('lm_session', JSON.stringify({ user: _user, role: _role }));
        _showApp();
        if (window.navigate) navigate('dashboard');
        return {};
      }
      return { error: 'Invalid email or password.' };
    },

    /** Sign out the current user. */
    async logout() {
      const client = window.SupabaseClient && SupabaseClient.getClient();
      if (client) await client.auth.signOut().catch(() => {});
      _user = null;
      _role = null;
      localStorage.removeItem('lm_session');
      _showAuth();
    },

    /** Returns the current user object. */
    getUser()  { return _user; },

    /** Returns the current user's role string. */
    getRole()  { return _role || 'translator'; },

    /** Returns true if the current user has the given permission. */
    hasPermission(perm) {
      const roleId = this.getRole();
      const roleDef = window.ROLES && ROLES[roleId];
      if (!roleDef) return false;
      return roleDef.permissions.includes('*') || roleDef.permissions.includes(perm);
    },

    /** Returns true if a user is currently authenticated. */
    isAuthenticated() { return !!_user; }
  };
})();

/** Global doLogin function called from the auth form. */
window.doLogin = async function() {
  const emailEl = document.getElementById('auth-email');
  const passEl  = document.getElementById('auth-password');
  const errEl   = document.getElementById('auth-error');
  const btn     = document.getElementById('auth-btn');
  if (!emailEl || !passEl) return;

  const email    = emailEl.value.trim();
  const password = passEl.value;

  if (btn)   { btn.textContent = '⏳ Signing in…'; btn.disabled = true; }
  if (errEl) errEl.classList.remove('show');

  const result = await Auth.login(email, password);

  if (result.error) {
    if (errEl) { errEl.textContent = result.error; errEl.classList.add('show'); }
  }
  if (btn) { btn.textContent = 'Sign In →'; btn.disabled = false; }
};
