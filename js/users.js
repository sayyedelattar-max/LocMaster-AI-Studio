// ── Users Manager ─────────────────────────────────────────────────
// RBAC user listing, invitation, and role management.

window.UsersManager = (function() {
  let _users = [];

  // ── Helpers ─────────────────────────────────────────────────────

  function _getClient() {
    return window.SupabaseClient && SupabaseClient.getClient();
  }

  function _notify(msg, type) {
    if (window.AppState) AppState.notify(msg, type);
  }

  function _buildRow(user) {
    const roleLabel = (window.ROLES && ROLES[user.role]?.label) || user.role || 'Translator';
    return `<tr>
  <td>${user.name || '—'}</td>
  <td>${user.email || '—'}</td>
  <td>
    <select onchange="UsersManager.updateRole('${user.id}', this.value)" class="select-sm">
      ${Object.entries(window.ROLES || {}).map(([id, r]) =>
        `<option value="${id}" ${user.role === id ? 'selected' : ''}>${r.label}</option>`
      ).join('')}
    </select>
  </td>
  <td><span class="badge">${user.status || 'active'}</span></td>
</tr>`;
  }

  // ── Public API ───────────────────────────────────────────────────

  return {
    /** Load users from Supabase (or localStorage) and render the table. */
    async load() {
      const tbody = document.getElementById('users-tbody');
      if (!tbody) return;

      try {
        const client = _getClient();
        if (client) {
          const { data, error } = await client.from('users').select('*').order('name');
          if (!error && data) _users = data;
        } else {
          const raw = localStorage.getItem('lm_users');
          _users = raw ? JSON.parse(raw) : _users;
        }
        tbody.innerHTML = _users.length
          ? _users.map(_buildRow).join('')
          : `<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No users yet.</td></tr>`;
      } catch (e) {
        _notify('Failed to load users: ' + e.message, 'error');
      }
    },

    /**
     * Invite a new user by email.
     * @param {string} email
     * @param {string} name
     * @param {string} role
     */
    async invite(email, name, role) {
      if (!email) { _notify('Email is required', 'error'); return; }
      const user = { id: Date.now(), email, name: name || email, role: role || 'translator', status: 'invited' };

      const client = _getClient();
      if (client) {
        const { error } = await client.from('users').insert([user]);
        if (error) { _notify('Invite failed: ' + error.message, 'error'); return; }
      } else {
        _users.push(user);
        localStorage.setItem('lm_users', JSON.stringify(_users));
      }

      const modal = document.getElementById('modal-invite-user');
      if (modal) modal.classList.remove('show');
      _notify(`Invitation sent to ${email}`, 'success');
      this.load();
    },

    /** Show the invite user modal. */
    showInviteModal() {
      const modal = document.getElementById('modal-invite-user');
      if (modal) modal.classList.add('show');
    },

    /**
     * Update a user's role.
     * @param {string|number} userId
     * @param {string}        role
     */
    async updateRole(userId, role) {
      const client = _getClient();
      if (client) {
        await client.from('users').update({ role }).eq('id', userId);
      } else {
        const user = _users.find(u => String(u.id) === String(userId));
        if (user) { user.role = role; localStorage.setItem('lm_users', JSON.stringify(_users)); }
      }
      _notify('Role updated', 'success');
    },

    /** Returns a snapshot of the in-memory users array. */
    getAllUsers() { return [..._users]; }
  };
})();
