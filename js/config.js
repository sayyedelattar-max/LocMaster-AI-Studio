// ══════════════════════════════════════════════════════════════
// js/config.js  — LocMaster AI Studio — Global Configuration
// ══════════════════════════════════════════════════════════════

window.LMConfig = {

  // ── AI Providers ──────────────────────────────────────────────
  providers: {
    gemini: {
      name: 'Gemini (Google)',
      type: 'gemini',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      keyStorageKey: 'lm_gemini_key',
      defaultModel: 'gemini-2.0-flash',
      models: [
        { id: 'gemini-2.0-flash',        label: 'Gemini 2.0 Flash (Recommended)' },
        { id: 'gemini-2.0-flash-lite',   label: 'Gemini 2.0 Flash Lite (Fast)' },
        { id: 'gemini-1.5-flash',        label: 'Gemini 1.5 Flash' },
        { id: 'gemini-1.5-flash-8b',     label: 'Gemini 1.5 Flash-8B (Light)' },
        { id: 'gemini-1.5-pro',          label: 'Gemini 1.5 Pro' },
      ],
    },
    claude: {
      name: 'Claude (Anthropic)',
      type: 'claude',
      endpoint: 'https://api.anthropic.com/v1/messages',
      keyStorageKey: 'lm_claude_key',
      defaultModel: 'claude-3-5-haiku-20241022',
      models: [
        { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-5-haiku-20241022',  label: 'Claude 3.5 Haiku (Fast)' },
        { id: 'claude-3-opus-20240229',     label: 'Claude 3 Opus' },
      ],
    },
    openai: {
      name: 'GPT-4o (OpenAI)',
      type: 'openai',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      keyStorageKey: 'lm_openai_key',
      defaultModel: 'gpt-4o-mini',
      models: [
        { id: 'gpt-4o',      label: 'GPT-4o' },
        { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
        { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      ],
    },
    deepseek: {
      name: 'DeepSeek',
      type: 'openai',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      keyStorageKey: 'lm_deepseek_key',
      defaultModel: 'deepseek-chat',
      models: [
        { id: 'deepseek-chat',     label: 'DeepSeek Chat' },
        { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
      ],
    },
  },

  // ── Per-Tool Defaults ─────────────────────────────────────────
  tools: {
    editor: {
      label: 'Translation Editor',
      defaultProvider: 'gemini',
      defaultModel: 'gemini-2.0-flash',
      temperature: 0.2,
      maxTokens: 2000,
    },
    lqi: {
      label: 'LQI Reviewer',
      defaultProvider: 'gemini',
      defaultModel: 'gemini-2.0-flash',
      temperature: 0.1,
      maxTokens: 2000,
    },
    qc: {
      label: 'QC Checker',
      defaultProvider: 'gemini',
      defaultModel: 'gemini-2.0-flash',
      temperature: 0.1,
      maxTokens: 1000,
    },
    proofreader: {
      label: 'Linguistic Proofreader',
      defaultProvider: 'gemini',
      defaultModel: 'gemini-2.0-flash',
      temperature: 0.2,
      maxTokens: 2000,
    },
    aligner: {
      label: 'AI Aligner',
      defaultProvider: 'gemini',
      defaultModel: 'gemini-2.0-flash',
      temperature: 0.05,
      maxTokens: 8000,
    },
    tmmaint: {
      label: 'TM Maintenance',
      defaultProvider: 'gemini',
      defaultModel: 'gemini-2.0-flash',
      temperature: 0.1,
      maxTokens: 8000,
    },
    aitranslator: {
      label: 'AI Translator (DNA)',
      defaultProvider: 'gemini',
      defaultModel: 'gemini-2.0-flash',
      temperature: 0.3,
      maxTokens: 3000,
    },
  },

  // ── UI Themes ─────────────────────────────────────────────────
  themes: {
    dark:    { label: 'Neural Dark',  icon: '🌑' },
    light:   { label: 'Clarity',      icon: '☀️'  },
    midnight:{ label: 'Midnight',     icon: '🌌' },
    ocean:   { label: 'Deep Ocean',   icon: '🌊' },
  },

  // ── Demo Accounts ─────────────────────────────────────────────
  demoAccounts: [
    { email: 'admin@locmaster.ai',      password: 'admin1234',  name: 'Admin User',       role: 'admin',      avatar: '⬡', color: '#ef4444' },
    { email: 'pm@locmaster.ai',         password: 'pm1234',     name: 'Project Manager',  role: 'pm',         avatar: '◈', color: '#f59e0b' },
    { email: 'reviewer@locmaster.ai',   password: 'rev1234',    name: 'Lead Reviewer',    role: 'reviewer',   avatar: '◎', color: '#a78bfa' },
    { email: 'translator@locmaster.ai', password: 'trans1234',  name: 'Translator',       role: 'translator', avatar: '✎', color: '#34d399' },
  ],

  // ── Role Permissions ──────────────────────────────────────────
  permissions: {
    admin:      ['project.create','project.delete','users.view','users.invite','reports.view','lqi.use','qc.use','proofreader.use'],
    pm:         ['project.create','users.view','reports.view','lqi.use','qc.use','proofreader.use'],
    reviewer:   ['lqi.use','qc.use','proofreader.use'],
    translator: ['lqi.use','qc.use'],
  },
};

// ── Convenience helpers ───────────────────────────────────────────
window.getProviderKey = function(providerId) {
  const cfg = LMConfig.providers[providerId];
  if (!cfg) return null;
  return localStorage.getItem(cfg.keyStorageKey) || null;
};

window.getToolPrompt = function(toolId) {
  const saved = JSON.parse(localStorage.getItem('lm_tool_ai_' + toolId) || '{}');
  return saved.customPrompt || '';
};

window.isToolReady = function(toolId) {
  // Check per-tool saved provider, or fall back to any configured provider
  const saved = JSON.parse(localStorage.getItem('lm_tool_ai_' + toolId) || '{}');
  const provider = saved.provider || LMConfig.tools[toolId]?.defaultProvider || 'gemini';
  return !!getProviderKey(provider);
};

window.getCurrentTheme = function() {
  return localStorage.getItem('lm_theme') || 'dark';
};

window.applyTheme = function(name) {
  const themes = {
    dark: {
      '--bg':         '#02040a',
      '--surface':    '#080d18',
      '--surface2':   '#0d1526',
      '--border':     '#1e2d45',
      '--text':       '#e2e8f0',
      '--text-dim':   '#94a3b8',
      '--text-muted': '#4a5568',
      '--accent':     '#38bdf8',
      '--success':    '#34d399',
      '--warning':    '#fbbf24',
      '--danger':     '#f87171',
      '--error':      '#ef4444',
      '--accent-rgb': '56,189,248',
      '--tool-lqi':   '#8b5cf6',
      '--tool-qc':    '#06b6d4',
      '--tool-proofreader': '#10b981',
    },
    light: {
      '--bg':         '#f8fafc',
      '--surface':    '#ffffff',
      '--surface2':   '#f1f5f9',
      '--border':     '#e2e8f0',
      '--text':       '#0f172a',
      '--text-dim':   '#334155',
      '--text-muted': '#94a3b8',
      '--accent':     '#0284c7',
      '--success':    '#059669',
      '--warning':    '#d97706',
      '--danger':     '#dc2626',
      '--error':      '#dc2626',
      '--accent-rgb': '2,132,199',
      '--tool-lqi':   '#7c3aed',
      '--tool-qc':    '#0891b2',
      '--tool-proofreader': '#059669',
    },
    midnight: {
      '--bg':         '#000000',
      '--surface':    '#050810',
      '--surface2':   '#0a0f1e',
      '--border':     '#151d30',
      '--text':       '#dde5f0',
      '--text-dim':   '#7a8ea8',
      '--text-muted': '#3a4a60',
      '--accent':     '#818cf8',
      '--success':    '#4ade80',
      '--warning':    '#facc15',
      '--danger':     '#fb7185',
      '--error':      '#f43f5e',
      '--accent-rgb': '129,140,248',
      '--tool-lqi':   '#a78bfa',
      '--tool-qc':    '#22d3ee',
      '--tool-proofreader': '#4ade80',
    },
    ocean: {
      '--bg':         '#021017',
      '--surface':    '#051a26',
      '--surface2':   '#082535',
      '--border':     '#0e3349',
      '--text':       '#cde8f5',
      '--text-dim':   '#6baecf',
      '--text-muted': '#2c5f7a',
      '--accent':     '#06b6d4',
      '--success':    '#10b981',
      '--warning':    '#f59e0b',
      '--danger':     '#f87171',
      '--error':      '#ef4444',
      '--accent-rgb': '6,182,212',
      '--tool-lqi':   '#818cf8',
      '--tool-qc':    '#22d3ee',
      '--tool-proofreader': '#34d399',
    },
  };
  const vars = themes[name] || themes.dark;
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  localStorage.setItem('lm_theme', name);
};
