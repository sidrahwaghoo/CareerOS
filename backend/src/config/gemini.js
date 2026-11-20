const { GoogleGenAI } = require('@google/genai');

// Live Gemini configuration. There is intentionally no fallback response:
// when credentials are missing or the API fails, callers receive a clear error.
const API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const MODEL = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
// Fallback chain: prioritized by instant responsiveness and low latency
const DEFAULT_FALLBACKS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.7-flash'];
const FALLBACK_MODELS = [
  ...((process.env.GEMINI_FALLBACK_MODELS || '').split(',').map((s) => s.trim())),
  MODEL,
  ...DEFAULT_FALLBACKS,
].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

const RETRYABLE = /\b(429|500|503)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|timed out/i;
const COOLDOWN_MS = 60 * 1000;
const cooldownUntil = new Map(); // model -> timestamp; overloaded models are skipped briefly

/**
 * Calls generateContent across the fallback chain. A model that returns
 * 503/429 or times out is put on a 60s cooldown so subsequent requests go straight to a
 * healthy model instead of waiting on the slow overloaded response again.
 * If everything fails, the error lists every model's failure, not just the last.
 */
async function callWithFallback(buildRequest) {
  const now = Date.now();
  const healthy = FALLBACK_MODELS.filter((m) => (cooldownUntil.get(m) || 0) <= now);
  const order = healthy.length > 0 ? healthy : FALLBACK_MODELS;
  const failures = [];
  for (const model of order) {
    let timer;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Model call timed out after 30s')), 30000);
      });
      const response = await Promise.race([
        genAI.models.generateContent({ model, ...buildRequest() }),
        timeoutPromise,
      ]);
      clearTimeout(timer);
      cooldownUntil.delete(model);
      return response;
    } catch (err) {
      if (timer) clearTimeout(timer);
      const msg = String((err && err.message) || err);
      const retryable = RETRYABLE.test(msg);
      if (retryable) cooldownUntil.set(model, Date.now() + COOLDOWN_MS);
      failures.push(`${model}: ${retryable ? 'temporarily overloaded/timed out' : msg.slice(0, 160)}`);
      console.warn(`Gemini model ${model} failed: ${msg.slice(0, 200)}`);
    }
  }
  const allBusy = failures.every((f) => f.includes('temporarily overloaded'));
  throw new GeminiError(
    allBusy
      ? 'Gemini is experiencing high demand right now. Please try again in a minute.'
      : `Gemini API request failed on all models -> ${failures.join(' | ')}`,
    allBusy ? 'GEMINI_UNAVAILABLE' : 'GEMINI_REQUEST_FAILED'
  );
}

class GeminiError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'GeminiError';
    this.code = code || 'GEMINI_ERROR';
    if (this.code === 'GEMINI_UNAVAILABLE') this.status = 503;
  }
}

let genAI = null;
let configured = false;
let initError = null;

if (API_KEY.length > 0) {
  try {
    genAI = new GoogleGenAI({ apiKey: API_KEY });
    configured = true;
  } catch (err) {
    initError = err;
    configured = false;
  }
}

/**
 * Call the live Gemini model with plain text input.
 * @param {string} prompt
 * @returns {Promise<string>} the raw text response from the model
 */
async function generateContent(prompt) {
  if (!configured || !genAI) {
    if (initError) {
      throw new GeminiError(
        `Gemini client failed to initialize: ${initError.message}`,
        'GEMINI_INIT_FAILED'
      );
    }
    throw new GeminiError(
      'GEMINI_API_KEY is not configured. Add it to backend/.env to use live AI.',
      'GEMINI_NOT_CONFIGURED'
    );
  }

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new GeminiError('A non-empty prompt is required.', 'INVALID_PROMPT');
  }

  const response = await callWithFallback(() => ({
    contents: prompt,
    config: { temperature: 0.3 },
  }));

  const text = typeof response && typeof response.text === 'function'
    ? response.text()
    : response && response.text;

  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new GeminiError(
      'Gemini returned an empty or non-text response. No mock response was substituted.',
      'GEMINI_EMPTY_RESPONSE'
    );
  }

  return text;
}

/**
 * Call the live Gemini model with tool calling support.
 * The model can request tool executions which are executed by the caller
 * (this function handles the tool call/result loop internally for simple cases).
 * @param {string} prompt - The user/system prompt
 * @param {Array} tools - Array of Gemini tool declarations
 * @param {Function} executeTool - Async function(name, args) => result
 * @returns {Promise<string>} Final text response after tool execution
 */
function extractFunctionCalls(candidate) {
  if (!candidate) return [];
  if (typeof candidate.functionCalls === 'function') {
    try {
      const res = candidate.functionCalls();
      if (Array.isArray(res)) return res;
    } catch (_) {}
  }
  if (Array.isArray(candidate.functionCalls)) return candidate.functionCalls;
  const parts = candidate.content?.parts || [];
  return parts.filter((p) => p && p.functionCall).map((p) => p.functionCall);
}

/**
 * Call the live Gemini model with tool calling support.
 * The model can request tool executions which are executed by the caller.
 * @param {string} prompt - The user/system prompt
 * @param {Array} tools - Array of Gemini tool declarations
 * @param {Function} executeTool - Async function(name, args) => result
 * @returns {Promise<string>} Final text response after tool execution
 */
async function generateContentWithTools(prompt, tools, executeTool) {
  if (!configured || !genAI) {
    if (initError) {
      throw new GeminiError(
        `Gemini client failed to initialize: ${initError.message}`,
        'GEMINI_INIT_FAILED'
      );
    }
    throw new GeminiError(
      'GEMINI_API_KEY is not configured. Add it to backend/.env to use live AI.',
      'GEMINI_NOT_CONFIGURED'
    );
  }

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new GeminiError('A non-empty prompt is required.', 'INVALID_PROMPT');
  }

  // Attempt generation with tool declarations
  try {
    const response = await callWithFallback(() => ({
      contents: prompt,
      config: {
        temperature: 0.3,
        tools: Array.isArray(tools) && tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
      },
    }));

    const candidate = response.candidates?.[0];
    const functionCalls = extractFunctionCalls(candidate);

    if (functionCalls.length > 0 && typeof executeTool === 'function') {
      const toolResults = [];
      for (const fc of functionCalls) {
        try {
          const res = await executeTool(fc.name, fc.args || {});
          toolResults.push({ tool: fc.name, result: res });
        } catch (e) {
          toolResults.push({ tool: fc.name, error: e.message });
        }
      }

      // Second turn feeding tool outputs back to complete the analysis
      const secondTurnPrompt = `${prompt}\n\nEXTERNAL TOOL DISCOVERY RESULTS:\n${JSON.stringify(toolResults, null, 2)}\n\nNow synthesize the final requested JSON output adhering strictly to the schema.`;
      return await generateContent(secondTurnPrompt);
    }

    const text = typeof response.text === 'function' ? response.text() : response.text;
    if (typeof text === 'string' && text.trim().length > 0) {
      return text;
    }
  } catch (err) {
    console.warn('Tool-augmented generation fell back to direct generation:', err.message);
  }

  // Resilient fallback: direct generation
  return await generateContent(prompt);
}

module.exports = { generateContent, generateContentWithTools, MODEL, genAI, configured, GeminiError };
