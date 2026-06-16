import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  DEFAULT_AUTH_LEVEL,
  normalizeAuthLevel,
  type AuthLevel,
} from '../lib/authLevels';

type AuthContextValue = {
  user: User | null;
  // Niveau d'habilitation de l'utilisateur (null tant que non connecté).
  authLevel: AuthLevel | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  authLevel: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLevel, setAuthLevel] = useState<AuthLevel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (u) {
        // Récupère le niveau d'habilitation depuis le profil Firestore.
        // Les comptes créés avant cette fonctionnalité n'ont pas de doc :
        // on retombe sur le niveau par défaut.
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          setAuthLevel(normalizeAuthLevel(snap.data()?.authLevel));
        } catch {
          setAuthLevel(DEFAULT_AUTH_LEVEL);
        }
      } else {
        setAuthLevel(null);
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOut = () => fbSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, authLevel, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
