// ══════════════════════════════════════════════════════════════
// js/ui-preview.js  — LocMaster AI Studio — Resources/Preview
// ══════════════════════════════════════════════════════════════

window.Resources = (function () {

  function render() {
    const view = document.getElementById('view-resources');
    if (!view) return;
    view.innerHTML = `
      <div style="padding:24px;overflow-y:auto;height:100%;box-sizing:border-box;">
        <h2 style="font-size:1.05rem;font-weight:800;margin-bottom:6px;">📚 Resources</h2>
        <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:20px;">Translation memory and termbase resources for your workspace.</p>

        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:18px;margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <div style="font-weight:700;font-size:.88rem;">🧠 Translation Memory</div>
            <div style="display:flex;gap:6px;">
              <button onclick="batchImportTMX()" style="padding:5px 12px;font-size:.74rem;background:var(--surface2);border:1px solid var(--border);border-radius:6px;cursor:pointer;color:var(--text-dim);">📥 Import TMX</button>
              <button onclick="batchExportTMX()" style="padding:5px 12px;font-size:.74rem;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;">📤 Export TMX</button>
            </div>
          </div>
          <div style="font-size:.82rem;color:var(--text-dim);">
            <strong>${TM.entries.length}</strong> entries in Translation Memory
          </div>
          ${TM.entries.length ? `
            <div style="margin-top:12px;max-height:200px;overflow-y:auto;">
              <table style="width:100%;border-collapse:collapse;font-size:.76rem;">
                <thead style="position:sticky;top:0;background:var(--surface2);">
                  <tr>
                    <th style="padding:6px 8px;text-align:left;color:var(--text-muted);">Source</th>
                    <th style="padding:6px 8px;text-align:right;color:var(--text-muted);">Target</th>
                  </tr>
                </thead>
                <tbody>
                  ${TM.entries.slice(0, 50).map(e => `<tr>
                    <td style="padding:5px 8px;border-bottom:1px solid var(--border);color:var(--text-dim);max-width:200px;">${e.src.substring(0,60)}</td>
                    <td style="padding:5px 8px;border-bottom:1px solid var(--border);direction:rtl;text-align:right;color:var(--text);max-width:200px;">${e.tgt.substring(0,60)}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>` : ''}
        </div>
      </div>`;
  }

  return {
    load() { render(); },
  };
})();

// ── Simple modal/UI helper ────────────────────────────────────────
window.UI = {
  showModal(title, html, actions = []) {
    let modal = document.getElementById('_ui_generic_modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = '_ui_generic_modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;max-width:520px;width:94vw;max-height:80vh;overflow:hidden;display:flex;flex-direction:column;">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
          <div style="font-weight:800;font-size:.9rem;">${title}</div>
          <button onclick="UI.closeModal()" style="border:none;background:none;cursor:pointer;color:var(--text-muted);font-size:1.1rem;">×</button>
        </div>
        <div style="padding:16px 18px;overflow-y:auto;flex:1;">${html}</div>
        ${actions.length ? `<div style="padding:10px 18px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;">
          ${actions.map(a => `<button onclick="(${a.action.toString()})()" style="padding:6px 16px;background:var(--accent);color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:.78rem;font-weight:700;">${a.label}</button>`).join('')}
        </div>` : ''}
      </div>`;
    modal.style.display = 'flex';
  },

  closeModal() {
    const modal = document.getElementById('_ui_generic_modal');
    if (modal) modal.style.display = 'none';
  },

  notify(msg, type) { AppState.notify(msg, type); },
};
