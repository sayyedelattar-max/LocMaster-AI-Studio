// ══════════════════════════════════════════════════════════════
// js/app.js  — LocMaster AI Studio — Main Application Logic
// ══════════════════════════════════════════════════════════════

// ── Navigation ─────────────────────────────────────────────────
window.navigate = function (viewName) {
  AppState.setView(viewName);
};

// ── File Upload ────────────────────────────────────────────────
window.handleFileUpload = async function (files) {
  if (!files?.length) return;
  const file = files[0];
  AppState.setLoading(true, 'Parsing ' + file.name + '…');
  try {
    const parsed = await Parser.parseFile(file);
    AppState.parsedData    = parsed;
    AppState.currentFile   = file;
    AppState.segments      = parsed.segments;
    AppState.srcLang       = parsed.srcLang || 'en';
    AppState.tgtLang       = parsed.tgtLang || 'ar';
    AppState.projectConfig = AppState.projectConfig || {};
    AppState.projectConfig.name    = parsed.name;
    AppState.projectConfig.srcLang = parsed.srcLang;
    AppState.projectConfig.tgtLang = parsed.tgtLang;

    if (window.UISegments) UISegments.render(parsed.segments, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });

    // Update topbar file info
    const fi = document.getElementById('file-name');   if (fi) fi.textContent = parsed.name;
    const fc = document.getElementById('file-count');  if (fc) fc.textContent = parsed.segmentCount + ' segments';
    const fileInfoBar = document.getElementById('file-info'); if (fileInfoBar) fileInfoBar.style.display = '';

    AppState.notify('File loaded: ' + parsed.name + ' (' + parsed.segmentCount + ' segments)', 'success');
    navigate('editor');
  } catch (err) {
    console.error('File parse error', err);
    AppState.notify('Failed to open file: ' + err.message, 'error');
  } finally {
    AppState.setLoading(false);
  }
};

// ── Demo Data ──────────────────────────────────────────────────
window.loadDemoData = function () {
  const demoSegments = [
    { id: '1', source: 'The device must comply with international safety standards.', target: 'يجب أن يمتثل الجهاز للمعايير الدولية للسلامة.', matchType: '100', matchPercent: 100, status: 'reviewed' },
    { id: '2', source: 'Please read all instructions before use.', target: 'يرجى قراءة جميع التعليمات قبل الاستخدام.', matchType: 'fuzzy', matchPercent: 87, status: 'translated' },
    { id: '3', source: 'Contact your local distributor for support.', target: '', matchType: 'new', matchPercent: 0, status: 'new' },
    { id: '4', source: 'Warning: Do not expose to direct sunlight.', target: 'تحذير: لا تعرضه لأشعة الشمس المباشرة', matchType: 'fuzzy', matchPercent: 76, status: 'translated' },
    { id: '5', source: 'Version 3.1 — Released January 2025', target: 'الإصدار 3.1 — صدر يناير 2025', matchType: '100', matchPercent: 100, status: 'translated' },
    { id: '6', source: 'Battery charging time: 2–3 hours.', target: '', matchType: 'new', matchPercent: 0, status: 'new' },
    { id: '7', source: 'All rights reserved.', target: 'جميع الحقوق محفوظة.', matchType: 'ice', matchPercent: 101, status: 'reviewed', locked: true },
    { id: '8', source: 'For indoor use only.', target: 'للاستخدام الداخلي فقط.', matchType: '100', matchPercent: 100, status: 'reviewed' },
  ];
  AppState.segments = demoSegments;
  AppState.srcLang  = 'en';
  AppState.tgtLang  = 'ar';
  AppState.projectConfig = { name: 'Demo Project', srcLang: 'en', tgtLang: 'ar', domain: 'technical' };
  const fi = document.getElementById('file-name');  if (fi) fi.textContent = 'demo.sdlxliff';
  const fc = document.getElementById('file-count'); if (fc) fc.textContent = demoSegments.length + ' segments';
  const fileInfoBar = document.getElementById('file-info'); if (fileInfoBar) fileInfoBar.style.display = '';
  if (window.UISegments) UISegments.render(demoSegments, { srcLang: 'en', tgtLang: 'ar' });
  AppState.notify('Demo data loaded (' + demoSegments.length + ' segments)', 'success');
};

// ── Save Project ───────────────────────────────────────────────
window.saveCurrentProject = function () {
  if (!AppState.segments.length) { AppState.notify('Nothing to save', 'warning'); return; }
  const data = {
    projectConfig: AppState.projectConfig,
    segments:      AppState.segments,
    srcLang:       AppState.srcLang,
    tgtLang:       AppState.tgtLang,
    savedAt:       new Date().toISOString(),
  };
  const key  = AppState.projectConfig?.name || 'project';
  localStorage.setItem('lm_save_' + key, JSON.stringify(data));
  AppState.notify('Project saved locally', 'success');
};

// ── Show segment actions modal ─────────────────────────────────
window.showSegmentActions = function () {
  if (window.UI) UI.showModal('Segment Actions', `
    <div style="display:flex;flex-direction:column;gap:8px;">
      <button onclick="batchPseudoTranslate()" class="btn-ghost btn-sm" style="text-align:left;">🔤 Pseudo-translate empty segments</button>
      <button onclick="batchExtractTM()" class="btn-ghost btn-sm" style="text-align:left;">📤 Extract all to TM</button>
      <button onclick="batchWordCount()" class="btn-ghost btn-sm" style="text-align:left;">🔢 Word count</button>
    </div>`);
};
