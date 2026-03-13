// ── Translation Memory ────────────────────────────────────────────
// In-memory TM with fuzzy matching, TMX import/export, and auto-apply.

window.TM = (function() {
  let _entries = []; // { source, target, srcLang, tgtLang, date, domain }

  // ── Fuzzy matching ──────────────────────────────────────────────

  /** Levenshtein distance between two strings (normalised to 0-100 score). */
  function _levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i-1] === b[j-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
      }
    }
    return dp[m][n];
  }

  // ── Persistence ─────────────────────────────────────────────────

  function _save() {
    try { localStorage.setItem('lm_tm', JSON.stringify(_entries)); } catch (_) {}
  }

  function _load() {
    try {
      const raw = localStorage.getItem('lm_tm');
      if (raw) _entries = JSON.parse(raw);
    } catch (_) { _entries = []; }
  }

  // ── Public API ───────────────────────────────────────────────────

  const api = {
    /** Expose raw entries array (app.js reads TM.entries directly). */
    get entries() { return _entries; },

    /** Initialise TM by loading persisted entries. */
    init() { _load(); },

    /**
     * Compute a 0-100 similarity score between two strings.
     * @param {string} a
     * @param {string} b
     * @returns {number}
     */
    fuzzyMatch(a, b) {
      const sa = (a || '').trim().toLowerCase();
      const sb = (b || '').trim().toLowerCase();
      if (!sa || !sb) return 0;
      if (sa === sb)  return 100;
      const dist  = _levenshtein(sa, sb);
      const maxLen = Math.max(sa.length, sb.length);
      return Math.round((1 - dist / maxLen) * 100);
    },

    /**
     * Search TM for matches above a threshold.
     * @param {string} source
     * @param {number} [threshold=75]
     * @returns {Array<{entry, score}>}
     */
    search(source, threshold = 75) {
      return _entries
        .map(entry => ({ entry, score: this.fuzzyMatch(source, entry.source) }))
        .filter(r => r.score >= threshold)
        .sort((a, b) => b.score - a.score);
    },

    /**
     * Add or update a TM entry.
     * @param {string} source
     * @param {string} target
     * @param {object} [meta]  { srcLang, tgtLang, domain }
     */
    add(source, target, meta = {}) {
      const existing = _entries.find(e => e.source === source && e.srcLang === (meta.srcLang || ''));
      if (existing) {
        existing.target = target;
        existing.date   = new Date().toISOString();
      } else {
        _entries.push({ source, target, srcLang: meta.srcLang || '', tgtLang: meta.tgtLang || '', domain: meta.domain || '', date: new Date().toISOString() });
      }
      _save();
    },

    /**
     * Import a TMX XML string into the TM.
     * @param {string} xmlStr
     */
    importTMX(xmlStr) {
      const doc = new DOMParser().parseFromString(xmlStr, 'application/xml');
      let imported = 0;
      doc.querySelectorAll('tu').forEach(tu => {
        const tuvs  = tu.querySelectorAll('tuv');
        const langs = Array.from(tuvs).map(t => ({ lang: t.getAttribute('xml:lang') || t.getAttribute('lang') || '', text: t.querySelector('seg')?.textContent || '' }));
        if (langs.length >= 2) {
          this.add(langs[0].text, langs[1].text, { srcLang: langs[0].lang, tgtLang: langs[1].lang });
          imported++;
        }
      });
      _save();
      return imported;
    },

    /**
     * Export TM as a TMX string.
     * @param {string} [srcLang]
     * @param {string} [tgtLang]
     * @returns {string}
     */
    exportTMX(srcLang, tgtLang) {
      const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      const src = srcLang || (window.AppState && AppState.srcLang) || 'en';
      const tgt = tgtLang || (window.AppState && AppState.tgtLang) || 'ar';
      const tus = _entries.map(e =>
        `  <tu>\n    <tuv xml:lang="${esc(e.srcLang||src)}"><seg>${esc(e.source)}</seg></tuv>\n    <tuv xml:lang="${esc(e.tgtLang||tgt)}"><seg>${esc(e.target)}</seg></tuv>\n  </tu>`
      ).join('\n');
      return `<?xml version="1.0" encoding="UTF-8"?>\n<tmx version="1.4">\n  <header creationtool="LocMaster" srclang="${esc(src)}"/>\n  <body>\n${tus}\n  </body>\n</tmx>`;
    },

    /** Returns a copy of all TM entries. */
    getAll() { return [..._entries]; },

    /** Remove all TM entries. */
    clear() { _entries = []; _save(); },

    /**
     * Auto-apply TM matches to untranslated segments.
     * @param {Array} segments
     * @param {number} [threshold=100]  Only apply 100% matches by default
     */
    autoApplyAll(segments, threshold = 100) {
      if (!segments) return;
      segments.forEach(seg => {
        if (seg.target || seg.status === 'locked') return;
        const hits = this.search(seg.source, threshold);
        if (hits.length) {
          seg.target     = hits[0].entry.target;
          seg.matchType  = hits[0].score === 100 ? 'exact' : 'fuzzy';
          seg.matchScore = hits[0].score;
          seg.status     = hits[0].score === 100 ? 'translated' : 'fuzzy';
        }
      });
    }
  };

  return api;
})();
