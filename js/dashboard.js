// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — Dashboard
// ══════════════════════════════════════════════════════════════════════════════

window.Dashboard = {
  _projects: [],
  _storageKey: 'lm_projects',

  init() {
    try {
      this._projects = JSON.parse(localStorage.getItem(this._storageKey) || '[]');
    } catch { this._projects = []; }
    this._render();
  },

  async createProject(data) {
    const project = {
      id:        Date.now(),
      name:      data.name || 'Untitled Project',
      client:    data.client || '',
      srcLang:   data.srcLang || 'en',
      tgtLang:   data.tgtLang || 'ar',
      domain:    data.domain  || 'general',
      status:    'active',
      createdAt: new Date().toISOString(),
      segments:  [],
    };
    this._projects.unshift(project);
    this._save();
    this._render();
    if (window.AppState) AppState.notify('Project created: ' + project.name, 'success');
    return project;
  },

  deleteProject(id) {
    this._projects = this._projects.filter(p => p.id !== id);
    this._save();
    this._render();
  },

  _save() {
    try { localStorage.setItem(this._storageKey, JSON.stringify(this._projects)); } catch {}
  },

  _render() {
    const container = document.getElementById('projects-list');
    if (!container) return;
    if (!this._projects.length) {
      container.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:40px;font-size:.85rem;">No projects yet. Create one above.</div>';
      return;
    }
    container.innerHTML = this._projects.map(p => `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px 18px;
                  display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
        <div>
          <div style="font-weight:700;font-size:.88rem;color:var(--text);">${p.name}</div>
          <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">
            ${p.client ? p.client + ' · ' : ''}${p.srcLang} → ${p.tgtLang} · ${p.domain}
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <button onclick="Dashboard.deleteProject(${p.id})"
                  style="padding:3px 10px;font-size:.7rem;border-radius:5px;cursor:pointer;
                         border:1px solid rgba(239,68,68,.3);background:transparent;color:#ef4444;">
            Delete
          </button>
        </div>
      </div>`).join('');
  },
};
