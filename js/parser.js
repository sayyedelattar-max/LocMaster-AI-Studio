// ══════════════════════════════════════════════════════════════
// js/parser.js  — LocMaster AI Studio — File Parser
// Supports: SDLXLIFF, XLIFF 1.2, MQXLIFF, TXML, TTX, TXLF, TMX
// ══════════════════════════════════════════════════════════════

window.Parser = (function () {

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file, 'utf-8');
    });
  }

  function detectFormat(name, content) {
    const ext = name.toLowerCase().split('.').pop();
    if (ext === 'sdlxliff') return 'sdlxliff';
    if (ext === 'mqxliff')  return 'mqxliff';
    if (ext === 'txml')     return 'txml';
    if (ext === 'ttx')      return 'ttx';
    if (ext === 'txlf')     return 'txlf';
    if (ext === 'tmx')      return 'tmx';
    if (ext === 'xlf' || ext === 'xliff') return 'xliff';
    if (content.includes('xmlns:sdl=') || content.includes('sdl.com/FileTypes'))  return 'sdlxliff';
    if (content.includes('MQXliff')) return 'mqxliff';
    return 'xliff';
  }

  function parseXML(text) {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(text, 'application/xml');
    const err    = doc.querySelector('parsererror');
    if (err) throw new Error('XML parse error: ' + err.textContent.substring(0, 100));
    return doc;
  }

  function getLang(doc, attr) {
    const file = doc.querySelector('file');
    return file?.getAttribute(attr) || '';
  }

  function segStatusFromState(state) {
    if (!state) return 'new';
    const s = state.toLowerCase();
    if (s.includes('final') || s.includes('approved') || s.includes('reviewed')) return 'reviewed';
    if (s.includes('translated')) return 'translated';
    return 'new';
  }

  function matchTypeFromScore(score) {
    if (!score) return 'new';
    const n = parseInt(score);
    if (n >= 100) return '100';
    if (n >= 75)  return 'fuzzy';
    return 'new';
  }

  // ── XLIFF 1.2 / SDLXLIFF / MQXLIFF ───────────────────────────
  function parseXLIFF(doc, format) {
    const units = [...doc.querySelectorAll('trans-unit')];
    return units.map((u, i) => {
      const id     = u.getAttribute('id') || String(i + 1);
      const source = u.querySelector('source')?.textContent || '';
      const tgtEl  = u.querySelector('target');
      const target = tgtEl?.textContent || '';
      const state  = tgtEl?.getAttribute('state') || '';
      const locked = u.getAttribute('translate') === 'no' || u.querySelector('[locked="true"]') !== null;
      // SDL match info
      const matchPct  = u.querySelector('[percent]')?.getAttribute('percent') || u.getAttribute('match-percent') || '';
      const matchType = matchPct ? matchTypeFromScore(matchPct) : (state.toLowerCase().includes('ice') ? 'ice' : 'new');
      return {
        id:           id,
        source:       source.trim(),
        target:       target.trim(),
        status:       segStatusFromState(state),
        matchType:    matchType,
        matchPercent: parseInt(matchPct) || 0,
        locked:       locked,
        comments:     [],
        lqiIssues:    [],
      };
    });
  }

  // ── TMX ────────────────────────────────────────────────────────
  function parseTMX(doc) {
    const units = [...doc.querySelectorAll('tu')];
    return units.map((u, i) => {
      const tuvs = [...u.querySelectorAll('tuv')];
      const src  = tuvs.find(t => (t.getAttribute('xml:lang') || t.getAttribute('lang') || '').toLowerCase().startsWith('en'));
      const tgt  = tuvs.find(t => t !== src);
      return {
        id:           u.getAttribute('tuid') || String(i + 1),
        source:       src?.querySelector('seg')?.textContent.trim() || '',
        target:       tgt?.querySelector('seg')?.textContent.trim() || '',
        status:       'translated',
        matchType:    '100',
        matchPercent: 100,
        locked:       false,
        comments:     [],
        lqiIssues:    [],
      };
    }).filter(s => s.source);
  }

  // ── Public ─────────────────────────────────────────────────────
  async function parseFile(file) {
    const text   = await readFile(file);
    const format = detectFormat(file.name, text);
    const doc    = parseXML(text);
    let segments = [];
    let srcLang  = '';
    let tgtLang  = '';

    if (format === 'tmx') {
      srcLang  = doc.querySelector('header')?.getAttribute('srclang') || 'en';
      tgtLang  = 'ar';
      segments = parseTMX(doc);
    } else {
      srcLang  = getLang(doc, 'source-language') || 'en';
      tgtLang  = getLang(doc, 'target-language') || 'ar';
      segments = parseXLIFF(doc, format);
    }

    return {
      name:         file.name,
      format:       format.toUpperCase(),
      srcLang:      srcLang.toLowerCase(),
      tgtLang:      tgtLang.toLowerCase(),
      segments:     segments,
      segmentCount: segments.length,
      rawXML:       text,
      doc:          doc,
    };
  }

  return { parseFile };
})();
