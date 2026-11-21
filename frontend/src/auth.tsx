import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  getIdToken,
  onAuthChange,
  signInWithGoogle,
  signOutUser,
} from './firebase';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInAsDemo: () => void;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('credensa_user');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      if (firebaseUser) {
        try {
          const u = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          };
          localStorage.setItem('credensa_user', JSON.stringify(u));
        } catch {}
        setUser(firebaseUser);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async () => {
        const res = await signInWithGoogle();
        if (res && res.user) {
          try {
            const u = {
              uid: res.user.uid,
              email: res.user.email,
              displayName: res.user.displayName,
              photoURL: res.user.photoURL,
            };
            localStorage.setItem('credensa_user', JSON.stringify(u));
          } catch {}
          setUser(res.user);
        }
      },
      signInAsDemo: () => {
        const demoUser = {
          uid: 'demo-user-sidrah',
          email: 'sidrahwaghoo786@gmail.com',
          displayName: 'Sidrah Waghoo',
          photoURL: null,
        };
        try {
          localStorage.setItem('credensa_user', JSON.stringify(demoUser));
        } catch {}
        setUser(demoUser as unknown as User);
        setLoading(false);
      },
      signOut: async () => {
        try {
          localStorage.removeItem('credensa_user');
        } catch {}
        setUser(null);
        await signOutUser().catch(() => undefined);
      },
      getIdToken,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
