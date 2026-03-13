// ── Reports UI ────────────────────────────────────────────────────
// Renders quality and progress charts/tables using Chart.js.

window.UIReports = (function() {
  let _chartInstances = {};

  // ── Helpers ─────────────────────────────────────────────────────

  function _destroyChart(id) {
    if (_chartInstances[id]) {
      _chartInstances[id].destroy();
      delete _chartInstances[id];
    }
  }

  function _createBarChart(canvasId, labels, data, label, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;
    _destroyChart(canvasId);
    _chartInstances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label, data, backgroundColor: color || 'rgba(59,130,246,0.6)', borderRadius: 4 }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }

  // ── Public API ───────────────────────────────────────────────────

  return {
    /**
     * Render generic report data (auto-selects chart type).
     * @param {object}      data
     * @param {HTMLElement} container
     */
    render(data, container) {
      if (!container) return;
      container.innerHTML = `<pre style="font-size:.75rem;white-space:pre-wrap;color:var(--text-dim)">${JSON.stringify(data, null, 2)}</pre>`;
    },

    /**
     * Render an LQI quality report.
     * @param {Array}       lqiResults  from AIClient.batchReview / LQI.run
     * @param {HTMLElement} [container] defaults to #reports-lqi
     */
    generateLQIReport(lqiResults, container) {
      const el = container || document.getElementById('reports-lqi');
      if (!el) return;
      const avg = lqiResults.length
        ? (lqiResults.reduce((s, r) => s + (r.score || 0), 0) / lqiResults.length).toFixed(2)
        : '—';
      const errorTypes = {};
      lqiResults.forEach(r => (r.errors || []).forEach(e => { errorTypes[e.type] = (errorTypes[e.type] || 0) + 1; }));
      el.innerHTML = `
        <div class="stat-card" style="display:inline-block;padding:14px 20px;margin-bottom:16px">
          <div class="stat-num" style="color:var(--tool-lqi)">${avg}/5</div>
          <div class="stat-label">Avg LQI Score</div>
        </div>
        <canvas id="lqi-chart" height="120"></canvas>`;
      if (Object.keys(errorTypes).length) {
        _createBarChart('lqi-chart', Object.keys(errorTypes), Object.values(errorTypes), 'Error Count', 'rgba(167,139,250,0.7)');
      }
    },

    /**
     * Render a QC issue summary report.
     * @param {Array}       qcResults  from QA.check()
     * @param {HTMLElement} [container] defaults to #reports-qc
     */
    generateQCReport(qcResults, container) {
      const el = container || document.getElementById('reports-qc');
      if (!el) return;
      const counts = {};
      qcResults.forEach(r => r.issues.forEach(i => { counts[i.check] = (counts[i.check] || 0) + 1; }));
      el.innerHTML = `
        <div class="stat-card" style="display:inline-block;padding:14px 20px;margin-bottom:16px">
          <div class="stat-num" style="color:var(--tool-qc)">${qcResults.length}</div>
          <div class="stat-label">Segments with Issues</div>
        </div>
        <canvas id="qc-chart" height="120"></canvas>`;
      if (Object.keys(counts).length) {
        _createBarChart('qc-chart', Object.keys(counts), Object.values(counts), 'Issues', 'rgba(34,211,238,0.7)');
      }
    }
  };
})();
