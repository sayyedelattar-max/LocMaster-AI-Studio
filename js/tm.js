// ══════════════════════════════════════════════════════════════
// js/tm.js  — LocMaster AI Studio — Translation Memory
// ══════════════════════════════════════════════════════════════

window.TM = (function () {

  let _entries = [];

  // ── Fuzzy match ────────────────────────────────────────────────
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  function similarityPct(a, b) {
    if (!a || !b) return 0;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 100;
    return Math.round((1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen) * 100);
  }

  // ── Public API ─────────────────────────────────────────────────
  return {
    get entries() { return _entries; },

    init() {
      const saved = localStorage.getItem('lm_tm_entries');
      if (saved) { try { _entries = JSON.parse(saved); } catch (_) { _entries = []; } }
    },

    save() {
      localStorage.setItem('lm_tm_entries', JSON.stringify(_entries));
    },

    addEntry(src, tgt, meta = {}) {
      if (!src || !tgt) return;
      const existing = _entries.find(e => e.src === src);
      if (existing) {
        existing.tgt  = tgt;
        existing.used = (existing.used || 0) + 1;
      } else {
        _entries.push({ id: Date.now() + Math.random(), src: src.trim(), tgt: tgt.trim(), ...meta, used: 0, date: new Date().toISOString() });
      }
      this.save();
    },

    lookup(sourceText, threshold = 75) {
      const results = _entries.map(e => ({
        ...e,
        pct: similarityPct(sourceText, e.src),
      }))
        .filter(e => e.pct >= threshold)
        .sort((a, b) => b.pct - a.pct);
      return results;
    },

    autoApplyAll(segments) {
      let count = 0;
      segments.forEach(s => {
        if (s.target || s.locked) return;
        const matches = this.lookup(s.source, 100);
        if (matches.length) {
          s.target       = matches[0].tgt;
          s.matchType    = matches[0].pct === 100 ? '100' : 'fuzzy';
          s.matchPercent = matches[0].pct;
          s.status       = 'translated';
          count++;
        }
      });
      return count;
    },

    extractFromSegments(segments, meta = {}) {
      let added = 0;
      segments.forEach(s => {
        if (s.source && s.target && s.status !== 'new') {
          this.addEntry(s.source, s.target, { srcLang: meta.srcLang || 'en', tgtLang: meta.tgtLang || 'ar' });
          added++;
        }
      });
      return added;
    },

    importTMX(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
          try {
            const doc   = new DOMParser().parseFromString(e.target.result, 'application/xml');
            const units = [...doc.querySelectorAll('tu')];
            let count   = 0;
            units.forEach(u => {
              const tuvs = [...u.querySelectorAll('tuv')];
              const en   = tuvs.find(t => (t.getAttribute('xml:lang') || t.getAttribute('lang') || '').toLowerCase().startsWith('en'));
              const ar   = tuvs.find(t => t !== en);
              const src  = en?.querySelector('seg')?.textContent.trim();
              const tgt  = ar?.querySelector('seg')?.textContent.trim();
              if (src && tgt) { this.addEntry(src, tgt); count++; }
            });
            resolve(count);
          } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        reader.readAsText(file, 'utf-8');
      });
    },

    exportTMX(srcLang = 'en', tgtLang = 'ar') {
      const now  = new Date().toISOString();
      const esc  = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<tmx version="1.4">\n  <header creationtool="LocMaster AI Studio" srclang="${srcLang}" creationdate="${now}"/>\n  <body>\n`;
      _entries.forEach((e, i) => {
        xml += `    <tu tuid="${i + 1}">\n`;
        xml += `      <tuv xml:lang="${srcLang}"><seg>${esc(e.src)}</seg></tuv>\n`;
        xml += `      <tuv xml:lang="${tgtLang}"><seg>${esc(e.tgt)}</seg></tuv>\n`;
        xml += `    </tu>\n`;
      });
      xml += `  </body>\n</tmx>`;
      return xml;
    },

    clear() {
      _entries = [];
      this.save();
    },
  };
})();
