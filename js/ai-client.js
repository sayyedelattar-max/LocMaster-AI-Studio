// ══════════════════════════════════════════════════════════════
// js/ai-client.js  — LocMaster AI Studio — Unified AI Client
// Supports: Gemini (2.0 Flash), Claude, OpenAI, DeepSeek
// Fixes: uses gemini-2.0-flash instead of deprecated gemini-1.5-pro
// ══════════════════════════════════════════════════════════════

window.AIClient = (function () {

  // ── Internal: build fetch options for each provider ────────────
  function buildRequest(provider, model, messages, opts) {
    const pc = LMConfig.providers[provider];
    const temperature = opts.temperature ?? 0.2;
    const maxTokens   = opts.maxTokens   ?? 2000;

    if (pc.type === 'gemini') {
      const key  = getProviderKey(provider);
      const url  = `${pc.endpoint}/${model}:generateContent?key=${key}`;
      const body = {
        contents: [{ parts: [{ text: messages[messages.length - 1].content }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      };
      return { url, options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } };
    }

    if (pc.type === 'claude') {
      const key  = getProviderKey(provider);
      const body = { model, messages, max_tokens: maxTokens, temperature };
      return {
        url: pc.endpoint,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify(body),
        },
      };
    }

    // OpenAI-compatible (openai, deepseek)
    const key  = getProviderKey(provider);
    const body = { model, messages, max_tokens: maxTokens, temperature };
    return {
      url: pc.endpoint,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify(body),
      },
    };
  }

  // ── Internal: extract text from response ───────────────────────
  function extractText(provider, data) {
    const pc = LMConfig.providers[provider];
    if (pc.type === 'gemini')  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (pc.type === 'claude')  return data.content?.[0]?.text ?? '';
    return data.choices?.[0]?.message?.content ?? '';
  }

  // ── Internal: get provider + model for a tool ──────────────────
  function getToolConfig(toolId) {
    const saved    = JSON.parse(localStorage.getItem('lm_tool_ai_' + toolId) || '{}');
    const defaults = LMConfig.tools[toolId] || LMConfig.tools.editor;
    const provider = saved.provider || defaults.defaultProvider || 'gemini';
    const model    = saved.model    || defaults.defaultModel    || 'gemini-2.0-flash';
    return { provider, model, temperature: saved.temperature ?? defaults.temperature ?? 0.2, maxTokens: saved.maxTokens ?? defaults.maxTokens ?? 2000 };
  }

  // ── Internal: Gemini model fallback list ───────────────────────
  function geminiModelFallbacks(requestedModel) {
    const fallbacks = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
    const list = [requestedModel, ...fallbacks.filter(m => m !== requestedModel)];
    return [...new Set(list)];
  }

  // ── Public: single AI call ─────────────────────────────────────
  async function call(prompt, toolId, callOpts = {}) {
    const tc = getToolConfig(toolId);
    const provider  = callOpts.provider  || tc.provider;
    const model     = callOpts.model     || tc.model;
    const opts      = { temperature: callOpts.temperature ?? tc.temperature, maxTokens: callOpts.maxTokens ?? tc.maxTokens };
    const key = getProviderKey(provider);
    if (!key) {
      throw new Error(`No API key configured for ${LMConfig.providers[provider]?.name || provider}. Go to Settings → AI Providers.`);
    }
    const messages = [{ role: 'user', content: prompt }];
    const pc = LMConfig.providers[provider];

    // Gemini: try model with fallback chain
    if (pc.type === 'gemini') {
      const tries = geminiModelFallbacks(model);
      let lastError = '';
      for (const m of tries) {
        try {
          const { url, options } = buildRequest(provider, m, messages, opts);
          const res  = await fetch(url, options);
          const data = await res.json();
          if (res.ok) return extractText(provider, data);
          lastError = data.error?.message || `HTTP ${res.status}`;
          // Retry on 404 (model not found) or explicit not-found/not-supported messages
          const retryOnStatus = res.status === 404;
          const retryOnMessage = lastError.includes('not found') || lastError.includes('not supported') || lastError.includes('deprecated');
          if (!retryOnStatus && !retryOnMessage) break;
        } catch (fetchErr) {
          lastError = fetchErr.message;
          break;
        }
      }
      throw new Error(lastError || 'Gemini API error');
    }

    // Other providers: single attempt
    const { url, options } = buildRequest(provider, model, messages, opts);
    const res  = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return extractText(provider, data);
  }

  // ── Public: batch review segments ─────────────────────────────
  async function batchReview(segments, opts = {}, onProgress = null) {
    const toolId = opts.toolId || 'editor';
    const results = [];
    const CHUNK = 5;
    let done = 0;

    for (let i = 0; i < segments.length; i += CHUNK) {
      const chunk = segments.slice(i, i + CHUNK);
      const customPrompt = opts.customPrompt || getToolPrompt(toolId);
      const prompt = buildReviewPrompt(chunk, opts, customPrompt);
      try {
        const raw  = await call(prompt, toolId, { temperature: 0.1, maxTokens: 3000 });
        const json = raw.replace(/```json|```/g, '').trim();
        const arr  = JSON.parse(json.match(/\[[\s\S]*\]/)?.[0] || '[]');
        arr.forEach(r => results.push(r));
      } catch (e) {
        chunk.forEach(s => results.push({ segmentId: s.id, score: null, errors: [], error: e.message }));
      }
      done += chunk.length;
      if (onProgress) onProgress(Math.round((done / segments.length) * 100));
      await new Promise(r => setTimeout(r, 200));
    }
    return results;
  }

  function buildReviewPrompt(segments, opts, customPrompt) {
    const srcLang = opts.srcLang || 'en';
    const tgtLang = opts.tgtLang || 'ar';
    const segsText = segments.map((s, i) =>
      `[${i + 1}] id:${s.id}\nSRC: ${s.source}\nTGT: ${s.target || '(empty)'}`
    ).join('\n\n');

    return `${customPrompt ? customPrompt + '\n\n' : ''}You are a professional translation quality evaluator (${srcLang}→${tgtLang}).
Review each segment and return ONLY a JSON array:
[{"segmentId":<id>,"score":<1-5>,"errors":[{"type":"<error_type>","severity":"<critical|major|minor>","description":"<description>"}],"suggestion":"<improved translation if needed>"}]

Segments:
${segsText}

Return ONLY valid JSON array, no markdown fences.`;
  }

  // ── Public: test API key ───────────────────────────────────────
  async function testKey(provider) {
    const key = getProviderKey(provider);
    if (!key) return { ok: false, error: 'No key configured' };
    try {
      const result = await call('Say "OK" in one word.', 'editor', { provider, temperature: 0, maxTokens: 10 });
      return { ok: true, response: result };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  return { call, batchReview, testKey, getToolConfig };
})();
