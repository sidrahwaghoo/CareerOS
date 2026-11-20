// Smoke test: exercises the real backend generateContent path (with fallback chain).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { generateContent } = require('../src/config/gemini');

const t = Date.now();
generateContent('Reply with exactly: OK')
  .then((text) => console.log('SMOKE OK in', Date.now() - t, 'ms ->', text.trim()))
  .catch((e) => console.log('SMOKE FAIL', e.code, e.status, '->', e.message));
