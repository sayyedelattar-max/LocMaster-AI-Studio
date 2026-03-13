// ── Segments UI Renderer ─────────────────────────────────────────
// Builds and updates the translation editor segment rows.

window.UISegments = (function() {
  let _selected = null;

  // ── Helpers ─────────────────────────────────────────────────────

  function _esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _statusBadge(seg) {
    const map = {
      locked:       'badge-locked',
      reviewed:     'badge-reviewed',
      translated:   'badge-translated',
      fuzzy:        'badge-fuzzy',
      untranslated: 'badge-untranslated'
    };
    const cls = map[seg.status] || 'badge-untranslated';
    return `<span class="seg-badge ${cls}">${seg.status || 'untranslated'}</span>`;
  }

  function _matchBadge(seg) {
    if (!seg.matchType) return '';
    const label = seg.matchType === 'exact' ? '100%' : `${seg.matchScore}%`;
    return `<span class="seg-match-badge">${label}</span>`;
  }

  function _buildRow(seg, opts) {
    const dir = (opts.tgtLang || '').toLowerCase().startsWith('ar') || (opts.tgtLang || '').toLowerCase().startsWith('he') ? 'rtl' : 'ltr';
    const locked = seg.locked || seg.status === 'locked';
    return `<div class="seg-row" data-seg-id="${seg.id}" data-status="${seg.status || 'untranslated'}">
  <div class="seg-meta">
    <span class="seg-num">${seg.id}</span>
    ${_statusBadge(seg)}
    ${_matchBadge(seg)}
  </div>
  <div class="seg-source" lang="${_esc(opts.srcLang || 'en')}">${_esc(seg.source)}</div>
  <div class="seg-target-wrap">
    <div class="seg-target" contenteditable="${locked ? 'false' : 'true'}"
         dir="${dir}" lang="${_esc(opts.tgtLang || 'ar')}"
         data-seg-id="${seg.id}"
         ${locked ? 'data-locked="true"' : ''}
         onblur="UISegments._onBlur(event, ${seg.id})"
         onclick="UISegments._onSelect(${seg.id})">${_esc(seg.target || '')}</div>
  </div>
</div>`;
  }

  function _applyFilters(segments) {
    const filters = window.AppState && AppState.filters;
    if (!filters) return segments;
    return segments.filter(seg => {
      if (filters.unconfirmed && seg.status !== 'untranslated') return false;
      if (filters.reviewed    && seg.status !== 'reviewed')     return false;
      if (filters.locked      && !seg.locked)                   return false;
      return true;
    });
  }

  // ── Public API ───────────────────────────────────────────────────

  return {
    /**
     * Render all segments into #segments-container.
     * @param {Array}  segments
     * @param {object} [options]  { srcLang, tgtLang, search }
     */
    render(segments, options = {}) {
      const container = document.getElementById('segments-container');
      if (!container) return;
      let segs = _applyFilters(segments);
      if (options.search) {
        const q = options.search.toLowerCase();
        segs = segs.filter(s => (s.source || '').toLowerCase().includes(q) || (s.target || '').toLowerCase().includes(q));
      }
      container.innerHTML = segs.length
        ? segs.map(seg => _buildRow(seg, options)).join('')
        : '<div class="empty-state">No segments to display.</div>';

      // update count info
      const info = document.getElementById('seg-count-info');
      if (info) info.textContent = `${segs.length} / ${segments.length} segments`;
    },

    /**
     * Update a single segment row in-place without full re-render.
     * @param {object} seg
     */
    updateSegment(seg) {
      const el = document.querySelector(`[data-seg-id="${seg.id}"] .seg-target`);
      if (el) el.textContent = seg.target || '';
      const row = document.querySelector(`.seg-row[data-seg-id="${seg.id}"]`);
      if (row) row.dataset.status = seg.status || 'untranslated';
    },

    /** Returns the currently selected segment object, or null. */
    getSelected() {
      if (_selected === null || !window.AppState) return null;
      return AppState.segments.find(s => s.id === _selected) || null;
    },

    /** @internal Called when a target cell loses focus. */
    _onBlur(event, segId) {
      const seg = window.AppState && AppState.segments.find(s => s.id === segId);
      if (!seg) return;
      const newVal = event.target.textContent;
      if (newVal !== seg.target) {
        seg.target = newVal;
        if (seg.status === 'untranslated') seg.status = 'translated';
        // push to TM
        if (window.TM && seg.target) TM.add(seg.source, seg.target, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
      }
    },

    /** @internal Called when a target cell is clicked (sets selection). */
    _onSelect(segId) {
      _selected = segId;
      document.querySelectorAll('.seg-row').forEach(r => r.classList.toggle('selected', Number(r.dataset.segId) === segId));
    }
  };
})();
