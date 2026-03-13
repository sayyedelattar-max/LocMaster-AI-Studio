// ══════════════════════════════════════════════════════════
// AI TRANSLATOR — DNA-Powered Translation Engine
// ══════════════════════════════════════════════════════════
window.AITranslator = (() => {
  const S = {
    dna: null,           // Built DNA object
    isBuilding: false,
    isTranslating: false,
    settingsOpen: false,
  };

  const VARIANTS = [
    { id:'direct',      label:'1. Direct & Accurate',   icon:'🎯', color:'#3b82f6', desc:'Literal and precise — exact meaning preserved' },
    { id:'refined',     label:'2. Refined Translation',  icon:'✨', color:'#8b5cf6', desc:'Enhanced style, flow, and natural Arabic' },
    { id:'transcreated',label:'3. Trans-created',        icon:'🌟', color:'#f59e0b', desc:'Culturally adapted for Arabic audience impact' },
    { id:'paraphrased', label:'4. Paraphrased',          icon:'🔄', color:'#06b6d4', desc:'Alternative wording preserving original intent' },
    { id:'final',       label:'5. Revised Final Version',icon:'🏆', color:'#10b981', desc:'Best of all variants — ready to use' },
  ];

  function buildDNAPrompt(segments) {
    const sample = segments.slice(0, 40).map((s,i)=>`[${i+1}] SRC: ${s.source}\n[${i+1}] TGT: ${s.target||'(untranslated)'}`).join('\n\n');
    return `You are a translation analyst. Analyze these ${segments.length} bilingual segments and extract the File DNA.

SEGMENTS SAMPLE:
${sample}

Return ONLY valid JSON:
{
  "domain": "<specific domain, e.g. Medical Devices, E-commerce, Legal Contracts>",
  "subDomain": "<more specific>",
  "register": "<formal|semi-formal|technical|colloquial>",
  "tone": "<professional|friendly|authoritative|neutral>",
  "sourceLanguage": "en",
  "targetLanguage": "ar",
  "dialect": "<ar-SA|ar-EG|ar-AE|ar>",
  "translatorStyle": "<description of translator patterns observed>",
  "recurringTerms": [
    {"src": "<English term>", "tgt": "<Arabic translation>", "frequency": <number>}
  ],
  "systemicIssues": ["<observed pattern 1>", "<observed pattern 2>"],
  "redFlags": ["<quality concern 1>"],
  "styleGuide": "<inferred style guide rules based on patterns>",
  "totalSegments": ${segments.length}
}`;
  }

  function buildTranslationPrompt(sourceText, dna, settings) {
    const tgtLang = document.getElementById('ait-tgt-lang')?.value || 'ar';
    const srcLang = document.getElementById('ait-src-lang')?.value || 'en';
    const registerOverride = document.getElementById('ait-register')?.value;
    const register = (registerOverride && registerOverride !== 'auto') ? registerOverride : (dna?.register || 'formal');
    const customInst = document.getElementById('ait-custom-inst')?.value?.trim() || '';
    const dialect = dna?.dialect || tgtLang;

    const dnaContext = dna ? `
FILE DNA CONTEXT (use strictly):
• Domain: ${dna.domain}${dna.subDomain ? ' — ' + dna.subDomain : ''}
• Register: ${register} | Tone: ${dna.tone || 'professional'}
• Dialect: ${dialect}
• Translator style: ${dna.translatorStyle || 'professional'}
• Style guide: ${dna.styleGuide || 'standard'}
${dna.recurringTerms?.length ? '• Established terms:\n' + dna.recurringTerms.slice(0,15).map(t=>`  - "${t.src}" → "${t.tgt}"`).join('\n') : ''}
${dna.systemicIssues?.length ? '• Known issues to avoid: ' + dna.systemicIssues.join('; ') : ''}
${customInst ? '• Special instructions: ' + customInst : ''}` : `
Context: ${register} ${tgtLang} translation. ${customInst}`;

    return `You are an expert professional translator (${srcLang} → Arabic ${dialect}).
${dnaContext}

SOURCE TEXT:
"${sourceText}"

Provide EXACTLY 5 Arabic translation variants. Return ONLY valid JSON:
{
  "direct": {
    "text": "<Literal and precise Arabic rendition — exact meaning, no embellishment>",
    "notes": "<Brief note on key translation choices>"
  },
  "refined": {
    "text": "<Improved version of direct — enhanced Arabic style, flow, naturalness while preserving exact meaning>",
    "notes": "<What was refined>"
  },
  "transcreated": {
    "text": "<Arabic adaptation prioritizing cultural relevance, emotional impact, audience resonance — may deviate from literal structure>",
    "notes": "<Cultural/creative choices made>"
  },
  "paraphrased": {
    "text": "<Rephrased using alternative Arabic wording and sentence structures — same intent, different expression>",
    "notes": "<Paraphrasing approach>"
  },
  "final": {
    "text": "<Best synthesis of all variants — production-ready final version combining accuracy, naturalness, and cultural fit>",
    "notes": "<Why this is the optimal version>"
  }
}`;
  }

  function renderVariants(data) {
    const results = document.getElementById('ait-results');
    const empty = document.getElementById('ait-empty');
    if (empty) empty.style.display = 'none';
    if (!results) return;

    const varHtml = VARIANTS.map(v => {
      const d = data[v.id];
      if (!d) return '';
      return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;border-left:3px solid ${v.color};">
        <div style="padding:8px 14px;background:var(--surface2);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
          <div style="display:flex;align-items:center;gap:7px;">
            <span style="font-size:.95rem;">${v.icon}</span>
            <span style="font-size:.8rem;font-weight:800;color:${v.color};">${v.label}</span>
            <span style="font-size:.67rem;color:var(--text-muted);">${v.desc}</span>
          </div>
          <div style="display:flex;gap:5px;">
            <button onclick="AITranslator.copyVariant('${v.id}')" style="font-size:.65rem;padding:2px 8px;border-radius:5px;border:1px solid var(--border);background:var(--surface);color:var(--text-dim);cursor:pointer;" title="Copy">📋 Copy</button>
            <button onclick="AITranslator.useInEditor('${v.id}')" style="font-size:.65rem;padding:2px 8px;border-radius:5px;border:1px solid ${v.color}55;background:${v.color}12;color:${v.color};cursor:pointer;font-weight:700;" title="Use in Editor">⬆ Use</button>
          </div>
        </div>
        <div style="padding:12px 14px;">
          <div id="ait-text-${v.id}" style="font-size:.9rem;direction:rtl;text-align:right;color:var(--text);line-height:1.85;">${d.text || '—'}</div>
          ${d.notes ? `<div style="font-size:.7rem;color:var(--text-muted);margin-top:6px;padding-top:6px;border-top:1px solid var(--border);">💡 ${d.notes}</div>` : ''}
        </div>
      </div>`;
    }).join('');

    // Replace content but keep existing varHtml container
    const existing = results.querySelector('.ait-variants-wrap');
    if (existing) existing.innerHTML = varHtml;
    else {
      const wrap = document.createElement('div');
      wrap.className = 'ait-variants-wrap';
      wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
      wrap.innerHTML = varHtml;
      results.appendChild(wrap);
    }
  }

  return {
    open() {
      document.getElementById('ai-translator-modal').style.display = '';
      // Pre-fill source from current editor segment if available
      this.fillFromEditor();
    },
    close() { document.getElementById('ai-translator-modal').style.display = 'none'; },

    openSettings() {
      const panel = document.getElementById('ait-settings-panel');
      if (panel) { panel.style.display = panel.style.display === 'none' ? '' : 'none'; }
    },

    fillFromEditor() {
      const active = document.querySelector('.seg-row.active');
      if (!active) return;
      const src = active.querySelector('.seg-src')?.textContent?.trim();
      if (src) { const inp = document.getElementById('ait-source'); if(inp) inp.value = src; }
    },

    async buildDNA() {
      if (S.isBuilding) return;
      const segments = AppState.segments?.filter(s=>s.source&&s.target) || [];
      if (!segments.length) { AppState.notify('Load a file in the Editor first to build DNA','warning'); return; }
      S.isBuilding = true;
      const btn = document.getElementById('ait-dna-btn');
      const status = document.getElementById('ait-dna-status');
      if (btn) btn.textContent = '⏳ Building…';
      if (status) status.textContent = `Analyzing ${segments.length} segments…`;
      try {
        const prompt = buildDNAPrompt(segments);
        const raw = await AIClient.call(prompt, 'lqi', { maxTokens: 1500, temperature: 0.1 });
        const m = raw.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('No JSON');
        S.dna = JSON.parse(m[0]);
        // Update DNA bar
        const domEl = document.getElementById('ait-dna-domain');
        const regEl = document.getElementById('ait-dna-register');
        const trmEl = document.getElementById('ait-dna-terms');
        if (domEl) domEl.textContent = 'Domain: ' + (S.dna.domain||'—');
        if (regEl) regEl.textContent = 'Register: ' + (S.dna.register||'—');
        if (trmEl) trmEl.textContent = 'Terms: ' + (S.dna.recurringTerms?.length||0);
        if (status) status.textContent = `✓ DNA built from ${segments.length} segments`;
        AppState.notify('File DNA built successfully', 'success');
      } catch(e) {
        if (status) status.textContent = 'DNA build failed: ' + e.message;
        AppState.notify('DNA error: ' + e.message, 'error');
      } finally {
        S.isBuilding = false;
        if (btn) btn.textContent = '🔄 Rebuild DNA';
      }
    },

    async translate() {
      if (S.isTranslating) return;
      const src = document.getElementById('ait-source')?.value?.trim();
      if (!src) { AppState.notify('Enter source text first','warning'); return; }
      if (!isToolReady('editor') && !isToolReady('lqi')) { AppState.notify('Configure AI in Settings → AI Providers','warning'); return; }

      S.isTranslating = true;
      const btn = document.getElementById('ait-run-btn');
      if (btn) { btn.disabled=true; btn.textContent='⏳ Translating…'; }

      // Show loading placeholders
      const results = document.getElementById('ait-results');
      const empty = document.getElementById('ait-empty');
      if (empty) empty.style.display='none';
      if (results) {
        let wrap = results.querySelector('.ait-variants-wrap');
        if (!wrap) { wrap = document.createElement('div'); wrap.className='ait-variants-wrap'; wrap.style.cssText='display:flex;flex-direction:column;gap:10px;'; results.appendChild(wrap); }
        wrap.innerHTML = VARIANTS.map(v=>`<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;border-left:3px solid ${v.color};opacity:.5;"><div style="font-size:.8rem;font-weight:700;color:${v.color};margin-bottom:8px;">${v.icon} ${v.label}</div><div style="height:16px;background:var(--border);border-radius:4px;animation:pulse 1s infinite;"></div></div>`).join('');
      }

      try {
        const prompt = buildTranslationPrompt(src, S.dna, {});
        const raw = await AIClient.call(prompt, 'editor', { maxTokens: 3000, temperature: 0.3 });
        const m = raw.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('No JSON in response');
        const data = JSON.parse(m[0]);
        renderVariants(data);
        AppState.notify('5 translation variants ready', 'success');
      } catch(e) {
        AppState.notify('Translation error: ' + e.message, 'error');
        const wrap = results?.querySelector('.ait-variants-wrap');
        if (wrap) wrap.innerHTML = `<div style="padding:20px;color:#ef4444;font-size:.8rem;">Error: ${e.message}</div>`;
      } finally {
        S.isTranslating = false;
        if (btn) { btn.disabled=false; btn.textContent='🧬 Translate with DNA'; }
      }
    },

    copyVariant(id) {
      const el = document.getElementById('ait-text-' + id);
      if (!el) return;
      navigator.clipboard.writeText(el.textContent).then(()=>AppState.notify('Copied','success'));
    },

    useInEditor(id) {
      const el = document.getElementById('ait-text-' + id);
      if (!el) return;
      const text = el.textContent;
      // Try to fill active segment target
      const activeTgt = document.querySelector('.seg-row.active .seg-tgt');
      if (activeTgt) {
        activeTgt.textContent = text;
        activeTgt.dispatchEvent(new Event('input', {bubbles:true}));
        AppState.notify('Applied to active segment', 'success');
      } else {
        navigator.clipboard.writeText(text).then(()=>AppState.notify('Copied to clipboard (no active segment)', 'info'));
      }
      this.close();
    }
  };
})();

// ══════════════════════════════════════════════════════════
// TOOL SETTINGS — Per-tool AI configuration
// ══════════════════════════════════════════════════════════
window.ToolSettings = (() => {
  let currentTool = null;

  const TOOLS = {
    lqi:         { label:'LQI Reviewer',          color:'#8b5cf6' },
    qc:          { label:'QC Checker',            color:'#06b6d4' },
    proofreader: { label:'Linguistic Proofreader', color:'#10b981' },
    editor:      { label:'Translation Editor',    color:'#3b82f6' },
    aligner:     { label:'AI Aligner',            color:'#f59e0b' },
    tmmaint:     { label:'TM Maintenance',        color:'#ef4444' },
  };

  return {
    open(toolId) {
      currentTool = toolId;
      const tool = TOOLS[toolId] || { label: toolId, color: 'var(--accent)' };
      const modal = document.getElementById('tool-settings-modal');
      const title = document.getElementById('tool-settings-title');
      const body  = document.getElementById('tool-settings-body');
      if (!modal || !body) return;

      if (title) title.textContent = tool.label + ' — Settings';
      const cfg = LMConfig.tools[toolId] || {};
      const saved = JSON.parse(localStorage.getItem('lm_tool_ai_'+toolId) || '{}');
      const provider = saved.provider || cfg.defaultProvider || 'gemini';
      const model    = saved.model    || cfg.defaultModel    || 'gemini-2.0-flash';
      const temp     = saved.temperature != null ? saved.temperature : (cfg.temperature || 0.2);
      const maxTok   = saved.maxTokens  || cfg.maxTokens || 1000;
      const prompt   = saved.customPrompt || '';

      body.innerHTML = `
        <div>
          <div style="font-size:.7rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:5px;">AI Provider</div>
          <select id="ts-provider" style="width:100%;font-size:.78rem;padding:6px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);outline:none;" onchange="ToolSettings.onProviderChange()">
            ${Object.entries(LMConfig.providers).map(([k,p])=>`<option value="${k}" ${k===provider?'selected':''}>${p.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <div style="font-size:.7rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:5px;">Model</div>
          <select id="ts-model" style="width:100%;font-size:.78rem;padding:6px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);outline:none;">
            ${(LMConfig.providers[provider]?.models||[]).map(m=>`<option value="${m.id}" ${m.id===model?'selected':''}>${m.label}</option>`).join('')}
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <div style="font-size:.7rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:5px;">Temperature <span id="ts-temp-val" style="color:var(--accent);">${temp}</span></div>
            <input type="range" id="ts-temperature" min="0" max="1" step="0.05" value="${temp}" style="width:100%;accent-color:var(--accent);" oninput="document.getElementById('ts-temp-val').textContent=this.value">
          </div>
          <div>
            <div style="font-size:.7rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:5px;">Max Tokens</div>
            <input type="number" id="ts-max-tokens" value="${maxTok}" min="256" max="16000" style="width:100%;font-size:.78rem;padding:5px 8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);outline:none;">
          </div>
        </div>
        <div>
          <div style="font-size:.7rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:5px;">Custom Prompt Override <span style="font-weight:400;font-style:italic;">(optional — prepended to system prompt)</span></div>
          <textarea id="ts-prompt" rows="5" style="width:100%;font-size:.74rem;padding:8px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);outline:none;resize:vertical;line-height:1.5;" placeholder="Add custom instructions that will be prepended to this tool's system prompt…">${prompt}</textarea>
        </div>`;
      modal.style.display = '';
    },

    onProviderChange() {
      const prov = document.getElementById('ts-provider')?.value;
      const modelSel = document.getElementById('ts-model');
      if (!modelSel || !prov) return;
      const models = LMConfig.providers[prov]?.models || [];
      modelSel.innerHTML = models.map(m=>`<option value="${m.id}">${m.label}</option>`).join('');
    },

    save() {
      if (!currentTool) return;
      const data = {
        provider:     document.getElementById('ts-provider')?.value,
        model:        document.getElementById('ts-model')?.value,
        temperature:  parseFloat(document.getElementById('ts-temperature')?.value || '0.2'),
        maxTokens:    parseInt(document.getElementById('ts-max-tokens')?.value || '1000'),
        customPrompt: document.getElementById('ts-prompt')?.value?.trim(),
      };
      localStorage.setItem('lm_tool_ai_' + currentTool, JSON.stringify(data));
      document.getElementById('tool-settings-modal').style.display = 'none';
      AppState.notify(`${TOOLS[currentTool]?.label || currentTool} settings saved`, 'success');
    }
  };
})();
