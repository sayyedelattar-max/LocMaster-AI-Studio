// ── Settings Module ───────────────────────────────────────────────
// Manages AI provider keys, theme, font-size, and per-tool prompts.

window.Settings = (function() {
  const STORAGE_KEY = 'lm_settings';

  // Default settings structure
  const DEFAULTS = {
    provider:   'gemini',
    model:      '',
    theme:      'dark',
    fontSize:   0.85,
    toolPrompts: {}
  };

  let _current = { ...DEFAULTS };

  // ── Helpers ─────────────────────────────────────────────────────

  function _el(id) { return document.getElementById(id); }

  // ── Public API ───────────────────────────────────────────────────

  return {
    /** Initialise settings: load persisted values and apply them to UI. */
    init() {
      this.load();
      // Populate provider key inputs from localStorage
      const provCfg = window.LMConfig && LMConfig.providers;
      if (provCfg) {
        Object.entries(provCfg).forEach(([id, cfg]) => {
          const inp = _el(`key-${id}`);
          if (inp) inp.value = localStorage.getItem(cfg.keyId) || '';
        });
      }
      // Set active provider dropdown
      const provSel = _el('settings-provider');
      if (provSel) provSel.value = _current.provider;
    },

    /**
     * Switch the active settings tab panel.
     * @param {string} tab  e.g. 'ai', 'appearance', 'account'
     */
    switchTab(tab) {
      document.querySelectorAll('.settings-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
      document.querySelectorAll('.settings-panel').forEach(panel => panel.classList.toggle('hidden', panel.dataset.panel !== tab));
    },

    /** Persist current settings to localStorage. */
    save() {
      // Persist provider API keys
      const provCfg = window.LMConfig && LMConfig.providers;
      if (provCfg) {
        Object.entries(provCfg).forEach(([id, cfg]) => {
          const inp = _el(`key-${id}`);
          if (inp && inp.value.trim()) localStorage.setItem(cfg.keyId, inp.value.trim());
        });
      }
      const provSel = _el('settings-provider');
      if (provSel) {
        _current.provider = provSel.value;
        if (window.AIClient) AIClient.setProvider(provSel.value);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_current));
      if (window.AppState) AppState.notify('Settings saved', 'success');
    },

    /** Load settings from localStorage. */
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) _current = { ...DEFAULTS, ...JSON.parse(raw) };
      } catch (_) { _current = { ...DEFAULTS }; }
    },

    /**
     * Returns the current AI provider configuration.
     * @returns {{ provider, model, keys: object }}
     */
    getAISettings() {
      const keys = {};
      const provCfg = window.LMConfig && LMConfig.providers;
      if (provCfg) {
        Object.entries(provCfg).forEach(([id, cfg]) => {
          keys[id] = localStorage.getItem(cfg.keyId) || '';
        });
      }
      return { provider: _current.provider, model: _current.model, keys };
    }
  };
})();

// ── Global helpers called from HTML and app.js ───────────────────

/**
 * Check whether the given tool's AI provider is configured.
 * @param {string} tool
 * @returns {boolean}
 */
window.isToolReady = function(tool) {
  if (!window.AIClient) return false;
  const provider = AIClient.getProvider();
  return !!getProviderKey(provider);
};

/**
 * Get the custom system prompt stored for a given tool.
 * @param {string} tool  e.g. 'editor', 'proofreader'
 * @returns {string}
 */
window.getToolPrompt = function(tool) {
  try {
    const raw = localStorage.getItem('lm_settings');
    const cfg = raw ? JSON.parse(raw) : {};
    return (cfg.toolPrompts && cfg.toolPrompts[tool]) || '';
  } catch (_) { return ''; }
};
