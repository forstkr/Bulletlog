import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  type Auth,
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from 'firebase/auth';
import {
  type Firestore,
  doc,
  getDocFromServer,
  getFirestore,
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY ?? '').trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '').trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '').trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '').trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '').trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID ?? '').trim(),
};

export const ALLOWED_EMAIL = (import.meta.env.VITE_ALLOWED_EMAIL ?? '')
  .trim()
  .toLowerCase();

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!ALLOWED_EMAIL) return true;
  if (!email) return false;
  return email.trim().toLowerCase() === ALLOWED_EMAIL;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope(CALENDAR_SCOPE);
googleProvider.setCustomParameters({ prompt: 'select_account' });

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  // Persist Google sign-in across reloads and PWA launches
  void setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Failed to set Firebase Auth persistence:', error);
  });
}

export async function testFirestoreConnection(): Promise<void> {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes('client is offline')
    ) {
      console.error(
        'Firestore appears offline. Please verify VITE_FIREBASE_* settings.'
      );
    }
  }
}

export { app, auth, db };
