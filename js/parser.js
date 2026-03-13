// ── File Parser ───────────────────────────────────────────────────
// Parses localisation file formats into a uniform segment array.

window.Parser = (function() {

  // ── Helpers ─────────────────────────────────────────────────────

  function _ext(file) {
    return (file.name || '').split('.').pop().toLowerCase();
  }

  function _readText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = ()  => reject(new Error('Failed to read file'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  function _readBinary(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = ()  => reject(new Error('Failed to read binary file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /** Increment-based ID generator scoped to a parse call. */
  function _idGen() { let n = 0; return () => ++n; }

  // ── XLIFF / SDLXLIFF / MQXLIFF / TXML / TXLF parser ────────────

  function _parseXliff(xmlStr, fileName) {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(xmlStr, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML parse error in ' + fileName);

    const nextId = _idGen();
    const segments = [];
    const srcLangAttr = doc.querySelector('file')?.getAttribute('source-language') || 'en';
    const tgtLangAttr = doc.querySelector('file')?.getAttribute('target-language')  || '';

    doc.querySelectorAll('trans-unit, unit').forEach(unit => {
      const srcEl = unit.querySelector('source');
      const tgtEl = unit.querySelector('target');
      const source = srcEl ? srcEl.textContent : '';
      const target = tgtEl ? tgtEl.textContent : '';
      const state  = tgtEl?.getAttribute('state') || (target ? 'translated' : 'untranslated');
      const locked = unit.getAttribute('translate') === 'no';
      segments.push({
        id:         nextId(),
        xliffId:    unit.getAttribute('id') || String(segments.length + 1),
        source,
        target,
        status:     locked ? 'locked' : state,
        matchType:  null,
        matchScore: 0,
        locked
      });
    });

    return {
      segments,
      srcLang:      srcLangAttr,
      tgtLang:      tgtLangAttr,
      segmentCount: segments.length,
      fileName,
      packageType:  'SingleFile',
      raw:          xmlStr
    };
  }

  // ── Package (ZIP) handler ─────────────────────────────────────────

  async function _parseZip(file) {
    if (!window.JSZip) throw new Error('JSZip not loaded');
    const buf  = await _readBinary(file);
    const zip  = await JSZip.loadAsync(buf);
    const entries = Object.entries(zip.files).filter(([, f]) => !f.dir);
    // find the first translatable file inside
    const xliffEntry = entries.find(([name]) => /\.(xliff|sdlxliff|xlf|txml|mqxliff|txlf)$/i.test(name));
    if (!xliffEntry) throw new Error('No XLIFF file found in package');
    const xmlStr = await xliffEntry[1].async('string');
    const result = _parseXliff(xmlStr, xliffEntry[0]);
    result.packageType = 'ProjectPackage';
    result.name = file.name;
    return result;
  }

  // ── Public API ───────────────────────────────────────────────────

  return {
    /**
     * Parse a file and return { segments, srcLang, tgtLang, segmentCount, … }.
     * Supports .xliff, .sdlxliff, .xlf, .txml, .mqxliff, .txlf, .xlz, .wsxz
     * @param {File} file
     * @returns {Promise<object>}
     */
    async parseFile(file) {
      const ext = _ext(file);
      if (['xliff', 'sdlxliff', 'xlf', 'txml', 'mqxliff', 'txlf'].includes(ext)) {
        const xml = await _readText(file);
        return _parseXliff(xml, file.name);
      }
      if (['xlz', 'wsxz', 'zip'].includes(ext)) {
        return _parseZip(file);
      }
      throw new Error(`Unsupported file format: .${ext}`);
    },

    /**
     * Alias used by some legacy callers.
     * @param {File} file
     * @returns {Promise<object>}
     */
    async parse(file) {
      return this.parseFile(file);
    }
  };
})();

// ── Global upload handlers ────────────────────────────────────────

/** Called when the user drops / selects a translation file in the editor. */
window.handleFileUpload = async function(files) {
  if (!files?.length) return;
  AppState.setLoading(true, `Parsing ${files[0].name}…`);
  try {
    const parsed = await Parser.parseFile(files[0]);
    AppState.parsedData  = parsed;
    AppState.segments    = parsed.segments || [];
    AppState.srcLang     = parsed.srcLang  || AppState.srcLang;
    AppState.tgtLang     = parsed.tgtLang  || AppState.tgtLang;
    AppState.currentFile = files[0];
    AppState.projectConfig = AppState.projectConfig || {};
    AppState.projectConfig.srcLang = parsed.srcLang;
    AppState.projectConfig.tgtLang = parsed.tgtLang;
    if (window.TM) TM.autoApplyAll(AppState.segments);
    if (window.UISegments) UISegments.render(AppState.segments, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
    const info = document.getElementById('topbar-filename');
    if (info) info.textContent = files[0].name;
    AppState.notify(`Loaded ${parsed.segmentCount} segments from ${files[0].name}`, 'success');
    navigate('editor');
  } catch (e) {
    AppState.notify('Parse error: ' + e.message, 'error');
  }
  AppState.setLoading(false);
};

/** Called when the user uploads an SDL / Trados project package (.sdlppx / .xlz). */
window.handlePackageUpload = async function(files) {
  if (!files?.length) return;
  AppState.setLoading(true, 'Parsing package…');
  try {
    const parsed = await Parser.parseFile(files[0]);
    if (parsed.packageType === 'ReturnPackage' && AppState.parsedData?.packageType === 'ProjectPackage') {
      let updates = 0;
      (parsed.segments || []).forEach(s => {
        const orig = AppState.segments.find(o => o.id === s.id);
        if (orig && s.target) { orig.target = s.target; orig.status = s.status; updates++; }
      });
      if (window.UISegments) UISegments.render(AppState.segments, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
      AppState.notify(`Return package applied (${updates} segments)`, 'success');
    } else {
      AppState.parsedData    = parsed;
      AppState.segments      = parsed.segments || [];
      AppState.srcLang       = parsed.srcLang  || AppState.srcLang;
      AppState.tgtLang       = parsed.tgtLang  || AppState.tgtLang;
      AppState.projectConfig = AppState.projectConfig || {};
      AppState.projectConfig.name    = parsed.projectName || AppState.projectConfig.name;
      AppState.projectConfig.srcLang = parsed.srcLang;
      AppState.projectConfig.tgtLang = parsed.tgtLang;
      if (window.UISegments) UISegments.render(AppState.segments, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
      AppState.notify('Package loaded: ' + parsed.name, 'success');
    }
  } catch (err) {
    AppState.notify('Failed to open package: ' + err.message, 'error');
  }
  AppState.setLoading(false);
};
