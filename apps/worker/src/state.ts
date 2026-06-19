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

interface StoredPlayer {
  energy: StoredEnergy;
  electricity: number;
  artifacts: number;
  xp: number;
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

// Charge l'état effectif (recharge appliquée), sans écrire en KV.
async function load(env: Env, uid: string, today: string): Promise<StoredPlayer> {
  const stored = parse(await env.ENERGY_KV.get(key(uid))) ?? defaults(today);
  return applyDailyRefill(stored, today);
}

function toState(stored: StoredPlayer, env: Env): PlayerState {
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
  };
}

/** Lit l'état complet du joueur (recharge quotidienne d'énergie appliquée). */
export async function getState(env: Env, uid: string): Promise<PlayerState> {
  const today = dayInTz(new Date(), tz(env));
  return toState(await load(env, uid, today), env);
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
  const today = dayInTz(new Date(), tz(env));
  const stored = await load(env, uid, today);
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
  | {
      ok: false;
      reason: 'insufficient';
      cost: ActionCost;
      have: { energy: number; electricity: number; artifacts: number };
    };

/**
 * Exécute une action du catalogue : vérifie les coûts, applique coûts et gains
 * (artefacts = tirage aléatoire), écrit l'état. Échoue sans débit si les
 * ressources sont insuffisantes. `requiredLevel` / `requiredAddressStatus` ne
 * sont volontairement PAS encore vérifiés (systèmes à venir).
 */
export async function performAction(
  env: Env,
  uid: string,
  actionId: string
): Promise<ActionResult> {
  const def = ACTIONS_BY_ID[actionId];
  if (!def) return { ok: false, reason: 'unknown_action' };

  const today = dayInTz(new Date(), tz(env));
  const stored = await load(env, uid, today);
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

  const gained = {
    electricity: def.gain.electricity,
    artifacts: randInt(def.gain.artifactsMin, def.gain.artifactsMax),
    xp: def.gain.xp,
  };

  const updated: StoredPlayer = {
    energy: { value: stored.energy.value - def.cost.energy, day: today },
    electricity: clamp(
      stored.electricity - def.cost.electricity + gained.electricity,
      0,
      MAX_ELECTRICITY
    ),
    artifacts: clamp(
      stored.artifacts - def.cost.artifacts + gained.artifacts,
      0,
      MAX_ARTIFACTS
    ),
    xp: Math.max(0, stored.xp + gained.xp),
  };
  await env.ENERGY_KV.put(key(uid), JSON.stringify(updated));

  return {
    ok: true,
    result: { state: toState(updated, env), actionId, gained },
  };
}
