// ── Global Configuration ──────────────────────────────────────────
// Supabase credentials (set via Settings or environment)
window.SUPABASE_URL      = '';
window.SUPABASE_ANON_KEY = '';

window.APP_VERSION = '9.0';

// Role definitions used across the app
window.ROLES = {
  admin:      { label: 'Admin',      permissions: ['*'] },
  pm:         { label: 'PM',         permissions: ['projects', 'users', 'reports'] },
  reviewer:   { label: 'Reviewer',   permissions: ['review', 'lqi', 'qc'] },
  translator: { label: 'Translator', permissions: ['translate'] }
};

// LMConfig: AI provider settings (also exposed as window.LMConfig for app.js)
window.LMConfig = {
  providers: {
    gemini: {
      name:     'Gemini',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
      type:     'gemini',
      models:   ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
      keyId:    'gemini_key'
    },
    claude: {
      name:     'Claude',
      endpoint: 'https://api.anthropic.com/v1/messages',
      type:     'claude',
      models:   ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
      keyId:    'claude_key'
    },
    gpt4o: {
      name:     'GPT-4o',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      type:     'openai',
      models:   ['gpt-4o', 'gpt-4o-mini'],
      keyId:    'openai_key'
    },
    deepseek: {
      name:     'DeepSeek',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      type:     'openai',
      models:   ['deepseek-chat', 'deepseek-reasoner'],
      keyId:    'deepseek_key'
    }
  },
  themes: {
    dark:    { label: 'Dark',    class: 'theme-dark' },
    light:   { label: 'Light',  class: 'theme-light' },
    solarized:{ label: 'Solarized', class: 'theme-solarized' }
  }
};

// AI_CONFIG alias for external modules
window.AI_CONFIG = window.LMConfig;

// ── Theme helpers ─────────────────────────────────────────────────

/** Returns the currently active theme key (stored in localStorage). */
window.getCurrentTheme = function() {
  return localStorage.getItem('lm_theme') || 'dark';
};

/** Applies a theme by setting a data-attribute on <html> and persisting the choice. */
window.applyTheme = function(theme) {
  const cfg = LMConfig.themes[theme] || LMConfig.themes['dark'];
  document.documentElement.setAttribute('data-theme', theme);
  // legacy class swap
  Object.values(LMConfig.themes).forEach(t => document.documentElement.classList.remove(t.class));
  document.documentElement.classList.add(cfg.class);
  localStorage.setItem('lm_theme', theme);
};

// ── Project persistence helper ────────────────────────────────────

/** Persists the current project / segment state to localStorage. */
window.saveCurrentProject = function() {
  try {
    if (window.AppState) {
      const data = {
        segments:      AppState.segments,
        srcLang:       AppState.srcLang,
        tgtLang:       AppState.tgtLang,
        projectConfig: AppState.projectConfig || {}
      };
      localStorage.setItem('lm_current_project', JSON.stringify(data));
    }
  } catch (e) {
    console.warn('saveCurrentProject failed', e);
  }
};

// ── API key helpers ───────────────────────────────────────────────

/** Returns the stored API key for the given provider. */
window.getProviderKey = function(provider) {
  const cfg = LMConfig.providers[provider];
  if (!cfg) return '';
  return localStorage.getItem(cfg.keyId) || '';
};
