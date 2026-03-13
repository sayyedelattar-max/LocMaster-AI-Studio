// ══════════════════════════════════════════════════════════════
// js/lqi.js  — LocMaster AI Studio — LQI Reviewer (MQM 2.0)
// ══════════════════════════════════════════════════════════════

window.LQI = (function () {
  let _files      = [];
  let _segments   = [];
  let _results    = [];
  let _matchFilter = 'all';
  let _statusFilter = 'all';
  let _search     = '';
  let _hideMode   = null;
  let _running    = false;

  const $ = id => document.getElementById(id);

  // ── Helpers ────────────────────────────────────────────────────
  function escHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function buildGauge(score, max = 5) {
    const pct = Math.min(100, Math.round((score / max) * 100));
    const color = pct >= 80 ? '#34d399' : pct >= 60 ? '#f59e0b' : '#f87171';
    return `<div style="width:70px;height:70px;position:relative;display:inline-flex;align-items:center;justify-content:center;">
      <svg width="70" height="70" style="position:absolute;transform:rotate(-90deg)">
        <circle cx="35" cy="35" r="28" fill="none" stroke="var(--border)" stroke-width="5"/>
        <circle cx="35" cy="35" r="28" fill="none" stroke="${color}" stroke-width="5"
          stroke-dasharray="${Math.PI*56}" stroke-dashoffset="${Math.PI*56*(1-pct/100)}"/>
      </svg>
      <span style="font-size:.9rem;font-weight:800;color:${color};">${score?.toFixed ? score.toFixed(1) : score}</span>
    </div>`;
  }

  function updateStats() {
    const segs = _segments;
    const $ = id => document.getElementById(id);
    const count = t => segs.filter(s => s.matchType === t).length;
    if($('lqi-stat-total')) $('lqi-stat-total').textContent = segs.length;
    if($('lqi-stat-ice'))   $('lqi-stat-ice').textContent   = count('ice');
    if($('lqi-stat-100'))   $('lqi-stat-100').textContent   = count('100');
    if($('lqi-stat-fuzzy')) $('lqi-stat-fuzzy').textContent = count('fuzzy');
    if($('lqi-stat-new'))   $('lqi-stat-new').textContent   = count('new');
    if($('lqi-stat-rep'))   $('lqi-stat-rep').textContent   = count('rep') || 0;
  }

  function renderPreview() {
    const tbody = $('lqi-preview-body');
    if (!tbody) return;
    const visible = _segments.filter(s => _matchFilter === 'all' || s.matchType === _matchFilter);
    $('lqi-preview-count').textContent = visible.length + ' segments';
    tbody.innerHTML = visible.map((s, i) => `
      <tr style="${i%2?'background:var(--surface2);':''}">
        <td style="padding:6px 10px;font-family:var(--mono);font-size:.72rem;color:var(--text-muted);">${s.id}</td>
        <td style="padding:6px 10px;font-size:.72rem;color:var(--text-muted);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(s._file||'—')}</td>
        <td style="padding:6px 10px;font-size:.78rem;color:var(--text);max-width:220px;">${escHtml((s.source||'').substring(0,100))}</td>
        <td style="padding:6px 10px;font-size:.82rem;color:var(--text);direction:rtl;text-align:right;max-width:220px;">${escHtml((s.target||'').substring(0,100))}</td>
        <td style="padding:6px 10px;text-align:center;"><span style="font-size:.67rem;padding:1px 6px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);">${s.matchType||'new'}</span></td>
        <td style="padding:6px 10px;text-align:center;font-family:var(--mono);font-size:.72rem;">${s.matchPercent||0}</td>
        <td style="padding:6px 10px;text-align:center;font-family:var(--mono);font-size:.72rem;">${(s.source||'').split(/\s+/).filter(Boolean).length}</td>
      </tr>`).join('');
    $('lqi-preview-section').style.display = _segments.length ? '' : 'none';
    $('lqi-empty-state').style.display      = _segments.length ? 'none' : 'flex';
  }

  function renderReport() {
    const list = $('lqi-report-list');
    if (!list) return;
    let rows = _results;
    if (_statusFilter !== 'all') rows = rows.filter(r => r.status === _statusFilter);
    if (_hideMode === 'accepted') rows = rows.filter(r => r.status !== 'accepted');
    if (_hideMode === 'rejected') rows = rows.filter(r => r.status !== 'rejected');
    if (_search) {
      const q = _search.toLowerCase();
      rows = rows.filter(r => (r.source||'').toLowerCase().includes(q) || (r.target||'').toLowerCase().includes(q));
    }
    list.innerHTML = rows.map(r => {
      const seg = _segments.find(s => s.id === r.segmentId) || {};
      const sevColor = { critical:'#f87171', major:'#fb923c', minor:'#fbbf24', info:'#60a5fa' };
      const errors = (r.errors || []).map(e => `
        <div style="padding:6px 10px;background:var(--surface2);border-radius:4px;margin:3px 0;display:flex;gap:8px;align-items:flex-start;">
          <span style="font-size:.65rem;padding:1px 6px;border-radius:4px;background:${sevColor[e.severity]||'var(--border)'}22;color:${sevColor[e.severity]||'var(--text-muted)'};border:1px solid ${sevColor[e.severity]||'var(--border)'}44;white-space:nowrap;">${e.severity||'info'}</span>
          <span style="font-size:.76rem;color:var(--text-dim);flex:1;">${escHtml(e.description||e.type||'')}</span>
        </div>`).join('');
      return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;margin-bottom:8px;overflow:hidden;" id="lqi-row-${r.id}">
        <div style="padding:8px 14px;background:var(--surface2);border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <span style="font-size:.7rem;font-family:var(--mono);color:var(--text-muted);">#${r.segmentId}</span>
          <span style="font-size:.75rem;font-weight:700;color:${r.score>=4?'#34d399':r.score>=3?'#fbbf24':'#f87171'};font-family:var(--mono);">${r.score||'?'}/5</span>
          ${r.errors?.length ? `<span style="font-size:.67rem;color:#f87171;">${r.errors.length} issue(s)</span>` : ''}
          <div style="margin-left:auto;display:flex;gap:4px;">
            <button onclick="LQI.acceptResult('${r.id}')" style="font-size:.67rem;padding:2px 8px;border-radius:4px;border:1px solid rgba(52,211,153,.3);background:transparent;color:#34d399;cursor:pointer;">✔ Accept</button>
            <button onclick="LQI.rejectResult('${r.id}')" style="font-size:.67rem;padding:2px 8px;border-radius:4px;border:1px solid rgba(248,113,113,.3);background:transparent;color:#f87171;cursor:pointer;">✕ Reject</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;">
          <div style="padding:8px 14px;border-right:1px solid var(--border);">
            <div style="font-size:.65rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:3px;">Source</div>
            <div style="font-size:.8rem;color:var(--text-dim);">${escHtml(seg.source||'')}</div>
          </div>
          <div style="padding:8px 14px;">
            <div style="font-size:.65rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:3px;">Target</div>
            <div style="font-size:.85rem;color:var(--text);direction:rtl;text-align:right;">${escHtml(seg.target||'')}</div>
          </div>
        </div>
        ${errors ? `<div style="padding:6px 14px 10px;">${errors}</div>` : ''}
        ${r.suggestion ? `<div style="padding:6px 14px 10px;border-top:1px solid var(--border);"><div style="font-size:.67rem;color:var(--accent);font-weight:700;margin-bottom:3px;">💡 Suggestion</div><div style="font-size:.82rem;direction:rtl;text-align:right;color:#34d399;">${escHtml(r.suggestion)}</div></div>` : ''}
      </div>`;
    }).join('') || '<div style="text-align:center;padding:40px;color:var(--text-muted);">No results match the current filters.</div>';
  }

  function buildMQMPrompt(segments, domain) {
    const sample = segments.map((s,i) => `[${i+1}] id:${s.id}\nSRC: ${s.source}\nTGT: ${s.target||'(empty)'}`).join('\n\n');
    return `You are an expert MQM 2.0 quality evaluator for ${domain} translation (English → Arabic).
Evaluate each segment. For each, return a JSON object with:
- segmentId: the ID
- score: 1-5 (5=perfect)
- errors: array of {type, severity: critical|major|minor, description}
- suggestion: improved Arabic translation if needed (optional)

Return ONLY a valid JSON array, no markdown:
[{"segmentId":"1","score":4,"errors":[{"type":"Terminology","severity":"minor","description":"..."}],"suggestion":""}]

Segments:
${sample}`;
  }

  // ── Public ─────────────────────────────────────────────────────
  return {
    handleFiles(files) {
      const arr = [...files];
      if (!arr.length) return;
      _files = arr;
      _segments = [];
      AppState.setLoading(true, `Parsing ${arr.length} file(s)…`);
      Promise.all(arr.map(f => Parser.parseFile(f))).then(parsed => {
        parsed.forEach(p => {
          p.segments.forEach(s => { s._file = p.name; });
          _segments.push(...p.segments);
        });
        updateStats();
        renderPreview();
        const badge = $('lqi-file-badge');
        if (badge) badge.textContent = `${arr.length} file(s) · ${_segments.length} segments`;
        AppState.notify(`Loaded ${_segments.length} segments`, 'success');
      }).catch(e => {
        AppState.notify('Parse error: ' + e.message, 'error');
      }).finally(() => AppState.setLoading(false));
    },

    loadMock() {
      _segments = [
        { id:'1', source:'The product must comply with safety regulations.', target:'يجب أن يمتثل المنتج للوائح السلامة.', matchType:'100', matchPercent:100, status:'translated', _file:'demo.sdlxliff' },
        { id:'2', source:'Please review the attached document carefully.', target:'يرجى مراجعة المستند المرفق بعناية', matchType:'fuzzy', matchPercent:85, status:'translated', _file:'demo.sdlxliff' },
        { id:'3', source:'Contact our support team for assistance.', target:'اتصل بفريق الدعم لدينا للحصول على المساعدة', matchType:'new', matchPercent:0, status:'new', _file:'demo.sdlxliff' },
        { id:'4', source:'Version 2.0 released on 01/15/2025.', target:'الإصدار 2.0 صدر في 15/01/2025.', matchType:'fuzzy', matchPercent:78, status:'translated', _file:'demo.sdlxliff' },
        { id:'5', source:'All rights reserved.', target:'All rights reserved.', matchType:'ice', matchPercent:101, status:'reviewed', locked:true, _file:'demo.sdlxliff' },
      ];
      updateStats();
      renderPreview();
      const badge = $('lqi-file-badge');
      if (badge) badge.textContent = `demo.sdlxliff · ${_segments.length} segments`;
      $('lqi-empty-state').style.display = 'none';
      AppState.notify('Demo data loaded', 'success');
    },

    async runEvaluation() {
      if (_running) return;
      if (!_segments.length) { AppState.notify('Upload a file first', 'warning'); return; }
      if (!isToolReady('lqi')) { AppState.notify('Configure AI in Settings → AI Providers', 'warning'); navigate('settings'); return; }

      const includes = [...document.querySelectorAll('.lqi-include-check:checked')].map(c => c.value);
      const domain   = $('lqi-domain')?.value || 'general';
      const toEval   = _segments.filter(s => {
        if (s.locked && !includes.includes('locked')) return false;
        if (s.matchType === 'ice' && !includes.includes('ice'))   return false;
        if (s.matchType === '100' && !includes.includes('100'))   return false;
        if (s.matchType === 'fuzzy' && !includes.includes('fuzzy')) return false;
        if (!s.target?.trim()) return false;
        return true;
      });
      if (!toEval.length) { AppState.notify('No segments match the selected filters', 'warning'); return; }

      _running = true;
      const btn = $('lqi-run-btn');
      if (btn) btn.textContent = '⏳ Running…';
      $('lqi-progress-wrap').style.display = '';
      _results = [];

      const CHUNK = 5;
      let done = 0;
      const customPrompt = getToolPrompt('lqi');

      for (let i = 0; i < toEval.length; i += CHUNK) {
        const chunk = toEval.slice(i, i + CHUNK);
        const prompt = (customPrompt ? customPrompt + '\n\n' : '') + buildMQMPrompt(chunk, domain);
        try {
          const raw  = await AIClient.call(prompt, 'lqi', { maxTokens: 2000, temperature: 0.1 });
          const json = raw.replace(/```json|```/g, '').trim();
          const arr  = JSON.parse(json.match(/\[[\s\S]*\]/)?.[0] || '[]');
          arr.forEach((r, j) => _results.push({ ...r, id: `r${i+j}`, segmentId: r.segmentId || chunk[j]?.id, status: 'pending' }));
        } catch (e) {
          chunk.forEach((s, j) => _results.push({ id:`r${i+j}`, segmentId: s.id, score: null, errors:[{type:'Error',severity:'info',description:e.message}], status:'pending' }));
        }
        done += chunk.length;
        const pct = Math.round((done / toEval.length) * 100);
        $('lqi-progress-bar').style.width = pct + '%';
        $('lqi-progress-text').textContent = `Evaluating… ${done}/${toEval.length} (${pct}%)`;
        await new Promise(r => setTimeout(r, 100));
      }

      _running = false;
      if (btn) btn.textContent = '⚡ Run AI Evaluation';
      $('lqi-progress-text').textContent = `Complete — ${_results.length} results`;

      // Update scores
      const scores = _results.map(r => r.score).filter(s => s != null);
      const avg    = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
      ['initial','post_translator','final'].forEach(k => {
        const el = $('lqi-gauge-'+k);
        if (el) el.innerHTML = buildGauge(avg);
      });

      this.switchTab('report');
      AppState.notify(`Evaluation complete — ${_results.length} segments reviewed`, 'success');
    },

    switchTab(tab) {
      ['preview','report','pm'].forEach(t => {
        const btn = $('lqi-tabBtn-'+t);
        const panel = $('lqi-tab-'+t);
        if (btn) { btn.style.borderBottomColor = t===tab ? 'var(--accent)' : 'transparent'; btn.style.color = t===tab ? 'var(--accent)' : 'var(--text-muted)'; btn.style.fontWeight = t===tab ? '700' : '500'; }
        if (panel) panel.style.display = t===tab ? 'flex' : 'none';
      });
      if (tab === 'report') renderReport();
    },

    setMatchFilter(f) { _matchFilter = f; renderPreview(); },
    setStatusFilter(f) { _statusFilter = f; renderReport(); },
    setSearch(v) { _search = v; renderReport(); },
    setHideMode(m) { _hideMode = _hideMode === m ? null : m; renderReport(); },

    acceptResult(id) {
      const r = _results.find(x => x.id === id);
      if (r) { r.status = 'accepted'; renderReport(); }
    },
    rejectResult(id) {
      const r = _results.find(x => x.id === id);
      if (r) { r.status = 'rejected'; renderReport(); }
    },

    exportReport(fmt) {
      if (!_results.length) { AppState.notify('Run evaluation first', 'warning'); return; }
      if (fmt === 'csv') {
        const rows = [['Segment ID','Score','Severity','Error Type','Description','Suggestion']];
        _results.forEach(r => {
          if (r.errors?.length) {
            r.errors.forEach(e => rows.push([r.segmentId, r.score||'', e.severity, e.type, e.description, r.suggestion||'']));
          } else {
            rows.push([r.segmentId, r.score||'', '', '', '', r.suggestion||'']);
          }
        });
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})); a.download = 'LQI_Report.csv'; a.click();
      }
      AppState.notify('Report exported', 'success');
    },

    reset() {
      _files = []; _segments = []; _results = [];
      _matchFilter = 'all'; _statusFilter = 'all'; _search = ''; _hideMode = null;
      updateStats();
      const badge = $('lqi-file-badge'); if (badge) badge.textContent = '';
      const body = $('lqi-report-list'); if (body) body.innerHTML = '';
      $('lqi-empty-state').style.display = 'flex';
      $('lqi-preview-section').style.display = 'none';
      $('lqi-progress-wrap').style.display = 'none';
      ['initial','post_translator','final'].forEach(k => { const el = $('lqi-gauge-'+k); if(el) el.innerHTML = ''; });
    },
  };
})();
