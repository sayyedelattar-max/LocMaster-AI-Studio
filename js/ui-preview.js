// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — Preview UI
// ══════════════════════════════════════════════════════════════════════════════

window.UIPreview = {
  render(segments = [], opts = {}) {
    const container = document.getElementById('preview-container');
    if (!container) return;

    const html = segments
      .filter(s => s.source)
      .map(s => `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid var(--border);">
          <div style="padding:10px 14px;font-size:.84rem;line-height:1.7;color:var(--text-dim);border-right:1px solid var(--border);">
            ${(s.source||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
          </div>
          <div style="padding:10px 14px;font-size:.88rem;line-height:1.7;direction:rtl;text-align:right;color:var(--text);">
            ${(s.target||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
          </div>
        </div>`).join('');

    container.innerHTML = html ||
      '<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:.84rem;">No segments to preview.</div>';
  },
};
