const { GoogleGenAI } = require('@google/genai');

// Live Gemini configuration. There is intentionally no fallback response:
// when credentials are missing or the API fails, callers receive a clear error.
const API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const MODEL = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();

class GeminiError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'GeminiError';
    this.code = code || 'GEMINI_ERROR';
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
 * Call the live Gemini model. Never returns fabricated data.
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

  let response;
  try {
    response = await genAI.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { temperature: 0.3 },
    });
  } catch (err) {
    throw new GeminiError(`Gemini API request failed: ${err.message}`, 'GEMINI_REQUEST_FAILED');
  }

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

module.exports = { generateContent, MODEL, genAI, configured, GeminiError };
