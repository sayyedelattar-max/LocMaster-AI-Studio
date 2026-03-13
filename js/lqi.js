// ── Language Quality Index (MQM-based) ───────────────────────────
// AI-powered quality scoring and reporting for translated segments.

window.LQI = (function() {

  // MQM error categories
  const CATEGORIES = {
    accuracy:          { label: 'Accuracy',           weight: 1.0 },
    fluency:           { label: 'Fluency',             weight: 0.8 },
    terminology:       { label: 'Terminology',         weight: 0.9 },
    style:             { label: 'Style',               weight: 0.6 },
    locale_convention: { label: 'Locale Convention',   weight: 0.5 }
  };

  // Severity penalty weights
  const SEVERITY = { critical: 25, major: 5, minor: 1 };

  let _lastResults = [];

  // ── Internal helpers ────────────────────────────────────────────

  function _wordCount(segments) {
    return segments.reduce((n, s) => n + (s.source || '').split(/\s+/).filter(Boolean).length, 0);
  }

  // ── Public API ───────────────────────────────────────────────────

  return {
    categories: CATEGORIES,

    /**
     * Run AI-powered LQI evaluation on an array of segments.
     * @param {Array}  segments
     * @param {object} [options]  { srcLang, tgtLang, customPrompt }
     * @returns {Promise<Array>}  array of { segmentId, score, errors, category }
     */
    async run(segments, options = {}) {
      if (!window.AIClient) return [];
      const results = await AIClient.batchReview(segments, options, pct => {
        const statusEl = document.getElementById('lqi-status');
        if (statusEl) statusEl.textContent = `Evaluating… ${pct}%`;
      });
      _lastResults = results;
      return results;
    },

    /**
     * Compute an MQM-style aggregate score from result objects.
     * Score = 100 − (total penalty / word count) × 100, clamped 0-100.
     * @param {Array}  results
     * @param {number} [wordCount]
     * @returns {number}
     */
    score(results, wordCount) {
      const wc = wordCount || Math.max(1, results.length * 10);
      const penalty = results.reduce((sum, r) => {
        return sum + (r.errors || []).reduce((s, e) => s + (SEVERITY[e.severity] || 1), 0);
      }, 0);
      return Math.max(0, Math.round((1 - penalty / (wc * 10)) * 100));
    },

    /**
     * Render LQI results into a DOM container.
     * @param {Array}       results
     * @param {HTMLElement} container
     */
    render(results, container) {
      if (!container) return;
      if (!results || !results.length) {
        container.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:40px">No results yet.</div>';
        return;
      }
      const avg = (results.reduce((s, r) => s + (r.score || 0), 0) / results.length).toFixed(2);
      const errors = results.flatMap(r => r.errors || []);
      container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px">
          <div class="stat-card"><div class="stat-num" style="color:var(--tool-lqi)">${avg}/5</div><div class="stat-label">Avg Quality</div></div>
          <div class="stat-card"><div class="stat-num">${results.length}</div><div class="stat-label">Segments Reviewed</div></div>
          <div class="stat-card"><div class="stat-num" style="color:var(--danger)">${errors.filter(e=>e.severity==='critical').length}</div><div class="stat-label">Critical</div></div>
          <div class="stat-card"><div class="stat-num" style="color:var(--warning)">${errors.filter(e=>e.severity==='major').length}</div><div class="stat-label">Major</div></div>
        </div>
        <p style="color:var(--text-dim);font-size:.8rem">Results are AI-generated estimates using the MQM framework.</p>`;
    },

    /**
     * Handle file upload for standalone LQI tool panel.
     * @param {FileList|Array} files
     */
    async handleFiles(files) {
      if (!files?.length) return;
      if (!window.Parser) { AppState.notify('Parser not available', 'error'); return; }
      AppState.setLoading(true, 'Parsing file for LQI…');
      try {
        const parsed = await Parser.parseFile(files[0]);
        AppState.segments = parsed.segments;
        AppState.notify(`Loaded ${parsed.segmentCount} segments for LQI review`, 'info');
      } catch (e) {
        AppState.notify('LQI parse error: ' + e.message, 'error');
      }
      AppState.setLoading(false);
    },

    /** Run evaluation triggered from the LQI panel. */
    async runEvaluation() {
      const segs = AppState.segments.filter(s => s.target);
      if (!segs.length) { AppState.notify('No translated segments to evaluate', 'warning'); return; }
      AppState.setLoading(true, 'Running LQI evaluation…');
      try {
        const results = await this.run(segs, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
        results.forEach(r => { AppState.lqiResults[r.segmentId] = r; });
        const container = document.getElementById('lqi-results-container');
        if (container) this.render(results, container);
        AppState.notify(`LQI complete — ${results.length} segments evaluated`, 'success');
      } catch (e) {
        AppState.notify('LQI error: ' + e.message, 'error');
      }
      AppState.setLoading(false);
    }
  };
})();
