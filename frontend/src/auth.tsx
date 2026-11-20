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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if demo user is active in localStorage
    const savedDemo = localStorage.getItem('credensa_demo_user');
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo);
        setUser({
          uid: parsed.uid || 'demo-user-sidrah',
          email: parsed.email || 'sidrahwaghoo786@gmail.com',
          displayName: parsed.displayName || 'Sidrah Waghoo',
          photoURL: null,
          getIdToken: async () => 'guest-demo-token',
        } as unknown as User);
        setLoading(false);
        return;
      } catch {}
    }

    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async () => {
        await signInWithGoogle();
      },
      signInAsDemo: () => {
        const demoUser = {
          uid: 'demo-user-sidrah',
          email: 'sidrahwaghoo786@gmail.com',
          displayName: 'Sidrah Waghoo',
        };
        localStorage.setItem('credensa_demo_user', JSON.stringify(demoUser));
        setUser({
          ...demoUser,
          photoURL: null,
          getIdToken: async () => 'guest-demo-token',
        } as unknown as User);
      },
      signOut: async () => {
        localStorage.removeItem('credensa_demo_user');
        setUser(null);
        await signOutUser();
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
