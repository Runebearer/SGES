// Client du back-office (routes /admin/* du Worker). L'autorisation est
// vérifiée CÔTÉ SERVEUR (allowlist) : ces appels échouent en 403 pour un compte
// hors allowlist, même si la page était atteinte. Mêmes conventions que
// playerClient (base NEXT_PUBLIC_WORKER_URL, Bearer token).

import type { PlayerState, AdminPlayerPatch } from '@sges/api-contract';

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;

export class AdminClientError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'AdminClientError';
  }
}

function baseUrl(): string {
  if (!WORKER_URL) {
    throw new Error(
      'NEXT_PUBLIC_WORKER_URL non défini : impossible de joindre le Worker.'
    );
  }
  return WORKER_URL.replace(/\/$/, '');
}

async function call(
  token: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new AdminClientError(`admin_request_failed`, res.status);
  return res;
}

/** Liste de tous les uid joueurs connus. */
export async function fetchPlayers(
  getToken: () => Promise<string>
): Promise<string[]> {
  const res = await call(await getToken(), '/admin/players');
  return (await res.json()) as string[];
}

/** État complet d'un joueur (consultation). */
export async function fetchPlayer(
  getToken: () => Promise<string>,
  uid: string
): Promise<PlayerState> {
  const res = await call(
    await getToken(),
    `/admin/player/${encodeURIComponent(uid)}`
  );
  return (await res.json()) as PlayerState;
}

/** Édite un joueur (valeurs absolues). Renvoie l'état à jour. */
export async function updatePlayer(
  getToken: () => Promise<string>,
  uid: string,
  patch: AdminPlayerPatch
): Promise<PlayerState> {
  const res = await call(
    await getToken(),
    `/admin/player/${encodeURIComponent(uid)}`,
    { method: 'POST', body: JSON.stringify(patch) }
  );
  return (await res.json()) as PlayerState;
}

/** Réinitialise un joueur à l'état par défaut. */
export async function resetPlayer(
  getToken: () => Promise<string>,
  uid: string
): Promise<PlayerState> {
  return updatePlayer(getToken, uid, { reset: true });
}
