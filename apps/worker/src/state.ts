// État joueur : serveur-autoritaire, consolidé dans un seul document Cloudflare
// KV par utilisateur (`player:{uid}`). Écrit uniquement par le Worker.
//
// Ressources :
//  - energy      : recharge quotidienne à 100 % « à minuit » (cf. ci-dessous).
//  - electricity : plafonnée à MAX_ELECTRICITY, SANS recharge quotidienne
//                  (gagnée via une mécanique de jeu à venir).
//  - artifacts   : compteur (≥ 0).
//  - xp          : accumulateur (≥ 0) ; le niveau (authLevel) reste dans Firestore.
//
// Recharge « à minuit » SANS tâche planifiée : on mémorise le jour de la
// dernière dépense d'énergie (fuseau de recharge). L'énergie effective est
// RECALCULÉE à la lecture : si le jour stocké n'est pas aujourd'hui, la jauge
// vaut MAX_ENERGY. Conséquence : `GET` n'écrit jamais en KV ; seule une dépense
// écrit. Comportement observable identique à un cron de minuit, par-utilisateur.

import {
  MAX_ENERGY,
  MAX_ELECTRICITY,
  MAX_ARTIFACTS,
  MAX_HISTORY,
  type PlayerState,
  type ActionCost,
  type PerformActionResult,
  type Address,
  type HistoryEntry,
  type AdminPlayerPatch,
} from '@sges/api-contract';
import { ACTIONS_BY_ID } from './actions';
import type { Env } from './index';

/**
 * Abstraction du stockage de l'état joueur : découple la logique métier du
 * backend. Aujourd'hui implémentée par le storage SQLite du Durable Object du
 * joueur (fortement cohérent) ; le format reste le doc JSON historique du KV
 * (`parse()` inchangé). `get()` renvoie null si le joueur n'a pas encore d'état.
 */
export interface Store {
  get(): Promise<string | null>;
  put(value: string): Promise<void>;
}

interface StoredEnergy {
  value: number;
  /** Jour de la dernière mise à jour d'énergie (YYYY-MM-DD, fuseau de recharge). */
  day: string;
}

interface StoredMission {
  actionId: string;
  startedAt: number; // ms epoch (horloge serveur)
  endsAt: number; // ms epoch
  subMissionId?: string;
}

interface StoredPlayer {
  energy: StoredEnergy;
  electricity: number;
  artifacts: number;
  xp: number;
  missions: StoredMission[];
  addresses: Address[];
  /** Journal des événements (actions terminées + passages de niveau), borné à MAX_HISTORY. */
  history: HistoryEntry[];
}

const DEFAULT_TZ = 'Europe/Paris';
const SECONDS_PER_DAY = 86400;

/** Clé du doc joueur en KV. Conservée pour l'hydratation KV → DO (cf. PlayerDO). */
export function key(uid: string): string {
  return `player:${uid}`;
}

/** Clé d'annuaire : marque l'existence d'un joueur, pour énumérer tous les uid. */
export function rosterKey(uid: string): string {
  return `roster:${uid}`;
}

function tz(env: Env): string {
  return env.RESET_TIMEZONE || DEFAULT_TZ;
}

// Date du jour (YYYY-MM-DD) dans le fuseau donné. `en-CA` produit ce format.
function dayInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// Instant ISO du prochain minuit local dans le fuseau (= prochaine recharge).
// Approximation au niveau des transitions d'heure d'été : champ purement
// informatif pour l'affichage côté client.
function nextResetIso(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');
  let hour = get('hour');
  if (hour === 24) hour = 0; // certains runtimes renvoient 24 à minuit
  const elapsed = hour * 3600 + get('minute') * 60 + get('second');
  const remaining = SECONDS_PER_DAY - elapsed;
  return new Date(now.getTime() + remaining * 1000).toISOString();
}

// === Niveaux d'habilitation (dérivés de l'XP) ================================
// Le niveau est calculé ICI (source unique) à partir de l'XP cumulée, puis
// renvoyé dans PlayerState. Le site se contente d'afficher.
const MAX_LEVEL = 100; // borné sur les habilitations valides (1–100)

// Coût en XP du palier vers le niveau N (transition N-1 → N), pour N ≥ 2.
// Formule : round(100 * (N - 2)^1.5 + 100).
function levelCost(n: number): number {
  if (n <= 1) return 0;
  return Math.round(100 * Math.pow(n - 2, 1.5) + 100);
}

// L'XP requise pour atteindre un niveau est la SOMME des paliers (cumulée) :
// p.ex. niveau 3 = coût(2) + coût(3) = 100 + 200 = 300.
function levelInfo(xp: number): {
  level: number;
  xpFloor: number;
  xpNext: number | null;
} {
  let level = 1;
  let xpFloor = 0; // XP cumulée pour atteindre `level`
  let cumulative = 0; // accumulateur des seuils successifs
  for (let n = 2; n <= MAX_LEVEL; n++) {
    cumulative += levelCost(n); // XP cumulée pour atteindre le niveau n
    if (xp >= cumulative) {
      level = n;
      xpFloor = cumulative;
    } else {
      // n est le prochain niveau, non atteint : borne haute de la barre.
      return { level, xpFloor, xpNext: cumulative };
    }
  }
  return { level, xpFloor, xpNext: null }; // niveau max atteint
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function defaults(today: string): StoredPlayer {
  return {
    energy: { value: MAX_ENERGY, day: today },
    electricity: 0,
    artifacts: 0,
    xp: 0,
    missions: [],
    addresses: [],
    history: [],
  };
}

// Parse défensif d'un enregistrement KV (champs absents/corrompus tolérés).
function parse(raw: string | null): StoredPlayer | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, any>;
    if (!o || typeof o !== 'object') return null;
    return {
      energy: {
        value: clamp(num(o.energy?.value, MAX_ENERGY), 0, MAX_ENERGY),
        day: typeof o.energy?.day === 'string' ? o.energy.day : '',
      },
      electricity: clamp(num(o.electricity, 0), 0, MAX_ELECTRICITY),
      artifacts: clamp(Math.floor(num(o.artifacts, 0)), 0, MAX_ARTIFACTS),
      xp: Math.max(0, num(o.xp, 0)),
      missions: Array.isArray(o.missions)
        ? o.missions
            .filter(
              (m: any) =>
                m &&
                typeof m.actionId === 'string' &&
                typeof m.startedAt === 'number' &&
                typeof m.endsAt === 'number'
            )
            .map((m: any) => ({
              actionId: m.actionId,
              startedAt: m.startedAt,
              endsAt: m.endsAt,
              ...(typeof m.subMissionId === 'string'
                ? { subMissionId: m.subMissionId }
                : {}),
            }))
        : [],
      addresses: Array.isArray(o.addresses)
        ? o.addresses
            .filter(
              (a: any) =>
                a && typeof a.id === 'string' && typeof a.name === 'string'
            )
            .map((a: any) => ({ id: a.id, name: a.name }))
        : [],
      history: Array.isArray(o.history)
        ? o.history
            .map((h: any): HistoryEntry | null => {
              if (!h || typeof h !== 'object') return null;
              // Passage de niveau.
              if (h.type === 'levelup') {
                if (
                  typeof h.level === 'number' &&
                  typeof h.timestamp === 'number'
                ) {
                  return {
                    type: 'levelup',
                    level: h.level,
                    fromLevel:
                      typeof h.fromLevel === 'number'
                        ? h.fromLevel
                        : h.level - 1,
                    timestamp: h.timestamp,
                  };
                }
                return null;
              }
              // Sinon : entrée d'action (compat. ascendante — `type` peut être absent).
              if (
                typeof h.actionId === 'string' &&
                typeof h.name === 'string' &&
                typeof h.timestamp === 'number' &&
                typeof h.level === 'number' &&
                h.result &&
                typeof h.result === 'object'
              ) {
                return {
                  type: 'action',
                  actionId: h.actionId,
                  name: h.name,
                  timestamp: h.timestamp,
                  level: h.level,
                  result: {
                    electricity: num(h.result.electricity, 0),
                    artifacts: num(h.result.artifacts, 0),
                    xp: num(h.result.xp, 0),
                    ...(h.result.addressUnlocked &&
                    typeof h.result.addressUnlocked.id === 'string' &&
                    typeof h.result.addressUnlocked.name === 'string'
                      ? {
                          addressUnlocked: {
                            id: h.result.addressUnlocked.id,
                            name: h.result.addressUnlocked.name,
                          },
                        }
                      : {}),
                  },
                };
              }
              return null;
            })
            .filter((h: HistoryEntry | null): h is HistoryEntry => h !== null)
            .slice(-MAX_HISTORY)
        : [],
    };
  } catch {
    return null;
  }
}

// Applique la recharge quotidienne d'énergie EN MÉMOIRE (sans écrire) : si le
// jour stocké n'est pas aujourd'hui, l'énergie vaut MAX_ENERGY.
function applyDailyRefill(stored: StoredPlayer, today: string): StoredPlayer {
  if (stored.energy.day !== today) {
    return { ...stored, energy: { value: MAX_ENERGY, day: today } };
  }
  return stored;
}

// Finalise les missions dont le timer est écoulé : applique leurs gains
// (électricité / artefacts aléatoires / xp) et les retire de la liste.
function completeMissions(
  stored: StoredPlayer,
  now: number
): { stored: StoredPlayer; completed: number } {
  if (stored.missions.length === 0) return { stored, completed: 0 };

  const stillRunning: StoredMission[] = [];
  let electricity = stored.electricity;
  let artifacts = stored.artifacts;
  let xp = stored.xp;
  const addresses = [...stored.addresses];
  const history = [...stored.history];
  let completed = 0;

  for (const m of stored.missions) {
    if (m.endsAt <= now) {
      const def = ACTIONS_BY_ID[m.actionId];
      if (def) {
        // Gains RÉELLEMENT crédités (différence après plafonnement) : c'est ce
        // qu'on journalise comme « résultat » de l'action.
        const before = { electricity, artifacts };
        electricity = clamp(
          electricity + def.gain.electricity,
          0,
          MAX_ELECTRICITY
        );
        artifacts = clamp(
          artifacts + randInt(def.gain.artifactsMin, def.gain.artifactsMax),
          0,
          MAX_ARTIFACTS
        );
        // Niveau du joueur AU MOMENT de l'action = niveau dérivé de l'XP AVANT
        // d'y ajouter le gain de cette action.
        const levelDuringAction = levelInfo(xp).level;
        xp = Math.max(0, xp + def.gain.xp);
        const levelAfterAction = levelInfo(xp).level;

        // Recherche : débloque la PROCHAINE adresse du pool non encore possédée.
        const sub = def.subMissions.find((s) => s.id === m.subMissionId);
        const next = sub?.unlocksAddresses?.find(
          (a) => !addresses.some((owned) => owned.id === a.id)
        );
        let addressUnlocked: Address | undefined;
        if (next) {
          addressUnlocked = { id: next.id, name: next.name };
          addresses.push(addressUnlocked);
        }

        // Journalise l'action terminée (nom, timestamp, résultat, niveau).
        history.push({
          type: 'action',
          actionId: m.actionId,
          name: def.name,
          timestamp: m.endsAt,
          level: levelDuringAction,
          result: {
            electricity: electricity - before.electricity,
            artifacts: artifacts - before.artifacts,
            xp: def.gain.xp,
            ...(addressUnlocked ? { addressUnlocked } : {}),
          },
        });

        // Journalise chaque passage de niveau provoqué par le gain d'XP de
        // cette action (une entrée par niveau franchi).
        for (let lvl = levelDuringAction + 1; lvl <= levelAfterAction; lvl++) {
          history.push({
            type: 'levelup',
            level: lvl,
            fromLevel: lvl - 1,
            timestamp: m.endsAt,
          });
        }
      }
      completed++;
    } else {
      stillRunning.push(m);
    }
  }

  if (completed === 0) return { stored, completed: 0 };
  return {
    stored: {
      ...stored,
      electricity,
      artifacts,
      xp,
      missions: stillRunning,
      addresses,
      // Borne le journal aux MAX_HISTORY entrées les plus récentes.
      history: history.slice(-MAX_HISTORY),
    },
    completed,
  };
}

// Charge l'état effectif : recharge d'énergie (en mémoire) + complétion des
// missions écoulées (gains appliqués). `dirty` = true si une mission a été
// complétée → l'appelant DOIT persister (les gains sont irréversibles).
async function loadReconciled(
  store: Store,
  today: string,
  now: number
): Promise<{ stored: StoredPlayer; dirty: boolean }> {
  const base = parse(await store.get()) ?? defaults(today);
  const refilled = applyDailyRefill(base, today);
  const { stored, completed } = completeMissions(refilled, now);
  return { stored, dirty: completed > 0 };
}

function toState(stored: StoredPlayer, env: Env): PlayerState {
  const { level, xpFloor, xpNext } = levelInfo(stored.xp);
  return {
    energy: {
      value: stored.energy.value,
      max: MAX_ENERGY,
      day: stored.energy.day,
      resetsAt: nextResetIso(new Date(), tz(env)),
    },
    electricity: stored.electricity,
    artifacts: stored.artifacts,
    xp: stored.xp,
    level,
    xpFloor,
    xpNext,
    missions: stored.missions.map((m) => {
      const def = ACTIONS_BY_ID[m.actionId];
      return {
        actionId: m.actionId,
        name: def ? def.name : m.actionId,
        startedAt: m.startedAt,
        endsAt: m.endsAt,
        durationSec: def
          ? def.durationSec
          : Math.max(0, Math.round((m.endsAt - m.startedAt) / 1000)),
        ...(m.subMissionId ? { subMissionId: m.subMissionId } : {}),
      };
    }),
    addresses: stored.addresses,
  };
}

/** Lit l'état complet du joueur (recharge d'énergie + complétion des missions). */
export async function getState(store: Store, env: Env): Promise<PlayerState> {
  const now = Date.now();
  const today = dayInTz(new Date(now), tz(env));
  const { stored, dirty } = await loadReconciled(store, today, now);
  if (dirty) await store.put(JSON.stringify(stored));
  return toState(stored, env);
}

/**
 * Lit le journal des actions terminées du joueur. Comme `getState`, la lecture
 * finalise d'abord les missions échues (leurs entrées d'historique sont alors
 * persistées) afin que le journal soit toujours à jour.
 */
export async function getHistory(
  store: Store,
  env: Env
): Promise<HistoryEntry[]> {
  const now = Date.now();
  const today = dayInTz(new Date(now), tz(env));
  const { stored, dirty } = await loadReconciled(store, today, now);
  if (dirty) await store.put(JSON.stringify(stored));
  return stored.history;
}

export type SpendResult =
  | { ok: true; state: PlayerState }
  | { ok: false; available: number };

/**
 * Dépense `amount` d'énergie. Échoue (sans débit) si le solde est insuffisant.
 *
 * Atomicité : exécutée dans le Durable Object du joueur (un seul exemplaire,
 * mono-thread), les read-modify-write sur le `store` ne se chevauchent jamais.
 */
export async function spendEnergy(
  store: Store,
  env: Env,
  amount: number
): Promise<SpendResult> {
  const now = Date.now();
  const today = dayInTz(new Date(now), tz(env));
  const { stored } = await loadReconciled(store, today, now);
  if (amount > stored.energy.value) {
    return { ok: false, available: stored.energy.value };
  }
  const updated: StoredPlayer = {
    ...stored,
    energy: { value: stored.energy.value - amount, day: today },
  };
  await store.put(JSON.stringify(updated));
  return { ok: true, state: toState(updated, env) };
}

// Tirage entier uniforme dans [min, max] (bornes incluses).
function randInt(min: number, max: number): number {
  const lo = Math.max(0, Math.floor(min));
  const hi = Math.max(lo, Math.floor(max));
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export type ActionResult =
  | { ok: true; result: PerformActionResult }
  | { ok: false; reason: 'unknown_action' }
  | { ok: false; reason: 'already_active' }
  | {
      ok: false;
      reason: 'insufficient';
      cost: ActionCost;
      have: { energy: number; electricity: number; artifacts: number };
    };

/**
 * DÉMARRE une action : refuse si elle est déjà en cours, déduit les coûts
 * (refus sans débit si insuffisant) et ajoute une mission avec son timer
 * (`endsAt = now + durationSec`). Les GAINS sont appliqués à la complétion du
 * timer (cf. completeMissions), pas ici. `requiredLevel` /
 * `requiredAddressStatus` ne sont volontairement PAS encore vérifiés.
 */
export async function startAction(
  store: Store,
  env: Env,
  actionId: string,
  subMissionId?: string
): Promise<ActionResult> {
  const def = ACTIONS_BY_ID[actionId];
  if (!def) return { ok: false, reason: 'unknown_action' };

  const now = Date.now();
  const today = dayInTz(new Date(now), tz(env));
  const { stored } = await loadReconciled(store, today, now);

  // Une seule instance par action à la fois.
  if (stored.missions.some((m) => m.actionId === actionId)) {
    return { ok: false, reason: 'already_active' };
  }

  const have = {
    energy: stored.energy.value,
    electricity: stored.electricity,
    artifacts: stored.artifacts,
  };
  if (
    have.energy < def.cost.energy ||
    have.electricity < def.cost.electricity ||
    have.artifacts < def.cost.artifacts
  ) {
    return { ok: false, reason: 'insufficient', cost: def.cost, have };
  }

  const updated: StoredPlayer = {
    ...stored,
    energy: { value: stored.energy.value - def.cost.energy, day: today },
    electricity: stored.electricity - def.cost.electricity,
    artifacts: stored.artifacts - def.cost.artifacts,
    missions: [
      ...stored.missions,
      {
        actionId,
        startedAt: now,
        endsAt: now + def.durationSec * 1000,
        ...(subMissionId ? { subMissionId } : {}),
      },
    ],
  };
  await store.put(JSON.stringify(updated));

  return { ok: true, result: { state: toState(updated, env), actionId } };
}

// === Back-office (admin) =====================================================
// Édition serveur-autoritaire d'un joueur depuis le back-office. L'autorisation
// (allowlist) est vérifiée EN AMONT dans index.ts ; ici on ne fait qu'appliquer.

/**
 * Écrase les ressources fournies (valeurs absolues, bornées) ; les champs omis
 * sont laissés tels quels. Recharge d'énergie / complétion de missions appliquées
 * d'abord (loadReconciled), comme toute autre lecture.
 */
export async function adminUpdate(
  store: Store,
  env: Env,
  patch: AdminPlayerPatch
): Promise<PlayerState> {
  const now = Date.now();
  const today = dayInTz(new Date(now), tz(env));
  const { stored } = await loadReconciled(store, today, now);
  const updated: StoredPlayer = {
    ...stored,
    energy:
      patch.energy != null
        ? { value: clamp(patch.energy, 0, MAX_ENERGY), day: today }
        : stored.energy,
    electricity:
      patch.electricity != null
        ? clamp(patch.electricity, 0, MAX_ELECTRICITY)
        : stored.electricity,
    artifacts:
      patch.artifacts != null
        ? clamp(Math.floor(patch.artifacts), 0, MAX_ARTIFACTS)
        : stored.artifacts,
    xp: patch.xp != null ? Math.max(0, patch.xp) : stored.xp,
  };
  await store.put(JSON.stringify(updated));
  return toState(updated, env);
}

/** Réinitialise le joueur à l'état par défaut (jauges pleines d'énergie, reste à zéro). */
export async function adminReset(store: Store, env: Env): Promise<PlayerState> {
  const now = Date.now();
  const today = dayInTz(new Date(now), tz(env));
  const fresh = defaults(today);
  await store.put(JSON.stringify(fresh));
  return toState(fresh, env);
}
