import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import type {
  PlayerState,
  SpendEnergyResponse,
  ActionDef,
  PerformActionResult,
} from '@sges/api-contract';
import { auth } from '../firebase';
import { normalizeAuthLevel, type AuthLevel } from '../lib/authLevels';
import {
  fetchPlayerState,
  fetchActions,
  performAction as performActionApi,
  spendEnergy as spendEnergyApi,
} from '../lib/playerClient';

type AuthContextValue = {
  user: User | null;
  // Niveau d'habilitation, DÉRIVÉ de l'XP (player.level). null si non connecté
  // / état joueur non chargé.
  authLevel: AuthLevel | null;
  // État joueur serveur-autoritaire (null tant que non connecté / non chargé).
  player: PlayerState | null;
  // Catalogue des actions (vide tant que non chargé).
  actions: ActionDef[];
  loading: boolean;
  signOut: () => Promise<void>;
  // Recharge l'état joueur depuis le Worker.
  refreshPlayer: () => Promise<void>;
  // Dépense de l'énergie pour une action ; met à jour l'énergie du joueur.
  spendEnergy: (amount?: number, action?: string) => Promise<SpendEnergyResponse>;
  // Démarre une action (timer) ; met à jour tout l'état joueur.
  performAction: (
    actionId: string,
    subMissionId?: string
  ) => Promise<PerformActionResult>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  authLevel: null,
  player: null,
  actions: [],
  loading: true,
  signOut: async () => {},
  refreshPlayer: async () => {},
  spendEnergy: async () => {
    throw new Error('not_authenticated');
  },
  performAction: async () => {
    throw new Error('not_authenticated');
  },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [actions, setActions] = useState<ActionDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (u) {
        // Charge l'état joueur + le catalogue d'actions depuis le Worker
        // (serveur-autoritaire). Le niveau d'habilitation est désormais dérivé
        // de l'XP (player.level) — plus de lecture Firestore. Tolère l'échec
        // (Worker non déployé / NEXT_PUBLIC_WORKER_URL absent).
        try {
          setPlayer(await fetchPlayerState(() => u.getIdToken()));
        } catch (e) {
          // Jauges vides = cette erreur. Cause fréquente : NEXT_PUBLIC_WORKER_URL
          // absent du build (serveur de dev démarré avant l'ajout de la variable
          // → redémarrer `npm run dev`), ou Worker injoignable.
          console.warn('[SGES] Chargement de l’état joueur échoué :', e);
          setPlayer(null);
        }
        try {
          setActions(await fetchActions(() => u.getIdToken()));
        } catch (e) {
          console.warn('[SGES] Chargement du catalogue d’actions échoué :', e);
          setActions([]);
        }
      } else {
        setPlayer(null);
        setActions([]);
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

  const performAction = async (
    actionId: string,
    subMissionId?: string
  ): Promise<PerformActionResult> => {
    const u = auth.currentUser;
    if (!u) throw new Error('not_authenticated');
    const res = await performActionApi(
      () => u.getIdToken(),
      actionId,
      subMissionId
    );
    // La réponse porte l'état joueur complet à jour : on le remplace.
    setPlayer(res.state);
    return res;
  };

  // Niveau d'habilitation dérivé de l'XP (serveur-autoritaire via player.level).
  const authLevel: AuthLevel | null = player
    ? normalizeAuthLevel(player.level)
    : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        authLevel,
        player,
        actions,
        loading,
        signOut,
        refreshPlayer,
        spendEnergy,
        performAction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
