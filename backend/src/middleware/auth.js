// Real Firebase Authentication middleware.
// Verifies the Firebase ID token supplied by the client on every protected
// request and exposes the decoded identity on `req.user`. No token is ever
// trusted from the request body or query string.
const { admin } = require('../config/firebase');

function extractBearerToken(req) {
  const header = req.headers && req.headers.authorization;
  if (typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  return token || null;
}

function toPublicUser(decoded) {
  return {
    uid: decoded.uid,
    email: decoded.email || null,
    name: decoded.name || null,
  };
}

/**
 * Require a valid Firebase ID token.
 * Reads `Authorization: Bearer <token>`, verifies it against Firebase Auth and
 * sets `req.user = { uid, email, name }`. Responds 401 on any missing/invalid
 * token and 503 if the auth service is not configured.
 */
async function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Authentication required: provide an Authorization: Bearer <token> header',
    });
  }

  if (!admin || typeof admin.auth !== 'function') {
    return res.status(503).json({ error: 'Authentication service is unavailable' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = toPublicUser(decoded);
    return next();
  } catch (err) {
    console.warn('Firebase ID token verification failed:', err && err.message);
    return res.status(401).json({ error: 'Authentication failed: invalid or expired token' });
  }
}

/**
 * Optional authentication: if a valid token is present, populate `req.user`;
 * otherwise continue anonymously. Never rejects a request because of auth.
 * Useful only for public endpoints; protected routes must use requireAuth.
 */
async function optionalAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token || !admin || typeof admin.auth !== 'function') return next();
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = toPublicUser(decoded);
  } catch (err) {
    // Ignore invalid tokens on optional endpoints.
  }
  return next();
}

module.exports = { requireAuth, optionalAuth };
