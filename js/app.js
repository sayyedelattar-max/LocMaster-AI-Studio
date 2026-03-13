// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — Main App
// ══════════════════════════════════════════════════════════════════════════════

// ── File Upload Handler ────────────────────────────────────────────────────
async function handleFileUpload(files) {
  if (!files || !files.length) return;
  AppState.setLoading(true, 'Parsing file…');
  try {
    const parsed = await Parser.parseFile(files[0]);
    AppState.currentFile   = files[0];
    AppState.parsedData    = parsed;
    AppState.segments      = parsed.segments || [];
    AppState.srcLang       = parsed.srcLang  || 'en';
    AppState.tgtLang       = parsed.tgtLang  || 'ar';
    AppState.projectConfig = AppState.projectConfig || {};
    AppState.projectConfig.srcLang = parsed.srcLang;
    AppState.projectConfig.tgtLang = parsed.tgtLang;

    // Auto-apply TM
    if (window.TM) {
      const hits = TM.autoApplyAll(AppState.segments);
      if (hits) AppState.notify(`${hits} TM matches applied`, 'info');
    }

    if (window.UISegments) {
      UISegments.render(AppState.segments, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
    }

    // Update topbar file name
    const fnEl = document.getElementById('topbar-filename');
    if (fnEl) fnEl.textContent = files[0].name;

    AppState.notify(`Loaded: ${files[0].name} (${AppState.segments.length} segments)`, 'success');

    // Navigate to editor view
    if (typeof navigate === 'function') navigate('editor');

  } catch (err) {
    console.error('File upload error:', err);
    AppState.notify('Failed to parse file: ' + err.message, 'error');
  } finally {
    AppState.setLoading(false);
  }
}

// ── Save / Export Handler ──────────────────────────────────────────────────
function saveTranslation() {
  if (!AppState.segments.length) { AppState.notify('Nothing to save', 'warning'); return; }
  const data = {
    projectConfig: AppState.projectConfig,
    srcLang:       AppState.srcLang,
    tgtLang:       AppState.tgtLang,
    segments:      AppState.segments,
    savedAt:       new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const name = `${AppState.projectConfig?.name || 'project'}_save.json`;
  const a    = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  AppState.notify('Translation saved', 'success');
}

// ── Toggle batch dropdown ──────────────────────────────────────────────────
function toggleBatchMenu() {
  const m = document.getElementById('batchTasks');
  if (m) m.classList.toggle('show');
}
