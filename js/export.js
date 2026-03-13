// ══════════════════════════════════════════════════════════════
// js/export.js  — LocMaster AI Studio — File Export
// ══════════════════════════════════════════════════════════════

window.Exporter = (function () {

  function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function dl(name, content, mime) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  // ── SDLXLIFF export ────────────────────────────────────────────
  function exportSDLXLIFF(parsedData, segments) {
    let doc = parsedData?.rawXML || '';
    if (!doc) {
      // Build minimal SDLXLIFF
      doc = `<?xml version="1.0" encoding="utf-8"?>\n<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2" xmlns:sdl="http://sdl.com/FileTypes/SdlXliff/1.0">\n  <file source-language="${AppState.srcLang}" target-language="${AppState.tgtLang}" datatype="x-sdlxliff">\n    <body>\n`;
      segments.forEach(s => {
        doc += `      <trans-unit id="${esc(String(s.id))}"><source>${esc(s.source)}</source><target state="${s.status === 'reviewed' ? 'final' : 'translated'}">${esc(s.target||'')}</target></trans-unit>\n`;
      });
      doc += `    </body>\n  </file>\n</xliff>`;
      return doc;
    }
    // Patch existing XML
    const parser  = new DOMParser();
    const xmlDoc  = parser.parseFromString(doc, 'application/xml');
    segments.forEach(seg => {
      const unit = xmlDoc.querySelector(`trans-unit[id="${CSS.escape(String(seg.id))}"]`);
      if (!unit) return;
      let tgt = unit.querySelector('target');
      if (!tgt) { tgt = xmlDoc.createElement('target'); unit.appendChild(tgt); }
      tgt.textContent = seg.target || '';
      tgt.setAttribute('state', seg.status === 'reviewed' ? 'final' : 'translated');
    });
    return new XMLSerializer().serializeToString(xmlDoc);
  }

  // ── Return package (ZIP) ───────────────────────────────────────
  async function exportReturnPackage(currentFile, segments) {
    if (!window.JSZip) { AppState.notify('JSZip not loaded', 'error'); return; }
    const zip  = new JSZip();
    const xml  = exportSDLXLIFF(AppState.parsedData, segments);
    const name = currentFile ? currentFile.name.replace(/\.[^.]+$/, '.sdlxliff') : 'export.sdlxliff';
    zip.file(name, xml);
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name.replace('.sdlxliff', '_return.sdlrpx');
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    AppState.notify('Return package exported', 'success');
  }

  // ── TMX export ─────────────────────────────────────────────────
  function exportTMX() {
    const xml = TM.exportTMX(AppState.srcLang, AppState.tgtLang);
    dl(`TM_${AppState.srcLang}_${AppState.tgtLang}_${Date.now()}.tmx`, xml, 'application/xml');
    AppState.notify('TMX exported', 'success');
  }

  return { exportSDLXLIFF, exportReturnPackage, exportTMX };
})();
