// Habilitations (clearance level) d'un opérateur. Le niveau est DÉRIVÉ de l'XP
// côté Worker (cf. apps/worker/src/state.ts) et exposé via AuthContext pour
// personnaliser l'affichage (badge, panneaux réservés…).
//
// ⚠️ La plage [MIN_AUTH_LEVEL, MAX_AUTH_LEVEL] doit rester alignée avec
// MAX_LEVEL du Worker, sinon un niveau hors plage serait ramené ci-dessous.

export const MIN_AUTH_LEVEL = 1;
export const MAX_AUTH_LEVEL = 100;

export type AuthLevel = number;

// Niveau attribué par défaut (nouvel opérateur, ou valeur absente/corrompue).
export const DEFAULT_AUTH_LEVEL: AuthLevel = MIN_AUTH_LEVEL;

// Garde-fou : renvoie un niveau valide (entier borné MIN..MAX) à partir d'une
// valeur potentiellement absente ou corrompue.
export function normalizeAuthLevel(value: unknown): AuthLevel {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return DEFAULT_AUTH_LEVEL;
  }
  if (value < MIN_AUTH_LEVEL) return MIN_AUTH_LEVEL;
  if (value > MAX_AUTH_LEVEL) return MAX_AUTH_LEVEL;
  return value;
}
