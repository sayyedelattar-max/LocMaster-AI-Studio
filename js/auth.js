// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — Authentication
// ══════════════════════════════════════════════════════════════════════════════

window.Auth = {
  _user: null,

  init() {
    // Check for stored session
    try {
      const stored = localStorage.getItem('lm_user');
      if (stored) this._user = JSON.parse(stored);
    } catch {}
    this._updateUI();
  },

  async login(email, password) {
    try {
      const client = window.SupabaseClient?.getClient();
      if (client) {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        this._user = data.user;
        localStorage.setItem('lm_user', JSON.stringify(this._user));
        this._updateUI();
        if (window.AppState) AppState.setView('dashboard');
        return { user: this._user };
      }
      // Offline demo mode
      if (email && password) {
        this._user = { id: 'demo', email, role: 'admin', name: email.split('@')[0] };
        localStorage.setItem('lm_user', JSON.stringify(this._user));
        this._updateUI();
        if (window.AppState) AppState.setView('dashboard');
        return { user: this._user };
      }
      return { error: 'Invalid credentials' };
    } catch (err) {
      return { error: err.message };
    }
  },

  logout() {
    this._user = null;
    localStorage.removeItem('lm_user');
    this._updateUI();
  },

  getUser()      { return this._user; },
  isLoggedIn()   { return !!this._user; },

  _updateUI() {
    const authScreen = document.getElementById('auth-screen');
    const appScreen  = document.getElementById('app-screen');
    if (!authScreen || !appScreen) return;
    if (this._user) {
      authScreen.classList.add('hidden');
      appScreen.classList.remove('hidden');
      if (window.AppState) AppState.setView('dashboard');
    } else {
      authScreen.classList.remove('hidden');
      appScreen.classList.add('hidden');
    }
  },
};
