// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — Exporter
// ══════════════════════════════════════════════════════════════════════════════

window.Exporter = {
  _dl(name, content, mime) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  },

  _esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },

  exportTMX(srcLang, tgtLang) {
    const sl   = srcLang  || AppState.srcLang || 'en';
    const tl   = tgtLang  || AppState.tgtLang || 'ar';
    const segs = AppState.segments.filter(s => s.source && s.target);
    const tus  = segs.map(s =>
      `  <tu tuid="${this._esc(String(s.id))}">
    <tuv xml:lang="${sl}"><seg>${this._esc(s.source)}</seg></tuv>
    <tuv xml:lang="${tl}"><seg>${this._esc(s.target)}</seg></tuv>
  </tu>`).join('\n');

    const xml = `<?xml version="1.0" encoding="utf-8"?>\n<tmx version="1.4">\n  <header srclang="${sl}" adminlang="${tl}" creationtool="LocMaster AI Studio"/>\n  <body>\n${tus}\n  </body>\n</tmx>`;
    const name = `${AppState.projectConfig?.name || 'export'}_${sl}_${tl}.tmx`;
    this._dl(name, xml, 'application/xml');
    AppState.notify(`Exported ${segs.length} TM entries`, 'success');
  },

  exportReturnPackage(currentFile, segments) {
    // Build basic SDLXLIFF return package with translated segments
    const sl  = AppState.srcLang || 'en';
    const tl  = AppState.tgtLang || 'ar';
    const tus = (segments || []).map(s =>
      `      <trans-unit id="${this._esc(String(s.id))}">
        <source>${this._esc(s.source)}</source>
        <target state="${s.status || 'translated'}">${this._esc(s.target || '')}</target>
      </trans-unit>`
    ).join('\n');

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="${sl}" target-language="${tl}" datatype="plaintext" original="${this._esc(currentFile?.name || 'project')}">
    <body>
${tus}
    </body>
  </file>
</xliff>`;
    const name = `${AppState.projectConfig?.name || 'return'}_${tl}.sdlxliff`;
    this._dl(name, xml, 'application/xml');
    AppState.notify('Return package exported', 'success');
  },
};
