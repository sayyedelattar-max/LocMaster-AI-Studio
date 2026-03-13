// ── Application State ─────────────────────────────────────────────
// Central store for all runtime state; other modules read/write this.

window.AppState = {
  // ── Data ──────────────────────────────────────────────────────
  segments:      [],   // array of segment objects { id, source, target, status, … }
  currentFile:   null, // File object currently open
  currentProject:null, // active project record
  parsedData:    null, // full result from Parser.parseFile()
  projectConfig: null, // { name, srcLang, tgtLang, … }
  srcLang:       'en',
  tgtLang:       'ar',
  activeView:    'dashboard',
  user:          null,
  role:          null,
  lqiResults:    {},   // { [segmentId]: { score, errors, … } }
  filters:       { unconfirmed: false, reviewed: false, locked: false },
  _proofSegments: null, // temp segments used by proofreader

  // ── Notification ─────────────────────────────────────────────

  /**
   * Show a toast notification.
   * @param {string} msg  Message text
   * @param {'info'|'success'|'warning'|'error'} [type='info']
   * @param {number} [duration=4000]
   */
  notify(msg, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container') || document.body;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    Object.assign(toast.style, {
      position:     'fixed',
      bottom:       '20px',
      right:        '20px',
      padding:      '10px 18px',
      borderRadius: '8px',
      zIndex:       '9999',
      maxWidth:     '380px',
      fontSize:     '0.85rem',
      background:   type === 'error'   ? '#ef4444'
                  : type === 'success' ? '#22c55e'
                  : type === 'warning' ? '#f59e0b'
                  : '#3b82f6',
      color:  '#fff',
      boxShadow: '0 4px 12px rgba(0,0,0,.4)',
      transition: 'opacity .3s'
    });
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, duration);
  },

  // ── Loading overlay ───────────────────────────────────────────

  /**
   * Show or hide the global loading overlay.
   * @param {boolean} show
   * @param {string}  [label]
   */
  setLoading(show, label = '') {
    const el  = document.getElementById('loading-overlay');
    const lbl = document.getElementById('loading-label');
    if (el)  el.classList.toggle('hidden', !show);
    if (lbl) lbl.textContent = label;
  },

  // ── View switching ────────────────────────────────────────────

  /** Switch the active view section and update nav state. */
  setView(view) {
    this.activeView = view;
    document.querySelectorAll('[data-view]').forEach(el => {
      el.classList.toggle('hidden', el.dataset.view !== view);
    });
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.nav === view);
    });
  },

  // ── File helpers ──────────────────────────────────────────────

  /** Store the open file + its parsed segments. */
  setFile(file, segments) {
    this.currentFile = file;
    this.segments    = segments || [];
    const info = document.getElementById('topbar-filename');
    if (info) info.textContent = file ? file.name : '';
  },

  // ── Reset ─────────────────────────────────────────────────────

  /** Reset editor state (keeps auth and settings). */
  reset() {
    this.segments       = [];
    this.currentFile    = null;
    this.currentProject = null;
    this.parsedData     = null;
    this.projectConfig  = null;
    this.lqiResults     = {};
    this.filters        = { unconfirmed: false, reviewed: false, locked: false };
    this._proofSegments = null;
    const info = document.getElementById('topbar-filename');
    if (info) info.textContent = '';
  }
};

// ── Global navigate helper ────────────────────────────────────────

/** Navigate to a named view section. */
window.navigate = function(view) {
  AppState.setView(view);
};

// ── Demo data loader ──────────────────────────────────────────────

/** Loads a set of built-in demo segments for offline exploration. */
window.loadDemoData = function() {
  const DEMO_SEGMENTS = [
    { id: 1,  source: 'Welcome to LocMaster AI Studio.',      target: '', status: 'untranslated', matchType: null, matchScore: 0 },
    { id: 2,  source: 'This is a professional translation tool.', target: '', status: 'untranslated', matchType: null, matchScore: 0 },
    { id: 3,  source: 'Open a file to start translating.',    target: '', status: 'untranslated', matchType: null, matchScore: 0 },
    { id: 4,  source: 'Use AI to accelerate your workflow.',  target: '', status: 'untranslated', matchType: null, matchScore: 0 },
    { id: 5,  source: 'Quality is our top priority.',         target: '', status: 'untranslated', matchType: null, matchScore: 0 }
  ];
  AppState.segments = DEMO_SEGMENTS;
  AppState.srcLang  = 'en';
  AppState.tgtLang  = 'ar';
  AppState.notify('Demo data loaded (5 segments)', 'info');
  if (window.UISegments) UISegments.render(AppState.segments, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
  navigate('editor');
};
