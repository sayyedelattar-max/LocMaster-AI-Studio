// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — Segments UI
// ══════════════════════════════════════════════════════════════════════════════

window.UISegments = {
  render(segments = [], opts = {}) {
    const container = document.getElementById('segments-container');
    if (!container) return;

    const search   = (opts.search  || '').toLowerCase();
    const visible  = search
      ? segments.filter(s =>
          (s.source||'').toLowerCase().includes(search) ||
          (s.target||'').toLowerCase().includes(search)
        )
      : segments;

    container.innerHTML = visible.length
      ? visible.map(seg => this._buildRow(seg, opts)).join('')
      : '<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:.84rem;">No segments match your search.</div>';

    // Attach event listeners
    container.querySelectorAll('.seg-tgt[contenteditable]').forEach(el => {
      el.addEventListener('input', () => this._onTargetInput(el));
      el.addEventListener('click', () => this._activateRow(el.closest('[data-seg-id]')));
    });
    container.querySelectorAll('[data-seg-id]').forEach(el => {
      el.addEventListener('click', e => {
        if (!e.target.closest('.seg-tgt')) this._activateRow(el);
      });
    });

    this._updateCount(visible.length, segments.length);
  },

  _buildRow(seg, opts) {
    const lqiResult  = (window.AppState?.lqiResults || {})[seg.id];
    const score      = lqiResult?.score;
    const scoreColor = score >= 4 ? '#10b981' : score >= 3 ? '#f59e0b' : '#ef4444';
    const statusDot  = seg.locked ? '🔒' : seg.target ? '✓' : '○';
    const statusCol  = seg.locked ? '#94a3b8' : seg.target ? '#10b981' : '#6b7280';
    const matchLabel = seg.matchType
      ? `<span style="font-size:.6rem;padding:1px 5px;border-radius:4px;background:rgba(99,102,241,.12);
                      color:#818cf8;border:1px solid rgba(99,102,241,.2);font-family:var(--mono);">
           ${seg.matchType}${seg.matchPercent ? ' ' + seg.matchPercent + '%' : ''}
         </span>` : '';

    return `<div class="seg-row" data-seg-id="${seg.id}"
               style="display:grid;grid-template-columns:36px 1fr 1fr 40px;gap:0;border-bottom:1px solid var(--border);
                      min-height:52px;cursor:pointer;transition:background .15s;">
      <div style="padding:10px 6px;display:flex;align-items:flex-start;justify-content:center;
                  font-family:var(--mono);font-size:.65rem;color:var(--text-muted);border-right:1px solid var(--border);">
        <span style="color:${statusCol};">${statusDot}</span>
      </div>
      <div class="seg-src" style="padding:10px 12px;font-size:.84rem;line-height:1.7;
                                   color:var(--text-dim);border-right:1px solid var(--border);">
        ${this._esc(seg.source)}
        <div style="margin-top:3px;">${matchLabel}</div>
      </div>
      <div class="seg-tgt" contenteditable="${seg.locked ? 'false' : 'true'}"
           data-seg-id="${seg.id}"
           style="padding:10px 12px;font-size:.88rem;line-height:1.7;direction:rtl;text-align:right;
                  color:var(--text);outline:none;min-height:52px;${seg.locked ? 'opacity:.6;' : ''}">
        ${this._esc(seg.target || '')}
      </div>
      <div style="padding:6px 4px;display:flex;align-items:center;justify-content:center;
                  border-left:1px solid var(--border);">
        ${score ? `<span style="font-size:.65rem;font-weight:700;color:${scoreColor};font-family:var(--mono);">${score}</span>` : ''}
      </div>
    </div>`;
  },

  _esc(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  },

  _onTargetInput(el) {
    const segId = el.dataset.segId;
    const seg   = (window.AppState?.segments || []).find(s => String(s.id) === String(segId));
    if (!seg) return;
    seg.target    = el.textContent || '';
    seg.status    = 'translated';
    seg.matchType = seg.matchType || 'mt';
    this._updateStatusBar();
  },

  _activateRow(rowEl) {
    if (!rowEl) return;
    document.querySelectorAll('.seg-row.active').forEach(el => el.classList.remove('active'));
    rowEl.classList.add('active');
    rowEl.style.background = 'rgba(99,102,241,.06)';
  },

  _updateCount(visible, total) {
    const info = document.getElementById('seg-count-info');
    if (info) info.textContent = visible === total
      ? `${total} segments`
      : `${visible} / ${total} segments`;
  },

  _updateStatusBar() {
    const segs = window.AppState?.segments || [];
    const done = segs.filter(s => s.target).length;
    const pct  = segs.length ? Math.round(done / segs.length * 100) : 0;
    const sbEl = document.getElementById('sb-progress');
    if (sbEl) sbEl.textContent = `${done}/${segs.length} (${pct}%)`;
  },
};
