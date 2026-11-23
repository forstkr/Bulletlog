import {
  type User,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import {
  auth,
  googleProvider,
  isEmailAllowed,
  isFirebaseConfigured,
  testFirestoreConnection,
} from '../config/firebase';

export type AuthStatus =
  | 'loading'
  | 'unconfigured'
  | 'unauthenticated'
  | 'unauthorized'
  | 'authenticated';

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>(
    isFirebaseConfigured ? 'loading' : 'unconfigured'
  );
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setStatus('unconfigured');
      return;
    }

    const firebaseAuth = auth;
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setStatus((prev) => (prev === 'unauthorized' ? 'unauthorized' : 'unauthenticated'));
        return;
      }

      if (!isEmailAllowed(firebaseUser.email)) {
        setError('허용되지 않은 Google 계정입니다. 등록된 개인 계정으로 로그인해 주세요.');
        setUser(null);
        setStatus('unauthorized');
        try {
          await signOut(firebaseAuth);
        } catch {
          // Ignore sign-out cleanup errors
        }
        return;
      }

      setError(null);
      setUser(firebaseUser);
      setStatus('authenticated');
      void testFirestoreConnection();
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) {
      setError('Firebase 환경변수(VITE_FIREBASE_*)가 설정되지 않았습니다.');
      return;
    }

    setIsSigningIn(true);
    setError(null);

    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, googleProvider);

      if (!isEmailAllowed(result.user.email)) {
        await signOut(auth);
        setUser(null);
        setStatus('unauthorized');
        setError('허용되지 않은 Google 계정입니다. 등록된 개인 계정으로 로그인해 주세요.');
        return;
      }

      setUser(result.user);
      setStatus('authenticated');
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError(null);
      } else if (code === 'auth/popup-blocked') {
        setError('브라우저에서 팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.');
      } else if (code === 'auth/unauthorized-domain') {
        setError('Firebase 콘솔의 승인된 도메인에 현재 주소를 추가해 주세요.');
      } else {
        setError('Google 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    if (!auth) return;
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
      setStatus('unauthenticated');
    } catch {
      setError('로그아웃 중 문제가 발생했습니다.');
    }
  }, []);

  return {
    status,
    user,
    error,
    isSigningIn,
    signInWithGoogle,
    signOutUser,
  };
}
