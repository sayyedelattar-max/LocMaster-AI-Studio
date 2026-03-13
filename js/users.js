// ══════════════════════════════════════════════════════════════
// js/users.js  — LocMaster AI Studio — Users Manager
// ══════════════════════════════════════════════════════════════

window.UsersManager = (function () {

  function getUsers() {
    return LMConfig.demoAccounts.map(a => ({ id: 'demo-' + a.role, name: a.name, email: a.email, role: a.role, color: a.color }));
  }

  function renderUsersView() {
    const view = document.getElementById('view-users');
    if (!view) return;
    const users = getUsers();
    view.innerHTML = `
      <div style="padding:24px;max-width:700px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <h2 style="font-size:1.05rem;font-weight:800;margin:0;">👥 Team Members</h2>
          <button data-perm="users.invite" onclick="document.getElementById('modal-invite').classList.add('show')"
            style="padding:7px 16px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.8rem;font-weight:700;">+ Invite</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${users.map(u => `
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:14px;">
              <div style="width:36px;height:36px;border-radius:50%;background:${u.color};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.9rem;color:#fff;flex-shrink:0;">${u.name[0]}</div>
              <div style="flex:1;">
                <div style="font-weight:700;font-size:.85rem;color:var(--text);">${u.name}</div>
                <div style="font-size:.72rem;color:var(--text-muted);">${u.email}</div>
              </div>
              <span style="font-size:.72rem;padding:3px 10px;border-radius:8px;border:1px solid ${u.color}44;color:${u.color};background:${u.color}11;">${u.role}</span>
            </div>`).join('')}
        </div>
      </div>`;

    // Re-apply RBAC visibility on rendered elements
    const perms = LMConfig.permissions[AppState.currentUser?.role || 'translator'] || [];
    view.querySelectorAll('[data-perm]').forEach(el => {
      el.style.display = perms.includes(el.getAttribute('data-perm')) ? '' : 'none';
    });
  }

  return {
    load()        { renderUsersView(); },
    getAllUsers()  { return getUsers(); },
    invite(email, name, role) {
      AppState.notify('Invite sent to ' + email + ' (demo mode — no email actually sent)', 'info');
      document.getElementById('modal-invite')?.classList.remove('show');
    },
  };
})();
