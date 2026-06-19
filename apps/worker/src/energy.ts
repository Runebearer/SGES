// Logique d'énergie : serveur-autoritaire, stockée en Cloudflare KV.
//
// Recharge « à minuit » sans tâche planifiée : on enregistre le jour de la
// dernière remise à plein (dans le fuseau de recharge). Au premier accès d'un
// nouveau jour, la jauge repasse à 100 %. Comportement observable identique à
// un cron de minuit, mais par-utilisateur et fiable en serverless (pas besoin
// d'itérer toutes les clés KV).

import { MAX_ENERGY, type EnergyState } from '@sges/api-contract';
import type { Env } from './index';

interface StoredEnergy {
  value: number;
  /** Jour de la dernière remise à plein (YYYY-MM-DD, fuseau de recharge). */
  day: string;
}

const DEFAULT_TZ = 'Europe/Paris';
const SECONDS_PER_DAY = 86400;

function key(uid: string): string {
  return `energy:${uid}`;
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
// Approximation au niveau des transitions d'heure d'été : ce champ est purement
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

// Charge l'état en appliquant la recharge quotidienne si nécessaire. Persiste
// la remise à plein pour que KV reste cohérent.
async function load(env: Env, uid: string): Promise<StoredEnergy> {
  const today = dayInTz(new Date(), tz(env));
  const raw = await env.ENERGY_KV.get(key(uid));

  let stored: StoredEnergy | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredEnergy;
      if (typeof parsed.value === 'number' && typeof parsed.day === 'string') {
        stored = parsed;
      }
    } catch {
      stored = null;
    }
  }

  // Aucun enregistrement, ou dernière recharge antérieure à aujourd'hui :
  // la jauge est repleine.
  if (!stored || stored.day !== today) {
    const fresh: StoredEnergy = { value: MAX_ENERGY, day: today };
    await env.ENERGY_KV.put(key(uid), JSON.stringify(fresh));
    return fresh;
  }

  return stored;
}

function toState(stored: StoredEnergy, env: Env): EnergyState {
  return {
    value: stored.value,
    max: MAX_ENERGY,
    day: stored.day,
    resetsAt: nextResetIso(new Date(), tz(env)),
  };
}

/** Lit l'énergie courante (recharge quotidienne appliquée). */
export async function getEnergy(env: Env, uid: string): Promise<EnergyState> {
  return toState(await load(env, uid), env);
}

export type SpendResult =
  | { ok: true; state: EnergyState }
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
  const stored = await load(env, uid);
  if (amount > stored.value) {
    return { ok: false, available: stored.value };
  }
  const updated: StoredEnergy = {
    value: stored.value - amount,
    day: stored.day,
  };
  await env.ENERGY_KV.put(key(uid), JSON.stringify(updated));
  return { ok: true, state: toState(updated, env) };
}
