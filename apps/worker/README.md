# @sges/worker — Worker état joueur (Cloudflare)

Backend serveur-autoritaire des **ressources** d'un opérateur, consolidées dans
un seul document KV par utilisateur (`player:{uid}`, écrit uniquement par le
Worker) :

| Ressource     | Comportement                                                        |
| ------------- | ------------------------------------------------------------------- |
| `energy`      | 0–100, **recharge à 100 % chaque jour à minuit** (fuseau configurable). |
| `electricity` | 0–100, plafonnée mais **sans** recharge quotidienne (gain à venir). |
| `artifacts`   | Compteur 0–30 (plafonné).                                           |
| `xp`          | Accumulateur ≥ 0 ; le niveau (`authLevel`) reste dans Firestore.    |

## Routes

| Méthode | Chemin           | Description                                            |
| ------- | ---------------- | ------------------------------------------------------ |
| `GET`   | `/state`         | État complet du joueur (recharge d'énergie appliquée). |
| `GET`   | `/energy`        | Énergie seule (alias de compatibilité).                |
| `POST`  | `/energy/spend`  | Dépense de l'énergie pour une action.                  |

Toutes les routes exigent un en-tête `Authorization: Bearer <ID token Firebase>`.
Le token est vérifié dans le Worker (signature RS256 en WebCrypto contre les
clés publiques Google + contrôle des claims `aud` / `iss` / `exp`). Pas de
Firebase Admin SDK.

`POST /energy/spend` accepte un corps JSON optionnel :

```json
{ "amount": 10, "action": "scan_secteur" }
```

`amount` omis → coût par défaut (`DEFAULT_ACTION_COST`, défini dans
`@sges/api-contract`). Si l'énergie est insuffisante : réponse **402** avec
`{ "error": "insufficient_energy", "available": <n>, "required": <n> }`.

## Recharge « à minuit »

Pas de tâche planifiée (cron). L'énergie effective est **recalculée à la
lecture** : chaque enregistrement KV mémorise le jour de la dernière dépense
(fuseau `RESET_TIMEZONE`) ; si ce jour n'est pas aujourd'hui, la jauge vaut
`MAX_ENERGY`. Conséquence : **`GET` n'écrit jamais en KV** ; seule une dépense
(`POST /energy/spend`) écrit. Comportement observable identique à un cron de
minuit, mais par-utilisateur et fiable en serverless.

## Configuration & déploiement

Prérequis : `npm install` à la racine du monorepo, et `wrangler` authentifié
(`npx wrangler login`).

1. **Créer le namespace KV** (une fois) :

   ```sh
   cd apps/worker
   npx wrangler kv namespace create ENERGY_KV
   # (optionnel, pour `wrangler dev`) :
   npx wrangler kv namespace create ENERGY_KV --preview
   ```

   Coller l'`id` (et `preview_id`) renvoyés dans `wrangler.toml`.

2. **Renseigner les variables** dans `wrangler.toml` (`[vars]`) :
   - `FIREBASE_PROJECT_ID` : même valeur que `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
     côté site.
   - `RESET_TIMEZONE` : fuseau de la recharge (défaut `Europe/Paris`).
   - `ALLOWED_ORIGIN` : URL du site (CORS). Ex. `https://sges.example.com`.
     Plusieurs origines possibles, séparées par des virgules.

3. **Développement local** :

   ```sh
   cp .dev.vars.example .dev.vars   # renseigner FIREBASE_PROJECT_ID
   npm run dev                      # wrangler dev (http://localhost:8787)
   ```

4. **Déploiement** :

   ```sh
   npm run deploy                   # wrangler deploy
   ```

   Récupérer l'URL publique du Worker (`https://sges-worker.<sous-domaine>.workers.dev`
   ou un domaine personnalisé) et la renseigner côté site dans
   `NEXT_PUBLIC_WORKER_URL`.

## Côté site

Le site consomme ce Worker via `apps/site/src/lib/energyClient.ts`, chargé dans
`AuthContext` à la connexion et affiché dans la jauge d'énergie du dashboard.
Les types sont partagés via `@sges/api-contract` (importés en `type`, donc
effacés du bundle navigateur).
