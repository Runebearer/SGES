// Logique back-office côté Worker : autorisation (allowlist) et énumération des
// joueurs. L'autorisation est vérifiée ICI, côté serveur (pas seulement masquée
// côté client) : un compte hors allowlist se voit refuser toute route /admin/*.
//
// Les Durable Objects ne s'énumèrent pas : on liste les uid depuis le KV, en
// unissant les clés `player:` (héritées d'avant la migration DO) et `roster:`
// (écrites à l'hydratation du DO pour les joueurs créés après la migration).

import type { Env } from './index';

/** Vrai si `uid` figure dans l'allowlist (var ADMIN_UIDS, séparée par des virgules). */
export function isAdmin(uid: string, env: Env): boolean {
  return (env.ADMIN_UIDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(uid);
}

/** Liste tous les uid joueurs connus (union des préfixes KV `player:` et `roster:`). */
export async function listPlayerUids(env: Env): Promise<string[]> {
  const uids = new Set<string>();
  for (const prefix of ['player:', 'roster:']) {
    let cursor: string | undefined;
    // KV pagine (≤ 1000 clés/appel) : on parcourt jusqu'à épuisement.
    for (;;) {
      const res = await env.ENERGY_KV.list({ prefix, cursor });
      for (const k of res.keys) uids.add(k.name.slice(prefix.length));
      if (res.list_complete) break;
      cursor = res.cursor;
    }
  }
  return [...uids].sort();
}
