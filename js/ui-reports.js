// ══════════════════════════════════════════════════════════════
// js/ui-reports.js  — LocMaster AI Studio — Reports View
// ══════════════════════════════════════════════════════════════

window.Reports = (function () {

  function renderReports() {
    const view = document.getElementById('view-reports');
    if (!view) return;
    const segs    = AppState.segments;
    const total   = segs.length;
    const rev     = segs.filter(s => s.status === 'reviewed').length;
    const tran    = segs.filter(s => s.status === 'translated').length;
    const flagged = segs.filter(s => s.flagged).length;
    const locked  = segs.filter(s => s.locked).length;
    const words   = segs.reduce((n, s) => n + (s.target||'').split(/\s+/).filter(Boolean).length, 0);
    const pct     = total ? Math.round(((rev + tran) / total) * 100) : 0;
    const lqiR    = Object.values(AppState.lqiResults || {});
    const avgScore = lqiR.length ? (lqiR.reduce((a, b) => a + (b.score || 0), 0) / lqiR.length).toFixed(2) : '—';

    view.innerHTML = `
      <div style="padding:24px;overflow-y:auto;height:100%;box-sizing:border-box;">
        <h2 style="font-size:1.05rem;font-weight:800;margin-bottom:20px;">📊 Project Reports</h2>

        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:24px;">
          ${[
            ['Total Segments', total, 'var(--text)'],
            ['Reviewed', rev, '#34d399'],
            ['Translated', tran, '#3b82f6'],
            ['Flagged', flagged, '#fbbf24'],
            ['Locked', locked, '#94a3b8'],
            ['Target Words', words, 'var(--accent)'],
            ['Progress', pct + '%', pct >= 80 ? '#34d399' : '#f59e0b'],
            ['Avg LQI Score', avgScore, lqiR.length ? '#8b5cf6' : 'var(--text-muted)'],
          ].map(([label, value, color]) => `
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:${color};font-family:var(--mono);">${value}</div>
              <div style="font-size:.7rem;color:var(--text-muted);margin-top:4px;">${label}</div>
            </div>`).join('')}
        </div>

        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px;">
          <div style="font-weight:700;font-size:.85rem;margin-bottom:12px;">Match Type Breakdown</div>
          ${['ice','100','fuzzy','mt','new'].map(mt => {
            const count = segs.filter(s => s.matchType === mt).length;
            const pctMT = total ? Math.round((count/total)*100) : 0;
            const colors = { ice:'#10b981', '100':'#3b82f6', fuzzy:'#f59e0b', mt:'#a78bfa', new:'#94a3b8' };
            return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <span style="font-size:.72rem;font-family:var(--mono);color:${colors[mt]};min-width:40px;">${mt.toUpperCase()}</span>
              <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${pctMT}%;background:${colors[mt]};border-radius:4px;"></div>
              </div>
              <span style="font-size:.72rem;font-family:var(--mono);color:var(--text-muted);min-width:30px;text-align:right;">${count}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  return {
    init() { renderReports(); },
  };
})();
