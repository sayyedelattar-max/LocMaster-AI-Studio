// ── File Exporter ─────────────────────────────────────────────────
// Builds and triggers browser downloads for supported export formats.

window.Exporter = (function() {

  // ── Helpers ─────────────────────────────────────────────────────

  function _download(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function _esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── XLIFF builder ────────────────────────────────────────────────

  function _buildXliff(segments, meta = {}) {
    const src = _esc(meta.srcLang || (window.AppState && AppState.srcLang) || 'en');
    const tgt = _esc(meta.tgtLang || (window.AppState && AppState.tgtLang) || 'ar');
    const tus = segments.map(seg => {
      const state = seg.status === 'reviewed' ? 'signed-off' : seg.status === 'translated' ? 'translated' : 'new';
      return `    <trans-unit id="${_esc(String(seg.xliffId || seg.id))}" translate="${seg.locked ? 'no' : 'yes'}">
      <source xml:lang="${src}">${_esc(seg.source)}</source>
      <target xml:lang="${tgt}" state="${state}">${_esc(seg.target || '')}</target>
    </trans-unit>`;
    }).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="${src}" target-language="${tgt}" datatype="plaintext" original="${_esc(meta.original || 'document')}">
    <body>
${tus}
    </body>
  </file>
</xliff>`;
  }

  // ── TMX builder ──────────────────────────────────────────────────

  function _buildTmx(entries) {
    const src = _esc((window.AppState && AppState.srcLang) || 'en');
    const tus = entries.map(e =>
      `  <tu>\n    <tuv xml:lang="${_esc(e.srcLang || src)}"><seg>${_esc(e.source)}</seg></tuv>\n    <tuv xml:lang="${_esc(e.tgtLang || 'ar')}"><seg>${_esc(e.target)}</seg></tuv>\n  </tu>`
    ).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<tmx version="1.4">\n  <header creationtool="LocMaster" srclang="${src}"/>\n  <body>\n${tus}\n  </body>\n</tmx>`;
  }

  // ── CSV builder ──────────────────────────────────────────────────

  function _buildCsv(segments) {
    const quote = s => '"' + (s || '').replace(/"/g, '""') + '"';
    const rows = [['ID', 'Source', 'Target', 'Status', 'Match Type', 'Match Score']];
    segments.forEach(seg => rows.push([seg.id, quote(seg.source), quote(seg.target || ''), seg.status || '', seg.matchType || '', seg.matchScore || 0]));
    return rows.map(r => r.join(',')).join('\r\n');
  }

  // ── Public API ───────────────────────────────────────────────────

  return {
    /**
     * Export the translated file as a return package (XLIFF).
     * @param {File}  file      Original source file
     * @param {Array} segments
     */
    exportReturnPackage(file, segments) {
      const name = file ? file.name.replace(/(\.[^.]+)$/, '_translated$1') : 'translated.xliff';
      const xliff = _buildXliff(segments, {
        srcLang:  window.AppState && AppState.srcLang,
        tgtLang:  window.AppState && AppState.tgtLang,
        original: file ? file.name : 'document'
      });
      _download(name, xliff, 'application/x-xliff+xml');
      if (window.AppState) AppState.notify('Return package exported ✓', 'success');
    },

    /**
     * Export TM entries as a .tmx file.
     * @param {Array} [entries]  Defaults to TM.getAll() if omitted
     */
    exportTMX(entries) {
      const data = entries || (window.TM && TM.getAll()) || [];
      _download(`TM_export_${Date.now()}.tmx`, _buildTmx(data), 'application/xml');
      if (window.AppState) AppState.notify(`TMX exported (${data.length} entries) ✓`, 'success');
    },

    /**
     * Export segments as a CSV spreadsheet.
     * @param {Array} [segments]  Defaults to AppState.segments
     */
    exportCSV(segments) {
      const segs = segments || (window.AppState && AppState.segments) || [];
      _download(`segments_${Date.now()}.csv`, _buildCsv(segs), 'text/csv');
      if (window.AppState) AppState.notify('CSV exported ✓', 'success');
    },

    /**
     * Export segments as a standalone XLIFF file.
     * @param {Array}  segments
     * @param {object} [meta]   { srcLang, tgtLang, original }
     */
    exportXLIFF(segments, meta = {}) {
      const xliff = _buildXliff(segments, meta);
      _download(`export_${Date.now()}.xliff`, xliff, 'application/x-xliff+xml');
      if (window.AppState) AppState.notify('XLIFF exported ✓', 'success');
    }
  };
})();
