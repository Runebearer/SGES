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
  type PlayerState,
  type ActionCost,
  type PerformActionResult,
} from '@sges/api-contract';
import { ACTIONS_BY_ID } from './actions';
import type { Env } from './index';

interface StoredEnergy {
  value: number;
  /** Jour de la dernière mise à jour d'énergie (YYYY-MM-DD, fuseau de recharge). */
  day: string;
}

interface StoredMission {
  actionId: string;
  startedAt: number; // ms epoch (horloge serveur)
  endsAt: number; // ms epoch
}

interface StoredPlayer {
  energy: StoredEnergy;
  electricity: number;
  artifacts: number;
  xp: number;
  missions: StoredMission[];
}

const DEFAULT_TZ = 'Europe/Paris';
const SECONDS_PER_DAY = 86400;

function key(uid: string): string {
  return `player:${uid}`;
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
            }))
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
  let completed = 0;

  for (const m of stored.missions) {
    if (m.endsAt <= now) {
      const def = ACTIONS_BY_ID[m.actionId];
      if (def) {
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
        xp = Math.max(0, xp + def.gain.xp);
      }
      completed++;
    } else {
      stillRunning.push(m);
    }
  }

  if (completed === 0) return { stored, completed: 0 };
  return {
    stored: { ...stored, electricity, artifacts, xp, missions: stillRunning },
    completed,
  };
}

// Charge l'état effectif : recharge d'énergie (en mémoire) + complétion des
// missions écoulées (gains appliqués). `dirty` = true si une mission a été
// complétée → l'appelant DOIT persister (les gains sont irréversibles).
async function loadReconciled(
  env: Env,
  uid: string,
  today: string,
  now: number
): Promise<{ stored: StoredPlayer; dirty: boolean }> {
  const base = parse(await env.ENERGY_KV.get(key(uid))) ?? defaults(today);
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
      };
    }),
  };
}

/** Lit l'état complet du joueur (recharge d'énergie + complétion des missions). */
export async function getState(env: Env, uid: string): Promise<PlayerState> {
  const now = Date.now();
  const today = dayInTz(new Date(now), tz(env));
  const { stored, dirty } = await loadReconciled(env, uid, today, now);
  if (dirty) await env.ENERGY_KV.put(key(uid), JSON.stringify(stored));
  return toState(stored, env);
}

export type SpendResult =
  | { ok: true; state: PlayerState }
  | { ok: false; available: number };

/**
 * Dépense `amount` d'énergie. Échoue (sans débit) si le solde est insuffisant.
 *
 * NB : KV n'offre pas de compare-and-set atomique ; deux dépenses très
 * concurrentes pour le même uid peuvent se chevaucher. Acceptable pour une
 * jauge de jeu ; passer aux Durable Objects si une atomicité stricte devient
 * nécessaire.
 */
export async function spendEnergy(
  env: Env,
  uid: string,
  amount: number
): Promise<SpendResult> {
  const now = Date.now();
  const today = dayInTz(new Date(now), tz(env));
  const { stored } = await loadReconciled(env, uid, today, now);
  if (amount > stored.energy.value) {
    return { ok: false, available: stored.energy.value };
  }
  const updated: StoredPlayer = {
    ...stored,
    energy: { value: stored.energy.value - amount, day: today },
  };
  await env.ENERGY_KV.put(key(uid), JSON.stringify(updated));
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
  env: Env,
  uid: string,
  actionId: string
): Promise<ActionResult> {
  const def = ACTIONS_BY_ID[actionId];
  if (!def) return { ok: false, reason: 'unknown_action' };

  const now = Date.now();
  const today = dayInTz(new Date(now), tz(env));
  const { stored } = await loadReconciled(env, uid, today, now);

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
      { actionId, startedAt: now, endsAt: now + def.durationSec * 1000 },
    ],
  };
  await env.ENERGY_KV.put(key(uid), JSON.stringify(updated));

  return { ok: true, result: { state: toState(updated, env), actionId } };
}
