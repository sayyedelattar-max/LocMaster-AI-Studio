// ── Bootstrap ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getCurrentTheme());
  if (window.TM && typeof TM.init === 'function') TM.init();
  setupRibbon();
  if (window.Auth) Auth.init();
  // Proofreader: word count
  const proofInp = document.getElementById('proof-input');
  const proofWc  = document.getElementById('proof-wc');
  if (proofInp && proofWc) {
    proofInp.addEventListener('input', () => {
      const words = proofInp.value.trim().split(/\s+/).filter(Boolean).length;
      proofWc.textContent = words + ' words';
    });
  }
  // TMMaint default mode init
  if (window.TMMaint && typeof TMMaint.setDefaultMode === 'function') TMMaint.setDefaultMode('suggest');
});

// ══════════════════════════════════════════════════════
// RIBBON TABS
// ══════════════════════════════════════════════════════
function switchRibbon(btn, tab) {
  document.querySelectorAll('.ribbon-tab').forEach(b => {
    b.style.borderBottomColor = 'transparent';
    b.style.color = 'var(--text-muted)';
    b.classList.remove('active');
  });
  document.querySelectorAll('.ribbon-panel').forEach(p => p.style.display = 'none');
  btn.style.borderBottomColor = 'var(--accent)';
  btn.style.color = 'var(--accent)';
  btn.classList.add('active');
  const panel = document.getElementById('rpanel-' + tab);
  if (panel) panel.style.display = 'flex';
}
// Ctrl+H → Find & Replace
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'h') { e.preventDefault(); showFindReplace(); }
  if (e.key === 'Escape') FR.close();
});
function showFindReplace() {
  const bar = document.getElementById('find-replace-bar');
  if (!bar) return;
  bar.style.display = bar.style.display === 'none' ? 'block' : 'none';
  if (bar.style.display !== 'none') {
    document.getElementById('fr-find').focus();
    FR.refresh();
  }
}

// ══════════════════════════════════════════════════════
// FIND & REPLACE ENGINE
// ══════════════════════════════════════════════════════
window.FR = {
  matches: [],
  current: -1,

  getQuery() {
    const raw = document.getElementById('fr-find').value;
    const isRegex = document.getElementById('fr-regex').checked;
    const isCaseSensitive = document.getElementById('fr-case').checked;
    const isWholeWord = document.getElementById('fr-whole').checked;
    if (!raw) return null;
    if (isRegex) {
      try { return new RegExp(raw, isCaseSensitive ? 'g' : 'gi'); } catch { return null; }
    }
    let pattern = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (isWholeWord) pattern = `\\b${pattern}\\b`;
    return new RegExp(pattern, isCaseSensitive ? 'g' : 'gi');
  },

  refresh() {
    this.matches = [];
    this.current = -1;
    const query = this.getQuery();
    if (!query || !AppState.segments.length) { this.updateUI(); return; }
    const searchSrc = document.getElementById('fr-src-too').checked;
    AppState.segments.forEach((seg, idx) => {
      const inTgt = query.test(seg.target || ''); query.lastIndex = 0;
      const inSrc = searchSrc && query.test(seg.source || ''); query.lastIndex = 0;
      if (inTgt || inSrc) this.matches.push(idx);
    });
    this.updateUI();
  },

  updateUI() {
    const count = document.getElementById('fr-count');
    const status = document.getElementById('fr-status');
    if (count) count.textContent = this.matches.length ? `${Math.max(0,this.current+1)}/${this.matches.length}` : '0/0';
    if (status && this.matches.length) {
      status.textContent = `Found in ${this.matches.length} segment(s)`;
    } else if (status) {
      status.textContent = document.getElementById('fr-find').value ? 'No matches' : '';
    }
  },

  next() {
    if (!this.matches.length) { this.refresh(); if (!this.matches.length) return; }
    this.current = (this.current + 1) % this.matches.length;
    this.scrollToMatch();
    this.updateUI();
  },

  prev() {
    if (!this.matches.length) return;
    this.current = (this.current - 1 + this.matches.length) % this.matches.length;
    this.scrollToMatch();
    this.updateUI();
  },

  scrollToMatch() {
    if (this.current < 0 || this.current >= this.matches.length) return;
    const idx = this.matches[this.current];
    const seg = AppState.segments[idx];
    if (!seg) return;
    const el = document.querySelector(`[data-seg-id="${seg.id}"]`);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.style.outline = '2px solid var(--accent)'; setTimeout(() => el.style.outline = '', 1500); }
  },

  replaceCurrent() {
    if (this.current < 0 || !this.matches.length) { this.next(); return; }
    const idx = this.matches[this.current];
    const seg = AppState.segments[idx];
    const query = this.getQuery();
    const rep = document.getElementById('fr-replace').value;
    if (!seg || !query) return;
    seg.target = (seg.target || '').replace(query, rep);
    seg.status = seg.status === 'reviewed' ? 'translated' : seg.status;
    if (window.UISegments) UISegments.render(AppState.segments, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
    AppState.notify(`Replaced 1 match in segment #${seg.id}`, 'success');
    this.refresh();
  },

  replaceAll() {
    const query = this.getQuery();
    const rep = document.getElementById('fr-replace').value;
    if (!query || !AppState.segments.length) return;
    let count = 0;
    AppState.segments.forEach(seg => {
      const old = seg.target || '';
      const newVal = old.replace(query, rep);
      if (newVal !== old) { seg.target = newVal; count++; }
    });
    if (count && window.UISegments) UISegments.render(AppState.segments, { srcLang: AppState.srcLang, tgtLang: AppState.tgtLang });
    AppState.notify(`Replaced ${count} segment(s)`, count ? 'success' : 'info');
    this.matches = []; this.current = -1; this.updateUI();
  },

  onFindInput() { this.refresh(); },
  onFindKey(e) { if (e.key === 'Enter') { e.shiftKey ? this.prev() : this.next(); } },
  onReplaceKey(e) { if (e.key === 'Enter') this.replaceCurrent(); },
  close() {
    const bar = document.getElementById('find-replace-bar');
    if (bar) bar.style.display = 'none';
    this.matches = []; this.current = -1;
  }
};

// ══════════════════════════════════════════════════════
// TARGET SEARCH
// ══════════════════════════════════════════════════════
window.filterSegmentsByTarget = function(query) {
  const q = (query || '').trim().toLowerCase();
  const srcQuery = (document.getElementById('seg-search')?.value || '').trim().toLowerCase();
  const els = document.querySelectorAll('#segments-container [data-seg-id]');
  let visible = 0, total = els.length;
  els.forEach(el => {
    const segId = el.dataset.segId;
    const seg = AppState.segments.find(s => String(s.id) === String(segId));
    if (!seg) return;
    const matchTgt = !q || (seg.target || '').toLowerCase().includes(q);
    const matchSrc = !srcQuery || (seg.source || '').toLowerCase().includes(srcQuery);
    el.style.display = (matchTgt && matchSrc) ? '' : 'none';
    if (matchTgt && matchSrc) visible++;
  });
  const info = document.getElementById('seg-count-info');
  if (info) info.textContent = `${visible} / ${total} segments`;
};

// ══════════════════════════════════════════════════════
// AI ALIGNER TOOL
// ══════════════════════════════════════════════════════
window.AlignTool = (function() {
  let pairs = [];
  let filter = 'all';
  let exportScope = 'approved';
  let exportFmt = 'tmx';

  function getKey() {
    const provider = document.getElementById('aln-provider')?.value || 'gemini';
    return getProviderKey(provider);
  }
  function getProviderEndpoint() {
    const provider = document.getElementById('aln-provider')?.value || 'gemini';
    const cfg = LMConfig.providers[provider];
    return cfg ? { endpoint: cfg.endpoint, type: cfg.type } : { endpoint: '', type: 'gemini' };
  }

  function escHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escXml(s)  { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function dlFile(name, content, mime) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = name; a.click();
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function updateStats() {
    let c = { t11:0, t12:0, t21:0, err:0, appr:0 };
    pairs.forEach(p => {
      if(p.type==='1-1') c.t11++; else if(p.type==='1-2') c.t12++; else if(p.type==='2-1') c.t21++; else c.err++;
      if(p.approved) c.appr++;
    });
    const s = id => document.getElementById(id);
    if(s('aln-s11')) s('aln-s11').textContent = c.t11;
    if(s('aln-s12')) s('aln-s12').textContent = c.t12;
    if(s('aln-s21')) s('aln-s21').textContent = c.t21;
    if(s('aln-serr')) s('aln-serr').textContent = c.err;
    if(s('aln-sappr')) s('aln-sappr').textContent = c.appr;
  }

  function render() {
    const list = document.getElementById('aln-list');
    const empty = document.getElementById('aln-empty');
    if (!list) return;
    empty.style.display = 'none';
    list.innerHTML = '';
    const visible = pairs.filter(p => {
      if (filter === 'all') return true;
      if (filter === 'approved') return p.approved;
      if (filter === 'flagged') return p.flagged;
      return p.type === filter;
    });
    visible.forEach(p => list.appendChild(buildRow(p)));
  }

  function buildRow(p) {
    const TYPE_CLS = {'1-1':'#68d391','1-2':'#f6ad55','2-1':'#63b3ed','err':'#fc8181'};
    const TYPE_LBL = {'1-1':'1:1','1-2':'1:2','2-1':'2:1','err':'ERR'};
    const conf = Math.round((p.confidence||0)*100);
    const confColor = conf>=85?'#68d391':conf>=65?'#f6ad55':'#fc8181';
    const div = document.createElement('div');
    div.style.cssText = `background:var(--surface);border:1px solid ${p.flagged?'#b794f4':TYPE_CLS[p.type]||'#fc8181'};border-left:3px solid ${p.flagged?'#b794f4':TYPE_CLS[p.type]||'#fc8181'};border-radius:var(--radius);overflow:hidden;margin-bottom:4px;`;
    div.id = `aln-seg-${p.id}`;
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:7px;padding:6px 12px;background:var(--surface2);border-bottom:1px solid var(--border);">
        <span style="font-family:var(--mono);font-size:.72rem;color:var(--text-muted);">#${p.id}</span>
        <span style="font-size:.68rem;font-family:var(--mono);padding:1px 7px;border-radius:10px;background:${TYPE_CLS[p.type]||'#fc8181'}22;color:${TYPE_CLS[p.type]||'#fc8181'};border:1px solid ${TYPE_CLS[p.type]||'#fc8181'}44;">${p.flagged?'🚩 FLAGGED':TYPE_LBL[p.type]||'ERR'}</span>
        <span style="font-family:var(--mono);font-size:.72rem;color:${confColor}">${conf}%</span>
        <span style="font-size:.72rem;color:var(--text-muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(p.reason||'')}</span>
        <div style="display:flex;gap:4px;">
          <button onclick="AlignTool.editPair(${p.id})" style="padding:2px 8px;font-size:.68rem;font-family:var(--mono);border-radius:3px;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--accent);">Edit</button>
          <button onclick="AlignTool.delPair(${p.id})" style="padding:2px 8px;font-size:.68rem;font-family:var(--mono);border-radius:3px;cursor:pointer;border:1px solid rgba(248,113,113,.3);background:transparent;color:#fc8181;">Del</button>
          <button onclick="AlignTool.toggleApprove(${p.id})" style="padding:2px 8px;font-size:.68rem;font-family:var(--mono);border-radius:3px;cursor:pointer;border:1px solid ${p.approved?'#68d391':'var(--border)'};background:${p.approved?'rgba(104,211,145,.12)':'transparent'};color:${p.approved?'#68d391':'var(--text-muted)'};">${p.approved?'✔ Approved':'Approve'}</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;">
        <div style="padding:9px 12px;">
          <div style="font-size:.68rem;font-family:var(--mono);color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Source</div>
          <div style="font-size:.83rem;line-height:1.7;color:var(--text);direction:ltr;text-align:left;">${escHtml(p.srcText)}</div>
        </div>
        <div style="padding:9px 12px;border-left:1px solid var(--border);">
          <div style="font-size:.68rem;font-family:var(--mono);color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Target</div>
          <div style="font-size:.88rem;line-height:1.7;color:var(--text);direction:rtl;text-align:right;">${escHtml(p.tgtText)}</div>
        </div>
      </div>`;
    return div;
  }

  async function callAI(prompt) {
    // Use the aln-provider selector if set, otherwise use AIClient defaults
    const provider = document.getElementById('aln-provider')?.value || 'gemini';
    const key = getProviderKey(provider);
    if (!key) throw new Error('No API key for ' + (LMConfig.providers[provider]?.name||provider) + '. Go to Settings → AI Providers.');
    const pc = LMConfig.providers[provider];
    const model = pc?.defaultModel || 'gemini-2.0-flash';
    // For Gemini: try model then fallback
    if (pc?.type === 'gemini') {
      const tries = [...new Set([model, 'gemini-2.0-flash', 'gemini-2.0-flash'])];
      let lastErr = '';
      for (const m of tries) {
        const r = await fetch(`${pc.endpoint}/${m}:generateContent?key=${key}`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.05,maxOutputTokens:8000},
            safetySettings:[{category:'HARM_CATEGORY_HARASSMENT',threshold:'BLOCK_NONE'},{category:'HARM_CATEGORY_HATE_SPEECH',threshold:'BLOCK_NONE'},{category:'HARM_CATEGORY_SEXUALLY_EXPLICIT',threshold:'BLOCK_NONE'},{category:'HARM_CATEGORY_DANGEROUS_CONTENT',threshold:'BLOCK_NONE'}]
          })
        });
        const data = await r.json();
        if (r.ok) return data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        lastErr = data.error?.message || 'API '+r.status;
        if (!lastErr.includes('not found') && !lastErr.includes('not supported')) break;
      }
      throw new Error(lastErr);
    }
    // Claude / OpenAI / DeepSeek
    const msgs=[{role:'user',content:prompt}];
    const headers={'Content-Type':'application/json'};
    if(pc?.type==='claude'){headers['x-api-key']=key;headers['anthropic-version']='2023-06-01';}
    else{headers['Authorization']='Bearer '+key;}
    const r2 = await fetch(pc.endpoint,{method:'POST',headers,body:JSON.stringify({model,messages:msgs,max_tokens:8000,temperature:0.05})});
    const d2 = await r2.json();
    if(!r2.ok) throw new Error(d2.error?.message||'API '+r2.status);
    return pc?.type==='claude'?d2.content?.[0]?.text||'[]':d2.choices?.[0]?.message?.content||'[]';
  }

  return {
    onProviderChange() { /* no-op */ },

    async run() {
      const srcTxt = document.getElementById('aln-src-txt')?.value.trim();
      const tgtTxt = document.getElementById('aln-tgt-txt')?.value.trim();
      if (!srcTxt || !tgtTxt) { AppState.notify('Paste source and target text first', 'error'); return; }
      const srcSegs = srcTxt.split('\n').map(s=>s.trim()).filter(Boolean);
      const tgtSegs = tgtTxt.split('\n').map(s=>s.trim()).filter(Boolean);
      if (!srcSegs.length || !tgtSegs.length) { AppState.notify('No segments found', 'error'); return; }

      AppState.setLoading(true, `Aligning ${srcSegs.length} source × ${tgtSegs.length} target…`);
      pairs = [];
      const CHUNK = 30;
      const srcChunks = []; for(let i=0;i<srcSegs.length;i+=CHUNK) srcChunks.push(srcSegs.slice(i,i+CHUNK));
      const tgtChunks = []; for(let i=0;i<tgtSegs.length;i+=CHUNK) tgtChunks.push(tgtSegs.slice(i,i+CHUNK));
      const total = Math.max(srcChunks.length, tgtChunks.length);
      const d12 = document.getElementById('aln-d12').checked;
      const d21 = document.getElementById('aln-d21').checked;
      const aiFlag = document.getElementById('aln-flag').checked;
      const dialect = document.getElementById('aln-dialect').value;

      try {
        for (let i = 0; i < total; i++) {
          const src = srcChunks[i] || [];
          const tgt = tgtChunks[i] || [];
          const offset = i * CHUNK;
          const srcList = src.map((s,j)=>`SRC-${offset+j+1}: ${s}`).join('\n');
          const tgtList = tgt.map((s,j)=>`TGT-${offset+j+1}: ${s}`).join('\n');
          const prompt = `You are a professional translation alignment engine for Arabic localization QA.
TARGET DIALECT: ${dialect}
SOURCE SEGMENTS:\n${srcList}\nTARGET SEGMENTS:\n${tgtList}
TASK: Match source and target segments. Detect:
- "1-1": one source → one target
- "1-2": one source → two targets (Arabic split) ${d12?'':'— SKIP'}
- "2-1": two sources → one target (Arabic merge) ${d21?'':'— SKIP'}
- "err": cannot align
${aiFlag?'Flag low-confidence (<0.72) pairs with flagged:true and flagReason':'Set flagged:false for all'}
Return ONLY valid JSON array, no markdown:
[{"id":1,"type":"1-1","srcText":"...","tgtText":"...","confidence":0.94,"reason":"...","flagged":false,"flagReason":"","approved":false}]`;
          let raw = await callAI(prompt);
          raw = raw.replace(/```json|```/g,'').trim();
          try {
            const arr = JSON.parse(raw);
            pairs.push(...arr.map((p,j)=>({...p, id:offset+j+1, modified:false})));
          } catch {
            src.forEach((s,j) => pairs.push({id:offset+j+1,type:'err',srcText:s,tgtText:tgt[j]||'',confidence:0,reason:'Parse failed',flagged:true,flagReason:'Manual review needed',approved:false,modified:false}));
          }
          await sleep(150);
        }
        AppState.setLoading(false);
        render(); updateStats();
        document.getElementById('aln-filterbar').style.display = 'flex';
        const expBtn = document.getElementById('aln-export-btn');
        if (expBtn) expBtn.disabled = false;
        AppState.notify(`Alignment complete — ${pairs.length} units`, 'success');
      } catch(e) {
        AppState.setLoading(false);
        AppState.notify('Alignment error: ' + e.message, 'error');
      }
    },

    approveAll() {
      pairs.forEach(p => { if(p.type==='1-1'&&!p.flagged) p.approved=true; });
      render(); updateStats();
      AppState.notify('All 1:1 pairs approved', 'success');
    },

    toggleApprove(id) {
      const p = pairs.find(x=>x.id===id);
      if(p) { p.approved=!p.approved; updateStats(); const el=document.getElementById(`aln-seg-${id}`); if(el){const nb=buildRow(p);el.replaceWith(nb);} }
    },

    editPair(id) {
      const p = pairs.find(x=>x.id===id);
      if (!p) return;
      const newTgt = prompt('Edit target:', p.tgtText);
      if (newTgt !== null) { p.tgtText = newTgt; p.modified = true; p.approved = false; render(); updateStats(); }
    },

    delPair(id) {
      pairs = pairs.filter(x=>x.id!==id);
      const el = document.getElementById(`aln-seg-${id}`);
      if (el) el.remove();
      updateStats();
    },

    setFilter(btn, f) {
      filter = f;
      document.querySelectorAll('#aln-filterbar .filter-chip').forEach(b => b.style.background='');
      btn.style.background = 'var(--accent)';
      btn.style.color = '#fff';
      render();
    },

    openExport() {
      document.getElementById('aln-export-modal').style.display = 'flex';
    },

    setScope(btn, scope) {
      exportScope = scope;
      document.querySelectorAll('.aln-scope').forEach(b => { b.style.background=''; b.classList.remove('on'); });
      btn.classList.add('on');
    },

    setFmt(card, fmt) {
      exportFmt = fmt;
      document.querySelectorAll('.aln-fmt').forEach(c => { c.style.borderColor='var(--border)'; });
      card.style.borderColor = 'var(--accent)';
    },

    runExport() {
      const toExp = exportScope==='approved' ? pairs.filter(p=>p.approved&&p.type!=='err') :
                    exportScope==='no-err'   ? pairs.filter(p=>p.type!=='err') : [...pairs];
      if (!toExp.length) { AppState.notify('No segments match scope', 'error'); return; }
      const srcL = 'en', tgtL = document.getElementById('aln-dialect').value;
      const now = new Date().toISOString().replace(/[-:.]/g,'').substring(0,15)+'Z';
      const clean = p => (p.tgtText||'').replace(/ ⟨\|⟩ /g,' ');

      if (exportFmt === 'tmx') {
        let out = `<?xml version="1.0" encoding="UTF-8"?>\n<tmx version="1.4">\n  <header creationtool="LocMaster AI Aligner" srclang="${srcL}" creationdate="${now}"/>\n  <body>\n`;
        toExp.forEach(p => { out += `    <tu tuid="${p.id}"><tuv xml:lang="${srcL}"><seg>${escXml(p.srcText)}</seg></tuv><tuv xml:lang="${tgtL}"><seg>${escXml(clean(p))}</seg></tuv></tu>\n`; });
        out += `  
<!-- ══════════════════════════════════════════════════
     AI TRANSLATOR MODAL — DNA-Powered
══════════════════════════════════════════════════ -->
<div id="ai-translator-modal" style="display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);">
  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(900px,96vw);max-height:88vh;background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,.4);">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:var(--surface2);border-bottom:1px solid var(--border);flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:1.2rem;">🧬</span>
        <div>
          <div style="font-size:.9rem;font-weight:800;color:var(--text);">AI Translator <span style="font-size:.7rem;padding:2px 7px;border-radius:8px;background:#10b98120;color:#10b981;border:1px solid #10b98140;margin-left:4px;font-weight:700;">DNA</span></div>
          <div style="font-size:.68rem;color:var(--text-muted);">Builds File DNA · 5 Translation Variants · Professional Quality</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <button onclick="AITranslator.openSettings()" title="Translator Settings" style="width:30px;height:30px;border-radius:7px;border:1px solid var(--border);background:var(--surface);color:var(--text-dim);cursor:pointer;font-size:.85rem;display:flex;align-items:center;justify-content:center;">⚙</button>
        <button onclick="AITranslator.close()" style="width:30px;height:30px;border-radius:7px;border:1px solid var(--border);background:var(--surface);color:var(--text-dim);cursor:pointer;font-size:1rem;">×</button>
      </div>
    </div>

    <!-- DNA Status Bar -->
    <div id="ait-dna-bar" style="padding:8px 20px;background:rgba(16,185,129,.06);border-bottom:1px solid rgba(16,185,129,.15);display:flex;align-items:center;gap:10px;flex-shrink:0;flex-wrap:wrap;">
      <span style="font-size:.65rem;font-weight:800;color:#10b981;font-family:var(--mono);text-transform:uppercase;letter-spacing:.06em;">🧬 File DNA</span>
      <span id="ait-dna-domain" style="font-size:.68rem;padding:1px 8px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);color:var(--text-dim);">Domain: —</span>
      <span id="ait-dna-register" style="font-size:.68rem;padding:1px 8px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);color:var(--text-dim);">Register: —</span>
      <span id="ait-dna-terms" style="font-size:.68rem;padding:1px 8px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);color:var(--text-dim);">Terms: 0</span>
      <span id="ait-dna-status" style="font-size:.68rem;color:var(--text-muted);margin-left:auto;font-style:italic;">No DNA built yet</span>
      <button id="ait-dna-btn" onclick="AITranslator.buildDNA()" style="font-size:.68rem;padding:3px 10px;border-radius:6px;border:1px solid #10b981;background:#10b98118;color:#10b981;cursor:pointer;font-weight:700;">⚡ Build DNA</button>
    </div>

    <!-- Body: Source + Results -->
    <div style="display:flex;flex:1;overflow:hidden;">

      <!-- Left: Input -->
      <div style="width:320px;flex-shrink:0;display:flex;flex-direction:column;border-right:1px solid var(--border);overflow:hidden;">
        <div style="padding:10px 14px;border-bottom:1px solid var(--border);background:var(--surface2);font-size:.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">Source Text</div>
        <div style="flex:1;overflow-y:auto;padding:14px;">
          <textarea id="ait-source" rows="8"
            style="width:100%;border:1px solid var(--border);outline:none;background:var(--bg);border-radius:8px;color:var(--text);font-size:.88rem;padding:10px 12px;resize:vertical;line-height:1.7;box-sizing:border-box;"
            onfocus="this.style.borderColor='#10b981'" onblur="this.style.borderColor='var(--border)'"
            placeholder="Paste English source text here…

Tip: Use 'Build DNA' first on your full file for better results."></textarea>
          <button onclick="AITranslator.fillFromEditor()" style="margin-top:6px;width:100%;padding:5px;font-size:.72rem;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text-dim);cursor:pointer;">← From Editor Selection</button>
        </div>
        <!-- Settings Panel (hidden by default) -->
        <div id="ait-settings-panel" style="display:none;padding:12px 14px;border-top:1px solid var(--border);background:var(--surface2);flex-shrink:0;">
          <div style="font-size:.68rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;">⚙ Translator Settings</div>
          <div style="display:flex;flex-direction:column;gap:7px;">
            <div>
              <div style="font-size:.68rem;color:var(--text-muted);margin-bottom:3px;">Source Language</div>
              <select id="ait-src-lang" style="width:100%;font-size:.74rem;padding:5px 8px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);outline:none;">
                <option value="en">English</option><option value="fr">French</option><option value="de">German</option><option value="es">Spanish</option>
              </select>
            </div>
            <div>
              <div style="font-size:.68rem;color:var(--text-muted);margin-bottom:3px;">Target Language</div>
              <select id="ait-tgt-lang" style="width:100%;font-size:.74rem;padding:5px 8px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);outline:none;">
                <option value="ar">Arabic (Generic)</option><option value="ar-SA">Arabic (Saudi Arabia)</option><option value="ar-EG">Arabic (Egypt)</option><option value="ar-AE">Arabic (UAE)</option>
              </select>
            </div>
            <div>
              <div style="font-size:.68rem;color:var(--text-muted);margin-bottom:3px;">Register Override</div>
              <select id="ait-register" style="width:100%;font-size:.74rem;padding:5px 8px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);outline:none;">
                <option value="auto">Auto (from DNA)</option><option value="formal">Formal / MSA</option><option value="semi-formal">Semi-Formal</option><option value="technical">Technical</option>
              </select>
            </div>
            <div>
              <div style="font-size:.68rem;color:var(--text-muted);margin-bottom:3px;">Custom Instructions</div>
              <textarea id="ait-custom-inst" rows="2" style="width:100%;font-size:.72rem;padding:5px 7px;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);outline:none;resize:none;" placeholder="e.g. Use formal Saudi Arabic. Preserve brand names…"></textarea>
            </div>
          </div>
        </div>
        <!-- Run button -->
        <div style="padding:10px 14px;border-top:1px solid var(--border);flex-shrink:0;">
          <button onclick="AITranslator.translate()" id="ait-run-btn" style="width:100%;padding:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-size:.85rem;">🧬 Translate with DNA</button>
        </div>
      </div>

      <!-- Right: 5 variants -->
      <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
        <div style="padding:10px 16px;border-bottom:1px solid var(--border);background:var(--surface2);font-size:.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">Translation Variants</div>
        <div id="ait-results" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;">
          <!-- Empty state -->
          <div id="ait-empty" style="text-align:center;padding:40px 20px;color:var(--text-muted);">
            <div style="font-size:2rem;margin-bottom:10px;opacity:.3;">🧬</div>
            <div style="font-size:.85rem;font-weight:700;color:var(--text);margin-bottom:6px;">DNA-Powered Translation</div>
            <div style="font-size:.76rem;max-width:260px;margin:0 auto;line-height:1.6;">Build DNA from your file, then paste source text and click Translate to get 5 professional variants.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ══ TOOL SETTINGS MODAL ══ -->
<div id="tool-settings-modal" style="display:none;position:fixed;inset:0;z-index:9100;background:rgba(0,0,0,.5);">
  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(520px,94vw);max-height:80vh;background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:var(--surface2);border-bottom:1px solid var(--border);">
      <div style="font-size:.88rem;font-weight:800;color:var(--text);">⚙ <span id="tool-settings-title">Tool Settings</span></div>
      <button onclick="document.getElementById('tool-settings-modal').style.display='none'" style="width:28px;height:28px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;">×</button>
    </div>
    <div id="tool-settings-body" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;"></div>
    <div style="padding:10px 16px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;">
      <button onclick="document.getElementById('tool-settings-modal').style.display='none'" style="padding:6px 16px;border:1px solid var(--border);background:transparent;border-radius:6px;color:var(--text-dim);cursor:pointer;font-size:.78rem;">Cancel</button>
      <button onclick="ToolSettings.save()" style="padding:6px 16px;background:var(--accent);border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:.78rem;font-weight:700;">Save</button>
    </div>
  </div>
</div>

</body>\n</tmx>`;
        dlFile('LocMaster_Aligned.tmx', out, 'application/xml');
      } else if (exportFmt === 'sdlxliff') {
        let out = `<?xml version="1.0" encoding="utf-8"?>\n<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2" xmlns:sdl="http://sdl.com/FileTypes/SdlXliff/1.0">\n  <file source-language="${srcL}" target-language="${tgtL}">\n    <body>\n`;
        toExp.forEach(p => { out += `      <trans-unit id="${p.id}"><source>${escXml(p.srcText)}</source><target state="${p.approved?'ApprovedTranslation':'Translated'}">${escXml(clean(p))}</target></trans-unit>\n`; });
        out += `    </body>\n  </file>\n</xliff>`;
        dlFile('LocMaster_Aligned.sdlxliff', out, 'application/xml');
      } else if (exportFmt === 'xliff12') {
        let out = `<?xml version="1.0" encoding="UTF-8"?>\n<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\n  <file source-language="${srcL}" target-language="${tgtL}">\n    <body>\n`;
        toExp.forEach(p => { out += `      <trans-unit id="${p.id}"><source>${escXml(p.srcText)}</source><target state="translated">${escXml(clean(p))}</target></trans-unit>\n`; });
        out += `    </body>\n  </file>\n</xliff>`;
        dlFile('LocMaster_Aligned.xlf', out, 'application/xml');
      } else if (exportFmt === 'mqxliff') {
        let out = `<?xml version="1.0" encoding="utf-8"?>\n<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2" xmlns:mq="MQXliff">\n  <file source-language="${srcL}" target-language="${tgtL}">\n    <body>\n`;
        toExp.forEach(p => { out += `      <trans-unit id="${p.id}"><source>${escXml(p.srcText)}</source><target mq:status="${p.approved?'Confirmed':'Translated'}">${escXml(clean(p))}</target></trans-unit>\n`; });
        out += `    </body>\n  </file>\n</xliff>`;
        dlFile('LocMaster_Aligned.mqxliff', out, 'application/xml');
      } else if (exportFmt === 'csv') {
        const rows = [['#','Type','Confidence','Source','Target','Approved']];
        toExp.forEach(p => rows.push([p.id,p.type,Math.round((p.confidence||0)*100)+'%',p.srcText,clean(p),p.approved?'Yes':'No']));
        const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
        dlFile('LocMaster_Aligned.csv','\uFEFF'+csv,'text/csv;charset=utf-8');
      } else if (exportFmt === 'tab') {
        const lines = toExp.map(p=>`${p.srcText}\t${clean(p)}`);
        dlFile('LocMaster_Aligned_TM.txt','\uFEFF'+lines.join('\n'),'text/plain;charset=utf-8');
      }
      document.getElementById('aln-export-modal').style.display = 'none';
      AppState.notify(`Exported ${toExp.length} units as ${exportFmt.toUpperCase()} ✓`, 'success');
    },

    clear() {
      pairs = []; filter = 'all';
      document.getElementById('aln-src-txt').value = '';
      document.getElementById('aln-tgt-txt').value = '';
      document.getElementById('aln-list').innerHTML = '';
      document.getElementById('aln-empty').style.display = 'flex';
      document.getElementById('aln-filterbar').style.display = 'none';
      const expBtn = document.getElementById('aln-export-btn');
      if (expBtn) expBtn.disabled = true;
      updateStats();
    }
  };
})();

// ══════════════════════════════════════════════════════
// TM MAINTENANCE TOOL
// ══════════════════════════════════════════════════════
window.TMMaint = (function() {
  let tmSegments = [];
  let issues = [];
  let currentFilter = 'all';
  let currentMode = 'suggest';
  let expScope = 'all';
  let expFmt = 'tmx';
  let repPreview = [];

  function escHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escXml(s)  { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function dlFile(name,content,mime){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:mime}));a.download=name;a.click();}
  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

  function getKey() {
    const provider = document.getElementById('tm-provider')?.value || 'gemini';
    return getProviderKey(provider);
  }

  function updateStats() {
    const total=issues.length, appr=issues.filter(i=>i.status==='approved').length;
    const pend=issues.filter(i=>i.status==='pending').length, rej=issues.filter(i=>i.status==='rejected').length;
    const s=id=>document.getElementById(id);
    if(s('tm-s-total')) s('tm-s-total').textContent=total;
    if(s('tm-s-appr'))  s('tm-s-appr').textContent=appr;
    if(s('tm-s-pend'))  s('tm-s-pend').textContent=pend;
    if(s('tm-s-rej'))   s('tm-s-rej').textContent=rej;
    if(s('tm-badge-audit')) s('tm-badge-audit').textContent=total;
  }

  function getFiltered() {
    return issues.filter(iss => {
      if(currentFilter==='all') return true;
      if(['term','dup','fmt','susp','style','dialect'].includes(currentFilter)) return iss.type===currentFilter;
      if(['critical','high','medium','low'].includes(currentFilter)) return iss.severity===currentFilter;
      if(currentFilter==='pending') return iss.status==='pending';
      if(currentFilter==='approved') return iss.status==='approved';
      if(currentFilter==='rejected') return iss.status==='rejected';
      return true;
    });
  }

  function buildIssueCard(iss) {
    const sevColor = {critical:'#f87171',high:'#fb923c',medium:'#fbbf24',low:'#60a5fa',info:'var(--text-muted)'}[iss.severity]||'var(--text-muted)';
    const typeIcon = {term:'🔤',dup:'♊',fmt:'🔢',susp:'⚠️',style:'✍️',dialect:'🗣️'};
    const isAppr = iss.status==='approved', isRej = iss.status==='rejected';
    const ev = (iss.evidence||[]).slice(0,2).map(e=>`
      <div style="display:grid;grid-template-columns:30px 1fr 1fr;gap:6px;padding:5px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:3px;margin-bottom:3px;">
        <span style="font-size:.68rem;font-family:var(--mono);color:var(--text-muted);">#${e.tuId}</span>
        <div style="font-size:.78rem;direction:ltr;text-align:left;color:var(--text-dim);">${escHtml((e.src||'').substring(0,80))}</div>
        <div style="font-size:.83rem;direction:rtl;text-align:right;color:${isAppr?'#68d391':'#f87171'};">${escHtml((e.tgt||'').substring(0,80))}</div>
      </div>`).join('');
    let suggPanel = '';
    if (currentMode !== 'flag') {
      const fix = iss.userFix || iss.aiSuggestedFix || '';
      suggPanel = `<div style="background:rgba(var(--accent-rgb),.06);border:1px solid rgba(var(--accent-rgb),.15);border-radius:3px;padding:8px 10px;margin-top:6px;">
        <div style="font-size:.68rem;font-family:var(--mono);color:var(--accent);text-transform:uppercase;margin-bottom:6px;">⚡ AI Fix Suggestion</div>
        <div style="font-size:.78rem;color:var(--text-dim);margin-bottom:6px;">${escHtml(iss.explanation||'')}</div>
        ${!isAppr&&!isRej?`<div style="font-size:.83rem;direction:rtl;text-align:right;color:#68d391;padding:5px;background:var(--surface2);border-radius:3px;margin-bottom:5px;">${escHtml(fix)}</div>
        <textarea id="tmfix-${iss.id}" style="width:100%;background:var(--bg);border:1px solid var(--accent);border-radius:3px;color:var(--text);font-size:.83rem;padding:5px 8px;direction:rtl;resize:none;min-height:36px;outline:none;">${escHtml(fix)}</textarea>
        <div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end;">
          <button onclick="TMMaint.saveFix(${iss.id})" style="padding:3px 10px;font-size:.72rem;background:#68d391;color:#000;border:none;border-radius:3px;cursor:pointer;">Use Fix</button>
        </div>`:
        `<div style="font-size:.83rem;direction:rtl;text-align:right;color:${isAppr?'#68d391':'var(--text-muted)'};padding:4px;background:var(--surface2);border-radius:3px;">${isAppr?escHtml(iss.userFix||iss.aiSuggestedFix||''):'Rejected'}</div>`}
      </div>`;
    }
    const div = document.createElement('div');
    div.style.cssText = `background:var(--surface);border:1px solid var(--border);border-left:3px solid ${sevColor};border-radius:var(--radius);overflow:hidden;${isAppr?'opacity:.6':''}`;
    div.id = `tm-iss-${iss.id}`;
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;padding:7px 12px;background:var(--surface2);border-bottom:1px solid var(--border);">
        <span style="font-size:.68rem;font-family:var(--mono);color:var(--text-muted);">#${iss.id}</span>
        <span style="font-size:.68rem;font-family:var(--mono);padding:1px 6px;border-radius:3px;background:${sevColor}22;color:${sevColor};border:1px solid ${sevColor}44;">${(iss.severity||'').toUpperCase()}</span>
        <span style="font-size:.72rem;background:var(--surface);border:1px solid var(--border);border-radius:3px;padding:1px 6px;">${typeIcon[iss.type]||''} ${(iss.type||'').toUpperCase()}</span>
        <span style="font-size:.8rem;font-weight:600;flex:1;">${escHtml(iss.title)}</span>
        <span style="font-size:.68rem;font-family:var(--mono);color:var(--text-muted);">${(iss.affectedIds||[]).length} TU(s)</span>
        <div style="display:flex;gap:3px;">
          ${currentMode==='auto'?`<button onclick="TMMaint.autoFix(${iss.id})" style="padding:2px 7px;font-size:.68rem;font-family:var(--mono);border-radius:3px;cursor:pointer;border:1px solid rgba(96,165,250,.3);background:transparent;color:#60a5fa;">⚡ Auto-Fix</button>`:''}
          ${isAppr?`<button style="padding:2px 7px;font-size:.68rem;font-family:var(--mono);border-radius:3px;border:1px solid #68d391;background:rgba(104,211,153,.12);color:#68d391;">✔ Approved</button>`:
            isRej?`<button onclick="TMMaint.undoStatus(${iss.id})" style="padding:2px 7px;font-size:.68rem;font-family:var(--mono);border-radius:3px;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text-muted);">↩ Undo</button>`:
            `<button onclick="TMMaint.approveIssue(${iss.id})" style="padding:2px 7px;font-size:.68rem;font-family:var(--mono);border-radius:3px;cursor:pointer;border:1px solid rgba(104,211,153,.3);background:transparent;color:#68d391;">✔ Approve</button>
             <button onclick="TMMaint.rejectIssue(${iss.id})" style="padding:2px 7px;font-size:.68rem;font-family:var(--mono);border-radius:3px;cursor:pointer;border:1px solid rgba(248,113,113,.3);background:transparent;color:#f87171;">✕ Reject</button>`}
        </div>
      </div>
      <div style="padding:8px 12px;">${ev}${suggPanel}</div>`;
    return div;
  }

  function renderIssues() {
    const list = document.getElementById('tm-issue-list');
    if (!list) return;
    list.innerHTML = '';
    getFiltered().forEach(iss => list.appendChild(buildIssueCard(iss)));
  }

  async function callAI(prompt) {
    const provider = document.getElementById('tm-provider')?.value || 'gemini';
    const key = getProviderKey(provider);
    if (!key) throw new Error('No API key for ' + (LMConfig.providers[provider]?.name||provider) + '. Go to Settings → AI Providers.');
    const pc = LMConfig.providers[provider];
    const model = pc?.defaultModel || 'gemini-2.0-flash';
    if (pc?.type === 'gemini') {
      const tries = [...new Set([model, 'gemini-2.0-flash', 'gemini-2.0-flash'])];
      let lastErr = '';
      for (const m of tries) {
        const r = await fetch(`${pc.endpoint}/${m}:generateContent?key=${key}`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.1,maxOutputTokens:8000},
            safetySettings:[{category:'HARM_CATEGORY_HARASSMENT',threshold:'BLOCK_NONE'},{category:'HARM_CATEGORY_HATE_SPEECH',threshold:'BLOCK_NONE'},{category:'HARM_CATEGORY_SEXUALLY_EXPLICIT',threshold:'BLOCK_NONE'},{category:'HARM_CATEGORY_DANGEROUS_CONTENT',threshold:'BLOCK_NONE'}]
          })
        });
        const data = await r.json();
        if (r.ok) return data.candidates?.[0]?.content?.parts?.[0]?.text||'[]';
        lastErr = data.error?.message||'API '+r.status;
        if (!lastErr.includes('not found') && !lastErr.includes('not supported')) break;
      }
      throw new Error(lastErr);
    }
    const msgs=[{role:'user',content:prompt}];
    const headers={'Content-Type':'application/json'};
    if(pc?.type==='claude'){headers['x-api-key']=key;headers['anthropic-version']='2023-06-01';}
    else{headers['Authorization']='Bearer '+key;}
    const r2 = await fetch(pc.endpoint,{method:'POST',headers,body:JSON.stringify({model,messages:msgs,max_tokens:8000,temperature:0.1})});
    const d2 = await r2.json();
    if(!r2.ok) throw new Error(d2.error?.message||'API '+r2.status);
    return pc?.type==='claude'?d2.content?.[0]?.text||'[]':d2.choices?.[0]?.message?.content||'[]';
  }

  return {
    switchTab(btn, panelId) {
      document.querySelectorAll('.tm-tab').forEach(t => { t.classList.remove('on'); t.style.borderBottomColor='transparent'; t.style.color='var(--text-muted)'; });
      document.querySelectorAll('.tm-panel').forEach(p => p.style.display='none');
      btn.classList.add('on'); btn.style.borderBottomColor='var(--accent)'; btn.style.color='var(--accent)';
      const panel = document.getElementById(panelId);
      if (panel) panel.style.display = 'flex';
    },

    setMode(btn, mode) {
      currentMode = mode;
      document.querySelectorAll('.tm-mode').forEach(b => { b.style.background='transparent'; b.style.color='var(--text-muted)'; b.classList.remove('on'); });
      btn.style.background = 'var(--accent)'; btn.style.color = '#fff'; btn.classList.add('on');
      renderIssues();
    },

    setFilter(btn, f) {
      currentFilter = f;
      document.querySelectorAll('#tm-filterbar .filter-chip').forEach(b => b.style.background='');
      btn.style.background = 'var(--accent)'; btn.style.color = '#fff';
      renderIssues();
    },

    onDrop(e) {
      e.preventDefault();
      const f = e.dataTransfer.files[0]; if(!f) return;
      const inp = document.getElementById('tm-file-input');
      const dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files;
      this.handleFile(inp);
    },

    handleFile(inp) {
      const file = inp.files[0]; if(!file) return;
      document.getElementById('tm-file-info').innerHTML = `<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:3px;font-size:.78rem;margin-top:4px;"><span>🗄️</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--mono);">${file.name}</span><span style="cursor:pointer;color:var(--error);" onclick="TMMaint.clearTM()">✕</span></div>`;
      const ext = file.name.split('.').pop().toLowerCase();
      const reader = new FileReader();
      reader.onload = e => {
        try {
          if(ext==='tmx') this.parseTMX(e.target.result);
          else if(['xlf','sdlxliff','mqxliff','xml'].includes(ext)) this.parseXLIFF(e.target.result);
          else if(ext==='csv') this.parseCSV(e.target.result);
          else { AppState.notify('Unsupported format: '+ext,'error'); return; }
          AppState.notify(`Loaded ${tmSegments.length} segments ✓`,'success');
        } catch(err) { AppState.notify('Parse error: '+err.message,'error'); }
      };
      reader.readAsText(file,'utf-8');
    },

    parseTMX(xml) {
      const doc = new DOMParser().parseFromString(xml,'text/xml');
      const srcLang = doc.querySelector('header')?.getAttribute('srclang')||'en';
      tmSegments = [];
      doc.querySelectorAll('tu').forEach((tu,i) => {
        let src='',tgt='',srcL='',tgtL='';
        tu.querySelectorAll('tuv').forEach(tuv => {
          const lang=(tuv.getAttribute('xml:lang')||tuv.getAttribute('lang')||'').toLowerCase();
          const seg=tuv.querySelector('seg')?.textContent?.trim()||'';
          if(lang.startsWith('ar')){tgt=seg;tgtL=lang;}else{src=seg;srcL=lang;}
        });
        if(src||tgt) tmSegments.push({id:i+1,src,tgt,srcLang:srcL,tgtLang:tgtL,modified:false,originalTgt:tgt});
      });
      this.updateTMStats(srcLang);
    },

    parseXLIFF(xml) {
      const doc = new DOMParser().parseFromString(xml,'text/xml');
      const srcL=doc.querySelector('file')?.getAttribute('source-language')||'en';
      const tgtL=doc.querySelector('file')?.getAttribute('target-language')||'ar';
      tmSegments=[];
      doc.querySelectorAll('trans-unit, unit').forEach((u,i) => {
        const src=u.querySelector('source')?.textContent?.trim()||'';
        const tgt=u.querySelector('target')?.textContent?.trim()||'';
        if(src||tgt) tmSegments.push({id:i+1,src,tgt,srcLang:srcL,tgtLang:tgtL,modified:false,originalTgt:tgt});
      });
      this.updateTMStats(srcL);
    },

    parseCSV(text) {
      const lines = text.split('\n').slice(1);
      tmSegments=[];
      lines.forEach((line,i) => {
        const cols=line.split(',').map(c=>c.replace(/^"|"$/g,'').trim());
        if(cols.length>=2&&(cols[0]||cols[1])) tmSegments.push({id:i+1,src:cols[0]||'',tgt:cols[1]||'',srcLang:'en',tgtLang:'ar',modified:false,originalTgt:cols[1]||''});
      });
      this.updateTMStats('en');
    },

    updateTMStats(srcLang) {
      const stats=document.getElementById('tm-stats');
      if(stats) stats.style.display='flex';
      const sc=document.getElementById('tm-seg-count'); if(sc) sc.textContent=tmSegments.length+' segments';
      const lp=document.getElementById('tm-lang-pair'); if(lp) lp.textContent=(srcLang||'en')+' → ar';
    },

    clearTM() {
      tmSegments=[]; issues=[];
      document.getElementById('tm-file-input').value='';
      document.getElementById('tm-file-info').innerHTML='';
      const stats=document.getElementById('tm-stats'); if(stats) stats.style.display='none';
      document.getElementById('tm-issue-list').innerHTML='';
      document.getElementById('tm-empty').style.display='flex';
      const fb=document.getElementById('tm-filterbar'); if(fb) fb.style.display='none';
      updateStats();
    },

    async runAudit() {
      if(!getKey()) { AppState.notify('No API key configured. Go to Settings.','error'); return; }
      if(!tmSegments.length) { AppState.notify('Load a TM file first','error'); return; }
      issues=[];
      AppState.setLoading(true,`Scanning ${tmSegments.length} TM segments…`);
      const dialect=document.getElementById('tm-dialect').value;
      const glossaryRaw=document.getElementById('tm-glossary').value.trim();
      const glossary={}; glossaryRaw.split('\n').forEach(l=>{const[e,a]=l.split('→').map(s=>s?.trim());if(e&&a)glossary[e.toLowerCase()]=a;});
      const checks={term:document.getElementById('tm-chk-term').checked,dup:document.getElementById('tm-chk-dup').checked,fmt:document.getElementById('tm-chk-fmt').checked,susp:document.getElementById('tm-chk-susp').checked,style:document.getElementById('tm-chk-style').checked,dialect:document.getElementById('tm-chk-dialect').checked};
      const CHUNK=25;
      const chunks=[];
      for(let i=0;i<tmSegments.length;i+=CHUNK) chunks.push(tmSegments.slice(i,i+CHUNK));
      try {
        for(let ci=0;ci<chunks.length;ci++) {
          const segs=chunks[ci];
          const offset=ci*CHUNK;
          const segList=segs.map((s,i)=>`[${offset+i+1}] SRC: ${s.src}\n[${offset+i+1}] TGT: ${s.tgt}`).join('\n\n');
          const glStr=Object.entries(glossary).map(([e,a])=>`${e} → ${a}`).join(', ');
                const specialInstructions = document.getElementById('tm-special-instructions')?.value?.trim() || '';
          const chkLines=[];
          if(checks.term) chkLines.push('- TERMINOLOGY: Inconsistent translation of same source term');
          if(checks.fmt)  chkLines.push('- FORMAT: Mismatched numbers, dates, symbols');
          if(checks.susp) chkLines.push('- SUSPICIOUS: Untranslated, empty, or wrong-language target');
          if(checks.style) chkLines.push('- STYLE: Register inconsistency, unnatural Arabic');
          if(checks.dialect) chkLines.push(`- DIALECT: Target should be ${dialect} — flag other dialects`);
          const prompt=`You are an expert Arabic TM auditor. Analyze these TM segments.
DIALECT: ${dialect}${glStr?'\nGLOSSARY: '+glStr:''}
SEGMENTS:\n${segList}
CHECKS:\n${chkLines.join('\n')}
${specialInstructions ? '\nSPECIAL INSTRUCTIONS: '+specialInstructions : ''}\nReturn ONLY valid JSON array ([] if no issues):
[{"type":"term|fmt|susp|style|dialect","severity":"critical|high|medium|low","title":"...","affectedIds":[1],"evidence":[{"tuId":1,"src":"...","tgt":"...","issue":"..."}],"aiSuggestedFix":"...","explanation":"..."}]`;
          let raw = await callAI(prompt);
          raw = raw.replace(/```json|```/g,'').trim();
          try { const arr=JSON.parse(raw); issues.push(...arr.map(iss=>({...iss,status:'pending',userFix:''}))); } catch{}
          await sleep(200);
        }
        // Duplicate detection
        if(checks.dup) {
          const srcMap={};
          tmSegments.forEach(s=>{const k=s.src.trim().toLowerCase();if(!srcMap[k])srcMap[k]=[];srcMap[k].push(s);});
          Object.values(srcMap).forEach(segs=>{
            if(segs.length<2) return;
            const targets=[...new Set(segs.map(s=>s.tgt.trim()))];
            if(targets.length<2) return;
            issues.push({type:'dup',severity:'critical',title:'Duplicate source with conflicting targets',affectedIds:segs.map(s=>s.id),evidence:segs.slice(0,3).map(s=>({tuId:s.id,src:s.src,tgt:s.tgt,issue:'Conflicting translation'})),aiSuggestedFix:targets[0],explanation:`Same source has ${targets.length} different translations — causes inconsistent leveraging.`,status:'pending',userFix:''});
          });
        }
        issues.forEach((iss,i)=>iss.id=i+1);
        AppState.setLoading(false);
        renderIssues(); updateStats();
        const fb=document.getElementById('tm-filterbar'); if(fb) fb.style.display='flex';
        const empty=document.getElementById('tm-empty'); if(empty) empty.style.display='none';
        const expBtn=document.getElementById('tm-export-btn'); if(expBtn) expBtn.disabled=false;
        document.getElementById('tm-badge-audit').textContent=issues.length;
        const score=this.calcScore();
        document.getElementById('tm-badge-health').textContent=score+'/100';
        this.renderHealthReport(score);
        AppState.notify(`Audit complete — ${issues.length} issues found`,'success');
      } catch(e) {
        AppState.setLoading(false);
        AppState.notify('Audit failed: '+e.message,'error');
      }
    },

    approveIssue(id) {
      const iss=issues.find(i=>i.id===id); if(!iss) return;
      const fixEl=document.getElementById(`tmfix-${id}`); if(fixEl) iss.userFix=fixEl.value;
      iss.status='approved';
      (iss.affectedIds||[]).forEach(tuId=>{const seg=tmSegments.find(s=>s.id===tuId);if(seg&&(iss.userFix||iss.aiSuggestedFix)){seg.tgt=iss.userFix||iss.aiSuggestedFix;seg.modified=true;}});
      const old=document.getElementById(`tm-iss-${id}`); if(old) old.replaceWith(buildIssueCard(iss));
      updateStats(); AppState.notify(`Issue #${id} approved ✓`,'success');
    },

    rejectIssue(id) {
      const iss=issues.find(i=>i.id===id); if(!iss) return;
      iss.status='rejected';
      const old=document.getElementById(`tm-iss-${id}`); if(old) old.replaceWith(buildIssueCard(iss));
      updateStats();
    },

    undoStatus(id) {
      const iss=issues.find(i=>i.id===id); if(!iss) return;
      if(iss.status==='approved'){(iss.affectedIds||[]).forEach(tuId=>{const seg=tmSegments.find(s=>s.id===tuId);if(seg){seg.tgt=seg.originalTgt;seg.modified=false;}});}
      iss.status='pending';
      const old=document.getElementById(`tm-iss-${id}`); if(old) old.replaceWith(buildIssueCard(iss));
      updateStats();
    },

    autoFix(id) { const iss=issues.find(i=>i.id===id); if(iss){iss.userFix=iss.aiSuggestedFix||'';} this.approveIssue(id); },
    saveFix(id) { const el=document.getElementById(`tmfix-${id}`); const iss=issues.find(i=>i.id===id); if(iss&&el){iss.userFix=el.value;AppState.notify('Fix saved','info');} },

    approveAll() { issues.filter(i=>i.status==='pending').forEach(i=>this.approveIssue(i.id)); },
    approveAllVisible() { getFiltered().filter(i=>i.status==='pending').forEach(i=>this.approveIssue(i.id)); AppState.notify('Visible issues approved','success'); },
    rejectAllVisible() { getFiltered().filter(i=>i.status==='pending').forEach(i=>this.rejectIssue(i.id)); },

    previewReplace() {
      const find=document.getElementById('tm-find').value.trim();
      const rep=document.getElementById('tm-replace').value.trim();
      if(!find||!rep){AppState.notify('Enter both terms','error');return;}
      if(!tmSegments.length){AppState.notify('No TM loaded','error');return;}
      const cs=document.getElementById('tm-rep-cs').checked;
      repPreview=tmSegments.filter(s=>cs?s.tgt.includes(find):s.tgt.toLowerCase().includes(find.toLowerCase())).map(s=>({id:s.id,src:s.src,before:s.tgt,after:cs?s.tgt.replaceAll(find,rep):s.tgt.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),rep),selected:true}));
      if(!repPreview.length){AppState.notify('No matches found','info');return;}
      const rows=repPreview.map((r,i)=>`<div style="display:grid;grid-template-columns:30px 1fr 1fr 80px;gap:6px;padding:6px 10px;border-bottom:1px solid var(--border);font-size:.78rem;" id="pr-${i}">
        <span style="font-family:var(--mono);color:var(--text-muted);">#${r.id}</span>
        <div style="direction:ltr;color:var(--text-dim);">${escHtml((r.src||'').substring(0,60))}</div>
        <div style="direction:rtl;"><div style="color:#f87171;text-decoration:line-through;">${escHtml(r.before)}</div><div style="color:#68d391;">→ ${escHtml(r.after)}</div></div>
        <button onclick="TMMaint.toggleRep(${i})" style="padding:2px 8px;font-size:.68rem;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--text-muted);border-radius:3px;">Exclude</button>
      </div>`).join('');
      document.getElementById('tm-rep-preview').innerHTML=`<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">
        <div style="padding:8px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;font-size:.78rem;font-weight:600;color:var(--accent);">📋 ${repPreview.length} matches <button onclick="TMMaint.applyReplace()" style="margin-left:auto;padding:4px 12px;font-size:.75rem;background:var(--accent);color:#fff;border:none;border-radius:3px;cursor:pointer;">Apply All</button><button onclick="document.getElementById('tm-rep-preview').style.display='none'" style="padding:4px 8px;font-size:.75rem;background:transparent;border:1px solid var(--border);color:var(--text-muted);border-radius:3px;cursor:pointer;">Cancel</button></div>
        <div>${rows}</div></div>`;
      document.getElementById('tm-rep-preview').style.display='block';
      AppState.notify(`${repPreview.length} matches found`,'info');
    },

    toggleRep(i) { repPreview[i].selected=!repPreview[i].selected; const row=document.getElementById(`pr-${i}`); if(row) row.style.opacity=repPreview[i].selected?'1':'.4'; },

    applyReplace() {
      let count=0;
      repPreview.filter(r=>r.selected).forEach(r=>{const seg=tmSegments.find(s=>s.id===r.id);if(seg){seg.tgt=r.after;seg.modified=true;count++;}});
      document.getElementById('tm-rep-preview').style.display='none';
      AppState.notify(`Applied ${count} replacements ✓`,'success');
    },

    calcScore() {
      if(!tmSegments.length) return 100;
      const w={critical:5,high:3,medium:1.5,low:0.5,info:0};
      let penalty=0;
      issues.forEach(iss=>{penalty+=(w[iss.severity]||0)*(iss.affectedIds||[1]).length;});
      const max=tmSegments.length*5;
      return Math.max(0,Math.round(100-(penalty/max)*100));
    },

    renderHealthReport(score) {
      const panel=document.getElementById('tm-tab-health'); if(!panel) return;
      const byType={},bySev={};
      issues.forEach(iss=>{byType[iss.type]=(byType[iss.type]||0)+1;bySev[iss.severity]=(bySev[iss.severity]||0)+1;});
      const gc=score>=80?'#68d391':score>=60?'#fbbf24':'#f87171';
      const circ=2*Math.PI*36;
      const offset=circ-(score/100)*circ;
      const approved=issues.filter(i=>i.status==='approved').length;
      panel.innerHTML=`<div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:center;gap:20px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;">
          <div style="position:relative;width:80px;height:80px;flex-shrink:0;">
            <svg width="80" height="80" viewBox="0 0 80 80" style="transform:rotate(-90deg)">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="7"/>
              <circle cx="40" cy="40" r="32" fill="none" stroke="${gc}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
            </svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
              <span style="font-size:1.3rem;font-weight:700;font-family:var(--mono);color:${gc}">${score}</span>
              <span style="font-size:.6rem;color:var(--text-muted);">/100</span>
            </div>
          </div>
          <div style="flex:1;">
            <div style="font-size:.9rem;font-weight:700;margin-bottom:5px;">TM Health Score</div>
            <div style="font-size:.8rem;color:var(--text-dim);line-height:1.6;margin-bottom:8px;">${score>=80?'TM is in good shape — address remaining issues for optimal leveraging.':score>=60?'Moderate issues detected. Resolve high-severity items to improve consistency.':'Critical issues need immediate attention before production use.'}</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:.72rem;font-family:var(--mono);">
              <span style="color:#f87171;">● ${bySev.critical||0} Critical</span>
              <span style="color:#fb923c;">● ${bySev.high||0} High</span>
              <span style="color:#fbbf24;">● ${bySev.medium||0} Medium</span>
              <span style="color:#68d391;">● ${approved} Resolved</span>
            </div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          ${[['Total Issues',issues.length,'#fbbf24'],['Critical+High',(bySev.critical||0)+(bySev.high||0),'#f87171'],['Resolved',approved,'#68d391'],['Terminology',byType.term||0,'#60a5fa'],['Duplicates',byType.dup||0,'#a78bfa'],['Pending',issues.filter(i=>i.status==='pending').length,'#fb923c']].map(([lbl,val,color])=>`<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px;"><div style="font-size:.68rem;font-family:var(--mono);color:var(--text-muted);text-transform:uppercase;">${lbl}</div><div style="font-family:var(--mono);font-size:1.6rem;font-weight:700;color:${color};">${val}</div></div>`).join('')}
        </div>
      </div>`;
    },

    setExpScope(btn, scope) {
      expScope=scope;
      document.querySelectorAll('.tm-exp-scope').forEach(b=>{b.classList.remove('on');b.style.background='';});
      btn.classList.add('on'); btn.style.background='var(--accent)'; btn.style.color='#fff';
    },

    setExpFmt(card, fmt) {
      expFmt=fmt;
      document.querySelectorAll('.tm-fmt').forEach(c=>c.style.borderColor='var(--border)');
      card.style.borderColor='var(--accent)';
    },

    runExport() {
      const segs=expScope==='fixed'?tmSegments.filter(s=>s.modified):expScope==='approved'?tmSegments.filter(s=>issues.filter(i=>i.status==='approved').some(i=>(i.affectedIds||[]).includes(s.id))):tmSegments;
      if(!segs.length){AppState.notify('No segments match scope','error');return;}
      const srcL=segs.find(s=>s.srcLang)?.srcLang||'en';
      const tgtL=segs.find(s=>s.tgtLang)?.tgtLang||'ar';
      const now=new Date().toISOString().replace(/[-:.]/g,'').substring(0,15)+'Z';
      if(expFmt==='tmx'){
        let out=`<?xml version="1.0" encoding="UTF-8"?>\n<tmx version="1.4">\n  <header creationtool="LocMaster TM Maintenance" srclang="${srcL}" creationdate="${now}"/>\n  <body>\n`;
        segs.forEach(s=>{out+=`    <tu tuid="${s.id}"${s.modified?' changedate="'+now+'"':''}><tuv xml:lang="${srcL}"><seg>${escXml(s.src)}</seg></tuv><tuv xml:lang="${tgtL}"><seg>${escXml(s.tgt)}</seg></tuv></tu>\n`;});
        out+=`  </body>\n</tmx>`;
        dlFile('LocMaster_TM_Cleaned.tmx',out,'application/xml');
      } else if(expFmt==='sdlxliff'){
        let out=`<?xml version="1.0" encoding="utf-8"?>\n<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\n  <file source-language="${srcL}" target-language="${tgtL}">\n    <body>\n`;
        segs.forEach(s=>{out+=`      <trans-unit id="${s.id}"><source>${escXml(s.src)}</source><target state="${s.modified?'translated':'final'}">${escXml(s.tgt)}</target></trans-unit>\n`;});
        out+=`    </body>\n  </file>\n</xliff>`;
        dlFile('LocMaster_TM_Cleaned.sdlxliff',out,'application/xml');
      } else if(expFmt==='xliff12'){
        let out=`<?xml version="1.0" encoding="UTF-8"?>\n<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\n  <file source-language="${srcL}" target-language="${tgtL}">\n    <body>\n`;
        segs.forEach(s=>{out+=`      <trans-unit id="${s.id}"><source>${escXml(s.src)}</source><target state="translated">${escXml(s.tgt)}</target></trans-unit>\n`;});
        out+=`    </body>\n  </file>\n</xliff>`;
        dlFile('LocMaster_TM_Cleaned.xlf',out,'application/xml');
      } else if(expFmt==='mqxliff'){
        let out=`<?xml version="1.0" encoding="utf-8"?>\n<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2" xmlns:mq="MQXliff">\n  <file source-language="${srcL}" target-language="${tgtL}">\n    <body>\n`;
        segs.forEach(s=>{out+=`      <trans-unit id="${s.id}"><source>${escXml(s.src)}</source><target mq:status="${s.modified?'Translated':'Confirmed'}">${escXml(s.tgt)}</target></trans-unit>\n`;});
        out+=`    </body>\n  </file>\n</xliff>`;
        dlFile('LocMaster_TM_Cleaned.mqxliff',out,'application/xml');
      } else if(expFmt==='csv'){
        const rows=[['ID','Source','Original','Cleaned','Modified']];
        segs.forEach(s=>rows.push([s.id,s.src,s.originalTgt,s.tgt,s.modified?'Yes':'No']));
        const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
        dlFile('LocMaster_TM_Cleaned.csv','\uFEFF'+csv,'text/csv;charset=utf-8');
      } else if(expFmt==='json'){
        const payload={meta:{tool:'LocMaster TM Maintenance',exported:new Date().toISOString(),totalSegments:segs.length},segments:segs.map(s=>({id:s.id,src:s.src,tgt:s.tgt,modified:s.modified})),issues:issues.map(i=>({id:i.id,type:i.type,severity:i.severity,status:i.status}))};
        dlFile('LocMaster_TM_Cleaned.json',JSON.stringify(payload,null,2),'application/json');
      }
      document.getElementById('tm-export-modal').style.display='none';
      AppState.notify(`Exported ${segs.length} segments as ${expFmt.toUpperCase()} ✓`,'success');
    },

    setDefaultMode(mode) {
      const descs = {
        flag: 'Issues are flagged for your attention — no AI fix suggested.',
        suggest: 'AI suggests a fix — you review and approve or reject each one.',
        autofix: 'AI automatically applies fixes — review the results after.'
      };
      const ids = {flag:'tm-dflt-flag', suggest:'tm-dflt-suggest', autofix:'tm-dflt-autofix'};
      Object.entries(ids).forEach(([m,id])=>{
        const btn=document.getElementById(id);
        if(!btn) return;
        const isActive = m===mode;
        btn.style.background  = isActive ? 'var(--accent)' : 'var(--surface2)';
        btn.style.color       = isActive ? '#fff' : 'var(--text-dim)';
        btn.style.borderColor = isActive ? 'var(--accent)' : 'var(--border)';
        btn.style.fontWeight  = isActive ? '700' : '400';
      });
      const desc=document.getElementById('tm-dflt-desc');
      if(desc) desc.textContent=descs[mode]||'';
      currentMode=mode;
      // Sync the main review mode bar
      document.querySelectorAll('.tm-mode').forEach(b=>{
        const m2 = b.textContent.toLowerCase().includes('flag')?'flag':b.textContent.toLowerCase().includes('auto')?'auto':'suggest';
        const match = (m2==='auto'&&mode==='autofix')||(m2===mode);
        b.style.background = match ? 'var(--accent)' : 'transparent';
        b.style.color      = match ? '#fff' : 'var(--text-muted)';
        b.classList.toggle('on', match);
      });
    }
  };
})();

// Style TM tabs on load
document.addEventListener('DOMContentLoaded', () => {
  // Init TM tab active style
  document.querySelectorAll('.tm-tab.on').forEach(t => { t.style.borderBottomColor='var(--accent)'; t.style.color='var(--accent)'; });
});


function setupRibbon(){
  const tabs = document.querySelectorAll('.toolbar-tabs .tab');
  const container = document.querySelector('.toolbar-container');
  // migrate existing groups into panels if present
  const orig = document.querySelector('.editor-toolbar');
  if(orig){
    const groups = orig.querySelectorAll('.toolbar-group');
    if(groups.length>0){
      // file panel = first group
      const filePanel = document.getElementById('tab-file');
      if(filePanel) filePanel.appendChild(groups[0].cloneNode(true));
      // edit panel = second group
      const editPanel = document.getElementById('tab-edit');
      if(editPanel && groups[1]) editPanel.appendChild(groups[1].cloneNode(true));
      // tools panel = remainder groups
      const toolsPanel = document.getElementById('tab-tools');
      for(let i=2;i<groups.length;i++){
        if(toolsPanel) toolsPanel.appendChild(groups[i].cloneNode(true));
      }
    }
  }
  tabs.forEach(t=>t.addEventListener('click',()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    renderPanel(t.dataset.tab);
  }));
  function renderPanel(name){
    const panel = document.getElementById('tab-'+name);
    if(panel){
      container.querySelectorAll('.toolbar-panel').forEach(p=>p.classList.add('hidden'));
      panel.classList.remove('hidden');
    }
  }
  renderPanel('file');
}

function openExternalTool(id){
  if(id==='aligner') window.open('https://drive.google.com/file/d/1RTcJ1JxdOCoo_BISaYjpb2phxilFX1oJ/view','_blank');
  if(id==='tmmaintenance') window.open('https://drive.google.com/file/d/1uzWpoa3bS08I_23OXVBzVPdAPALRSPS0/view','_blank');
}

// project alert helper
window.ProjectAlerts = {
  lastWarned: null,
  check() {
    const total = AppState.segments.length;
    if (!total) return;
    const done = AppState.segments.filter(s=>s.target).length;
    const pct = Math.round(done/total*100);
    const lqiScores = Object.values(AppState.lqiResults||{}).map(r=>r.score);
    const avg = lqiScores.length? (lqiScores.reduce((a,b)=>a+b,0)/lqiScores.length) : null;
    // simple rules
    if (pct >= 80 && avg !== null && avg < 3 && this.lastWarned !== 'quality') {
      AppState.notify('⚠️ High progress but quality is low (avg score '+avg.toFixed(1)+')','warning');
      this.lastWarned = 'quality';
    }
    if (pct < 20 && this.lastWarned !== 'lag') {
      AppState.notify('⏳ Less than 20% translated yet','info');
      this.lastWarned = 'lag';
    }
  }
};
setInterval(()=> ProjectAlerts.check(), 5*60*1000);

function toggleFontSize(dir){
  const current = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--editor-font-size'))||0.85;
  const delta = 0.05;
  const next = dir==='increase'? current+delta : current-delta;
  document.documentElement.style.setProperty('--editor-font-size', next+'rem');
}

function toggleTheme(){
  const themes = Object.keys(LMConfig.themes);
  let idx = themes.indexOf(getCurrentTheme());
  idx = (idx+1)%themes.length;
  applyTheme(themes[idx]);
}

// ── Auth Helpers ─────────────────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('auth-email').value;
  const pass  = document.getElementById('auth-password').value;
  const btn   = document.getElementById('auth-btn');
  const errEl = document.getElementById('auth-error');
  btn.textContent = '⏳ Signing in…';
  btn.disabled = true;
  errEl.classList.remove('show');
  const res = await Auth.login(email, pass);
  if (res.error) {
    console.warn('login error', res.error);
    errEl.textContent = res.error;
    errEl.classList.add('show');
  }
  btn.textContent = 'Sign In →';
  btn.disabled = false;
}
function fillDemo(email, pass) {
  document.getElementById('auth-email').value = email;
  document.getElementById('auth-password').value = pass;
  doLogin();
}
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.getElementById('auth-screen').classList.contains('hidden')) {
    e.preventDefault();
    doLogin();
  }
});

// ── View Navigation + Topbar Sync ────────────────────────────────
const viewMeta = {
  dashboard:   { label:'Dashboard',          dot:'#38bdf8', showFile:false, showSave:false, showUpload:false },
  editor:      { label:'Translation Editor', dot:'#3b82f6', showFile:true,  showSave:true,  showUpload:true  },
  lqi:         { label:'LQI Reviewer',       dot:'#a78bfa', showFile:true,  showSave:false, showUpload:false },
  qc:          { label:'QC Checker',         dot:'#22d3ee', showFile:false, showSave:false, showUpload:false },
  proofreader: { label:'Linguistic Proofreader', dot:'#34d399', showFile:false, showSave:false, showUpload:false },
  aligner:     { label:'Aligner',             dot:'#f59e0b', showFile:false, showSave:false, showUpload:false },
  tmmaintenance:{ label:'AI TM Maintenance', dot:'#ef4444', showFile:false, showSave:false, showUpload:false },
  resources:   { label:'Resources',          dot:'#94a3b8', showFile:false, showSave:false, showUpload:false },
  users:       { label:'Users',              dot:'#94a3b8', showFile:false, showSave:false, showUpload:false },
  reports:     { label:'Reports',            dot:'#94a3b8', showFile:false, showSave:false, showUpload:false },
  settings:    { label:'Settings',           dot:'#94a3b8', showFile:false, showSave:false, showUpload:false }
};
const _origSetView = AppState.setView.bind(AppState);
AppState.setView = function(view) {
  _origSetView(view);
  const meta = viewMeta[view] || {};
  const $ = id => document.getElementById(id);
  $('topbar-label').textContent = meta.label || view;
  $('topbar-dot').style.background = meta.dot || '#38bdf8';
  $('topbar-dot').style.color      = meta.dot || '#38bdf8';
  $('file-info').style.display        = meta.showFile   ? '' : 'none';
  $('btn-save-top').style.display     = meta.showSave   ? '' : 'none';
  $('btn-upload-top').style.display   = meta.showUpload ? '' : 'none';
  document.querySelectorAll('.nav-item').forEach(n =>
    n.classList.toggle('active', n.dataset.nav === view));
  if (view === 'settings')  Settings.init();
  if (view === 'users')     UsersManager.load();
  if (view === 'resources') Resources.load();
  if (view === 'reports')   Reports.init();
};

// ── Editor Helpers ────────────────────────────────────────────────
function toggleFilter(type) {
  AppState.filters[type] = !AppState.filters[type];
  const chip = document.getElementById('filter-' + type);
  if (chip) chip.className = AppState.filters[type]
    ? `filter-chip active-${type}` : 'filter-chip';
  if (window.UISegments && AppState.segments.length)
    UISegments.render(AppState.segments, { srcLang:AppState.srcLang, tgtLang:AppState.tgtLang });
}
function filterSegments(q) {
  if (window.UISegments && AppState.segments.length)
    UISegments.render(AppState.segments, { srcLang:AppState.srcLang, tgtLang:AppState.tgtLang, search:q });
}
async function runEditorAIAll() {
  if (!AppState.segments.length) { AppState.notify('No segments to review', 'error'); return; }
  if (!isToolReady('editor')) { AppState.notify('AI not configured. Go to Settings.', 'warning'); navigate('settings'); return; }
  AppState.notify('⏳ Running full AI review…', 'info', 60000);
  const segs = AppState.segments.filter(s => s.target && s.status !== 'locked');
  const opts = { srcLang:AppState.srcLang, tgtLang:AppState.tgtLang, customPrompt:getToolPrompt('editor') };
  const results = await AIClient.batchReview(segs, opts, pct => {
    const el = document.getElementById('sb-words');
    if (el) el.textContent = `AI: ${pct}%`;
  });
  results.forEach(r => { AppState.lqiResults[r.segmentId] = r; });
  AppState.notify(`✓ Reviewed ${results.length} segments`, 'success');
  if (window.UISegments) UISegments.render(AppState.segments, { srcLang:AppState.srcLang, tgtLang:AppState.tgtLang });
}

// ── LQI Helpers ───────────────────────────────────────────────────
async function handlePackageUpload(files) {
  if (!files?.length) return;
  AppState.setLoading(true, 'Parsing package…');
  try {
    const parsed = await Parser.parseFile(files[0]);
    // parsed may contain multiple underlying files
    if (parsed.packageType === 'ReturnPackage' && AppState.parsedData && AppState.parsedData.packageType === 'ProjectPackage') {
      // merge returned segments into original
      let updates = 0;
      parsed.segments.forEach(s => {
        const orig = AppState.segments.find(o => o.id === s.id);
        if (orig && s.target && s.target !== orig.target) {
          orig.target = s.target;
          orig.status = s.status || orig.status;
          updates++;
        }
      });
      UISegments.render(AppState.segments, { srcLang:AppState.srcLang, tgtLang:AppState.tgtLang });
      AppState.notify(`Return package applied (${updates} segments)`,'success');
    } else {
      AppState.parsedData = parsed;
      AppState.segments = parsed.segments || [];
      AppState.srcLang = parsed.srcLang || AppState.srcLang;
      AppState.tgtLang = parsed.tgtLang || AppState.tgtLang;
      AppState.projectConfig = AppState.projectConfig || {};
      AppState.projectConfig.name = parsed.projectName || AppState.projectConfig.name;
      AppState.projectConfig.srcLang = parsed.srcLang;
      AppState.projectConfig.tgtLang = parsed.tgtLang;
      UISegments.render(AppState.segments, { srcLang:AppState.srcLang, tgtLang:AppState.tgtLang });
      AppState.notify('Package loaded: ' + parsed.name, 'success');
    }
  } catch (err) {
    console.error('Package parse error', err);
    AppState.notify('Failed to open package: ' + err.message, 'error');
  } finally {
    AppState.setLoading(false);
  }
}

// ── Batch tasks handlers ─────────────────
function toggleBatchMenu() {
  const el = document.getElementById('batchTasks');
  el.classList.toggle('show');
}

function batchAnalyse() {
  toggleBatchMenu();
  AppState.notify('Analyzing segments…', 'info');
  const words = AppState.segments.reduce((sum,s) => sum + (s.target||'').split(/\s+/).length,0);
  AppState.notify(`Word count: ${words}`, 'success');
}

function batchWordCount() { batchAnalyse(); }

function batchPretranslate() {
  toggleBatchMenu();
  if (!window.TM) { AppState.notify('TM not available', 'warning'); return; }
  AppState.notify('Applying TM to all segments…', 'info');
  TM.autoApplyAll(AppState.segments);
  UISegments.render(AppState.segments, { srcLang:AppState.srcLang, tgtLang:AppState.tgtLang });
}

function batchRunQA() {
  toggleBatchMenu();
  if (window.QA) QA.runAll(AppState.segments,{srcLang:AppState.srcLang,tgtLang:AppState.tgtLang});
}

function batchExportTMX() {
  toggleBatchMenu();
  if (window.Exporter) Exporter.exportTMX();
}

function batchShowPackageInfo() {
  toggleBatchMenu();
  const pd = AppState.parsedData;
  if (!pd) { AppState.notify('No package loaded', 'warning'); return; }
  const info = [];
  info.push(`<strong>Name:</strong> ${pd.name || ''}`);
  info.push(`<strong>Format:</strong> ${pd.format || ''}`);
  if (pd.packageType) info.push(`<strong>Package type:</strong> ${pd.packageType}`);
  if (pd.srcLang) info.push(`<strong>Source:</strong> ${pd.srcLang}`);
  if (pd.tgtLang) info.push(`<strong>Target:</strong> ${pd.tgtLang}`);
  if (pd.files) info.push(`<strong>Files:</strong> ${pd.files.length}`);
  if (pd.tmEntries) info.push(`<strong>TM entries:</strong> ${pd.tmEntries.length}`);
  UI.showModal('Package Info', '<div style="font-size:0.85rem;line-height:1.4">' + info.join('<br>') + '</div>');
}

function batchBackup() {
  toggleBatchMenu();
  const blob = new Blob([JSON.stringify(AppState.segments,null,2)],{type:'application/json'});
  const name = `${AppState.projectConfig?.name||'backup'}_segments.json`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  AppState.notify('Backup downloaded', 'success');
}

function batchExportFilteredXLIFF() {
  toggleBatchMenu();
  // build simple XLIFF with current segments array
  const segments = AppState.segments;
  const xliff = ['<?xml version="1.0" encoding="utf-8"?>',
    '<xliff version="1.2">', '<file source-language="'+AppState.srcLang+'" target-language="'+AppState.tgtLang+'" datatype="plaintext">',
    '<body>'];
  segments.forEach(s=>{
    xliff.push('<trans-unit id="'+s.id+'">');
    xliff.push('<source>'+s.source.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</source>');
    xliff.push('<target>'+ (s.target||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</target>');
    xliff.push('</trans-unit>');
  });
  xliff.push('</body></file></xliff>');
  const blob = new Blob([xliff.join('\n')], {type:'application/xml'});
  const name = `${AppState.projectConfig?.name||'export'}_filtered.xliff`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  AppState.notify('Filtered XLIFF exported', 'success');
}

// ------------------------------------------------------------------
// TM import/extract helpers
function batchImportTMX() {
  toggleBatchMenu();
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.tmx';
  inp.onchange = async () => {
    if (inp.files.length) {
      const cnt = await TM.importTMX(inp.files[0]);
      AppState.notify(`Imported ${cnt} TM entries`, 'success');
    }
  };
  inp.click();
}

function batchExtractTM() {
  toggleBatchMenu();
  if (!AppState.segments.length) { AppState.notify('No segments to extract', 'warning'); return; }
  const added = TM.extractFromSegments(AppState.segments, AppState.projectConfig||{});
  AppState.notify(`Extracted ${added} entries to TM`, 'success');
}

function batchPseudoTranslate() {
  toggleBatchMenu();
  let count = 0;
  AppState.segments.forEach(s => {
    if (s.source && !s.target) {
      s.target = `[${s.source}]`;
      s.matchType = 'mt';
      s.matchPercent = 50;
      count++;
    }
  });
  UISegments.render(AppState.segments, { srcLang:AppState.srcLang, tgtLang:AppState.tgtLang });
  AppState.notify(`Pseudo‑translated ${count} segments`, 'success');
}

function batchChangeCase(mode) {
  toggleBatchMenu();
  AppState.segments.forEach(s => {
    if (s.target) {
      s.target = mode === 'upper' ? s.target.toUpperCase() : s.target.toLowerCase();
    }
  });
  UISegments.render(AppState.segments, { srcLang:AppState.srcLang, tgtLang:AppState.tgtLang });
  AppState.notify(`Converted targets to ${mode}`, 'success');
}

function batchLockAll() {
  toggleBatchMenu();
  AppState.segments.forEach(s => { s.locked = true; });
  UISegments.render(AppState.segments, { srcLang:AppState.srcLang, tgtLang:AppState.tgtLang });
  AppState.notify('All segments locked', 'info');
}

function batchUnlockAll() {
  toggleBatchMenu();
  AppState.segments.forEach(s => { s.locked = false; });
  UISegments.render(AppState.segments, { srcLang:AppState.srcLang, tgtLang:AppState.tgtLang });
  AppState.notify('All segments unlocked', 'info');
}

function batchAssign() {
  toggleBatchMenu();
  const users = (window.UsersManager && UsersManager.getAllUsers()) || [];
  const options = users.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('');
  UI.showModal('Assign segments',
    `<p>Select user to assign filtered segments:</p>
     <select id="assign-user" style="width:100%;padding:6px">${options}</select>
     <p><label><input type="checkbox" id="assign-evenly"> distribute evenly</label></p>`,
    [{label:'Assign', action:()=>{
        const uid = document.getElementById('assign-user').value;
        const evenly = document.getElementById('assign-evenly').checked;
        let count=0;
        AppState.segments.forEach((s,i)=>{
          if (!s.target) return; // skip empty
          if (evenly) {
            // just modulo assignment example
            s.assignedTo = users[i % users.length]?.id || uid;
          } else {
            s.assignedTo = uid;
          }
          count++;
        });
        UISegments.render(AppState.segments, { srcLang:AppState.srcLang, tgtLang:AppState.tgtLang });
        AppState.notify(`Assigned ${count} segments`, 'success');
        UI.closeModal();
      }}]);
}

// TM manager modal
function showTMManager() {
  const total = TM.entries.length;
  const html = `
    <div style="font-size:0.85rem;line-height:1.4">
      <p>Total TM entries: <strong>${total}</strong></p>
      <button onclick="TM.exportAndDownload();" class="btn-primary btn-sm">Export TMX</button>
      <button onclick="batchImportTMX();" class="btn-ghost btn-sm">Import TMX</button>
      <button onclick="TM.clear();UI.closeModal();" class="btn-danger btn-sm">Clear TM</button>
    </div>`;
  UI.showModal('Translation Memory', html);
}

// helper for TM export & download
TM.exportAndDownload = function() {
  const xml = this.exportTMX(AppState.srcLang, AppState.tgtLang);
  const blob = new Blob([xml], {type:'application/xml'});
  const name = `TM_${AppState.srcLang}_${AppState.tgtLang}_${Date.now()}.tmx`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  UI.notify('TMX exported', 'success');
};

// close batch dropdown when clicking elsewhere
document.addEventListener('click', e => {
  const dropdown = document.getElementById('batchTasks');
  if (dropdown && !dropdown.contains(e.target)) {
    dropdown.classList.remove('show');
  }
});

// LQI legacy stubs — delegate to new LQI module
async function handleLQIUpload(files) { if (window.LQI) LQI.handleFiles(files); }
async function runLQIReview() { if (window.LQI) LQI.runEvaluation(); }
function renderLQIResults(results) {
  const avg = (results.reduce((s,r) => s + (r.score||0), 0) / results.length).toFixed(2);
  const errors = results.flatMap(r => r.errors || []);
  const container = document.getElementById('lqi-results-container');
  container.innerHTML = `
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px">
    <div class="stat-card"><div class="stat-num" style="color:var(--tool-lqi)">${avg}/5</div><div class="stat-label">Avg Quality</div></div>
    <div class="stat-card"><div class="stat-num">${results.length}</div><div class="stat-label">Segments Reviewed</div></div>
    <div class="stat-card"><div class="stat-num" style="color:var(--danger)">${errors.filter(e=>e.severity==='critical').length}</div><div class="stat-label">Critical Errors</div></div>
    <div class="stat-card"><div class="stat-num" style="color:var(--warning)">${errors.filter(e=>e.severity==='major').length}</div><div class="stat-label">Major Errors</div></div>
  </div>
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
  <table class="data-table">
    <thead><tr>
      <th>#</th><th>Source</th><th>Target</th><th>Score</th><th>Issues</th>
    </tr></thead>
    <tbody>${results.map((r,i) => {
      const seg = AppState.segments.find(s=>s.id===r.segmentId)||{};
      const sc = r.score>=4?'var(--success)':r.score>=3?'var(--warning)':'var(--danger)';
      return `<tr>
        <td style="font-family:var(--mono);color:var(--text-muted)">${i+1}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${seg.source||'—'}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl">${seg.target||'—'}</td>
        <td style="font-weight:700;color:${sc};font-family:var(--mono)">${r.score||'—'}</td>
        <td>${(r.errors||[]).map(e=>`<span style="font-size:.68rem;background:rgba(248,113,113,.1);color:var(--danger);padding:1px 6px;border-radius:4px;margin:2px;display:inline-block">${e.type}</span>`).join('')||'<span style="color:var(--success)">✓</span>'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
  document.getElementById('lqi-status').innerHTML = '';
}

// ── QC Helpers ─────────────────────────────────────────────────────
async function handleQCUpload(files) {
  if (!files?.length) return;
  AppState.setLoading(true, 'Running checks…');
  try {
    const parsed = await Parser.parseFile(files[0]);
    AppState.segments = parsed.segments;
    const issues = [];
    if (window.QA) {
      parsed.segments.forEach(s => {
        const res = QA.checkSegment(s, { srcLang:parsed.srcLang, tgtLang:parsed.tgtLang });
        if (res.issues?.length) issues.push({ seg:s, issues:res.issues });
      });
    }
    document.getElementById('qc-status').innerHTML = '';
    document.getElementById('qc-results-container').innerHTML = issues.length
      ? `<div class="stat-card" style="margin-bottom:16px;display:inline-block;padding:14px 20px"><div class="stat-num" style="color:var(--tool-qc)">${issues.length}</div><div class="stat-label">Segments with issues</div></div>
         <div style="display:flex;flex-direction:column;gap:8px">
         ${issues.map(({seg,issues:iss}) => `
           <div style="background:var(--surface);border:1px solid rgba(34,211,238,.15);border-radius:var(--radius-sm);padding:14px">
             <div style="font-size:.8rem;margin-bottom:8px;color:var(--text-dim)">${seg.source}</div>
             ${iss.map(i=>`<div style="font-size:.76rem;color:${i.severity==='error'?'var(--danger)':'var(--warning)'};margin:3px 0">⚠ ${i.check}: ${i.message}</div>`).join('')}
           </div>`).join('')}</div>`
      : '<div style="color:var(--success);text-align:center;padding:40px;font-size:1.1rem">✓ No issues detected!</div>';
    AppState.notify(`Checked ${parsed.segmentCount} segments — ${issues.length} issues`, issues.length ? 'warning' : 'success');
  } catch(e) { AppState.notify('Error: ' + e.message, 'error'); }
  AppState.setLoading(false);
}

// ── Proofreader Helpers ─────────────────────────────────────────────
function setProofMode(mode) {
  document.getElementById('proof-text-mode').style.display = mode==='text' ? '' : 'none';
  document.getElementById('proof-file-mode').style.display = mode==='file' ? '' : 'none';
  document.getElementById('proof-mode-text').style.borderColor = mode==='text' ? 'var(--tool-proofreader)' : '';
  document.getElementById('proof-mode-file').style.borderColor = mode==='file' ? 'var(--tool-proofreader)' : '';
}
async function handleProofFile(files) {
  if (!files?.length) return;
  AppState.setLoading(true, 'Parsing file…');
  try {
    const parsed = await Parser.parseFile(files[0]);
    const arabicSegs = parsed.segments.filter(s => s.target?.trim() && !s.locked && s.matchType !== 'ice');
    AppState._proofSegments = arabicSegs;
    document.getElementById('proof-file-mode').innerHTML =
      `<div style="color:var(--success);padding:12px;border:1px solid rgba(52,211,153,.3);border-radius:var(--radius-sm);font-size:.84rem">
        ✓ Loaded ${arabicSegs.length} eligible segments from ${files[0].name}
      </div>`;
  } catch(e) { AppState.notify('Error: ' + e.message, 'error'); }
  AppState.setLoading(false);
}
async function runProofreader() {
  const text = document.getElementById('proof-input')?.value?.trim();
  const segs = AppState._proofSegments;
  if (!text && !segs?.length) { AppState.notify('Enter text or upload a file', 'warning'); return; }
  if (!isToolReady('proofreader')) { AppState.notify('AI not configured. Go to Settings.', 'warning'); navigate('settings'); return; }
  AppState.setLoading(true, 'Proofreading…');
  const register = document.getElementById('proof-register')?.value || 'msa';
  const custom   = getToolPrompt('proofreader');
  const content  = text || segs.map(s=>s.target).join('\n\n---\n\n');
  const prompt = `You are an expert Arabic proofreader. Review the following text (register: ${register}) and report:
- Grammar and spelling errors
- Style and phrasing issues
- Inappropriate or ambiguous wording
- Improvement suggestions
${custom ? `\nAdditional instructions: ${custom}` : ''}

Text:
${content}

Respond in JSON only:
{"issues":[{"text":"<original text>","problem":"<description>","suggestion":"<correction>","type":"<grammar|spelling|style|terminology>"}],"summary":"<overall summary>","score":<1-10>}`;
  try {
    const raw  = await AIClient.call(prompt, 'proofreader', { temperature:0.2, maxTokens:2000 });
    const m    = raw.match(/\{[\s\S]*\}/);
    const data = m ? JSON.parse(m[0]) : { issues:[], summary:raw, score:null };
    document.getElementById('proof-results').innerHTML = `
    <div style="background:var(--surface);border:1px solid rgba(52,211,153,.2);border-radius:var(--radius);padding:20px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <strong>Proofreading Result</strong>
        ${data.score ? `<span style="font-size:1.3rem;font-weight:700;font-family:var(--mono);color:${data.score>=7?'var(--success)':data.score>=5?'var(--warning)':'var(--danger)'}">${data.score}/10</span>` : ''}
      </div>
      <p style="color:var(--text-dim);font-size:.86rem">${data.summary||''}</p>
    </div>
    ${(data.issues||[]).length
      ? `<div style="display:flex;flex-direction:column;gap:8px">
         ${data.issues.map(i=>`
         <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:13px">
           <div style="display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;margin-bottom:6px">
             <span style="background:rgba(248,113,113,.1);color:var(--danger);padding:2px 8px;border-radius:4px;font-size:.68rem;font-family:var(--mono)">${i.type||'issue'}</span>
             <span style="color:var(--text-dim);font-size:.83rem;flex:1">"${i.text}"</span>
           </div>
           <div style="font-size:.8rem;color:var(--warning)">⚠ ${i.problem}</div>
           ${i.suggestion ? `<div style="font-size:.8rem;color:var(--success);margin-top:3px">✓ ${i.suggestion}</div>` : ''}
         </div>`).join('')}</div>`
      : '<div style="color:var(--success);text-align:center;padding:20px">✓ No language issues detected!</div>'}`;
  } catch(e) { AppState.notify('Error: ' + e.message, 'error'); }
  AppState.setLoading(false);
}
function clearProofreader() {
  const el = document.getElementById('proof-input');
  if (el) el.value = '';
  document.getElementById('proof-results').innerHTML = '';
  AppState._proofSegments = null;
}

// ── Project CRUD ──────────────────────────────────────────────────
async function createProject() {
  const name = document.getElementById('new-proj-name')?.value?.trim();
  if (!name) { AppState.notify('Enter a project name', 'error'); return; }
  await Dashboard.createProject({
    name,
    client:  document.getElementById('new-proj-client')?.value?.trim() || '',
    srcLang: document.getElementById('new-proj-src')?.value  || 'en',
    tgtLang: document.getElementById('new-proj-tgt')?.value  || 'ar',
    domain:  document.getElementById('new-proj-domain')?.value || 'general'
  });
}

// ── Modal Helpers ─────────────────────────────────────────────────
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape')
    document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('show');
  });
});
