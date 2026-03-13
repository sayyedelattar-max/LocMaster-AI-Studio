// ══════════════════════════════════════════════════════════════════════════════
// LOCMASTER AI STUDIO — Unified AI Client
// ══════════════════════════════════════════════════════════════════════════════

window.AIClient = {

  // ── Main dispatch ──────────────────────────────────────────────────────────
  async call(prompt, toolId = 'editor', options = {}) {
    const cfg      = getToolConfig ? getToolConfig(toolId) : {};
    const provider = options.provider || cfg.provider || this._getFirstProvider();
    const key      = getProviderKey(provider);

    if (!key) {
      throw new Error(
        `No API key for ${LMConfig.providers[provider]?.name || provider}. ` +
        'Go to Settings → AI Providers.'
      );
    }

    const pc    = LMConfig.providers[provider];
    const model = options.model || cfg.model || pc?.defaultModel || 'gemini-2.0-flash';
    const opts  = {
      temperature: options.temperature != null ? options.temperature : (cfg.temperature || 0.3),
      maxTokens:   options.maxTokens   || cfg.maxTokens || 2000,
      timeout:     options.timeout     || 60000,
    };

    try {
      switch (pc?.type) {
        case 'gemini':   return await this._callGemini(prompt, model, key, opts);
        case 'claude':   return await this._callClaude(prompt, model, key, opts);
        case 'openai':   return await this._callOpenAI(prompt, model, key, opts);
        case 'deepseek': return await this._callDeepSeek(prompt, model, key, opts);
        default:         return await this._callGemini(prompt, model, key, opts);
      }
    } catch (err) {
      console.error(`AIClient.call [${provider}/${model}]:`, err);
      throw err;
    }
  },

  // ── Gemini ────────────────────────────────────────────────────────────────
  async _callGemini(prompt, model, key, opts) {
    // Fallback chain in case of 404
    const models = [...new Set([model, 'gemini-2.0-flash', 'gemini-1.5-flash'])];
    let lastErr = null;

    for (const m of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${m}:generateContent?key=${key}`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature:    opts.temperature,
                maxOutputTokens: opts.maxTokens,
                topP: 0.9,
                topK: 40,
              },
              safetySettings: LMConfig.safetySettings,
            }),
          }
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          lastErr = errData.error?.message || `HTTP ${res.status}`;
          if (res.status === 404 || lastErr.includes('not found')) {
            console.warn(`Gemini model ${m} not available, trying fallback…`);
            continue;
          }
          throw new Error(lastErr);
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Empty Gemini response');
        return text;

      } catch (err) {
        lastErr = err.message;
        if (!err.message.includes('not found') && !err.message.includes('404')) throw err;
        console.warn(`Gemini model ${m} failed: ${lastErr}`);
      }
    }
    throw new Error(`Gemini API failed: ${lastErr}`);
  },

  // ── Claude ────────────────────────────────────────────────────────────────
  async _callClaude(prompt, model, key, opts) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':       key,
        'anthropic-version': '2023-06-01',
        'Content-Type':    'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens:  opts.maxTokens,
        temperature: opts.temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Claude API HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) throw new Error('Empty Claude response');
    return text;
  },

  // ── OpenAI ────────────────────────────────────────────────────────────────
  async _callOpenAI(prompt, model, key, opts) {
    const models = [...new Set([model, 'gpt-4o', 'gpt-4-turbo'])];
    let lastErr = null;

    for (const m of models) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: m,
            messages: [{ role: 'user', content: prompt }],
            temperature: opts.temperature,
            max_tokens:  opts.maxTokens,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          lastErr = err.error?.message || `HTTP ${res.status}`;
          if (res.status === 404 || lastErr.includes('not found')) { continue; }
          throw new Error(lastErr);
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty OpenAI response');
        return text;

      } catch (err) {
        lastErr = err.message;
        if (!err.message.includes('not found') && !err.message.includes('404')) throw err;
      }
    }
    throw new Error(`OpenAI API failed: ${lastErr}`);
  },

  // ── DeepSeek ──────────────────────────────────────────────────────────────
  async _callDeepSeek(prompt, model, key, opts) {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: opts.temperature,
        max_tokens:  opts.maxTokens,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `DeepSeek API HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty DeepSeek response');
    return text;
  },

  // ── Batch Review ──────────────────────────────────────────────────────────
  async batchReview(segments, options = {}, progressCallback) {
    const results = [];
    const total   = segments.length;

    for (let i = 0; i < total; i++) {
      const seg = segments[i];
      try {
        const prompt   = this._buildReviewPrompt(seg, options);
        const raw      = await this.call(prompt, 'lqi', { temperature: 0.2, maxTokens: 1000 });
        const parsed   = this._parseJSON(raw);
        results.push({ segmentId: seg.id, ...parsed });
      } catch (err) {
        console.error(`Review failed for segment ${seg.id}:`, err);
        results.push({
          segmentId: seg.id,
          score: 0,
          issues: [{ type: 'error', severity: 'critical', message: err.message }],
        });
      }

      if (progressCallback) progressCallback(Math.round((i + 1) / total * 100));
      await new Promise(r => setTimeout(r, 80)); // rate limiting
    }

    return results;
  },

  // ── Helpers ───────────────────────────────────────────────────────────────
  _buildReviewPrompt(seg, opts = {}) {
    const custom = opts.customPrompt || '';
    return `You are an expert Arabic translator and quality reviewer.

Source (${opts.srcLang || 'en'}): ${seg.source}
Target (${opts.tgtLang || 'ar'}): ${seg.target}

Evaluate for: accuracy, grammar, natural Arabic phrasing, terminology, formatting.
${custom ? `\nAdditional instructions:\n${custom}` : ''}

Respond ONLY in JSON:
{"score":<1-5>,"issues":[{"type":"<string>","severity":"critical|major|minor","message":"<string>"}],"suggestion":"<improved or empty>","confidence":<0-1>}`;
  },

  _parseJSON(raw) {
    try {
      const m = (raw || '').match(/\{[\s\S]*\}/);
      if (!m) return { score: 0, issues: [] };
      return JSON.parse(m[0]);
    } catch {
      return { score: 0, issues: [] };
    }
  },

  _getFirstProvider() {
    for (const p of ['gemini', 'claude', 'openai', 'deepseek']) {
      if (typeof isProviderConfigured === 'function' && isProviderConfigured(p)) return p;
    }
    return 'gemini';
  },
};
