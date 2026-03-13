// ── Proofreader Module ────────────────────────────────────────────
// AI-powered linguistic proofreading with grammar, style, and full modes.
// Referenced in code but not yet linked in index.html.

window.Proofreader = (function() {
  let _mode = 'full'; // 'grammar' | 'style' | 'full'

  // ── Helpers ─────────────────────────────────────────────────────

  function _buildPrompt(text, lang, mode) {
    const modeInstr = mode === 'grammar'
      ? 'Focus only on grammar and spelling errors.'
      : mode === 'style'
      ? 'Focus only on style, phrasing, and clarity issues.'
      : 'Report grammar, spelling, style, and terminology issues.';
    return `You are an expert linguistic proofreader for ${lang} text.
${modeInstr}

Text to proofread:
${text}

Respond in JSON only:
{"issues":[{"text":"<original phrase>","problem":"<description>","suggestion":"<corrected text>","type":"<grammar|spelling|style|terminology>","severity":"<minor|major|critical>"}],"summary":"<brief overall summary>","score":<1-10>}`;
  }

  function _buildResultsHTML(data) {
    const score = data.score;
    const scoreColor = score >= 7 ? 'var(--success)' : score >= 5 ? 'var(--warning)' : 'var(--danger)';
    const issues = data.issues || [];
    return `
<div style="background:var(--surface);border:1px solid rgba(52,211,153,.2);border-radius:var(--radius);padding:20px;margin-bottom:14px">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <strong>Proofreading Result</strong>
    ${score != null ? `<span style="font-size:1.3rem;font-weight:700;font-family:var(--mono);color:${scoreColor}">${score}/10</span>` : ''}
  </div>
  <p style="color:var(--text-dim);font-size:.86rem">${data.summary || ''}</p>
</div>
${issues.length
  ? `<div style="display:flex;flex-direction:column;gap:8px">
     ${issues.map(i => `
     <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:13px">
       <div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;margin-bottom:6px">
         <span style="background:rgba(248,113,113,.1);color:var(--danger);padding:2px 8px;border-radius:4px;font-size:.68rem;font-family:var(--mono)">${i.type || 'issue'}</span>
         <span style="color:var(--text-dim);font-size:.83rem;flex:1">"${i.text}"</span>
       </div>
       <div style="font-size:.8rem;color:var(--warning)">⚠ ${i.problem}</div>
       ${i.suggestion ? `<div style="font-size:.8rem;color:var(--success);margin-top:3px">✓ ${i.suggestion}</div>` : ''}
     </div>`).join('')}</div>`
  : '<div style="color:var(--success);text-align:center;padding:20px">✓ No language issues detected!</div>'}`;
  }

  // ── Public API ───────────────────────────────────────────────────

  return {
    /** Initialise Proofreader (reserved for future setup). */
    init() { /* no-op */ },

    /**
     * Set the proofreading mode.
     * @param {'grammar'|'style'|'full'} mode
     */
    setMode(mode) { _mode = mode; },

    /**
     * Proofread a text string using the configured AI provider.
     * @param {string} text
     * @param {string} [lang]  Target language name or code
     * @returns {Promise<{ issues, summary, score }>}
     */
    async proofread(text, lang = 'Arabic') {
      if (!window.AIClient) return { issues: [], summary: 'AI not configured.', score: null };
      const prompt = _buildPrompt(text, lang, _mode);
      const raw  = await AIClient.call(prompt, 'proofreader', { temperature: 0.2, maxTokens: 2000 });
      const m    = raw.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : { issues: [], summary: raw, score: null };
    },

    /**
     * Render proofreading results into a DOM container.
     * @param {{ issues, summary, score }} results
     * @param {HTMLElement}               container
     */
    renderResults(results, container) {
      if (!container) return;
      container.innerHTML = _buildResultsHTML(results || { issues: [], summary: '', score: null });
    }
  };
})();
