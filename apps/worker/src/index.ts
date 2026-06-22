// Worker Cloudflare SGES — état joueur serveur-autoritaire.
//
// Routes :
//   GET  /state         → état complet du joueur (énergie, électricité, artefacts, xp)
//   GET  /energy        → énergie seule (alias de compatibilité)
//   GET  /history       → journal des actions terminées (récompenses)
//   POST /energy/spend  → dépense de l'énergie pour une action
//   GET  /actions       → catalogue des actions (coûts, gains, descriptions)
//   POST /action/{id}   → exécute une action (coûts/gains serveur-autoritaires)
//
// Auth : en-tête `Authorization: Bearer <ID token Firebase>`, vérifié en
// WebCrypto (cf. auth.ts). L'uid Firebase sert de clé KV.

import { DEFAULT_ACTION_COST, type SpendEnergyRequest } from '@sges/api-contract';
import { verifyFirebaseToken } from './auth';
import { getState, getHistory, spendEnergy, startAction } from './state';
import { ACTIONS } from './actions';

export interface Env {
  ENERGY_KV: KVNamespace;
  FIREBASE_PROJECT_ID: string;
  RESET_TIMEZONE?: string;
  /** Origine(s) CORS autorisée(s), séparées par des virgules. `*` = toutes. */
  ALLOWED_ORIGIN?: string;
}

// Toute origine localhost (n'importe quel port) est acceptée en dev, en plus
// des origines configurées — évite de casser le CORS quand `next dev` change de
// port (3000 occupé → 3001, etc.). Sans risque : l'accès exige de toute façon
// un ID token Firebase valide.
function isLocalhost(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function corsHeaders(env: Env, origin: string | null): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGIN ?? '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowAll = allowed.includes('*');
  const allowOrigin = allowAll
    ? '*'
    : origin && (allowed.includes(origin) || isLocalhost(origin))
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

    // --- GET /history (journal des actions terminées) ------------------------
    if (request.method === 'GET' && url.pathname === '/history') {
      return json(await getHistory(env, uid), 200, cors);
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

    // --- GET /actions (catalogue) --------------------------------------------
    if (request.method === 'GET' && url.pathname === '/actions') {
      return json(ACTIONS, 200, cors);
    }

    // --- POST /action/{id} ---------------------------------------------------
    if (request.method === 'POST' && url.pathname.startsWith('/action/')) {
      const actionId = decodeURIComponent(
        url.pathname.slice('/action/'.length)
      );
      let subMissionId: string | undefined;
      try {
        const body = (await request.json()) as { subMissionId?: unknown };
        if (body && typeof body.subMissionId === 'string') {
          subMissionId = body.subMissionId;
        }
      } catch {
        // Corps vide ou invalide : pas de sous-mission précisée.
      }
      const result = await startAction(env, uid, actionId, subMissionId);
      if (!result.ok && result.reason === 'unknown_action') {
        return json({ error: 'unknown_action' }, 404, cors);
      }
      if (!result.ok && result.reason === 'already_active') {
        return json({ error: 'already_active' }, 409, cors);
      }
      if (!result.ok && result.reason === 'insufficient') {
        return json(
          {
            error: 'insufficient_resources',
            cost: result.cost,
            have: result.have,
          },
          402,
          cors
        );
      }
      if (result.ok) {
        return json(result.result, 200, cors);
      }
    }

    return json({ error: 'not_found' }, 404, cors);
  },
};
