// ── AI Client ─────────────────────────────────────────────────────
// Unified API client that delegates to the configured AI provider.

window.AIClient = (function() {
  let _provider = 'gemini';
  let _model    = '';

  // ── Internal helpers ────────────────────────────────────────────

  function _getConfig() {
    return (window.LMConfig && LMConfig.providers[_provider]) || null;
  }

  function _getKey() {
    return window.getProviderKey ? getProviderKey(_provider) : '';
  }

  function _defaultModel(cfg) {
    if (_model) return _model;
    return (cfg && cfg.models && cfg.models[0]) || '';
  }

  /** Low-level HTTP call for Gemini REST API. */
  async function _callGemini(prompt, cfg, options) {
    const model = _defaultModel(cfg);
    const key   = _getKey();
    if (!key) throw new Error(`No API key for ${cfg.name}. Go to Settings → AI Providers.`);
    const endpoint = cfg.endpoint.replace('{model}', model) + '?key=' + encodeURIComponent(key);
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxTokens ?? 2048
      }
    };
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /** Low-level HTTP call for OpenAI-compatible APIs (GPT-4o, DeepSeek). */
  async function _callOpenAI(prompt, cfg, options) {
    const model = _defaultModel(cfg);
    const key   = _getKey();
    if (!key) throw new Error(`No API key for ${cfg.name}. Go to Settings → AI Providers.`);
    const body = {
      model,
      messages:    [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.3,
      max_tokens:  options.maxTokens  ?? 2048
    };
    const res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`${cfg.name} error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  /** Low-level HTTP call for Anthropic Claude. */
  async function _callClaude(prompt, cfg, options) {
    const model = _defaultModel(cfg);
    const key   = _getKey();
    if (!key) throw new Error(`No API key for ${cfg.name}. Go to Settings → AI Providers.`);
    const body = {
      model,
      max_tokens: options.maxTokens ?? 2048,
      messages:   [{ role: 'user', content: prompt }]
    };
    const res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data?.content?.[0]?.text || '';
  }

  // ── Public API ──────────────────────────────────────────────────

  return {
    getProvider()       { return _provider; },
    setProvider(name)   { _provider = name; _model = ''; },
    getModel()          { return _model; },
    setModel(m)         { _model = m; },

    /**
     * Send a raw prompt and return the text response.
     * @param {string} prompt
     * @param {string} [tool]    Optional tool context hint (ignored in stub)
     * @param {object} [options] { temperature, maxTokens }
     * @returns {Promise<string>}
     */
    async call(prompt, tool = '', options = {}) {
      const cfg = _getConfig();
      if (!cfg) return '';
      if (cfg.type === 'gemini') return _callGemini(prompt, cfg, options);
      if (cfg.type === 'claude') return _callClaude(prompt, cfg, options);
      return _callOpenAI(prompt, cfg, options);
    },

    /**
     * Translate a single text string.
     * @param {string} text
     * @param {{ srcLang, tgtLang, customPrompt }} [options]
     * @returns {Promise<string>}
     */
    async translate(text, options = {}) {
      const { srcLang = 'en', tgtLang = 'ar', customPrompt = '' } = options;
      const prompt = `Translate the following text from ${srcLang} to ${tgtLang}. Return ONLY the translation, no explanation.\n${customPrompt ? customPrompt + '\n' : ''}Text:\n${text}`;
      return this.call(prompt, 'translate', { temperature: 0.2, maxTokens: 1024 });
    },

    /**
     * Run a completion prompt and return the response.
     * @param {string} prompt
     * @param {object} [options]
     * @returns {Promise<string>}
     */
    async complete(prompt, options = {}) {
      return this.call(prompt, 'complete', options);
    },

    /**
     * Batch-review segments and return LQI results.
     * @param {Array}  segments
     * @param {object} options   { srcLang, tgtLang, customPrompt }
     * @param {Function} [onProgress]  called with 0-100 progress
     * @returns {Promise<Array>}
     */
    async batchReview(segments, options = {}, onProgress) {
      const results = [];
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const prompt = `You are an expert translator. Review this translation and rate it 1-5 for quality.
Source (${options.srcLang || 'en'}): ${seg.source}
Target (${options.tgtLang || 'ar'}): ${seg.target}
Respond in JSON only: {"score":<1-5>,"errors":[{"type":"<type>","severity":"<minor|major|critical>","comment":"<text>"}]}`;
        try {
          const raw = await this.call(prompt, 'lqi', { temperature: 0.1, maxTokens: 512 });
          const m   = raw.match(/\{[\s\S]*\}/);
          const obj = m ? JSON.parse(m[0]) : { score: 3, errors: [] };
          results.push({ segmentId: seg.id, ...obj });
        } catch (e) {
          results.push({ segmentId: seg.id, score: null, errors: [], error: e.message });
        }
        if (onProgress) onProgress(Math.round(((i + 1) / segments.length) * 100));
      }
      return results;
    }
  };
})();
