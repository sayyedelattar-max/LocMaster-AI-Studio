// ── QC Checker ────────────────────────────────────────────────────
// Extended automated quality checks beyond basic QA rules.
// Referenced in code but not yet linked in index.html.

window.QCChecker = (function() {

  const CHECK_CATEGORIES = ['numbers', 'tags', 'punctuation', 'terminology', 'consistency'];

  // ── Helpers ─────────────────────────────────────────────────────

  function _notify(msg, type) {
    if (window.AppState) AppState.notify(msg, type);
  }

  function _buildResultsHTML(results) {
    if (!results.length) return '<div style="color:var(--success);text-align:center;padding:40px">✓ No issues detected!</div>';
    return `<div style="display:flex;flex-direction:column;gap:8px">
${results.map(({ seg, issues }) => `
  <div style="background:var(--surface);border:1px solid rgba(34,211,238,.15);border-radius:var(--radius-sm);padding:14px">
    <div style="font-size:.8rem;margin-bottom:8px;color:var(--text-dim)">#${seg.id} — ${(seg.source || '').slice(0, 80)}</div>
    ${issues.map(i => `<div style="font-size:.76rem;color:${i.severity === 'error' ? 'var(--danger)' : 'var(--warning)'};margin:3px 0">⚠ ${i.check}: ${i.message}</div>`).join('')}
  </div>`).join('')}
</div>`;
  }

  // ── Public API ───────────────────────────────────────────────────

  return {
    categories: CHECK_CATEGORIES,

    /** Initialise QC checker (reserved for future setup). */
    init() { /* no-op */ },

    /**
     * Run QC checks on an array of segments.
     * Delegates to QA module if available, otherwise returns empty results.
     * @param {Array}  segments
     * @param {object} [options]
     * @returns {Array<{ seg, issues }>}
     */
    run(segments, options = {}) {
      if (window.QA) return QA.check(segments, options);
      return [];
    },

    /**
     * Render QC results into a DOM container.
     * @param {Array}       results  from QCChecker.run()
     * @param {HTMLElement} container
     */
    renderResults(results, container) {
      if (!container) return;
      container.innerHTML = _buildResultsHTML(results || []);
    }
  };
})();
