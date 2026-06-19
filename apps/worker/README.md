# @sges/worker — Worker énergie (Cloudflare)

Backend serveur-autoritaire de la ressource **énergie** d'un opérateur.
La jauge contrôle le nombre d'actions par jour et se **recharge à 100 % chaque
jour à minuit** (fuseau configurable).

## Routes

| Méthode | Chemin           | Description                                            |
| ------- | ---------------- | ------------------------------------------------------ |
| `GET`   | `/energy`        | État courant (recharge quotidienne appliquée).         |
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

Pas de tâche planifiée (cron). Chaque enregistrement KV mémorise le jour de la
dernière remise à plein dans le fuseau `RESET_TIMEZONE`. Au premier accès d'un
nouveau jour, la jauge repasse à `MAX_ENERGY`. Comportement observable identique
à un cron de minuit, mais par-utilisateur et fiable en serverless (pas besoin
d'itérer toutes les clés KV).

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
