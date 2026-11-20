// Diagnostic: lists Gemini models available to GEMINI_API_KEY and test-calls the configured one.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { GoogleGenAI } = require('@google/genai');

(async () => {
  const ai = new GoogleGenAI({ apiKey: (process.env.GEMINI_API_KEY || '').trim() });
  const names = [];
  try {
    const pager = await ai.models.list();
    for await (const m of pager) {
      if ((m.supportedActions || []).includes('generateContent')) names.push(m.name);
    }
    console.log('MODELS supporting generateContent:\n' + names.join('\n'));
  } catch (e) {
    console.log('LIST FAILED:', e.message);
  }
  const candidates = [process.env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-flash-latest'].filter(Boolean);
  for (const m of candidates) {
    try {
      const r = await ai.models.generateContent({ model: m, contents: 'Reply with OK' });
      console.log('CALL OK', m, '->', r.text);
    } catch (e) {
      console.log('CALL FAIL', m, '->', e.message.slice(0, 300));
    }
  }
})();
