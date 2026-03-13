// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — AI Translator: File DNA Analysis
// ══════════════════════════════════════════════════════════════════════════════

window.AITranslatorDNA = (() => {

  // ── Domain keyword dictionaries ───────────────────────────────────────────
  const DOMAIN_KEYWORDS = {
    medical: [
      'patient','diagnosis','treatment','clinical','dosage','prescription',
      'symptom','therapy','surgery','pharmaceutical','medication','hospital',
      'physician','disease','chronic','acute','pathology','specimen',
    ],
    legal: [
      'contract','agreement','clause','liability','indemnification','jurisdiction',
      'plaintiff','defendant','court','arbitration','compliance','regulation',
      'statute','witness','affidavit','breach','obligation','warranty',
    ],
    technical: [
      'configuration','parameter','installation','firmware','protocol','interface',
      'specification','module','component','architecture','deployment','api',
      'database','algorithm','encryption','authentication','integration',
    ],
    marketing: [
      'brand','campaign','audience','engagement','conversion','revenue',
      'roi','strategy','promotion','advertisement','customer','consumer',
      'market','sales','product','launch','awareness','content',
    ],
    financial: [
      'invoice','payment','budget','revenue','expense','asset','liability',
      'balance','transaction','account','audit','portfolio','investment',
      'profit','loss','tax','payable','receivable',
    ],
  };

  // ── Register detection patterns ───────────────────────────────────────────
  const REGISTER_PATTERNS = {
    technical: [
      /\b(configure|implement|deploy|initialize|execute|parameter|specification)\b/i,
      /\b(api|sdk|xml|json|csv|html|url|http)\b/i,
      /\d+\s*(ms|kb|mb|gb|px|rpm|hz|mhz)/i,
    ],
    formal: [
      /\b(pursuant|herein|thereof|whereas|hereby|aforementioned)\b/i,
      /\b(shall|must|required|mandatory|authorized|permitted)\b/i,
    ],
    colloquial: [
      /\b(gonna|wanna|kinda|sorta|yeah|nope|okay|ok)\b/i,
      /!/g,
    ],
  };

  // ── Public: Build full File DNA from segments ──────────────────────────────
  function buildFileDNA(segments) {
    if (!segments || !segments.length) {
      return { domain: 'General', register: 'formal', recurringTerms: [], systemicIssues: [] };
    }

    const allSource = segments.map(s => s.source || '').join(' ');
    const domain    = analyzeDomain(allSource);
    const register  = detectRegister(allSource);
    const terms     = extractTerminology(segments);
    const patterns  = detectPatterns(segments);

    return {
      domain,
      subDomain:      '',
      register,
      tone:           register === 'technical' ? 'technical' : 'professional',
      sourceLanguage: 'en',
      targetLanguage: 'ar',
      dialect:        'ar',
      translatorStyle: patterns.translatorStyle || 'standard',
      recurringTerms: terms,
      systemicIssues: patterns.issues,
      redFlags:       patterns.redFlags,
      styleGuide:     '',
      totalSegments:  segments.length,
      builtAt:        Date.now(),
    };
  }

  // ── Public: Detect domain from text ───────────────────────────────────────
  function analyzeDomain(text) {
    if (!text) return 'General';
    const lower  = text.toLowerCase();
    const scores = {};

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      scores[domain] = keywords.filter(kw => lower.includes(kw)).length;
    }

    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    if (!best || best[1] === 0) return 'General';

    const labelMap = {
      medical:   'Medical',
      legal:     'Legal',
      technical: 'Technical',
      marketing: 'Marketing',
      financial: 'Financial',
    };
    return labelMap[best[0]] || 'General';
  }

  // ── Pattern constant ──────────────────────────────────────────────────────
  const CAPITALIZED_TERM_RE = /\b[A-Z][a-zA-Z]{2,}\b/g;

  // ── Public: Build terminology dictionary from bilingual segments ───────────
  function extractTerminology(segments) {
    const termMap = {};

    segments.forEach(seg => {
      if (!seg.source || !seg.target) return;

      // Extract capitalized terms (proper nouns / key terms)
      const srcTerms = seg.source.match(CAPITALIZED_TERM_RE) || [];
      srcTerms.forEach(term => {
        if (!termMap[term]) {
          termMap[term] = { src: term, tgt: '', count: 0, segIds: [] };
        }
        termMap[term].count++;
        termMap[term].segIds.push(seg.id);
      });
    });

    // Attempt to find Arabic translations by co-occurrence
    segments.forEach(seg => {
      if (!seg.source || !seg.target) return;
      const srcTerms = seg.source.match(CAPITALIZED_TERM_RE) || [];
      srcTerms.forEach(term => {
        if (termMap[term] && !termMap[term].tgt) {
          // Look for Arabic words in target that appear only in segs containing this term
          const arabicWords = (seg.target.match(/[\u0600-\u06FF]{3,}/g) || []);
          if (arabicWords.length) {
            termMap[term].tgt = arabicWords[0]; // best-effort heuristic
          }
        }
      });
    });

    return Object.values(termMap)
      .filter(t => t.count >= 2) // only recurring terms
      .sort((a, b) => b.count - a.count)
      .slice(0, 30)
      .map(({ src, tgt, count }) => ({ src, tgt, frequency: count }));
  }

  // ── Public: Detect systemic issues & patterns ──────────────────────────────
  function detectPatterns(segments) {
    const issues   = [];
    const redFlags = [];
    let untranslatedCount = 0;
    let inconsistencyCount = 0;
    let tagIssueCount = 0;

    // Build source→target map for consistency check
    const srcToTgt = {};
    segments.forEach(seg => {
      if (!seg.source || !seg.target) {
        untranslatedCount++;
        return;
      }
      const key = seg.source.trim().toLowerCase();
      if (!srcToTgt[key]) {
        srcToTgt[key] = new Set();
      }
      srcToTgt[key].add(seg.target.trim());
    });

    // Check for translation inconsistencies
    for (const [src, tgts] of Object.entries(srcToTgt)) {
      if (tgts.size > 1) {
        inconsistencyCount++;
      }
    }

    // Check for HTML/XML tag preservation
    segments.forEach(seg => {
      if (!seg.source || !seg.target) return;
      const srcTags = (seg.source.match(/<[^>]+>/g) || []).length;
      const tgtTags = (seg.target.match(/<[^>]+>/g) || []).length;
      if (srcTags !== tgtTags) tagIssueCount++;
    });

    if (untranslatedCount > 0) {
      issues.push(`${untranslatedCount} untranslated segment(s)`);
    }
    if (inconsistencyCount > 3) {
      issues.push(`Terminology inconsistencies detected (${inconsistencyCount} source strings have multiple translations)`);
    }
    if (tagIssueCount > 0) {
      redFlags.push(`${tagIssueCount} segment(s) with mismatched inline tags`);
    }

    // Detect register
    const allSrc = segments.map(s => s.source || '').join(' ');
    const register = detectRegister(allSrc);

    // Translator style observation
    const pct = Math.round(
      (segments.filter(s => s.target).length / Math.max(1, segments.length)) * 100
    );
    const translatorStyle = pct > 80
      ? 'consistent and productive'
      : pct > 40
        ? 'partially complete'
        : 'early-stage translation';

    return { issues, redFlags, register, translatorStyle };
  }

  // ── Private: Detect text register ──────────────────────────────────────────
  function detectRegister(text) {
    if (!text) return 'formal';
    const scores = { technical: 0, formal: 0, colloquial: 0 };

    for (const [reg, patterns] of Object.entries(REGISTER_PATTERNS)) {
      patterns.forEach(p => {
        const m = text.match(p);
        if (m) scores[reg] += m.length;
      });
    }

    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    if (best[1] === 0) return 'formal';
    return best[0] === 'colloquial' ? 'semi-formal' : best[0];
  }

  // ── Expose public API ─────────────────────────────────────────────────────
  return { buildFileDNA, analyzeDomain, extractTerminology, detectPatterns };

})();
