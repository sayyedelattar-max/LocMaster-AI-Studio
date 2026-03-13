// ── Preview Panel ─────────────────────────────────────────────────
// Bilingual side-by-side preview of the current translation.

window.UIPreview = (function() {
  let _visible = false;

  // ── Helpers ─────────────────────────────────────────────────────

  function _esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _buildRow(seg, opts) {
    const dir = (opts.tgtLang || '').toLowerCase().startsWith('ar') || (opts.tgtLang || '').toLowerCase().startsWith('he') ? 'rtl' : 'ltr';
    return `<div class="preview-row">
  <div class="preview-source" lang="${_esc(opts.srcLang || 'en')}">${_esc(seg.source)}</div>
  <div class="preview-target" lang="${_esc(opts.tgtLang || 'ar')}" dir="${dir}">${_esc(seg.target || '<em>—</em>')}</div>
</div>`;
  }

  // ── Public API ───────────────────────────────────────────────────

  return {
    /**
     * Render a bilingual preview of segments.
     * @param {Array}  segments
     * @param {object} [options]  { srcLang, tgtLang }
     */
    render(segments, options = {}) {
      const container = document.getElementById('preview-container');
      if (!container) return;
      if (!segments || !segments.length) {
        container.innerHTML = '<div class="empty-state">No segments to preview.</div>';
        return;
      }
      container.innerHTML = segments.map(seg => _buildRow(seg, options)).join('');
    },

    /** Toggle the preview panel open / closed. */
    toggle() {
      _visible = !_visible;
      const panel = document.getElementById('preview-panel');
      if (panel) panel.classList.toggle('hidden', !_visible);
      // Re-render current segments when opening
      if (_visible && window.AppState && AppState.segments.length) {
        this.render(AppState.segments, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
      }
    }
  };
})();
