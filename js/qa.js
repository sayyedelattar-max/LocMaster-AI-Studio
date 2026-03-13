// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — QA Checker
// ══════════════════════════════════════════════════════════════════════════════

window.QA = {
  CHECKS: {
    missingTranslation: s => !s.target && { check:'missingTranslation', severity:'error',   message:'No translation provided' },
    emptySource:        s => !s.source && { check:'emptySource',        severity:'warning',  message:'Source text is empty' },
    identicalSourceTarget: s => s.source && s.target && s.source.trim()===s.target.trim()
      && { check:'identicalSourceTarget', severity:'warning', message:'Target is identical to source' },
    leadingTrailingSpace: s => s.target && /^\s|\s$/.test(s.target)
      && { check:'leadingTrailingSpace', severity:'minor', message:'Target has leading/trailing whitespace' },
    numberMismatch: s => {
      if (!s.source || !s.target) return false;
      const sNums = (s.source.match(/\d[\d,.]*(?:\.\d+)?/g) || []).map(Number).sort();
      const tNums = (s.target.match(/\d[\d,.]*(?:\.\d+)?/g) || []).map(Number).sort();
      if (JSON.stringify(sNums) !== JSON.stringify(tNums))
        return { check:'numberMismatch', severity:'error', message:`Number mismatch: source ${sNums.join(',')} vs target ${tNums.join(',')}` };
    },
    tagMismatch: s => {
      if (!s.source || !s.target) return false;
      const sTags = (s.source.match(/<[^>]+>/g) || []).length;
      const tTags = (s.target.match(/<[^>]+>/g) || []).length;
      if (sTags !== tTags) return { check:'tagMismatch', severity:'error', message:`Tag count mismatch: ${sTags} in source vs ${tTags} in target` };
    },
  },

  checkSegment(seg, opts = {}) {
    const issues = Object.values(this.CHECKS)
      .map(fn => fn(seg))
      .filter(Boolean);
    return { segmentId: seg.id, issues };
  },

  runAll(segments = [], opts = {}) {
    const results = segments.map(s => this.checkSegment(s, opts));
    const total   = results.reduce((n, r) => n + r.issues.length, 0);
    if (window.AppState) AppState.notify(`QA complete: ${total} issue(s) found`, total ? 'warning' : 'success');
    return results;
  },
};
