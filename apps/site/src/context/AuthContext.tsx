import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { EnergyState } from '@sges/api-contract';
import { auth, db } from '../firebase';
import {
  DEFAULT_AUTH_LEVEL,
  normalizeAuthLevel,
  type AuthLevel,
} from '../lib/authLevels';
import { fetchEnergy, spendEnergy as spendEnergyApi } from '../lib/energyClient';

type AuthContextValue = {
  user: User | null;
  // Niveau d'habilitation de l'utilisateur (null tant que non connecté).
  authLevel: AuthLevel | null;
  // Énergie serveur-autoritaire (null tant que non connecté ou non chargée).
  energy: EnergyState | null;
  loading: boolean;
  signOut: () => Promise<void>;
  // Recharge l'état d'énergie depuis le Worker.
  refreshEnergy: () => Promise<void>;
  // Dépense de l'énergie pour une action ; renvoie le nouvel état.
  spendEnergy: (amount?: number, action?: string) => Promise<EnergyState>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  authLevel: null,
  energy: null,
  loading: true,
  signOut: async () => {},
  refreshEnergy: async () => {},
  spendEnergy: async () => {
    throw new Error('not_authenticated');
  },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLevel, setAuthLevel] = useState<AuthLevel | null>(null);
  const [energy, setEnergy] = useState<EnergyState | null>(null);
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

        // Charge l'énergie depuis le Worker (serveur-autoritaire). Tolère
        // l'échec (Worker non déployé / NEXT_PUBLIC_WORKER_URL absent) :
        // la jauge s'affichera « en attente ».
        try {
          setEnergy(await fetchEnergy(() => u.getIdToken()));
        } catch {
          setEnergy(null);
        }
      } else {
        setAuthLevel(null);
        setEnergy(null);
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOut = () => fbSignOut(auth);

  const refreshEnergy = async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      setEnergy(await fetchEnergy(() => u.getIdToken()));
    } catch {
      setEnergy(null);
    }
  };

  const spendEnergy = async (
    amount?: number,
    action?: string
  ): Promise<EnergyState> => {
    const u = auth.currentUser;
    if (!u) throw new Error('not_authenticated');
    const state = await spendEnergyApi(() => u.getIdToken(), amount, action);
    setEnergy(state);
    return state;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authLevel,
        energy,
        loading,
        signOut,
        refreshEnergy,
        spendEnergy,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
