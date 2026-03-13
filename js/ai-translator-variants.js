// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — AI Translator: 5-Variant Generation
// ══════════════════════════════════════════════════════════════════════════════

window.AITranslatorVariants = (() => {

  // ── Variant definitions ───────────────────────────────────────────────────
  const VARIANT_STYLES = [
    {
      id:      'direct',
      label:   '1. Direct & Accurate',
      icon:    '🎯',
      color:   '#3b82f6',
      desc:    'Literal and precise — exact meaning preserved',
      system:  'Translate this English text to Arabic with absolute precision. Maintain exact meaning without interpretation. Preserve all formatting, numbers, and proper nouns.',
    },
    {
      id:      'refined',
      label:   '2. Refined Translation',
      icon:    '✨',
      color:   '#8b5cf6',
      desc:    'Enhanced style, flow, and natural Arabic',
      system:  'Translate to Arabic with natural flow and improved readability. Enhance style while preserving all original meaning.',
    },
    {
      id:      'transcreated',
      label:   '3. Trans-created',
      icon:    '🌟',
      color:   '#f59e0b',
      desc:    'Culturally adapted for Arabic audience impact',
      system:  'Adapt this text for an Arabic-speaking audience. Prioritize cultural relevance and emotional impact. You may deviate from literal structure if it improves resonance.',
    },
    {
      id:      'paraphrased',
      label:   '4. Paraphrased',
      icon:    '🔄',
      color:   '#06b6d4',
      desc:    'Alternative wording preserving original intent',
      system:  'Rephrase this in Arabic using alternative wording and sentence structures. Convey the same intent without being a direct copy.',
    },
    {
      id:      'final',
      label:   '5. Revised Final Version',
      icon:    '🏆',
      color:   '#10b981',
      desc:    'Best of all variants — ready to use',
      system:  'Synthesize the best qualities of all translation approaches. Produce a production-ready Arabic translation that balances accuracy, naturalness, cultural fit, and consistency.',
    },
  ];

  // ── Public: Generate 5 variants for a source text ─────────────────────────
  async function generateVariants(sourceText, dna, customPrompt = '') {
    if (!sourceText || !sourceText.trim()) {
      throw new Error('Source text is required');
    }

    const prompt = _buildCombinedPrompt(sourceText, dna, customPrompt);
    const raw    = await AIClient.call(prompt, 'aitranslator', {
      temperature: 0.4,
      maxTokens:   4000,
    });

    return _parseVariants(raw);
  }

  // ── Public: Build a variant-specific prompt ────────────────────────────────
  function buildTranslationPrompt(style, dna, customPrompt = '') {
    const variant = VARIANT_STYLES.find(v => v.id === style) || VARIANT_STYLES[0];
    const dnaCtx  = _buildDNAContext(dna);
    const custom  = customPrompt ? `\n\nAdditional instructions: ${customPrompt}` : '';

    return `${variant.system}

TARGET: Arabic${dna?.dialect && dna.dialect !== 'ar' ? ` (${dna.dialect})` : ''}
${dna?.domain ? `DOMAIN: ${dna.domain}${dna.subDomain ? ' — ' + dna.subDomain : ''}` : ''}
${dna?.register ? `REGISTER: ${dna.register}` : ''}
${dnaCtx}${custom}

SOURCE TEXT:
"{{SOURCE_TEXT}}"

Provide ONLY the Arabic translation. No explanations unless asked.`;
  }

  // ── Public: Apply a variant's translation to editor segments ─────────────
  function applyToSegments(variantText, segments, segmentId) {
    if (!segments || !segments.length) return 0;
    let applied = 0;

    if (segmentId) {
      // Apply to a specific segment
      const seg = segments.find(s => String(s.id) === String(segmentId));
      if (seg) {
        seg.target    = variantText;
        seg.matchType = 'mt';
        applied++;
      }
    } else {
      // Apply to the currently active segment via DOM
      const active = document.querySelector('.seg-row.active .seg-tgt');
      if (active) {
        active.textContent = variantText;
        active.dispatchEvent(new Event('input', { bubbles: true }));
        applied++;
      }
    }

    return applied;
  }

  // ── Public: Get variant definitions (for UI) ───────────────────────────────
  function getVariantStyles() {
    return VARIANT_STYLES;
  }

  // ── Private: Build combined 5-variant prompt ───────────────────────────────
  function _buildCombinedPrompt(sourceText, dna, customPrompt) {
    const dnaCtx  = _buildDNAContext(dna);
    const dialect = dna?.dialect || 'ar';
    const domain  = dna?.domain  || 'General';
    const register = dna?.register || 'formal';
    const custom  = customPrompt ? `\n• Special instructions: ${customPrompt}` : '';

    return `You are an expert professional translator (English → Arabic ${dialect}).
${dna ? `
FILE DNA CONTEXT (apply strictly):
• Domain: ${domain}${dna.subDomain ? ' — ' + dna.subDomain : ''}
• Register: ${register} | Tone: ${dna.tone || 'professional'}
• Dialect: ${dialect}
• Translator style: ${dna.translatorStyle || 'professional'}
• Style guide: ${dna.styleGuide || 'standard'}
${dnaCtx}${custom}` : `Context: ${register} Arabic translation.${custom}`}

SOURCE TEXT:
"${sourceText}"

Provide EXACTLY 5 Arabic translation variants. Return ONLY valid JSON:
{
  "direct": {
    "text": "<Literal and precise Arabic rendition — exact meaning, no embellishment. Target: ${dialect}. Terminology: [TERMS]>",
    "notes": "<Key translation choices>"
  },
  "refined": {
    "text": "<Improved Arabic — enhanced style, flow, naturalness while preserving exact meaning. Domain: ${domain}. Register: ${register}. Terminology: [TERMS]>",
    "notes": "<What was refined>"
  },
  "transcreated": {
    "text": "<Culturally adapted for Arabic audience — prioritize emotional impact and resonance. May deviate from literal structure. Domain: ${domain}. Target dialect: ${dialect}. Terminology: [TERMS]>",
    "notes": "<Cultural/creative choices>"
  },
  "paraphrased": {
    "text": "<Rephrased using alternative Arabic wording and sentence structures — same intent, different expression. Domain: ${domain}. Terminology: [TERMS]>",
    "notes": "<Paraphrasing approach>"
  },
  "final": {
    "text": "<Best synthesis — production-ready, balances accuracy, naturalness, cultural fit, and consistency. Domain: ${domain}. Terminology: [TERMS]>",
    "notes": "<Why this is optimal>"
  }
}

Replace [TERMS] with actual terminology from the DNA context when available. Replace placeholder text with real translations.`;
  }

  // ── Private: Build DNA context string ────────────────────────────────────
  function _buildDNAContext(dna) {
    if (!dna) return '';
    const parts = [];

    if (dna.recurringTerms?.length) {
      parts.push('• Established terminology:');
      dna.recurringTerms.slice(0, 15).forEach(t => {
        parts.push(`  - "${t.src}" → "${t.tgt || '?'}"`);
      });
    }
    if (dna.systemicIssues?.length) {
      parts.push('• Known issues to avoid: ' + dna.systemicIssues.join('; '));
    }

    return parts.join('\n');
  }

  // ── Private: Parse AI response into variants ──────────────────────────────
  function _parseVariants(raw) {
    if (!raw) throw new Error('Empty AI response');

    // Extract JSON from response
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in AI response');

    let data;
    try {
      data = JSON.parse(match[0]);
    } catch (e) {
      throw new Error('Could not parse AI response as JSON: ' + e.message);
    }

    // Validate expected keys
    const required = ['direct', 'refined', 'transcreated', 'paraphrased', 'final'];
    const missing  = required.filter(k => !data[k]);
    if (missing.length) {
      throw new Error(`Missing variants in response: ${missing.join(', ')}`);
    }

    return data;
  }

  // ── Expose public API ─────────────────────────────────────────────────────
  return {
    generateVariants,
    buildTranslationPrompt,
    applyToSegments,
    getVariantStyles,
    VARIANT_STYLES,
  };

})();
