'use strict';
// Configurable AI provider layer. API keys are read from env on the server only.
// Every result carries an explicit `mode` so the UI can never present a demo response as real LLM output:
//   mode: 'llm'  -> a real model call was made (provider + model reported)
//   mode: 'demo' -> deterministic template/extractive output, NO model was called
const cfg = require('./config');

function status() {
  const p = cfg.AI_PROVIDER;
  if (p === 'openai' && cfg.OPENAI_API_KEY) return { provider: 'openai', model: cfg.OPENAI_MODEL, mode: 'llm' };
  if (p === 'gemini' && cfg.GEMINI_API_KEY) return { provider: 'gemini', model: cfg.GEMINI_MODEL, mode: 'llm' };
  return { provider: 'demo', model: null, mode: 'demo' };
}

async function withTimeout(promise, ms = 20000) {
  return await Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('LLM timeout')), ms))]);
}

// complete({system, user}) -> {text, mode, provider, model} | throws
async function complete({ system, user, maxTokens = 400 }) {
  const s = status();
  if (s.mode !== 'llm') return { text: null, ...s };
  if (s.provider === 'openai') {
    const r = await withTimeout(fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: cfg.OPENAI_MODEL, max_tokens: maxTokens, temperature: 0.2,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    }));
    if (!r.ok) throw new Error(`OpenAI error ${r.status}`);
    const j = await r.json();
    return { text: j.choices?.[0]?.message?.content?.trim() || '', ...s };
  }
  if (s.provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.GEMINI_MODEL}:generateContent`;
    const r = await withTimeout(fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.GEMINI_API_KEY },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 } }),
    }));
    if (!r.ok) throw new Error(`Gemini error ${r.status}`);
    const j = await r.json();
    return { text: j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim() || '', ...s };
  }
  return { text: null, ...status() };
}

module.exports = { status, complete };
