// Client de l'état joueur serveur-autoritaire exposé par le Worker Cloudflare.
//
// Le client se contente de lire l'état et de demander des dépenses ; il n'écrit
// jamais les ressources lui-même. Les types viennent de @sges/api-contract
// (importés en `type`, effacés du bundle).

import type { PlayerState, SpendEnergyResponse } from '@sges/api-contract';

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;

/** Erreur réseau/applicative du client (porte le code HTTP). */
export class PlayerClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Solde disponible, renseigné sur un 402 (énergie insuffisante). */
    readonly available?: number
  ) {
    super(message);
    this.name = 'PlayerClientError';
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

/** Récupère l'état complet du joueur (énergie, électricité, artefacts, xp). */
export async function fetchPlayerState(
  getToken: () => Promise<string>
): Promise<PlayerState> {
  const token = await getToken();
  const res = await fetch(`${baseUrl()}/state`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new PlayerClientError('fetch_state_failed', res.status);
  }
  return (await res.json()) as PlayerState;
}

/**
 * Demande la dépense d'énergie pour une action. Lève une PlayerClientError de
 * status 402 (avec `available`) si le solde est insuffisant.
 */
export async function spendEnergy(
  getToken: () => Promise<string>,
  amount?: number,
  action?: string
): Promise<SpendEnergyResponse> {
  const token = await getToken();
  const res = await fetch(`${baseUrl()}/energy/spend`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount, action }),
  });

  if (res.status === 402) {
    const body = (await res.json().catch(() => ({}))) as { available?: number };
    throw new PlayerClientError('insufficient_energy', 402, body.available);
  }
  if (!res.ok) {
    throw new PlayerClientError('spend_energy_failed', res.status);
  }
  return (await res.json()) as SpendEnergyResponse;
}
