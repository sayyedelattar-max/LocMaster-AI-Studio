// ══════════════════════════════════════════════════════════════
// js/ui-segments.js  — LocMaster AI Studio — Segments Renderer
// ══════════════════════════════════════════════════════════════

window.UISegments = (function () {

  const MATCH_COLORS = {
    ice:        { bg: '#10b98115', border: '#10b98150', badge: '#10b981', label: 'ICE' },
    '100':      { bg: '#3b82f615', border: '#3b82f650', badge: '#3b82f6', label: '100%' },
    fuzzy:      { bg: '#f59e0b15', border: '#f59e0b50', badge: '#f59e0b', label: 'Fuzzy' },
    mt:         { bg: '#a78bfa15', border: '#a78bfa50', badge: '#a78bfa', label: 'MT' },
    new:        { bg: 'transparent', border: 'var(--border)', badge: '#94a3b8', label: 'New' },
    translated: { bg: 'transparent', border: 'var(--border)', badge: '#3b82f6', label: 'Transl' },
    reviewed:   { bg: '#34d39915', border: '#34d39950', badge: '#34d399', label: 'Rev' },
  };

  const STATUS_ICONS = { reviewed: '✓', translated: '✎', flagged: '⚑', locked: '🔒', new: '' };

  function escHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function matchInfo(seg) {
    const mt = seg.matchType || 'new';
    return MATCH_COLORS[mt] || MATCH_COLORS.new;
  }

  function segVisible(seg, opts = {}) {
    const f = AppState.filters;
    const mt = seg.matchType || 'new';
    // Match type filters
    if (mt === 'ice'    && !f.ice)        return false;
    if (mt === '100'    && !f['100'])     return false;
    if ((mt === 'fuzzy') && !f.fuzzy)    return false;
    if (mt === 'mt'     && !f.mt)         return false;
    if (mt === 'new'    && !f.new)        return false;
    // Status filters
    if (seg.status === 'translated' && !f.translated) return false;
    if (seg.status === 'reviewed'   && !f.reviewed)   return false;
    if (seg.flagged  && !f.flagged)  return false;
    if (seg.locked   && !f.locked)   return false;
    // Search
    if (opts.search) {
      const q = opts.search.toLowerCase();
      if (!(seg.source||'').toLowerCase().includes(q) && !(seg.target||'').toLowerCase().includes(q)) return false;
    }
    return true;
  }

  function buildRow(seg, opts = {}) {
    const mc  = matchInfo(seg);
    const st  = seg.status || 'new';
    const ico = STATUS_ICONS[seg.locked ? 'locked' : seg.flagged ? 'flagged' : st] || '';
    const wc  = (seg.target || '').split(/\s+/).filter(Boolean).length;
    const lqiR = AppState.lqiResults?.[seg.id];
    const lqiColor = lqiR ? (lqiR.score >= 4 ? '#34d399' : lqiR.score >= 3 ? '#fbbf24' : '#f87171') : '';
    return `<div class="seg-row${seg.locked?' locked':''}" data-seg-id="${seg.id}"
      style="display:grid;grid-template-columns:40px 1fr 1fr 80px;border-bottom:1px solid var(--border);background:${mc.bg};border-left:3px solid ${seg.flagged?'#fbbf24':seg.locked?'#94a3b8':mc.border};"
      onclick="UISegments.selectSegment('${seg.id}')">
      <!-- # column -->
      <div style="padding:8px 6px;display:flex;flex-direction:column;align-items:center;gap:3px;border-right:1px solid var(--border);justify-content:center;background:var(--surface);">
        <span style="font-size:.65rem;font-family:var(--mono);color:var(--text-muted);">${seg.id}</span>
        ${ico ? `<span style="font-size:.7rem;">${ico}</span>` : ''}
        ${lqiR?.score != null ? `<span style="font-size:.6rem;font-weight:800;color:${lqiColor}">${lqiR.score}</span>` : ''}
      </div>
      <!-- Source -->
      <div class="seg-src" style="padding:10px 14px;font-size:.82rem;color:var(--text-dim);line-height:1.65;direction:${opts.srcLang === 'ar' ? 'rtl' : 'ltr'};overflow-wrap:break-word;min-height:44px;">
        ${escHtml(seg.source || '')}
      </div>
      <!-- Target -->
      <div class="seg-tgt" contenteditable="${seg.locked ? 'false' : 'true'}"
        style="padding:10px 14px;font-size:.85rem;color:var(--text);line-height:1.75;direction:rtl;text-align:right;overflow-wrap:break-word;min-height:44px;outline:none;cursor:${seg.locked?'not-allowed':'text'};caret-color:var(--accent);"
        data-seg-id="${seg.id}"
        oninput="UISegments.onTargetInput(event,'${seg.id}')"
        onkeydown="UISegments.onTargetKey(event,'${seg.id}')"
        onblur="UISegments.onTargetBlur(event,'${seg.id}')"
        onfocus="UISegments.onTargetFocus(event,'${seg.id}')"
        >${escHtml(seg.target || '')}</div>
      <!-- Meta -->
      <div style="padding:6px 8px;display:flex;flex-direction:column;align-items:flex-end;gap:3px;border-left:1px solid var(--border);background:var(--surface);font-family:var(--mono);">
        <span style="font-size:.63rem;padding:1px 5px;border-radius:4px;background:${mc.badge}22;color:${mc.badge};border:1px solid ${mc.badge}44;">${mc.label}</span>
        <span style="font-size:.62rem;color:var(--text-muted);">${seg.matchPercent||0}%</span>
        <span style="font-size:.62rem;color:var(--text-muted);">${wc}w</span>
      </div>
    </div>`;
  }

  let _activeSegId = null;

  return {
    render(segments, opts = {}) {
      const container = document.getElementById('segments-container');
      if (!container) return;
      const visible = segments.filter(s => segVisible(s, opts));
      container.innerHTML = visible.map(s => buildRow(s, opts)).join('');
      const info = document.getElementById('seg-count-info');
      if (info) info.textContent = `${visible.length} / ${segments.length} segments`;
      this.updateStatusBar(segments);
    },

    updateStatusBar(segments) {
      const rev  = segments.filter(s => s.status === 'reviewed').length;
      const tran = segments.filter(s => s.status === 'translated').length;
      const flag = segments.filter(s => s.flagged).length;
      const words = segments.reduce((n, s) => n + (s.source||'').split(/\s+/).filter(Boolean).length, 0);
      const $  = id => document.getElementById(id);
      if ($('sb-reviewed'))  $('sb-reviewed').textContent  = rev  + ' reviewed';
      if ($('sb-translated')) $('sb-translated').textContent = tran + ' translated';
      if ($('sb-flagged'))   $('sb-flagged').textContent   = flag + ' flagged';
      if ($('sb-words'))     $('sb-words').textContent     = '~' + words + ' words';
    },

    selectSegment(segId) {
      _activeSegId = segId;
      document.querySelectorAll('.seg-row').forEach(el => el.classList.remove('active'));
      const row = document.querySelector(`[data-seg-id="${segId}"]`);
      if (row) { row.classList.add('active'); row.scrollIntoView({ block: 'nearest' }); }
      const seg = AppState.segments.find(s => String(s.id) === String(segId));
      this.renderPanel(seg);
    },

    renderPanel(seg) {
      const panel = document.getElementById('editor-panel');
      if (!panel || !seg) return;
      const tmMatches = TM.lookup(seg.source, 70).slice(0, 5);
      const tmHtml = tmMatches.length
        ? tmMatches.map(m => `<div style="padding:8px;border-bottom:1px solid var(--border);cursor:pointer;" onclick="UISegments.applyTM('${seg.id}','${m.tgt.replace(/'/g,"\\'")}')">
            <div style="font-size:.65rem;font-family:var(--mono);color:var(--accent);margin-bottom:2px;">${m.pct}%</div>
            <div style="font-size:.8rem;direction:rtl;color:var(--text);">${m.tgt.substring(0,120)}</div>
          </div>`).join('')
        : '<div style="padding:12px;font-size:.74rem;color:var(--text-muted);text-align:center;">No TM matches</div>';
      panel.innerHTML = `
        <div style="padding:10px 12px;border-bottom:1px solid var(--border);font-size:.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Segment #${seg.id}</div>
        <div style="padding:10px 12px;border-bottom:1px solid var(--border);">
          <div style="font-size:.65rem;color:var(--text-muted);margin-bottom:4px;">TM Matches</div>
          ${tmHtml}
        </div>
        <div style="padding:10px 12px;">
          <div style="font-size:.65rem;color:var(--text-muted);margin-bottom:4px;">Actions</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">
            <button onclick="UISegments.confirmSegment('${seg.id}')" style="padding:4px 10px;font-size:.7rem;background:var(--success);color:#fff;border:none;border-radius:5px;cursor:pointer;">✓ Confirm</button>
            <button onclick="UISegments.flagSegment('${seg.id}')" style="padding:4px 10px;font-size:.7rem;background:var(--surface2);border:1px solid var(--border);border-radius:5px;cursor:pointer;color:var(--warning);">⚑ Flag</button>
          </div>
        </div>`;
    },

    applyTM(segId, tgt) {
      const seg = AppState.segments.find(s => String(s.id) === String(segId));
      if (!seg || seg.locked) return;
      seg.target = tgt;
      seg.status = 'translated';
      this.render(AppState.segments, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
      this.selectSegment(segId);
    },

    confirmSegment(segId) {
      const seg = AppState.segments.find(s => String(s.id) === String(segId));
      if (!seg || seg.locked) return;
      seg.status = 'reviewed';
      TM.addEntry(seg.source, seg.target, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
      this.render(AppState.segments, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
      AppState.notify('Segment confirmed', 'success', 1500);
    },

    flagSegment(segId) {
      const seg = AppState.segments.find(s => String(s.id) === String(segId));
      if (!seg) return;
      seg.flagged = !seg.flagged;
      this.render(AppState.segments, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
    },

    onTargetInput(event, segId) {
      const seg = AppState.segments.find(s => String(s.id) === String(segId));
      if (!seg || seg.locked) return;
      seg.target = event.target.textContent;
      if (!seg.status || seg.status === 'new') seg.status = 'translated';
    },

    onTargetKey(event, segId) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        this.confirmSegment(segId);
        // Move to next
        const segs = AppState.segments;
        const idx  = segs.findIndex(s => String(s.id) === String(segId));
        if (idx >= 0 && idx < segs.length - 1) this.selectSegment(segs[idx + 1].id);
      }
      if (event.altKey && event.key === 'ArrowDown') {
        event.preventDefault();
        const segs = AppState.segments;
        const idx  = segs.findIndex(s => String(s.id) === String(segId));
        if (idx >= 0 && idx < segs.length - 1) this.selectSegment(segs[idx + 1].id);
      }
    },

    onTargetFocus(event, segId) {
      const row = document.querySelector(`.seg-row[data-seg-id="${segId}"]`);
      if (row) row.classList.add('active');
    },

    onTargetBlur(event, segId) {
      const seg = AppState.segments.find(s => String(s.id) === String(segId));
      if (seg) seg.target = event.target.textContent;
    },
  };
})();
