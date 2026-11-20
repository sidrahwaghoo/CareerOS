// Firebase Admin / Firestore configuration.
// Credentials are REQUIRED. There is no local/in-memory store fallback.
// If any credential is missing, the module throws at startup (fail fast).
const firebaseAdmin = require('firebase-admin');

const projectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
// Some deployment systems wrap the PEM block in quotes; normalize both the
// escaped newlines and any surrounding quotes.
const rawPrivateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();

function missingCredentialsError(missing) {
  return new Error(
    'Firebase is not configured. Missing required environment variable(s): ' +
      `${missing.join(', ')}. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and ` +
      'FIREBASE_PRIVATE_KEY in backend/.env (or inject them via Secret Manager) ' +
      'to run Credensa with real Firestore persistence. No local fallback is available.'
  );
}

const missing = [];
if (!projectId) missing.push('FIREBASE_PROJECT_ID');
if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
if (!rawPrivateKey) missing.push('FIREBASE_PRIVATE_KEY');

if (missing.length > 0) {
  // Fail fast: the app must never silently run against a fake data store.
  throw missingCredentialsError(missing);
}

const privateKey = rawPrivateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');

const serviceAccount = { projectId, clientEmail, privateKey };

let admin = null;
let firestore = null;

try {
  // Reuse an already-initialized app (important for hot reload / tests) and
  // derive Firestore from that app so it uses the service-account credentials.
  let app;
  const apps = firebaseAdmin.getApps();
  if (apps.length === 0) {
    app = firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(serviceAccount),
      projectId,
    });
  } else {
    app = apps[0];
  }
  admin = firebaseAdmin;
  firestore = app.firestore();
} catch (err) {
  throw new Error(`Failed to initialize Firebase/Firestore: ${err.message}`);
}

module.exports = { admin, firestore };
