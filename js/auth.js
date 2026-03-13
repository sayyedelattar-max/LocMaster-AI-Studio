// ══════════════════════════════════════════════════════════════
// js/auth.js  — LocMaster AI Studio — Authentication Module
// Supports demo accounts defined in LMConfig + optional Supabase
// ══════════════════════════════════════════════════════════════

window.Auth = (function () {

  let _session = null;

  // ── Helpers ────────────────────────────────────────────────────
  function saveSession(user) {
    _session = user;
    localStorage.setItem('lm_session', JSON.stringify(user));
  }

  function clearSession() {
    _session = null;
    localStorage.removeItem('lm_session');
  }

  function applyUser(user) {
    AppState.currentUser = user;
    // Update UI
    const avatar = document.getElementById('user-avatar');
    const name   = document.getElementById('user-name');
    const role   = document.getElementById('user-role');
    if (avatar) { avatar.textContent = user.avatar || user.name?.[0]?.toUpperCase() || 'U'; avatar.style.background = user.color || '#3b82f6'; }
    if (name)   name.textContent  = user.name  || user.email;
    if (role)   { role.textContent = user.role || '—'; role.style.color = user.color || '#3b82f6'; }

    // Apply RBAC — hide elements requiring permissions the user doesn't have
    const perms = LMConfig.permissions[user.role] || [];
    document.querySelectorAll('[data-perm]').forEach(el => {
      const required = el.getAttribute('data-perm');
      el.style.display = perms.includes(required) ? '' : 'none';
    });

    AppState.updateAIStatusBar();
  }

  // ── Demo login ─────────────────────────────────────────────────
  async function demoLogin(email, password) {
    const account = LMConfig.demoAccounts.find(a => a.email === email && a.password === password);
    if (account) {
      const user = { id: 'demo-' + account.role, email: account.email, name: account.name, role: account.role, avatar: account.avatar, color: account.color, isDemo: true };
      return { user, error: null };
    }
    return { user: null, error: 'Invalid email or password' };
  }

  // ── Public API ─────────────────────────────────────────────────
  return {
    async init() {
      // Try to restore session
      const saved = localStorage.getItem('lm_session');
      if (saved) {
        try {
          const user = JSON.parse(saved);
          _session = user;
          AppState.currentUser = user;
          this.showApp(user);
          return;
        } catch (_) { clearSession(); }
      }
      // No session: show auth screen
      document.getElementById('auth-screen')?.classList.remove('hidden');
      document.getElementById('app')?.classList.add('hidden');
    },

    async login(email, password) {
      // 1. Try demo accounts first
      const demo = await demoLogin(email, password);
      if (demo.user) {
        saveSession(demo.user);
        this.showApp(demo.user);
        return { error: null };
      }

      // 2. Try Supabase if configured
      if (window.SupabaseClient) {
        try {
          const { data, error } = await SupabaseClient.auth.signInWithPassword({ email, password });
          if (error) return { error: error.message };
          const user = {
            id:    data.user.id,
            email: data.user.email,
            name:  data.user.user_metadata?.full_name || email.split('@')[0],
            role:  data.user.user_metadata?.role || 'translator',
            avatar: (data.user.user_metadata?.full_name || email)[0].toUpperCase(),
            color: '#3b82f6',
          };
          saveSession(user);
          this.showApp(user);
          return { error: null };
        } catch (e) { return { error: e.message }; }
      }

      return { error: 'Invalid email or password' };
    },

    showApp(user) {
      document.getElementById('auth-screen')?.classList.add('hidden');
      document.getElementById('app')?.classList.remove('hidden');
      applyUser(user);
      if (window.navigate) navigate('dashboard');
    },

    logout() {
      clearSession();
      AppState.currentUser = null;
      if (window.SupabaseClient) SupabaseClient.auth.signOut().catch(() => {});
      document.getElementById('auth-screen')?.classList.remove('hidden');
      document.getElementById('app')?.classList.add('hidden');
    },

    getCurrentUser() { return _session; },
  };
})();
