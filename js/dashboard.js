// ══════════════════════════════════════════════════════════════
// js/dashboard.js  — LocMaster AI Studio — Project Dashboard
// ══════════════════════════════════════════════════════════════

window.Dashboard = (function () {

  const STORAGE_KEY = 'lm_projects';

  function loadProjects() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  }

  function saveProjects(projects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  function statusColor(pct) {
    if (pct >= 100) return '#34d399';
    if (pct >= 70)  return '#f59e0b';
    return '#94a3b8';
  }

  function renderProjects(projects) {
    const container = document.getElementById('dashboard-projects');
    const stats     = document.getElementById('dash-stats');
    if (!container) return;

    // Stats bar
    if (stats) {
      const total      = projects.length;
      const completed  = projects.filter(p => p.progress >= 100).length;
      const inProgress = projects.filter(p => p.progress > 0 && p.progress < 100).length;
      stats.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:20px;">
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 18px;text-align:center;">
            <div style="font-size:1.6rem;font-weight:800;color:var(--accent);">${total}</div>
            <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">Total Projects</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 18px;text-align:center;">
            <div style="font-size:1.6rem;font-weight:800;color:#f59e0b;">${inProgress}</div>
            <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">In Progress</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 18px;text-align:center;">
            <div style="font-size:1.6rem;font-weight:800;color:#34d399;">${completed}</div>
            <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">Completed</div>
          </div>
        </div>`;
    }

    if (!projects.length) {
      container.innerHTML = `<div class="dash-empty"><span class="dash-empty-icon">📂</span><p>No projects yet. Create your first project to get started.</p></div>`;
      return;
    }

    container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
      ${projects.map(p => {
        const pct   = p.progress || 0;
        const color = statusColor(pct);
        const date  = new Date(p.createdAt).toLocaleDateString();
        return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;cursor:pointer;transition:.15s;"
          onmouseenter="this.style.borderColor='var(--accent)'" onmouseleave="this.style.borderColor='var(--border)'"
          onclick="Dashboard.openProject('${p.id}')">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
            <div style="font-weight:700;font-size:.9rem;color:var(--text);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name}</div>
            <span style="font-size:.65rem;padding:2px 8px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);">${p.domain||'general'}</span>
          </div>
          <div style="font-size:.73rem;color:var(--text-muted);margin-bottom:10px;">
            ${p.srcLang||'en'} → ${p.tgtLang||'ar'} · ${p.client||'—'} · ${date}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:5px;background:var(--border);border-radius:3px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:.3s;"></div>
            </div>
            <span style="font-size:.7rem;font-family:var(--mono);color:${color};min-width:32px;">${pct}%</span>
          </div>
          <div style="display:flex;gap:6px;margin-top:10px;">
            <button onclick="event.stopPropagation();Dashboard.openProject('${p.id}')" style="flex:1;padding:5px;font-size:.72rem;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;">Open</button>
            <button onclick="event.stopPropagation();Dashboard.deleteProject('${p.id}')" style="padding:5px 8px;font-size:.72rem;background:var(--surface2);border:1px solid var(--border);border-radius:6px;cursor:pointer;color:var(--danger);">🗑</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  return {
    load() {
      renderProjects(loadProjects());
    },

    showCreateModal() {
      const modal = document.getElementById('modal-create-project');
      if (modal) modal.classList.add('show');
    },

    async createProject(data) {
      const projects = loadProjects();
      const project  = {
        id:        'p_' + Date.now(),
        name:      data.name,
        client:    data.client || '',
        srcLang:   data.srcLang || 'en',
        tgtLang:   data.tgtLang || 'ar',
        domain:    data.domain || 'general',
        progress:  0,
        createdAt: new Date().toISOString(),
        segments:  [],
      };
      projects.unshift(project);
      saveProjects(projects);
      document.getElementById('modal-create-project')?.classList.remove('show');
      renderProjects(projects);
      AppState.notify('Project created: ' + data.name, 'success');
      return project;
    },

    openProject(id) {
      const projects = loadProjects();
      const project  = projects.find(p => p.id === id);
      if (!project) return;
      AppState.projectConfig = project;
      AppState.srcLang = project.srcLang;
      AppState.tgtLang = project.tgtLang;
      navigate('editor');
      AppState.notify('Opened: ' + project.name, 'success');
    },

    deleteProject(id) {
      if (!confirm('Delete this project?')) return;
      const projects = loadProjects().filter(p => p.id !== id);
      saveProjects(projects);
      renderProjects(projects);
      AppState.notify('Project deleted', 'info');
    },
  };
})();
