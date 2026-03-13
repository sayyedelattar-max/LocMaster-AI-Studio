// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — AI Translator: UI Layer
// ══════════════════════════════════════════════════════════════════════════════
// This module enhances the inline AITranslator with modular DNA + variant logic.
// It binds AITranslatorDNA and AITranslatorVariants to the modal UI and exposes
// an augmented window.AITranslator object that the inline bootstrap script uses.
// ══════════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Wait for DOM + other modules ──────────────────────────────────────────
  function _ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // ── Safely get an element ─────────────────────────────────────────────────
  function $id(id) { return document.getElementById(id); }

  // ── DNA status bar updater ─────────────────────────────────────────────────
  function _updateDNABar(dna) {
    if (!dna) return;
    const domEl = $id('ait-dna-domain');
    const regEl = $id('ait-dna-register');
    const trmEl = $id('ait-dna-terms');
    const stEl  = $id('ait-dna-status');

    if (domEl) domEl.textContent = 'Domain: ' + (dna.domain || '—');
    if (regEl) regEl.textContent = 'Register: ' + (dna.register || '—');
    if (trmEl) trmEl.textContent = 'Terms: ' + (dna.recurringTerms?.length || 0);
    if (stEl)  stEl.textContent  = `✓ DNA built from ${dna.totalSegments || 0} segments`;

    // Style the DNA bar to show it's ready
    const bar = $id('ait-dna-bar');
    if (bar) bar.style.background = 'rgba(16,185,129,.1)';

    const btn = $id('ait-dna-btn');
    if (btn) {
      btn.textContent  = '🔄 Rebuild DNA';
      btn.style.border = '1px solid #10b981';
    }
  }

  // ── Render variant cards ───────────────────────────────────────────────────
  function _renderVariants(data) {
    const results = $id('ait-results');
    const empty   = $id('ait-empty');
    if (!results) return;
    if (empty) empty.style.display = 'none';

    const styles = (window.AITranslatorVariants?.VARIANT_STYLES) || [];
    const html   = styles.map(v => {
      const d = data[v.id];
      if (!d) return '';
      return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;
                          overflow:hidden;border-left:3px solid ${v.color};">
        <div style="padding:8px 14px;background:var(--surface2);border-bottom:1px solid var(--border);
                    display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
          <div style="display:flex;align-items:center;gap:7px;">
            <span style="font-size:.95rem;">${v.icon}</span>
            <span style="font-size:.8rem;font-weight:800;color:${v.color};">${v.label}</span>
            <span style="font-size:.67rem;color:var(--text-muted);">${v.desc}</span>
          </div>
          <div style="display:flex;gap:5px;">
            <button onclick="AITranslator.copyVariant('${v.id}')"
                    style="font-size:.65rem;padding:2px 8px;border-radius:5px;border:1px solid var(--border);
                           background:var(--surface);color:var(--text-dim);cursor:pointer;"
                    title="Copy">📋 Copy</button>
            <button onclick="AITranslator.useInEditor('${v.id}')"
                    style="font-size:.65rem;padding:2px 8px;border-radius:5px;border:1px solid ${v.color}55;
                           background:${v.color}12;color:${v.color};cursor:pointer;font-weight:700;"
                    title="Use in Editor">⬆ Use</button>
          </div>
        </div>
        <div style="padding:12px 14px;">
          <div id="ait-text-${v.id}"
               style="font-size:.9rem;direction:rtl;text-align:right;color:var(--text);line-height:1.85;">
            ${d.text || '—'}
          </div>
          ${d.notes ? `<div style="font-size:.7rem;color:var(--text-muted);margin-top:6px;padding-top:6px;
                                   border-top:1px solid var(--border);">💡 ${d.notes}</div>` : ''}
        </div>
      </div>`;
    }).join('');

    let wrap = results.querySelector('.ait-variants-wrap');
    if (wrap) {
      wrap.innerHTML = html;
    } else {
      wrap = document.createElement('div');
      wrap.className = 'ait-variants-wrap';
      wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
      wrap.innerHTML = html;
      results.appendChild(wrap);
    }
  }

  // ── Loading skeleton while generating ─────────────────────────────────────
  function _renderLoadingSkeleton() {
    const results = $id('ait-results');
    const empty   = $id('ait-empty');
    if (!results) return;
    if (empty) empty.style.display = 'none';

    const styles = (window.AITranslatorVariants?.VARIANT_STYLES) || [];
    let wrap = results.querySelector('.ait-variants-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'ait-variants-wrap';
      wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
      results.appendChild(wrap);
    }
    wrap.innerHTML = styles.map(v =>
      `<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;
                   padding:16px;border-left:3px solid ${v.color};opacity:.5;">
        <div style="font-size:.8rem;font-weight:700;color:${v.color};margin-bottom:8px;">${v.icon} ${v.label}</div>
        <div style="height:14px;background:var(--border);border-radius:4px;animation:pulse 1.2s infinite;margin-bottom:6px;"></div>
        <div style="height:14px;background:var(--border);border-radius:4px;animation:pulse 1.2s infinite;width:70%;"></div>
      </div>`
    ).join('');
  }

  // ── Main AITranslator augmentation ────────────────────────────────────────
  _ready(function () {
    // Persist reference so the inline partial definition doesn't overwrite this
    const _existing = window.AITranslator || {};

    window.AITranslator = Object.assign({}, _existing, {
      _state: {
        dna:           null,
        isBuilding:    false,
        isTranslating: false,
      },

      // ── Open modal ────────────────────────────────────────────────────────
      open() {
        const modal = $id('ai-translator-modal');
        if (modal) modal.style.display = '';
        this.fillFromEditor();
      },

      // ── Close modal ───────────────────────────────────────────────────────
      close() {
        const modal = $id('ai-translator-modal');
        if (modal) modal.style.display = 'none';
      },

      // ── Toggle settings panel ─────────────────────────────────────────────
      openSettings() {
        const panel = $id('ait-settings-panel');
        if (panel) panel.style.display = panel.style.display === 'none' ? '' : 'none';
      },

      // ── Pre-fill source from active editor segment ────────────────────────
      fillFromEditor() {
        const active = document.querySelector('.seg-row.active');
        if (!active) return;
        const src = active.querySelector('.seg-src')?.textContent?.trim();
        const inp = $id('ait-source');
        if (src && inp) inp.value = src;
      },

      // ── Build File DNA from loaded segments ───────────────────────────────
      async buildDNA() {
        if (this._state.isBuilding) return;
        const segments = (window.AppState?.segments || []).filter(s => s.source && s.target);
        if (!segments.length) {
          AppState.notify('Load a file in the Editor first to build DNA', 'warning');
          return;
        }

        this._state.isBuilding = true;
        const btn = $id('ait-dna-btn');
        const st  = $id('ait-dna-status');
        if (btn) btn.textContent = '⏳ Building…';
        if (st)  st.textContent  = `Analyzing ${segments.length} segments…`;

        try {
          // Try fast local DNA first
          let dna = null;
          if (window.AITranslatorDNA) {
            dna = AITranslatorDNA.buildFileDNA(segments);
          }

          // Enhance with AI if available
          if (isToolReady && isToolReady('editor')) {
            try {
              const prompt = _buildDNAPrompt(segments);
              const raw    = await AIClient.call(prompt, 'aitranslator', {
                maxTokens:   1500,
                temperature: 0.1,
              });
              const m = raw.match(/\{[\s\S]*\}/);
              if (m) {
                const aiDna = JSON.parse(m[0]);
                // Merge: prefer AI results but keep local recurring terms
                dna = Object.assign({}, dna, aiDna, {
                  recurringTerms: aiDna.recurringTerms?.length
                    ? aiDna.recurringTerms
                    : (dna?.recurringTerms || []),
                  builtAt: Date.now(),
                });
              }
            } catch (aiErr) {
              console.warn('AI DNA enhancement failed, using local analysis:', aiErr.message);
            }
          }

          if (!dna) throw new Error('DNA analysis failed');

          this._state.dna = dna;
          _updateDNABar(dna);
          AppState.notify('File DNA built successfully', 'success');

        } catch (err) {
          if (st) st.textContent = 'DNA build failed: ' + err.message;
          AppState.notify('DNA error: ' + err.message, 'error');
        } finally {
          this._state.isBuilding = false;
          if (btn) btn.textContent = '🔄 Rebuild DNA';
        }
      },

      // ── Generate 5 translation variants ───────────────────────────────────
      async translate() {
        if (this._state.isTranslating) return;
        const src = $id('ait-source')?.value?.trim();
        if (!src) { AppState.notify('Enter source text first', 'warning'); return; }

        if (!isToolReady('editor') && !isToolReady('lqi')) {
          AppState.notify('Configure AI in Settings → AI Providers', 'warning');
          return;
        }

        this._state.isTranslating = true;
        const btn = $id('ait-run-btn');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Translating…'; }

        _renderLoadingSkeleton();

        try {
          const customInst = $id('ait-custom-inst')?.value?.trim() || '';
          let data;

          if (window.AITranslatorVariants) {
            // Use the modular variants generator
            const dna = this._getDNA();
            data = await AITranslatorVariants.generateVariants(src, dna, customInst);
          } else {
            // Fallback to inline prompt approach
            const prompt = _buildLegacyPrompt(src, this._getDNA());
            const raw    = await AIClient.call(prompt, 'aitranslator', {
              maxTokens: 3000, temperature: 0.35,
            });
            const m = raw.match(/\{[\s\S]*\}/);
            if (!m) throw new Error('No JSON in response');
            data = JSON.parse(m[0]);
          }

          _renderVariants(data);
          AppState.notify('5 translation variants ready', 'success');

        } catch (err) {
          AppState.notify('Translation error: ' + err.message, 'error');
          const wrap = $id('ait-results')?.querySelector('.ait-variants-wrap');
          if (wrap) {
            wrap.innerHTML = `<div style="padding:20px;color:#ef4444;font-size:.8rem;">
              ❌ Error: ${err.message}
            </div>`;
          }
        } finally {
          this._state.isTranslating = false;
          if (btn) { btn.disabled = false; btn.textContent = '🧬 Translate with DNA'; }
        }
      },

      // ── Copy a variant to clipboard ───────────────────────────────────────
      copyVariant(id) {
        const el = $id('ait-text-' + id);
        if (!el) return;
        navigator.clipboard.writeText(el.textContent.trim())
          .then(() => AppState.notify('Copied to clipboard', 'success'))
          .catch(() => AppState.notify('Copy failed', 'error'));
      },

      // ── Apply variant to active editor segment ────────────────────────────
      useInEditor(id) {
        const el = $id('ait-text-' + id);
        if (!el) return;
        const text = el.textContent.trim();

        if (window.AITranslatorVariants) {
          const applied = AITranslatorVariants.applyToSegments(text, AppState.segments || []);
          if (applied) {
            AppState.notify('Applied to active segment', 'success');
            if (window.UISegments && AppState.segments?.length) {
              UISegments.render(AppState.segments, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
            }
            this.close();
            return;
          }
        }

        // Fallback: apply directly via DOM
        const activeTgt = document.querySelector('.seg-row.active .seg-tgt');
        if (activeTgt) {
          activeTgt.textContent = text;
          activeTgt.dispatchEvent(new Event('input', { bubbles: true }));
          AppState.notify('Applied to active segment', 'success');
          this.close();
        } else {
          navigator.clipboard.writeText(text)
            .then(() => AppState.notify('Copied to clipboard (no active segment)', 'info'))
            .catch(() => AppState.notify('Copy failed', 'error'));
        }
      },

      // ── Get current DNA (merged local + AI) ───────────────────────────────
      _getDNA() {
        if (this._state.dna) return this._state.dna;
        // Return settings-derived partial DNA if no DNA built
        const tgtLang      = $id('ait-tgt-lang')?.value || 'ar';
        const register     = $id('ait-register')?.value;
        return {
          domain:   '',
          register: register && register !== 'auto' ? register : 'formal',
          dialect:  tgtLang,
          recurringTerms:  [],
          systemicIssues:  [],
        };
      },
    });
  });

  // ── DNA Prompt builder (AI-enhanced analysis) ─────────────────────────────
  function _buildDNAPrompt(segments) {
    const sample = segments.slice(0, 40).map((s, i) =>
      `[${i + 1}] SRC: ${s.source}\n[${i + 1}] TGT: ${s.target || '(untranslated)'}`
    ).join('\n\n');

    return `You are a translation analyst. Analyze these ${segments.length} bilingual segments and extract the File DNA.

SEGMENTS SAMPLE:
${sample}

Return ONLY valid JSON:
{
  "domain": "<specific domain, e.g. Medical Devices, E-commerce, Legal Contracts>",
  "subDomain": "<more specific sub-domain>",
  "register": "<formal|semi-formal|technical|colloquial>",
  "tone": "<professional|friendly|authoritative|neutral>",
  "sourceLanguage": "en",
  "targetLanguage": "ar",
  "dialect": "<ar-SA|ar-EG|ar-AE|ar>",
  "translatorStyle": "<observed translator patterns>",
  "recurringTerms": [
    {"src": "<English term>", "tgt": "<Arabic translation>", "frequency": <number>}
  ],
  "systemicIssues": ["<observed pattern 1>", "<observed pattern 2>"],
  "redFlags": ["<quality concern 1>"],
  "styleGuide": "<inferred style guide rules based on patterns>",
  "totalSegments": ${segments.length}
}`;
  }

  // ── Legacy prompt fallback ─────────────────────────────────────────────────
  function _buildLegacyPrompt(sourceText, dna) {
    const tgtLang    = $id('ait-tgt-lang')?.value || 'ar';
    const srcLang    = $id('ait-src-lang')?.value || 'en';
    const regOverride = $id('ait-register')?.value;
    const register   = regOverride && regOverride !== 'auto'
      ? regOverride
      : (dna?.register || 'formal');
    const customInst = $id('ait-custom-inst')?.value?.trim() || '';
    const dialect    = dna?.dialect || tgtLang;

    const dnaCtx = dna ? `
FILE DNA CONTEXT (apply strictly):
• Domain: ${dna.domain || 'General'}${dna.subDomain ? ' — ' + dna.subDomain : ''}
• Register: ${register} | Tone: ${dna.tone || 'professional'}
• Dialect: ${dialect}
${dna.recurringTerms?.length
    ? '• Terminology:\n' + dna.recurringTerms.slice(0, 15).map(t => `  - "${t.src}" → "${t.tgt}"`).join('\n')
    : ''}
${dna.systemicIssues?.length ? '• Known issues to avoid: ' + dna.systemicIssues.join('; ') : ''}
${customInst ? '• Special instructions: ' + customInst : ''}` : '';

    return `You are an expert professional translator (${srcLang} → Arabic ${dialect}).
${dnaCtx}

SOURCE TEXT:
"${sourceText}"

Provide EXACTLY 5 Arabic translation variants. Return ONLY valid JSON:
{
  "direct":      { "text": "<Literal and precise>",                     "notes": "<choices>" },
  "refined":     { "text": "<Enhanced style and flow>",                 "notes": "<what was refined>" },
  "transcreated":{ "text": "<Cultural adaptation for Arabic audience>", "notes": "<cultural choices>" },
  "paraphrased": { "text": "<Alternative wording, same intent>",        "notes": "<approach>" },
  "final":       { "text": "<Production-ready best synthesis>",         "notes": "<why optimal>" }
}`;
  }

})();
