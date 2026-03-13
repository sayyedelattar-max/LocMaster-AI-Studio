// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — LQI Reviewer
// ══════════════════════════════════════════════════════════════════════════════

window.LQI = {
  _segments: [],

  handleFiles(files) {
    if (!files || !files.length) return;
    AppState.setLoading(true, 'Parsing LQI file…');
    Parser.parseFile(files[0]).then(parsed => {
      this._segments = parsed.segments || [];
      AppState.segments = this._segments;
      AppState.srcLang  = parsed.srcLang || 'en';
      AppState.tgtLang  = parsed.tgtLang || 'ar';
      AppState.notify(`Loaded ${this._segments.length} segments for review`, 'success');
      if (window.UISegments) UISegments.render(this._segments, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
    }).catch(err => {
      AppState.notify('Failed to parse file: ' + err.message, 'error');
    }).finally(() => AppState.setLoading(false));
  },

  async runEvaluation() {
    const segs = this._segments.filter(s => s.target);
    if (!segs.length) { AppState.notify('No translated segments to review', 'warning'); return; }
    if (!isToolReady('lqi')) { AppState.notify('Configure AI in Settings → AI Providers', 'warning'); return; }

    AppState.setLoading(true, `Reviewing ${segs.length} segments…`);
    try {
      const results = await AIClient.batchReview(segs, {
        srcLang: AppState.srcLang,
        tgtLang: AppState.tgtLang,
        customPrompt: getToolPrompt('lqi'),
      }, pct => {
        const el = document.getElementById('sb-words');
        if (el) el.textContent = `LQI: ${pct}%`;
      });
      results.forEach(r => { AppState.lqiResults[r.segmentId] = r; });
      AppState.notify(`Reviewed ${results.length} segments`, 'success');
      if (window.UISegments) UISegments.render(AppState.segments, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
    } catch (err) {
      AppState.notify('LQI error: ' + err.message, 'error');
    }
    AppState.setLoading(false);
  },
};
