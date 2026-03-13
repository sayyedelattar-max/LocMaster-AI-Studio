// ── Quality Assurance ─────────────────────────────────────────────
// Rule-based QA checks on segments: missing translation, numbers,
// punctuation, inline tags, and consistency.

window.QA = (function() {

  // ── Individual check functions ──────────────────────────────────

  /** Returns an issue if the segment has no translation yet. */
  function _checkMissing(seg) {
    if (!seg.target || !seg.target.trim()) {
      return { check: 'missing_translation', severity: 'error', message: 'Target is empty.' };
    }
    return null;
  }

  /** Returns issues for numbers present in source but absent in target. */
  function _checkNumbers(seg) {
    const srcNums = (seg.source || '').match(/\d[\d.,]*/g) || [];
    const tgtText = seg.target || '';
    return srcNums
      .filter(n => !tgtText.includes(n))
      .map(n => ({ check: 'numbers', severity: 'error', message: `Number "${n}" missing in target.` }));
  }

  /** Returns an issue if terminal punctuation differs between source and target. */
  function _checkPunctuation(seg) {
    const srcEnd = (seg.source || '').trim().slice(-1);
    const tgtEnd = (seg.target || '').trim().slice(-1);
    const terminal = ['.', '!', '?', ':', '…'];
    if (terminal.includes(srcEnd) && tgtEnd && !terminal.includes(tgtEnd)) {
      return { check: 'punctuation', severity: 'warning', message: `Terminal punctuation mismatch: source ends "${srcEnd}", target ends "${tgtEnd}".` };
    }
    return null;
  }

  /** Returns issues for XML/HTML tags in source that are absent in target. */
  function _checkTags(seg) {
    const TAG_RE = /<[^>]+>/g;
    const srcTags = (seg.source || '').match(TAG_RE) || [];
    const tgtText = seg.target  || '';
    return srcTags
      .filter(tag => !tgtText.includes(tag))
      .map(tag => ({ check: 'tags', severity: 'error', message: `Tag "${tag}" missing in target.` }));
  }

  /** Returns an issue if identical source strings have inconsistent translations. */
  function _checkConsistency(seg, allSegments) {
    if (!allSegments) return null;
    const twins = allSegments.filter(s => s.id !== seg.id && s.source === seg.source && s.target);
    if (twins.length && seg.target && twins.some(t => t.target !== seg.target)) {
      return { check: 'consistency', severity: 'warning', message: 'Translation inconsistent with other identical source segments.' };
    }
    return null;
  }

  // ── Public API ───────────────────────────────────────────────────

  return {
    /**
     * Run QA checks on a single segment.
     * @param {object} seg
     * @param {object} [options]  { allSegments, srcLang, tgtLang }
     * @returns {{ issues: Array }}
     */
    checkSegment(seg, options = {}) {
      const issues = [];
      const push = v => v && (Array.isArray(v) ? issues.push(...v) : issues.push(v));
      push(_checkMissing(seg));
      if (seg.target) {
        push(_checkNumbers(seg));
        push(_checkPunctuation(seg));
        push(_checkTags(seg));
        push(_checkConsistency(seg, options.allSegments));
      }
      return { issues };
    },

    /**
     * Run QA checks on an array of segments and return all issues.
     * @param {Array}  segments
     * @param {object} [options]
     * @returns {Array<{ seg, issues }>}
     */
    check(segments, options = {}) {
      return segments
        .map(seg => ({ seg, issues: this.checkSegment(seg, { ...options, allSegments: segments }).issues }))
        .filter(r => r.issues.length > 0);
    },

    /**
     * Convenience method: run checks and surface results via AppState.notify.
     * @param {Array}  segments
     * @param {object} [options]
     */
    runAll(segments, options = {}) {
      const results = this.check(segments, options);
      const count   = results.reduce((s, r) => s + r.issues.length, 0);
      if (window.AppState) {
        AppState.notify(count ? `QA found ${count} issue(s) in ${results.length} segment(s)` : '✓ No QA issues detected', count ? 'warning' : 'success');
      }
      return results;
    }
  };
})();
