// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — Reports UI
// ══════════════════════════════════════════════════════════════════════════════

window.UIReports = {
  render() {
    const container = document.getElementById('reports-container');
    if (!container) return;

    const segs     = window.AppState?.segments || [];
    const total    = segs.length;
    const done     = segs.filter(s => s.target).length;
    const pct      = total ? Math.round(done / total * 100) : 0;
    const lqiData  = Object.values(window.AppState?.lqiResults || {});
    const avgScore = lqiData.length
      ? (lqiData.reduce((sum, r) => sum + (r.score || 0), 0) / lqiData.length).toFixed(2)
      : '—';

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px;">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:800;color:#3b82f6;">${total}</div>
          <div style="font-size:.74rem;color:var(--text-muted);">Total Segments</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:800;color:#10b981;">${done}</div>
          <div style="font-size:.74rem;color:var(--text-muted);">Translated</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:800;color:#f59e0b;">${pct}%</div>
          <div style="font-size:.74rem;color:var(--text-muted);">Completion</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:1.6rem;font-weight:800;color:#8b5cf6;">${avgScore}</div>
          <div style="font-size:.74rem;color:var(--text-muted);">Avg LQI Score</div>
        </div>
      </div>
      <div style="color:var(--text-muted);font-size:.82rem;text-align:center;padding:20px;">
        Run LQI review to generate detailed quality metrics.
      </div>`;
  },
};
