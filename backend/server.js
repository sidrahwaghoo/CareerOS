require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimitModule = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Both config modules enforce real credentials. firebase.js throws at startup
// if any Firebase credential is missing, so the app never runs on a fake store.
const { firestore } = require('./src/config/firebase');
const { configured: geminiConfigured } = require('./src/config/gemini');

// express-rate-limit v7+ exposes `rateLimit`; older versions export the
// function directly. Support both without pinning a major version here.
const rateLimit = rateLimitModule.rateLimit || rateLimitModule;

const careerRecordRoutes = require('./src/routes/careerRecordRoutes');
const matchRoutes = require('./src/routes/matchRoutes');
const draftRoutes = require('./src/routes/draftRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const exportRoutes = require('./src/routes/exportRoutes');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Security headers.
app.use(helmet());

const allowedOrigin = process.env.FRONTEND_URL;
app.use(
  cors(
    allowedOrigin
      ? { origin: allowedOrigin, credentials: true }
      : { origin: true, credentials: true }
  )
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Lightweight request logging: method, path, status and duration.
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`
    );
  });
  next();
});

// Rate limit the API. Health checks are exempt so monitoring is not throttled.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  message: {
    error: 'Too many requests. Please try again in 15 minutes.',
    code: 'RATE_LIMITED',
  },
});

// Health check reflects the real backend state.
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    storage: firestore ? 'firestore' : 'unconfigured',
    ai: geminiConfigured ? 'gemini-live' : 'unconfigured',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', apiLimiter);

// API Routes
app.use('/api/records', careerRecordRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/draft', draftRoutes);
// PRD-named plural alias so /api/drafts/:id/approve and /api/drafts/:id/reject
// resolve in addition to the legacy /api/draft/* endpoints.
app.use('/api/drafts', draftRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/export', exportRoutes);

// Serve static frontend (for production)
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// SPA fallback: serve index.html for non-API routes
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  next();
});

// Structured JSON error responses. Stack traces are never exposed in production.
app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);
  const rawStatus = err && (err.status || err.statusCode);
  const status =
    Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599
      ? rawStatus
      : 500;
  const message =
    status === 500 && isProduction
      ? 'Internal server error'
      : (err && err.message) || 'Internal server error';

  const payload = { error: message };
  if (err && err.details) payload.details = err.details;
  if (!isProduction && err && err.stack) payload.stack = err.stack;
  res.status(status).json(payload);
});

app.listen(PORT, () => {
  console.log(`Credensa backend running on port ${PORT}`);
  console.log('Storage: Firestore');
  console.log(
    `AI: ${geminiConfigured ? 'Gemini (live)' : 'unconfigured (set GEMINI_API_KEY to enable AI agents)'}`
  );
});

module.exports = app;
