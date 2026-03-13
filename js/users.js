// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — Users Manager
// ══════════════════════════════════════════════════════════════════════════════

window.UsersManager = {
  _storageKey: 'lm_users',

  getAllUsers() {
    try { return JSON.parse(localStorage.getItem(this._storageKey) || '[]'); } catch { return []; }
  },

  addUser(user) {
    const users = this.getAllUsers();
    user.id = user.id || Date.now();
    users.push(user);
    try { localStorage.setItem(this._storageKey, JSON.stringify(users)); } catch {}
    return user;
  },

  removeUser(id) {
    const users = this.getAllUsers().filter(u => u.id !== id);
    try { localStorage.setItem(this._storageKey, JSON.stringify(users)); } catch {}
  },

  render() {
    const container = document.getElementById('users-list');
    if (!container) return;
    const users = this.getAllUsers();
    if (!users.length) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:.84rem;">No users yet.</p>';
      return;
    }
    container.innerHTML = users.map(u => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;
                  background:var(--surface);border:1px solid var(--border);border-radius:7px;margin-bottom:6px;">
        <div>
          <div style="font-weight:600;font-size:.84rem;">${u.name || u.email}</div>
          <div style="font-size:.7rem;color:var(--text-muted);">${u.email} · ${u.role || 'viewer'}</div>
        </div>
        <button onclick="UsersManager.removeUser(${u.id});UsersManager.render();"
                style="font-size:.7rem;padding:2px 8px;border-radius:5px;cursor:pointer;
                       border:1px solid rgba(239,68,68,.3);background:transparent;color:#ef4444;">Remove</button>
      </div>`).join('');
  },
};
