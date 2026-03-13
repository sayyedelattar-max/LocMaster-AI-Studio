// ── Dashboard ─────────────────────────────────────────────────────
// Loads and renders the project overview and statistics cards.

window.Dashboard = (function() {
  let _projects = [];

  // ── Helpers ─────────────────────────────────────────────────────

  function _getClient() {
    return window.SupabaseClient && SupabaseClient.getClient();
  }

  function _notify(msg, type) {
    if (window.AppState) AppState.notify(msg, type);
  }

  // ── Rendering ───────────────────────────────────────────────────

  function _buildProjectCard(proj) {
    const progress = proj.segmentCount
      ? Math.round(((proj.translatedCount || 0) / proj.segmentCount) * 100)
      : 0;
    return `<div class="project-card" data-proj-id="${proj.id}" onclick="Dashboard.openProject('${proj.id}')">
  <div class="project-card-header">
    <span class="project-card-name">${proj.name || 'Untitled'}</span>
    <span class="project-card-badge">${proj.status || 'active'}</span>
  </div>
  <div class="project-card-meta">
    <span>${proj.srcLang || '—'} → ${proj.tgtLang || '—'}</span>
    <span>${proj.client || ''}</span>
  </div>
  <div class="project-card-progress">
    <div class="progress-bar" style="width:${progress}%"></div>
  </div>
  <div class="project-card-footer">
    <span>${proj.segmentCount || 0} segments</span>
    <span>${progress}% done</span>
  </div>
</div>`;
  }

  // ── Public API ───────────────────────────────────────────────────

  return {
    /** Load projects from Supabase (or localStorage fallback) and render. */
    async load() {
      const container = document.getElementById('projects-container');
      if (!container) return;

      try {
        const client = _getClient();
        if (client) {
          const { data, error } = await client.from('projects').select('*').order('created_at', { ascending: false });
          if (!error && data) { _projects = data; }
        } else {
          // localStorage fallback
          const raw = localStorage.getItem('lm_projects');
          _projects = raw ? JSON.parse(raw) : [];
        }
        this.renderProjects(_projects);
        this.renderStats({ total: _projects.length, active: _projects.filter(p => p.status === 'active').length });
      } catch (e) {
        _notify('Failed to load projects: ' + e.message, 'error');
      }
    },

    /**
     * Render an array of project cards into #projects-container.
     * @param {Array} projects
     */
    renderProjects(projects) {
      const container = document.getElementById('projects-container');
      if (!container) return;
      if (!projects || !projects.length) {
        container.innerHTML = '<div class="empty-state">No projects yet. Create one to get started.</div>';
        return;
      }
      container.innerHTML = projects.map(_buildProjectCard).join('');
    },

    /**
     * Render summary statistics.
     * @param {{ total, active, [key]: number }} stats
     */
    renderStats(stats) {
      const el = document.getElementById('dashboard-stats');
      if (!el) return;
      el.innerHTML = `
        <div class="stat-card"><div class="stat-num">${stats.total || 0}</div><div class="stat-label">Total Projects</div></div>
        <div class="stat-card"><div class="stat-num">${stats.active || 0}</div><div class="stat-label">Active</div></div>`;
    },

    /** Open (activate) a project by ID. */
    async openProject(id) {
      const proj = _projects.find(p => String(p.id) === String(id));
      if (!proj) return;
      if (window.AppState) {
        AppState.currentProject = proj;
        AppState.srcLang = proj.srcLang || AppState.srcLang;
        AppState.tgtLang = proj.tgtLang || AppState.tgtLang;
        AppState.projectConfig = proj;
      }
      navigate('editor');
    },

    /** Show the create project modal. */
    showCreateModal() {
      const modal = document.getElementById('modal-create-project');
      if (modal) modal.classList.add('show');
    },

    /**
     * Create a new project record.
     * @param {{ name, client, srcLang, tgtLang, domain }} data
     */
    async createProject(data) {
      if (!data.name) { _notify('Project name is required', 'error'); return; }
      const project = { id: Date.now(), ...data, status: 'active', segmentCount: 0, translatedCount: 0, createdAt: new Date().toISOString() };

      const client = _getClient();
      if (client) {
        const { error } = await client.from('projects').insert([project]);
        if (error) { _notify('Failed to create project: ' + error.message, 'error'); return; }
      } else {
        _projects.unshift(project);
        localStorage.setItem('lm_projects', JSON.stringify(_projects));
      }

      // close modal and reload
      const modal = document.getElementById('modal-create-project');
      if (modal) modal.classList.remove('show');
      _notify(`Project "${data.name}" created`, 'success');
      this.load();
    }
  };
})();
