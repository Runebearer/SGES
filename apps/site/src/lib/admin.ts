// Allowlist des comptes autorisés au back-office.
//
// ⚠️ Ce contrôle côté CLIENT n'est qu'un garde-fou d'UX : il masque la page,
// mais n'est PAS une frontière de sécurité (le routage navigateur est
// contournable). L'autorité réelle viendra des routes admin du Worker, qui
// vérifieront l'uid côté serveur, quand l'édition de données sera branchée.

import type { User } from 'firebase/auth';

/** uid Firebase autorisés à ouvrir `/admin`. */
export const ADMIN_UIDS: readonly string[] = ['L5tOGxcIImWsm5haAwsXe37YUtF3'];

export function isAdmin(user: User | null): boolean {
  return user != null && ADMIN_UIDS.includes(user.uid);
}
