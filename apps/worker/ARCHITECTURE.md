# Architecture — Backend (SGES)

Le backend de SGES est un **Cloudflare Worker** serveur-autoritaire qui gère toutes
les ressources et la progression du joueur. Objectif : **anti-triche** — le client
ne peut ni lire ni écrire l'état de jeu directement ; tout passe par le Worker, qui
est la seule source de vérité.

> Règle d'or : toute logique métier de ressource (régénération, dépense, gain,
> timers, déblocages, anti-triche) vit dans le Worker. Jamais côté client.

---

## 1. Stack & emplacement

| Élément | Détail |
| --- | --- |
| Runtime | Cloudflare Workers (V8 isolate, pas Node) |
| Langage | TypeScript |
| Outil | Wrangler |
| Stockage | Cloudflare **KV** (binding `ENERGY_KV`) |
| Identité | Firebase Authentication (vérif. de token, sans Admin SDK) |
| Package | `apps/worker` (`@sges/worker`) |
| Contrat partagé | `packages/api-contract` (`@sges/api-contract`) |

Fichiers clés :
- `src/index.ts` — routeur HTTP + CORS + porte d'authentification.
- `src/auth.ts` — vérification des ID tokens Firebase (WebCrypto).
- `src/state.ts` — état joueur, ressources, niveaux, missions, adresses.
- `src/actions.ts` — catalogue d'actions (coûts, gains, durées, sous-missions).
- `wrangler.toml` — configuration et bindings.

---

## 2. Authentification

Chaque requête exige l'en-tête `Authorization: Bearer <ID token Firebase>`.

`src/auth.ts` vérifie le token **sans Firebase Admin SDK** :
1. Décodage du JWT (header / payload / signature).
2. Vérification de la signature **RS256** en **WebCrypto** contre les clés publiques
   JWK de Google (`securetoken@system`), mises en cache par isolate selon le
   `Cache-Control` renvoyé.
3. Contrôle des claims : `aud === FIREBASE_PROJECT_ID`, `iss` attendu,
   `exp`/`iat` valides, `sub` présent.

L'`uid` Firebase (`sub`) sert de clé de stockage (`player:{uid}`).

---

## 3. Stockage : un document KV par joueur

Clé `player:{uid}` → JSON (`StoredPlayer`). Forme stockée :

```jsonc
{
  "energy": { "value": 100, "day": "2026-06-20" }, // day = fuseau de recharge
  "electricity": 0,
  "artifacts": 0,
  "xp": 0,
  "missions": [ { "actionId": "...", "startedAt": 0, "endsAt": 0, "subMissionId": "..." } ],
  "addresses": [ { "id": "chulak", "name": "Chulak" } ],
  "history": [                            // union discriminée par `type`
    {
      "type": "action",
      "actionId": "earth_archaeology",
      "name": "Archéologie Terrienne",
      "timestamp": 1718900000000,        // ms epoch (complétion)
      "level": 3,                          // niveau du joueur lors de l'action
      "result": {                          // gains réellement crédités
        "electricity": 0,
        "artifacts": 2,
        "xp": 8,
        "addressUnlocked": { "id": "chulak", "name": "Chulak" } // si recherche
      }
    },
    {
      "type": "levelup",                  // passage de niveau (1 entrée / niveau)
      "level": 4,                          // niveau atteint
      "fromLevel": 3,
      "timestamp": 1718900000000           // = complétion de l'action déclenchante
    }
  ]
}
```

Le parsing est **défensif** (`parse()`) : champs absents/corrompus tolérés, valeurs
bornées. Conséquence : les anciens enregistrements restent compatibles quand on
ajoute un champ.

`GET` **n'écrit jamais** en KV par principe (voir énergie/missions ci-dessous) ;
seules une dépense, un démarrage d'action, ou une complétion de mission écrivent.

> ⚠️ KV n'offre pas de compare-and-set atomique. Deux écritures très concurrentes
> pour le même `uid` peuvent se chevaucher. Acceptable pour une jauge de jeu ;
> passer aux **Durable Objects** si une atomicité stricte devient nécessaire.

---

## 4. Ressources & règles

| Ressource | Règle |
| --- | --- |
| `energy` | 0–100. **Recharge à 100 % chaque jour à minuit** (`RESET_TIMEZONE`, défaut `Europe/Paris`). Dépensée au lancement des actions. |
| `electricity` | 0–100, plafonnée. **Pas** de recharge quotidienne. Gagnée par certaines actions. |
| `artifacts` | Compteur 0–30 (plafonné). Coût/gain de certaines actions. |
| `xp` | Accumulateur ≥ 0, gagné via les actions. |
| `level` | Habilitation 1–100, **dérivée de l'XP** (calculée, jamais stockée). |
| `missions` | Missions en cours (timers serveur). |
| `addresses` | Coordonnées de la Porte débloquées par les recherches. |
| `history` | Journal des événements : actions terminées **+ passages de niveau** (récompenses). Borné aux `MAX_HISTORY` (200) entrées les plus récentes. |

### Recharge d'énergie « à minuit » (paresseuse, sans cron)
On mémorise le jour (`energy.day`) de la dernière mise à jour, dans le fuseau
`RESET_TIMEZONE`. L'énergie **effective est recalculée à la lecture** : si le jour
stocké ≠ aujourd'hui → la jauge vaut 100. Donc `GET` n'écrit pas ; comportement
observable identique à un cron de minuit, mais par-utilisateur et fiable en
serverless.

### Niveaux dérivés de l'XP
Coût d'un palier N : `round(100 * (N - 2)^1.5 + 100)`. L'XP requise pour un niveau
est la **somme cumulée** des paliers (L2=100, L3=300, L4=683, L5=1303, …, max
L100). `PlayerState` expose `level`, `xpFloor`, `xpNext` (null au max) pour la
barre côté client. ⚠️ Garder `MAX_LEVEL` (Worker) aligné avec `MAX_AUTH_LEVEL` (site).

---

## 5. Actions (catalogue serveur-autoritaire)

`src/actions.ts` définit le catalogue (`ActionDef[]`). Chaque action a : `id`,
`name`, `section` (carte du dashboard), `cost`, `gain` (artefacts = tirage
aléatoire `[min,max]`), `durationSec`, `subMissions`, et — données conservées mais
**pas encore appliquées** — `requiredLevel`, `requiredAddressStatus`,
`opensSection`.

### Actions temporisées
`POST /action/{id}` = **démarrer** (pas instantané) :
1. Refuse si déjà en cours (**409 `already_active`**) — une instance par action.
2. Déduit les **coûts au lancement** (refus sans débit si insuffisant → **402**).
3. Ajoute une mission `{ actionId, startedAt, endsAt = now + durationSec }`.

**Complétion paresseuse** : à chaque lecture (`loadReconciled`), les missions dont
`endsAt <= now` sont finalisées → gains appliqués (électricité / artefacts aléatoires
/ xp), mission retirée, état persisté (gains irréversibles → écriture obligatoire).

### Journal des événements (historique)
`player.history` est un journal d'événements (**union discriminée par `type`**),
borné aux `MAX_HISTORY` (200) entrées les plus récentes et lu via `GET /history`.
C'est la base serveur-autoritaire pour attribuer des récompenses. Deux types
d'entrées, tous deux ajoutés à la **complétion** d'une action (seul moment où le
*résultat* et les gains d'XP existent) :

- **`action`** — `{ actionId, name, timestamp (= endsAt), level, result }`. Le
  `level` est celui du joueur **au moment de l'action** (dérivé de l'XP **avant**
  d'y ajouter le gain) ; `result` contient les gains **réellement crédités** (après
  plafonnement des ressources et tirage des artefacts), plus l'adresse débloquée le
  cas échéant.
- **`levelup`** — `{ level, fromLevel, timestamp }`. Ajouté lorsque le gain d'XP de
  l'action fait franchir un ou plusieurs paliers : **une entrée par niveau franchi**
  (un saut de deux niveaux d'un coup → deux entrées), insérée juste après l'entrée
  `action` déclenchante.

### Recherche & adresses
Une sous-mission peut porter `unlocksAddresses` (pool ordonné). À chaque complétion
d'une telle recherche, le Worker débloque la **prochaine adresse non encore
possédée** et l'ajoute à `player.addresses`. La recherche reste répétable.

---

## 6. API

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` | `/state` | État complet du joueur (recharge + complétions appliquées). |
| `GET` | `/energy` | Énergie seule (alias de compat). |
| `GET` | `/history` | Journal des actions terminées (`ActionHistoryEntry[]`). |
| `POST` | `/energy/spend` | Dépense d'énergie générique (`{ amount?, action? }`). |
| `GET` | `/actions` | Catalogue des actions. |
| `POST` | `/action/{id}` | Démarre une action (`{ subMissionId? }`). |

Codes d'erreur : `401` (token absent/invalide), `402` (ressources insuffisantes),
`404` (action/route inconnue), `409` (action déjà en cours).

**CORS** : origines autorisées via `ALLOWED_ORIGIN` (séparées par des virgules) ;
en plus, **toute origine `localhost:<port>` est acceptée** (dev). L'accès reste
protégé par le token Firebase.

---

## 7. Contrat partagé (`@sges/api-contract`)

Types et constantes partagés entre Worker et site : `PlayerState`, `EnergyState`,
`ActionDef`, `SubMission`, `Address`, `ActiveMission`, `HistoryEntry`,
`ActionHistoryEntry`, `LevelUpHistoryEntry`, `ActionResultSummary`, `MAX_ENERGY`,
`MAX_ELECTRICITY`, `MAX_ARTIFACTS`, `MAX_HISTORY`, etc. Le **site les importe en `type`** (effacés
du bundle navigateur) ; le Worker importe aussi les valeurs (constantes). Pas de
`transpilePackages` nécessaire côté Next.

---

## 8. Configuration & déploiement

`wrangler.toml` :
- `[[kv_namespaces]]` binding `ENERGY_KV` (créé via `wrangler kv namespace create`).
- `[vars]` : `FIREBASE_PROJECT_ID` (= projet Firebase du site), `RESET_TIMEZONE`,
  `ALLOWED_ORIGIN`.

Déploiement : `npm run deploy` (→ `wrangler deploy`). **Toute modification du Worker
(texte, coûts, logique) n'est visible qu'après redéploiement** (ou via
`wrangler dev` en local). Le site cible l'URL du Worker via `NEXT_PUBLIC_WORKER_URL`.

Voir `README.md` pour la procédure pas à pas.

---

## 9. Limites connues / à venir

- `requiredLevel` et `requiredAddressStatus` sont **stockés mais pas appliqués**
  (gates de niveau/adresse à activer plus tard).
- Pas d'atomicité stricte (KV) — voir §3.
- Pas d'endpoint d'administration (consultation des joueurs se fait via dashboard
  Cloudflare / `wrangler kv key get` ; clé = UID Firebase).
- Firestore `users/{uid}.authLevel` n'est plus la source du niveau (dérivé de l'XP) ;
  le signup l'écrit encore (inoffensif).
