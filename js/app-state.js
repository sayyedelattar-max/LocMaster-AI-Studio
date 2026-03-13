// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — Application State
// ══════════════════════════════════════════════════════════════════════════════

window.AppState = {
  // ── Data ───────────────────────────────────────────────────────────────────
  segments:      [],
  srcLang:       'en',
  tgtLang:       'ar',
  currentFile:   null,
  parsedData:    null,
  projectConfig: null,
  lqiResults:    {},
  currentView:   'dashboard',

  // ── Private proofreader segments ──────────────────────────────────────────
  _proofSegments: null,

  // ── View Management ───────────────────────────────────────────────────────
  setView(view) {
    this.currentView = view;
    // Hide all view panels
    document.querySelectorAll('.view-panel, [data-view]').forEach(el => {
      if (el.dataset.view) {
        el.style.display = el.dataset.view === view ? '' : 'none';
      }
    });
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.nav === view);
    });
  },

  // ── Loading State ─────────────────────────────────────────────────────────
  setLoading(active, message) {
    const overlay = document.getElementById('loading-overlay');
    const text    = document.getElementById('loading-text');
    if (!overlay) return;
    overlay.style.display = active ? 'flex' : 'none';
    if (text && message) text.textContent = message;
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  _notifTimer: null,
  notify(message, type = 'info', duration = 3500) {
    const el = document.getElementById('notification');
    if (!el) { console.log(`[${type}] ${message}`); return; }

    // Clear existing timer
    if (this._notifTimer) clearTimeout(this._notifTimer);

    const colors = {
      success: { bg: 'rgba(16,185,129,.15)', border: '#10b981', text: '#10b981' },
      error:   { bg: 'rgba(239,68,68,.15)',  border: '#ef4444', text: '#ef4444' },
      warning: { bg: 'rgba(245,158,11,.15)', border: '#f59e0b', text: '#f59e0b' },
      info:    { bg: 'rgba(99,102,241,.15)', border: '#6366f1', text: '#6366f1' },
    };
    const c = colors[type] || colors.info;

    el.textContent = message;
    el.style.cssText = [
      'position:fixed',
      'bottom:20px',
      'right:20px',
      'z-index:99999',
      'padding:10px 18px',
      'border-radius:8px',
      `background:${c.bg}`,
      `border:1px solid ${c.border}`,
      `color:${c.text}`,
      'font-size:.82rem',
      'font-weight:600',
      'backdrop-filter:blur(8px)',
      'box-shadow:0 4px 20px rgba(0,0,0,.3)',
      'max-width:360px',
      'word-break:break-word',
      'display:block',
      'opacity:1',
      'transition:opacity .3s',
    ].join(';');

    if (duration > 0) {
      this._notifTimer = setTimeout(() => { el.style.opacity = '0'; }, duration);
    }
  },

  // ── Convenience Helpers ───────────────────────────────────────────────────
  getActiveSegment() {
    const el = document.querySelector('.seg-row.active');
    if (!el) return null;
    const id = el.dataset.segId;
    return this.segments.find(s => String(s.id) === String(id)) || null;
  },

  reset() {
    this.segments      = [];
    this.parsedData    = null;
    this.lqiResults    = {};
    this.currentFile   = null;
    this._proofSegments = null;
  },
};

// ── Legacy UI namespace ────────────────────────────────────────────────────
window.UI = {
  notify(msg, type) { AppState.notify(msg, type); },

  showModal(title, html, buttons = []) {
    const existing = document.getElementById('ui-generic-modal');
    if (existing) existing.remove();

    const btnHtml = buttons.map(b =>
      `<button onclick="${b.action ? '(' + b.action.toString() + ')()'  : ''}"
         style="padding:6px 16px;border-radius:6px;cursor:pointer;font-size:.78rem;
                border:1px solid var(--accent);background:var(--accent);color:#fff;font-weight:700;"
       >${b.label}</button>`
    ).join('');

    const modal = document.createElement('div');
    modal.id = 'ui-generic-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;
                  max-width:520px;width:94vw;max-height:80vh;overflow:auto;padding:20px 24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <strong style="font-size:.9rem;color:var(--text);">${title}</strong>
          <button onclick="document.getElementById('ui-generic-modal').remove()"
                  style="width:26px;height:26px;border-radius:5px;border:1px solid var(--border);
                         background:transparent;color:var(--text-dim);cursor:pointer;">×</button>
        </div>
        <div style="font-size:.84rem;color:var(--text-dim);line-height:1.6;">${html}</div>
        ${btnHtml ? `<div style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px;">${btnHtml}</div>` : ''}
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  },

  closeModal() {
    const m = document.getElementById('ui-generic-modal');
    if (m) m.remove();
    document.querySelectorAll('.modal-overlay.show').forEach(el => el.classList.remove('show'));
  },
};
