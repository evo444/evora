import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, getRedirectResult } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  // authDomain MUST match an authorized domain in Firebase console.
  // Use the env var so it works on both localhost and production (Netlify).
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { getRedirectResult };

// Request profile and email scopes
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Always force account picker — prevents silent re-auth with wrong account
googleProvider.setCustomParameters({ prompt: 'select_account' });

