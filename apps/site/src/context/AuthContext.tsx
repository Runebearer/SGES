import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { PlayerState, SpendEnergyResponse } from '@sges/api-contract';
import { auth, db } from '../firebase';
import {
  DEFAULT_AUTH_LEVEL,
  normalizeAuthLevel,
  type AuthLevel,
} from '../lib/authLevels';
import { fetchPlayerState, spendEnergy as spendEnergyApi } from '../lib/playerClient';

type AuthContextValue = {
  user: User | null;
  // Niveau d'habilitation de l'utilisateur (null tant que non connecté).
  authLevel: AuthLevel | null;
  // État joueur serveur-autoritaire (null tant que non connecté / non chargé).
  player: PlayerState | null;
  loading: boolean;
  signOut: () => Promise<void>;
  // Recharge l'état joueur depuis le Worker.
  refreshPlayer: () => Promise<void>;
  // Dépense de l'énergie pour une action ; met à jour l'énergie du joueur.
  spendEnergy: (amount?: number, action?: string) => Promise<SpendEnergyResponse>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  authLevel: null,
  player: null,
  loading: true,
  signOut: async () => {},
  refreshPlayer: async () => {},
  spendEnergy: async () => {
    throw new Error('not_authenticated');
  },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLevel, setAuthLevel] = useState<AuthLevel | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);
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

        // Charge l'état joueur depuis le Worker (serveur-autoritaire). Tolère
        // l'échec (Worker non déployé / NEXT_PUBLIC_WORKER_URL absent) :
        // les jauges s'afficheront « en attente ».
        try {
          setPlayer(await fetchPlayerState(() => u.getIdToken()));
        } catch {
          setPlayer(null);
        }
      } else {
        setAuthLevel(null);
        setPlayer(null);
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOut = () => fbSignOut(auth);

  const refreshPlayer = async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      setPlayer(await fetchPlayerState(() => u.getIdToken()));
    } catch {
      setPlayer(null);
    }
  };

  const spendEnergy = async (
    amount?: number,
    action?: string
  ): Promise<SpendEnergyResponse> => {
    const u = auth.currentUser;
    if (!u) throw new Error('not_authenticated');
    const res = await spendEnergyApi(() => u.getIdToken(), amount, action);
    // La réponse porte l'énergie à jour : on la fusionne dans l'état joueur.
    setPlayer((prev) =>
      prev
        ? {
            ...prev,
            energy: {
              value: res.value,
              max: res.max,
              day: res.day,
              resetsAt: res.resetsAt,
            },
          }
        : prev
    );
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authLevel,
        player,
        loading,
        signOut,
        refreshPlayer,
        spendEnergy,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
