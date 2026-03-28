// ══════════════════════════════════════════════════════════════
// js/qa.js  — LocMaster AI Studio — Quality Assurance Checks
// ══════════════════════════════════════════════════════════════

window.QA = (function () {

  const CHECKS = {
    empty_target: {
      label: 'Empty target',
      check: (s) => !s.target?.trim() && !s.locked,
      severity: 'error',
    },
    numbers_mismatch: {
      label: 'Number mismatch',
      check: (s) => {
        const srcNums = (s.source || '').match(/\d+(?:[.,]\d+)*/g) || [];
        const tgtNums = (s.target || '').match(/\d+(?:[.,]\d+)*/g) || [];
        return srcNums.slice().sort((a,b)=>parseFloat(a)-parseFloat(b)).join(',') !== tgtNums.slice().sort((a,b)=>parseFloat(a)-parseFloat(b)).join(',') && srcNums.length > 0;
      },
      severity: 'major',
    },
    double_space: {
      label: 'Double space',
      check: (s) => /  /.test(s.target || ''),
      severity: 'minor',
    },
    leading_trailing_space: {
      label: 'Leading/trailing space',
      check: (s) => (s.target || '') !== (s.target || '').trim() && s.target?.length > 0,
      severity: 'minor',
    },
    identical_source_target: {
      label: 'Source = target (untranslated)',
      check: (s) => s.target?.trim() && s.target.trim() === s.source?.trim(),
      severity: 'major',
    },
    punctuation_end: {
      label: 'Inconsistent end punctuation',
      check: (s) => {
        const src = (s.source || '').trimEnd();
        const tgt = (s.target || '').trimEnd();
        const srcPunct = /[.!?:;,]$/.test(src);
        const tgtPunct = /[.!?:;،؟]$/.test(tgt);
        return srcPunct !== tgtPunct && tgt.length > 0;
      },
      severity: 'minor',
    },
    tag_mismatch: {
      label: 'Tag mismatch',
      check: (s) => {
        const srcTags = (s.source || '').match(/<[^>]+>/g) || [];
        const tgtTags = (s.target || '').match(/<[^>]+>/g) || [];
        return srcTags.length !== tgtTags.length;
      },
      severity: 'major',
    },
  };

  function checkSegment(seg, opts = {}) {
    const issues = [];
    Object.entries(CHECKS).forEach(([key, check]) => {
      if (check.check(seg)) {
        issues.push({ check: key, message: check.label, severity: check.severity });
      }
    });
    return { segmentId: seg.id, issues };
  }

  function runAll(segments, opts = {}) {
    const results = [];
    segments.forEach(s => {
      const r = checkSegment(s, opts);
      if (r.issues.length) results.push(r);
    });
    const container = document.getElementById('qc-results-container');
    if (!container) return results;
    if (!results.length) {
      container.innerHTML = '<div style="color:var(--success);text-align:center;padding:40px;font-size:1.1rem">✓ No QA issues detected!</div>';
    } else {
      container.innerHTML = `
        <div style="margin-bottom:12px;font-size:.85rem;color:var(--text-dim)">Found <strong>${results.length}</strong> segment(s) with issues</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${results.map(r => {
            const seg = segments.find(s => s.id === r.segmentId) || {};
            return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;">
              <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:4px;">#${r.segmentId}</div>
              <div style="font-size:.82rem;margin-bottom:6px;color:var(--text-dim)">${(seg.source || '').substring(0, 120)}</div>
              ${r.issues.map(i => `<div style="font-size:.76rem;color:${i.severity === 'error' ? 'var(--danger)' : i.severity === 'major' ? 'var(--warning)' : 'var(--text-muted)'};margin:2px 0;">⚠ ${i.message}</div>`).join('')}
            </div>`;
          }).join('')}
        </div>`;
    }
    AppState.notify(`QA: ${results.length} issue(s) found`, results.length ? 'warning' : 'success');
    return results;
  }

  return { checkSegment, runAll };
})();
