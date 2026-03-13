// ══════════════════════════════════════════════════════════════
// js/settings.js  — LocMaster AI Studio — Settings Module
// Includes: AI Providers, Prompt Center, Themes, Supabase
// ══════════════════════════════════════════════════════════════

window.Settings = (function () {

  let _currentTab = 'ai-providers';

  // ── AI Providers Panel ─────────────────────────────────────────
  function renderAIProviders() {
    const panel = document.getElementById('settings-ai-providers');
    if (!panel) return;
    panel.innerHTML = `
      <div style="padding:24px;max-width:700px;">
        <h2 style="font-size:1rem;font-weight:800;margin-bottom:6px;">🤖 AI Providers</h2>
        <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:20px;">Configure API keys for AI-powered tools. Keys are stored locally in your browser.</p>
        ${Object.entries(LMConfig.providers).map(([id, prov]) => {
          const key = getProviderKey(id) || '';
          const configured = !!key;
          return `<div style="background:var(--surface2);border:1px solid ${configured ? 'rgba(52,211,153,.3)' : 'var(--border)'};border-radius:10px;padding:16px 20px;margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${configured ? '#34d399' : '#94a3b8'};"></div>
              <div style="font-weight:700;font-size:.88rem;color:var(--text);">${prov.name}</div>
              ${configured ? '<span style="font-size:.65rem;padding:1px 8px;border-radius:8px;background:rgba(52,211,153,.15);color:#34d399;border:1px solid rgba(52,211,153,.3);">Configured</span>' : ''}
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="password" id="key-${id}" value="${key}"
                placeholder="Paste your ${prov.name} API key…"
                style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:.8rem;padding:8px 12px;outline:none;font-family:var(--mono);"
                onfocus="this.type='text'" onblur="this.type='password'">
              <button onclick="Settings.saveKey('${id}')" style="padding:8px 16px;background:var(--accent);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:.78rem;font-weight:700;">Save</button>
              ${configured ? `<button onclick="Settings.removeKey('${id}')" style="padding:8px 12px;background:transparent;border:1px solid rgba(248,113,113,.3);color:#f87171;border-radius:7px;cursor:pointer;font-size:.78rem;">Remove</button>` : ''}
              <button onclick="Settings.testKey('${id}')" style="padding:8px 12px;background:var(--surface);border:1px solid var(--border);color:var(--text-dim);border-radius:7px;cursor:pointer;font-size:.78rem;">Test</button>
            </div>
            <div id="key-test-${id}" style="font-size:.72rem;margin-top:6px;color:var(--text-muted);"></div>
            <div style="font-size:.67rem;color:var(--text-muted);margin-top:8px;">Default model: ${prov.defaultModel} · <a href="#" style="color:var(--accent);" onclick="event.preventDefault();">Get API key ↗</a></div>
          </div>`;
        }).join('')}
      </div>`;
  }

  // ── Prompt Center Panel ────────────────────────────────────────
  function renderPromptCenter() {
    const panel = document.getElementById('settings-prompt-center');
    if (!panel) return;
    panel.innerHTML = `
      <div style="padding:24px;max-width:700px;">
        <h2 style="font-size:1rem;font-weight:800;margin-bottom:6px;">🧠 Prompt Center</h2>
        <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:20px;">Customize AI prompts for each tool. Leave empty to use defaults.</p>
        ${Object.entries(LMConfig.tools).map(([id, tool]) => {
          const saved = JSON.parse(localStorage.getItem('lm_tool_ai_' + id) || '{}');
          const prompt = saved.customPrompt || '';
          return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:16px 20px;margin-bottom:12px;">
            <div style="font-weight:700;font-size:.85rem;color:var(--text);margin-bottom:8px;">${tool.label}</div>
            <textarea id="prompt-${id}" rows="4"
              style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:.78rem;padding:10px;outline:none;resize:vertical;line-height:1.5;box-sizing:border-box;"
              placeholder="Custom instructions prepended to ${tool.label}'s system prompt (optional)…"
              onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">${prompt}</textarea>
            <button onclick="Settings.savePrompt('${id}')" style="margin-top:8px;padding:6px 16px;background:var(--accent);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:.76rem;font-weight:700;">Save Prompt</button>
          </div>`;
        }).join('')}
      </div>`;
  }

  // ── Themes Panel ───────────────────────────────────────────────
  function renderThemes() {
    const panel = document.getElementById('settings-themes');
    if (!panel) return;
    const current = getCurrentTheme();
    panel.innerHTML = `
      <div style="padding:24px;max-width:600px;">
        <h2 style="font-size:1rem;font-weight:800;margin-bottom:6px;">🎨 Themes</h2>
        <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:20px;">Choose your preferred color scheme.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;">
          ${Object.entries(LMConfig.themes).map(([id, t]) => `
            <div onclick="Settings.applyTheme('${id}')" style="background:var(--surface2);border:2px solid ${id===current?'var(--accent)':'var(--border)'};border-radius:10px;padding:14px;text-align:center;cursor:pointer;transition:.15s;"
              onmouseenter="this.style.borderColor='var(--accent)'" onmouseleave="this.style.borderColor='${id===current?'var(--accent)':'var(--border)'}'">
              <div style="font-size:1.5rem;margin-bottom:6px;">${t.icon}</div>
              <div style="font-size:.78rem;font-weight:700;color:var(--text);">${t.label}</div>
              ${id===current?'<div style="font-size:.65rem;color:var(--accent);margin-top:3px;">Active</div>':''}
            </div>`).join('')}
        </div>
      </div>`;
  }

  // ── Supabase Panel ─────────────────────────────────────────────
  function renderSupabase() {
    const panel = document.getElementById('settings-supabase');
    if (!panel) return;
    const url = localStorage.getItem('lm_supabase_url') || '';
    const key = localStorage.getItem('lm_supabase_anon_key') || '';
    panel.innerHTML = `
      <div style="padding:24px;max-width:600px;">
        <h2 style="font-size:1rem;font-weight:800;margin-bottom:6px;">🗄️ Supabase Integration</h2>
        <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:20px;">Connect your Supabase project for team collaboration and cloud storage. Leave empty to use local/demo mode.</p>
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:16px 20px;">
          <div style="margin-bottom:12px;">
            <label style="font-size:.72rem;color:var(--text-muted);display:block;margin-bottom:4px;">Project URL</label>
            <input type="text" id="supabase-url" value="${url}" placeholder="https://your-project.supabase.co"
              style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:.8rem;padding:8px 12px;outline:none;box-sizing:border-box;">
          </div>
          <div style="margin-bottom:14px;">
            <label style="font-size:.72rem;color:var(--text-muted);display:block;margin-bottom:4px;">Anon Key</label>
            <input type="password" id="supabase-key" value="${key}" placeholder="eyJhbGciOiJIUzI1NiIs…"
              style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:.8rem;padding:8px 12px;outline:none;font-family:var(--mono);box-sizing:border-box;"
              onfocus="this.type='text'" onblur="this.type='password'">
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="Settings.saveSupabase()" style="padding:8px 20px;background:var(--accent);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:.78rem;font-weight:700;">Save & Reconnect</button>
            <button onclick="Settings.clearSupabase()" style="padding:8px 16px;background:transparent;border:1px solid var(--border);color:var(--text-dim);border-radius:7px;cursor:pointer;font-size:.78rem;">Clear</button>
          </div>
          <div id="supabase-status" style="font-size:.72rem;color:var(--text-muted);margin-top:8px;">${window.SupabaseClient ? '✓ Connected' : 'Not connected (demo mode)'}</div>
        </div>
      </div>`;
  }

  // ── Public ─────────────────────────────────────────────────────
  return {
    init() {
      this.switchTab(_currentTab);
      AppState.updateAIStatusBar();
    },

    switchTab(tab) {
      _currentTab = tab;
      document.querySelectorAll('.settings-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
      });
      document.querySelectorAll('.settings-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `settings-${tab}`);
      });
      if (tab === 'ai-providers')  renderAIProviders();
      if (tab === 'prompt-center') renderPromptCenter();
      if (tab === 'themes')        renderThemes();
      if (tab === 'supabase')      renderSupabase();
    },

    saveKey(providerId) {
      const inp = document.getElementById('key-' + providerId);
      if (!inp) return;
      const key = inp.value.trim();
      const cfg = LMConfig.providers[providerId];
      if (key) {
        localStorage.setItem(cfg.keyStorageKey, key);
        AppState.notify(`${cfg.name} API key saved`, 'success');
      } else {
        localStorage.removeItem(cfg.keyStorageKey);
        AppState.notify(`${cfg.name} key removed`, 'info');
      }
      renderAIProviders();
      AppState.updateAIStatusBar();
    },

    removeKey(providerId) {
      const cfg = LMConfig.providers[providerId];
      localStorage.removeItem(cfg.keyStorageKey);
      renderAIProviders();
      AppState.updateAIStatusBar();
      AppState.notify(`${cfg.name} key removed`, 'info');
    },

    async testKey(providerId) {
      const inp = document.getElementById('key-' + providerId);
      const status = document.getElementById('key-test-' + providerId);
      if (!inp || !status) return;
      const key = inp.value.trim();
      if (!key) { status.textContent = '⚠ Enter a key first'; return; }
      // Temporarily save for test
      const cfg = LMConfig.providers[providerId];
      const prev = localStorage.getItem(cfg.keyStorageKey);
      localStorage.setItem(cfg.keyStorageKey, key);
      status.textContent = '⏳ Testing…';
      try {
        const result = await AIClient.testKey(providerId);
        status.style.color = result.ok ? '#34d399' : '#f87171';
        status.textContent = result.ok ? '✓ Connection successful' : '✗ ' + result.error;
      } catch (e) {
        status.style.color = '#f87171';
        status.textContent = '✗ ' + e.message;
      } finally {
        if (!prev) localStorage.removeItem(cfg.keyStorageKey); else localStorage.setItem(cfg.keyStorageKey, prev);
      }
    },

    savePrompt(toolId) {
      const inp = document.getElementById('prompt-' + toolId);
      if (!inp) return;
      const saved = JSON.parse(localStorage.getItem('lm_tool_ai_' + toolId) || '{}');
      saved.customPrompt = inp.value.trim();
      localStorage.setItem('lm_tool_ai_' + toolId, JSON.stringify(saved));
      AppState.notify('Prompt saved for ' + (LMConfig.tools[toolId]?.label || toolId), 'success');
    },

    applyTheme(name) {
      applyTheme(name);
      renderThemes();
    },

    saveSupabase() {
      const url = document.getElementById('supabase-url')?.value.trim();
      const key = document.getElementById('supabase-key')?.value.trim();
      if (url) localStorage.setItem('lm_supabase_url', url); else localStorage.removeItem('lm_supabase_url');
      if (key) localStorage.setItem('lm_supabase_anon_key', key); else localStorage.removeItem('lm_supabase_anon_key');
      AppState.notify('Supabase settings saved. Reload the page to reconnect.', 'success');
    },

    clearSupabase() {
      localStorage.removeItem('lm_supabase_url');
      localStorage.removeItem('lm_supabase_anon_key');
      renderSupabase();
      AppState.notify('Supabase settings cleared', 'info');
    },
  };
})();
