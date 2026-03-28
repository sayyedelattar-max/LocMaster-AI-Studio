// ══════════════════════════════════════════════════════════════
// js/app-state.js  — LocMaster AI Studio — Application State
// ══════════════════════════════════════════════════════════════

window.AppState = (function () {
  const state = {
    // Auth
    currentUser: null,

    // Editor
    segments:      [],
    srcLang:       'en',
    tgtLang:       'ar',
    currentFile:   null,
    parsedData:    null,
    projectConfig: null,

    // Per-segment AI results
    lqiResults: {},

    // Proofreader
    _proofSegments: null,

    // Filter state
    filters: {
      ice:        true,
      '100':      true,
      fuzzy:      true,
      mt:         true,
      new:        true,
      translated: true,
      reviewed:   true,
      flagged:    true,
      locked:     true,
    },
  };

  // ── Notification ───────────────────────────────────────────────
  let _notifTimer = null;
  function notify(message, type = 'info', duration = 3500) {
    const el = document.getElementById('notification');
    if (!el) return;
    el.textContent = message;
    el.className = `notification show ${type}`;
    clearTimeout(_notifTimer);
    if (duration > 0) {
      _notifTimer = setTimeout(() => el.classList.remove('show'), duration);
    }
  }

  // ── Loading overlay ────────────────────────────────────────────
  function setLoading(active, text = 'Processing…') {
    const overlay = document.getElementById('loading-overlay');
    const textEl  = document.getElementById('loading-text');
    if (!overlay) return;
    if (active) {
      if (textEl) textEl.textContent = text;
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('active');
    }
  }

  // ── View Management ────────────────────────────────────────────
  function setView(viewName) {
    document.querySelectorAll('.view').forEach(v => {
      v.classList.toggle('active', v.id === `view-${viewName}`);
      if (v.id === `view-${viewName}`) {
        v.style.display = '';
      } else {
        v.style.display = 'none';
      }
    });
  }

  // ── AI Status Bar ──────────────────────────────────────────────
  function updateAIStatusBar() {
    const bar = document.getElementById('ai-status-bar');
    if (!bar) return;
    const providers = Object.keys(LMConfig.providers);
    const configured = providers.filter(p => getProviderKey(p));
    if (configured.length > 0) {
      const names = configured.map(p => LMConfig.providers[p].name.split(' ')[0]).join(' · ');
      bar.className = 'ai-status-bar configured';
      bar.innerHTML = `<span class="ai-dot success"></span><span>${names}</span>`;
    } else {
      bar.className = 'ai-status-bar not-configured';
      bar.innerHTML = `<span class="ai-dot error"></span><span>AI not configured</span>`;
    }
  }

  // ── Expose via proxy so code can do AppState.setView = function()… ──
  return new Proxy(state, {
    get(target, prop) {
      if (prop === 'notify')            return notify;
      if (prop === 'setLoading')        return setLoading;
      if (prop === 'setView')           return setView;
      if (prop === 'updateAIStatusBar') return updateAIStatusBar;
      return target[prop];
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
})();
