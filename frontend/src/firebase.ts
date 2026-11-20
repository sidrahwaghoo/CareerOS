import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import type { Auth, User } from 'firebase/auth';

/**
 * Firebase client initialisation.
 *
 * Every value comes from VITE_FIREBASE_* build-time environment variables —
 * there are no hard-coded credentials or fallback/placeholder projects. A
 * misconfiguration is reported honestly instead of silently using fake data.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);

let configurationError = '';
let auth: Auth | null = null;

if (missingKeys.length > 0) {
  configurationError =
    'Firebase Authentication is not configured — contact administrator.';
  console.error(
    `Firebase configuration missing: ${missingKeys
      .map((key) => `VITE_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`)
      .join(', ')}. See frontend/.env.example.`,
  );
} else {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (err) {
    configurationError =
      'Firebase Authentication could not be initialised — contact administrator.';
    console.error(configurationError, err);
  }
}

export { auth };

const googleProvider = new GoogleAuthProvider();
// Ask for the user's email and basic profile; no custom scopes are required.
googleProvider.setCustomParameters({ prompt: 'select_account' });

/** Sign in with the real Google Identity provider. */
export function signInWithGoogle() {
  if (!auth) {
    return Promise.reject(new Error(configurationError));
  }
  return signInWithPopup(auth, googleProvider);
}

/** End the current Firebase session. */
export function signOutUser() {
  if (!auth) return Promise.resolve();
  return signOut(auth);
}

/**
 * Return a short-lived Firebase ID token for the signed-in user, or null when
 * there is no user. The token is sent to the API as `Authorization: Bearer …`.
 */
export async function getIdToken(): Promise<string | null> {
  if (!auth) return null;
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

/** Subscribe to authentication state changes. Returns an unsubscribe function. */
export function onAuthChange(callback: (user: User | null) => void) {
  if (!auth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, callback);
}
