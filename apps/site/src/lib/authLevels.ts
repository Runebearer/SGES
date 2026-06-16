// Niveaux d'habilitation (clearance level) attribués aux opérateurs.
// Stockés dans Firestore (users/{uid}.authLevel) et exposés via AuthContext
// pour personnaliser l'affichage du site (ex. afficher un panneau si niveau >= 3).
//
// ⚠️ Sécurité : ce niveau sert UNIQUEMENT à la personnalisation d'affichage côté
// client. Il ne protège rien en soi — toute donnée réellement sensible doit être
// gardée par des Firestore Security Rules côté serveur, pas par ce champ.

export const AUTH_LEVELS = [1, 2, 3, 4, 5] as const;

export type AuthLevel = (typeof AUTH_LEVELS)[number];

// Niveau attribué à tout nouvel inscrit.
export const DEFAULT_AUTH_LEVEL: AuthLevel = 1;

// Garde-fou : renvoie un AuthLevel valide à partir d'une valeur Firestore
// potentiellement absente ou corrompue (vieux comptes, écriture partielle…).
export function normalizeAuthLevel(value: unknown): AuthLevel {
  return (AUTH_LEVELS as readonly number[]).includes(value as number)
    ? (value as AuthLevel)
    : DEFAULT_AUTH_LEVEL;
}
