// Client de la ressource « énergie » exposée par le Worker Cloudflare.
//
// L'énergie est serveur-autoritaire : le client se contente de lire l'état et
// de demander des dépenses ; il n'écrit jamais la valeur lui-même. Les types
// viennent de @sges/api-contract (importés en `type`, effacés du bundle).

import type { EnergyState, SpendEnergyResponse } from '@sges/api-contract';

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;

/** Erreur réseau/applicative du client énergie (porte le code HTTP). */
export class EnergyClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Solde disponible, renseigné sur un 402 (énergie insuffisante). */
    readonly available?: number
  ) {
    super(message);
    this.name = 'EnergyClientError';
  }
}

function baseUrl(): string {
  if (!WORKER_URL) {
    throw new Error(
      'NEXT_PUBLIC_WORKER_URL non défini : impossible de joindre le Worker énergie.'
    );
  }
  return WORKER_URL.replace(/\/$/, '');
}

/** Récupère l'état d'énergie courant. */
export async function fetchEnergy(
  getToken: () => Promise<string>
): Promise<EnergyState> {
  const token = await getToken();
  const res = await fetch(`${baseUrl()}/energy`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new EnergyClientError('fetch_energy_failed', res.status);
  }
  return (await res.json()) as EnergyState;
}

/**
 * Demande la dépense d'énergie pour une action. Lève une EnergyClientError de
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
    throw new EnergyClientError('insufficient_energy', 402, body.available);
  }
  if (!res.ok) {
    throw new EnergyClientError('spend_energy_failed', res.status);
  }
  return (await res.json()) as SpendEnergyResponse;
}
