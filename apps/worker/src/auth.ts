// Vérification des ID tokens Firebase directement dans le Worker, sans Firebase
// Admin SDK : on valide la signature RS256 en WebCrypto contre les clés
// publiques Google, puis on contrôle les claims (aud / iss / exp / iat / sub).
//
// Réf. : un ID token Firebase est un JWT signé par Google. Les clés publiques
// au format JWK sont publiées (avec un Cache-Control) à l'URL ci-dessous.

interface JwkKey {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
}

const JWK_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

interface CachedKeys {
  keys: Record<string, JwkKey>;
  expiresAt: number;
}

// Cache par isolate : évite de refrapper Google à chaque requête. Respecte le
// max-age renvoyé par Google.
let keysCache: CachedKeys | null = null;

async function getGoogleKeys(): Promise<Record<string, JwkKey>> {
  const now = Date.now();
  if (keysCache && keysCache.expiresAt > now) return keysCache.keys;

  const res = await fetch(JWK_URL);
  if (!res.ok) throw new Error('keys_fetch_failed');
  const body = (await res.json()) as { keys: JwkKey[] };

  const keys: Record<string, JwkKey> = {};
  for (const k of body.keys) keys[k.kid] = k;

  const cc = res.headers.get('cache-control') ?? '';
  const maxAgeMatch = cc.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;
  keysCache = { keys, expiresAt: now + maxAge * 1000 };
  return keys;
}

function base64UrlToBytes(input: string): Uint8Array {
  let s = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad) s += '='.repeat(4 - pad);
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeSegment(segment: string): any {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment)));
}

export interface VerifiedToken {
  uid: string;
  email?: string;
}

/**
 * Vérifie un ID token Firebase et renvoie l'uid. Lève une erreur si le token
 * est invalide (signature, clé inconnue, claim incorrect, expiré…).
 */
export async function verifyFirebaseToken(
  token: string,
  projectId: string
): Promise<VerifiedToken> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('malformed_token');
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = decodeSegment(headerB64);
  if (header.alg !== 'RS256') throw new Error('unexpected_alg');
  if (!header.kid) throw new Error('missing_kid');

  const keys = await getGoogleKeys();
  const jwk = keys[header.kid];
  if (!jwk) throw new Error('unknown_key');

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToBytes(signatureB64);
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signature,
    signedData
  );
  if (!valid) throw new Error('invalid_signature');

  const payload = decodeSegment(payloadB64);
  const now = Math.floor(Date.now() / 1000);
  const expectedIss = `https://securetoken.google.com/${projectId}`;

  if (payload.aud !== projectId) throw new Error('invalid_aud');
  if (payload.iss !== expectedIss) throw new Error('invalid_iss');
  if (typeof payload.exp !== 'number' || payload.exp <= now)
    throw new Error('token_expired');
  // Tolérance de 5 min sur l'horloge pour iat.
  if (typeof payload.iat !== 'number' || payload.iat > now + 300)
    throw new Error('invalid_iat');
  if (typeof payload.sub !== 'string' || payload.sub.length === 0)
    throw new Error('missing_sub');

  return { uid: payload.sub, email: payload.email };
}
