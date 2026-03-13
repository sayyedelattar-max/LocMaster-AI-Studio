// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — Translation Memory
// ══════════════════════════════════════════════════════════════════════════════

window.TM = (function () {
  const STORAGE_KEY = 'lm_tm_entries';
  let entries = [];

  function _load() {
    try {
      entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { entries = []; }
  }

  function _save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
  }

  function _normalise(s) { return (s || '').trim().toLowerCase(); }

  function init() { _load(); }

  function add(srcText, tgtText, meta = {}) {
    if (!srcText || !tgtText) return;
    const key = _normalise(srcText);
    const existing = entries.find(e => _normalise(e.source) === key);
    if (existing) {
      existing.target  = tgtText;
      existing.updated = Date.now();
    } else {
      entries.push({
        id:      Date.now() + Math.random(),
        source:  srcText.trim(),
        target:  tgtText.trim(),
        domain:  meta.domain  || '',
        srcLang: meta.srcLang || 'en',
        tgtLang: meta.tgtLang || 'ar',
        created: Date.now(),
        updated: Date.now(),
      });
    }
    _save();
  }

  function lookup(srcText, threshold = 0.75) {
    const key = _normalise(srcText);
    const exact = entries.find(e => _normalise(e.source) === key);
    if (exact) return { match: exact, score: 1.0, type: 'exact' };

    // Simple fuzzy: word overlap
    const srcWords = new Set(key.split(/\s+/));
    let best = null, bestScore = 0;
    entries.forEach(e => {
      const tmWords = new Set(_normalise(e.source).split(/\s+/));
      const shared  = [...srcWords].filter(w => tmWords.has(w)).length;
      const score   = shared / Math.max(srcWords.size, tmWords.size);
      if (score > bestScore && score >= threshold) {
        bestScore = score; best = e;
      }
    });
    if (best) return { match: best, score: bestScore, type: 'fuzzy' };
    return null;
  }

  function autoApplyAll(segments = []) {
    let applied = 0;
    segments.forEach(seg => {
      if (seg.target || seg.locked) return;
      const hit = lookup(seg.source);
      if (hit) {
        seg.target       = hit.match.target;
        seg.matchType    = hit.type === 'exact' ? 'tm' : 'fuzzy';
        seg.matchPercent = Math.round(hit.score * 100);
        applied++;
      }
    });
    return applied;
  }

  function extractFromSegments(segments = [], config = {}) {
    let added = 0;
    segments.forEach(seg => {
      if (seg.source && seg.target) {
        add(seg.source, seg.target, {
          domain:  config.domain  || '',
          srcLang: config.srcLang || 'en',
          tgtLang: config.tgtLang || 'ar',
        });
        added++;
      }
    });
    return added;
  }

  async function importTMX(file) {
    const parsed = await Parser.parseFile(file);
    let added = 0;
    (parsed.segments || []).forEach(seg => {
      add(seg.source, seg.target, { srcLang: parsed.srcLang, tgtLang: parsed.tgtLang });
      added++;
    });
    return added;
  }

  function exportTMX(srcLang = 'en', tgtLang = 'ar') {
    const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const tus = entries
      .filter(e => e.source && e.target)
      .map(e => `  <tu>
    <tuv xml:lang="${esc(e.srcLang || srcLang)}"><seg>${esc(e.source)}</seg></tuv>
    <tuv xml:lang="${esc(e.tgtLang || tgtLang)}"><seg>${esc(e.target)}</seg></tuv>
  </tu>`).join('\n');
    return `<?xml version="1.0" encoding="utf-8"?>
<tmx version="1.4">
  <header creationtool="LocMaster AI Studio" srclang="${esc(srcLang)}" adminlang="${esc(tgtLang)}"/>
  <body>
${tus}
  </body>
</tmx>`;
  }

  function clear() { entries = []; _save(); }

  return {
    get entries() { return entries; },
    init, add, lookup, autoApplyAll, extractFromSegments, importTMX, exportTMX, clear,
  };
})();
