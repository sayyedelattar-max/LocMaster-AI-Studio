// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — File Parser
// Supports: SDLXLIFF, XLIFF 1.2/2.0, TXML, MQXLIFF, TMX, ZIP packages
// ══════════════════════════════════════════════════════════════════════════════

window.Parser = {
  async parseFile(file) {
    const ext  = (file.name.split('.').pop() || '').toLowerCase();
    const text = await this._readFile(file);

    if (ext === 'zip' || ext === 'xlz' || ext === 'sdlppx' || ext === 'sdlrpx' || ext === 'wsxz') {
      return this._parseZip(file, text);
    }
    if (ext === 'tmx') return this._parseTMX(text, file.name);
    if (ext === 'sdlxliff' || ext === 'mqxliff' || ext === 'txlf') return this._parseXLIFF(text, file.name, ext);
    if (ext === 'xliff' || ext === 'xlf') return this._parseXLIFF(text, file.name, ext);
    if (ext === 'txml')  return this._parseTXML(text, file.name);
    if (ext === 'ttx')   return this._parseTTX(text, file.name);
    if (ext === 'sdltm') return this._parseSDLTM(file, file.name);

    return this._parseXLIFF(text, file.name, ext);
  },

  _readFile(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = e => res(e.target.result);
      r.onerror = () => rej(new Error('Failed to read file'));
      r.readAsText(file, 'utf-8');
    });
  },

  _readBinary(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = e => res(e.target.result);
      r.onerror = () => rej(new Error('Failed to read file'));
      r.readAsArrayBuffer(file);
    });
  },

  async _parseZip(file) {
    if (typeof JSZip === 'undefined') throw new Error('JSZip library not loaded');
    const buf  = await this._readBinary(file);
    const zip  = await JSZip.loadAsync(buf);
    const entries = Object.values(zip.files).filter(f => !f.dir);
    const xliffEntry = entries.find(f =>
      /\.(sdlxliff|xliff|xlf|txml|mqxliff|ttx|txlf)$/i.test(f.name)
    );
    if (!xliffEntry) throw new Error('No XLIFF file found in package');
    const text = await xliffEntry.async('text');
    return this._parseXLIFF(text, xliffEntry.name, xliffEntry.name.split('.').pop().toLowerCase());
  },

  _parseXLIFF(xmlText, name, ext) {
    const parser  = new DOMParser();
    const doc     = parser.parseFromString(xmlText, 'application/xml');
    const err     = doc.querySelector('parsererror');
    if (err) throw new Error('XML parse error: ' + err.textContent.slice(0, 120));

    const units   = Array.from(doc.querySelectorAll('trans-unit, unit'));
    const segments = units.map((u, idx) => {
      const src  = u.querySelector('source');
      const tgt  = u.querySelector('target');
      const note = u.querySelector('note');
      return {
        id:           u.getAttribute('id') || String(idx + 1),
        source:       src ? (src.textContent || '') : '',
        target:       tgt ? (tgt.textContent || '') : '',
        status:       tgt?.getAttribute('state') || 'needs-translation',
        locked:       u.getAttribute('translate') === 'no',
        note:         note?.textContent || '',
        matchType:    null,
        matchPercent: 0,
      };
    }).filter(s => s.source.trim());

    const fileEl  = doc.querySelector('file');
    return {
      name:         name,
      format:       ext || 'xliff',
      segments,
      srcLang:      fileEl?.getAttribute('source-language') || 'en',
      tgtLang:      fileEl?.getAttribute('target-language') || 'ar',
      segmentCount: segments.length,
    };
  },

  _parseTMX(xmlText, name) {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(xmlText, 'application/xml');
    const tus    = Array.from(doc.querySelectorAll('tu'));
    let srcLang  = 'en', tgtLang = 'ar';
    const segments = [];

    tus.forEach((tu, i) => {
      const tuvs = Array.from(tu.querySelectorAll('tuv'));
      let src = '', tgt = '';
      tuvs.forEach(tuv => {
        const lang = (tuv.getAttribute('xml:lang') || tuv.getAttribute('lang') || '').toLowerCase();
        const seg  = tuv.querySelector('seg');
        if (!seg) return;
        if (lang.startsWith('en')) { src = seg.textContent; srcLang = lang; }
        else { tgt = seg.textContent; tgtLang = lang; }
      });
      if (src) segments.push({ id: String(i + 1), source: src, target: tgt, status: 'translated' });
    });

    return { name, format: 'tmx', segments, srcLang, tgtLang, segmentCount: segments.length };
  },

  _parseTXML(xmlText, name) {
    // Delegate to generic XLIFF parser (TXML is XLIFF-based)
    return this._parseXLIFF(xmlText, name, 'txml');
  },

  _parseTTX(xmlText, name) {
    return this._parseXLIFF(xmlText, name, 'ttx');
  },

  async _parseSDLTM(file, name) {
    // SDLTM is SQLite — basic stub
    throw new Error('SDLTM import not supported in browser. Please export as TMX first.');
  },
};
