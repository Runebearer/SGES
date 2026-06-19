// Worker Cloudflare SGES — état joueur serveur-autoritaire.
//
// Routes :
//   GET  /state         → état complet du joueur (énergie, électricité, artefacts, xp)
//   GET  /energy        → énergie seule (alias de compatibilité)
//   POST /energy/spend  → dépense de l'énergie pour une action
//
// Auth : en-tête `Authorization: Bearer <ID token Firebase>`, vérifié en
// WebCrypto (cf. auth.ts). L'uid Firebase sert de clé KV.

import { DEFAULT_ACTION_COST, type SpendEnergyRequest } from '@sges/api-contract';
import { verifyFirebaseToken } from './auth';
import { getState, spendEnergy } from './state';

export interface Env {
  ENERGY_KV: KVNamespace;
  FIREBASE_PROJECT_ID: string;
  RESET_TIMEZONE?: string;
  /** Origine(s) CORS autorisée(s), séparées par des virgules. `*` = toutes. */
  ALLOWED_ORIGIN?: string;
}

function corsHeaders(env: Env, origin: string | null): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGIN ?? '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowAll = allowed.includes('*');
  const allowOrigin = allowAll
    ? '*'
    : origin && allowed.includes(origin)
      ? origin
      : (allowed[0] ?? '');

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(
  body: unknown,
  status: number,
  cors: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(env, origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    // --- Authentification ----------------------------------------------------
    const authz = request.headers.get('Authorization') ?? '';
    const bearer = authz.match(/^Bearer\s+(.+)$/i);
    if (!bearer) return json({ error: 'unauthorized' }, 401, cors);

    let uid: string;
    try {
      ({ uid } = await verifyFirebaseToken(bearer[1], env.FIREBASE_PROJECT_ID));
    } catch {
      return json({ error: 'invalid_token' }, 401, cors);
    }

    // --- GET /state ----------------------------------------------------------
    if (request.method === 'GET' && url.pathname === '/state') {
      return json(await getState(env, uid), 200, cors);
    }

    // --- GET /energy (alias de compatibilité : énergie seule) ----------------
    if (request.method === 'GET' && url.pathname === '/energy') {
      return json((await getState(env, uid)).energy, 200, cors);
    }

    // --- POST /energy/spend --------------------------------------------------
    if (request.method === 'POST' && url.pathname === '/energy/spend') {
      let amount = DEFAULT_ACTION_COST;
      try {
        const body = (await request.json()) as SpendEnergyRequest;
        if (body && typeof body.amount === 'number') amount = body.amount;
      } catch {
        // Corps vide ou JSON invalide : on conserve le coût par défaut.
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        return json({ error: 'invalid_amount' }, 400, cors);
      }

      const result = await spendEnergy(env, uid, amount);
      if (!result.ok) {
        return json(
          {
            error: 'insufficient_energy',
            available: result.available,
            required: amount,
          },
          402,
          cors
        );
      }
      return json({ ...result.state.energy, spent: amount }, 200, cors);
    }

    return json({ error: 'not_found' }, 404, cors);
  },
};
