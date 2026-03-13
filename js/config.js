// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — Configuration
// ══════════════════════════════════════════════════════════════════════════════

window.LMConfig = {
  version: '2.0.0',

  // ── AI Providers ──────────────────────────────────────────────────────────
  providers: {
    gemini: {
      name: 'Google Gemini',
      type: 'gemini',
      endpoint: 'https://generativelanguage.googleapis.com/v1/models',
      defaultModel: 'gemini-2.0-flash',
      models: [
        { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash (Recommended)' },
        { id: 'gemini-1.5-flash',      label: 'Gemini 1.5 Flash' },
        { id: 'gemini-1.5-flash-8b',   label: 'Gemini 1.5 Flash 8B' },
      ],
    },
    claude: {
      name: 'Anthropic Claude',
      type: 'claude',
      endpoint: 'https://api.anthropic.com/v1/messages',
      defaultModel: 'claude-3-5-sonnet-20241022',
      models: [
        { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-haiku-20240307',    label: 'Claude 3 Haiku' },
      ],
    },
    openai: {
      name: 'OpenAI',
      type: 'openai',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      defaultModel: 'gpt-4o',
      models: [
        { id: 'gpt-4o',       label: 'GPT-4o' },
        { id: 'gpt-4-turbo',  label: 'GPT-4 Turbo' },
        { id: 'gpt-3.5-turbo',label: 'GPT-3.5 Turbo' },
      ],
    },
    deepseek: {
      name: 'DeepSeek',
      type: 'deepseek',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      defaultModel: 'deepseek-chat',
      models: [
        { id: 'deepseek-chat',    label: 'DeepSeek Chat' },
        { id: 'deepseek-coder',   label: 'DeepSeek Coder' },
      ],
    },
  },

  // ── Per-tool defaults ──────────────────────────────────────────────────────
  tools: {
    lqi:           { defaultProvider: 'gemini', defaultModel: 'gemini-2.0-flash', temperature: 0.2, maxTokens: 2000 },
    qc:            { defaultProvider: 'gemini', defaultModel: 'gemini-2.0-flash', temperature: 0.1, maxTokens: 1000 },
    proofreader:   { defaultProvider: 'gemini', defaultModel: 'gemini-2.0-flash', temperature: 0.2, maxTokens: 2000 },
    editor:        { defaultProvider: 'gemini', defaultModel: 'gemini-2.0-flash', temperature: 0.3, maxTokens: 3000 },
    aligner:       { defaultProvider: 'gemini', defaultModel: 'gemini-2.0-flash', temperature: 0.1, maxTokens: 4000 },
    tmmaint:       { defaultProvider: 'gemini', defaultModel: 'gemini-2.0-flash', temperature: 0.2, maxTokens: 3000 },
    aitranslator:  { defaultProvider: 'gemini', defaultModel: 'gemini-2.0-flash', temperature: 0.3, maxTokens: 4000 },
  },

  // ── Themes ────────────────────────────────────────────────────────────────
  themes: {
    dark:        { '--bg':'#0f1117','--surface':'#1a1d27','--surface2':'#22263a','--border':'#2d3150','--text':'#e8eaf0','--text-muted':'#8890b0','--text-dim':'#5a6080','--accent':'#6366f1' },
    light:       { '--bg':'#f0f2f8','--surface':'#ffffff','--surface2':'#f5f7fb','--border':'#dde1ef','--text':'#1a1d2e','--text-muted':'#5a6080','--text-dim':'#8890b0','--accent':'#4f52d0' },
    midnight:    { '--bg':'#080c14','--surface':'#0e1220','--surface2':'#141928','--border':'#1e2440','--text':'#cdd6f4','--text-muted':'#6c7aaa','--text-dim':'#3d4570','--accent':'#89b4fa' },
    nord:        { '--bg':'#2e3440','--surface':'#3b4252','--surface2':'#434c5e','--border':'#4c566a','--text':'#eceff4','--text-muted':'#9099b0','--text-dim':'#616e88','--accent':'#88c0d0' },
  },

  // ── Gemini safety settings ─────────────────────────────────────────────────
  safetySettings: [
    { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH',        threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',  threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT',  threshold: 'BLOCK_NONE' },
  ],
};

// ── Provider Key Helpers ───────────────────────────────────────────────────
function getProviderKey(provider) {
  return localStorage.getItem('lm_key_' + provider) || '';
}

function getProviderConfig(provider) {
  return LMConfig.providers[provider] || LMConfig.providers.gemini;
}

function getProviderModel(provider) {
  const saved = JSON.parse(localStorage.getItem('lm_tool_ai_editor') || '{}');
  if (saved.provider === provider && saved.model) return saved.model;
  return getProviderConfig(provider).defaultModel;
}

function isProviderConfigured(provider) {
  return !!getProviderKey(provider);
}

// ── Tool Helpers ───────────────────────────────────────────────────────────
function isToolReady(toolId) {
  const saved = JSON.parse(localStorage.getItem('lm_tool_ai_' + toolId) || '{}');
  const provider = saved.provider || LMConfig.tools[toolId]?.defaultProvider || 'gemini';
  return isProviderConfigured(provider);
}

function getToolPrompt(toolId) {
  const saved = JSON.parse(localStorage.getItem('lm_tool_ai_' + toolId) || '{}');
  return saved.customPrompt || '';
}

function getToolConfig(toolId) {
  const defaults = LMConfig.tools[toolId] || {};
  const saved = JSON.parse(localStorage.getItem('lm_tool_ai_' + toolId) || '{}');
  return {
    provider:    saved.provider    || defaults.defaultProvider || 'gemini',
    model:       saved.model       || defaults.defaultModel    || 'gemini-2.0-flash',
    temperature: saved.temperature != null ? saved.temperature : (defaults.temperature || 0.2),
    maxTokens:   saved.maxTokens   || defaults.maxTokens       || 1000,
    customPrompt: saved.customPrompt || '',
  };
}

// ── Theme Helpers ──────────────────────────────────────────────────────────
function getCurrentTheme() {
  return localStorage.getItem('lm_theme') || 'dark';
}

/**
 * Extract and parse the first JSON object from an AI response string.
 * Shared utility to avoid duplication across ai-client.js, ai-translator-ui.js, etc.
 * @param {string} raw - Raw AI response text
 * @returns {object|null} Parsed JSON object or null
 */
function extractJSON(raw) {
  if (!raw) return null;
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function applyTheme(name) {
  const theme = LMConfig.themes[name] || LMConfig.themes.dark;
  const root  = document.documentElement;
  Object.entries(theme).forEach(([k, v]) => root.style.setProperty(k, v));
  localStorage.setItem('lm_theme', name);
  // Update active theme button if present
  document.querySelectorAll('[data-theme]').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === name);
  });
}

// ── Navigation ────────────────────────────────────────────────────────────
function navigate(view) {
  if (window.AppState && typeof AppState.setView === 'function') {
    AppState.setView(view);
  }
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === view);
  });
  // Show/hide view panels
  document.querySelectorAll('[data-view]').forEach(el => {
    el.style.display = el.dataset.view === view ? '' : 'none';
  });
}
