# Architecture — Frontend (SGES)

Le frontend de SGES est un **site Next.js** (le « cockpit » du jeu) qui s'appuie
sur **Firebase** pour l'identité et sur le **Worker Cloudflare** pour tout l'état
de jeu (serveur-autoritaire). Le site **n'est jamais la source de vérité** des
ressources : il lit l'état et déclenche des actions ; le Worker décide.

---

## 1. Stack & monorepo

| Élément | Détail |
| --- | --- |
| Framework | Next.js 14 (**Pages Router**) |
| UI | React 18, TypeScript |
| Auth | Firebase Auth (SDK web) |
| i18n | next-i18next (`fr` / `en`) |
| Styles | `styled-jsx` (global, scopé par préfixe de classe) |
| Hébergement | Vercel |
| Package | `apps/site` (`@sges/site`) |

Monorepo (workspaces npm) :
- `apps/site` — le site (ce document).
- `apps/worker` — le backend (voir `apps/worker/ARCHITECTURE.md`).
- `apps/extension` — extension Chrome (MV3) — voir §9.
- `packages/api-contract` — types d'API partagés (importés en `type`).
- `packages/i18n` — traductions partagées (`fr`/`en`).

---

## 2. Identité & contexte d'auth

`src/firebase.js` initialise Firebase (config via `NEXT_PUBLIC_FIREBASE_*`).

`src/context/AuthContext.tsx` (`AuthProvider`, monté dans `_app.tsx`) :
- écoute `onAuthStateChanged` ;
- à la connexion, charge **l'état joueur** (`GET /state`) et le **catalogue
  d'actions** (`GET /actions`) depuis le Worker ;
- dérive le **niveau d'habilitation** depuis `player.level` (plus de lecture
  Firestore) ;
- expose : `user`, `authLevel`, `player`, `actions`, `loading`, `signOut`,
  `refreshPlayer`, `spendEnergy`, `performAction(actionId, subMissionId?)`.

En cas d'échec de chargement (Worker injoignable, `NEXT_PUBLIC_WORKER_URL` absent,
CORS…), `player` reste `null` et un `console.warn` explicite est émis — les jauges
affichent alors « — ».

---

## 3. Client du Worker

`src/lib/playerClient.ts` encapsule les appels au Worker (Bearer = `getIdToken()`):
- `fetchPlayerState()` → `GET /state`
- `fetchActions()` → `GET /actions`
- `performAction(id, subMissionId?)` → `POST /action/{id}` (démarre une mission)
- `spendEnergy()` → `POST /energy/spend`

Erreurs typées via `PlayerClientError` (status HTTP ; `402` insuffisant, `409` déjà
en cours). URL du Worker : `NEXT_PUBLIC_WORKER_URL`.

---

## 4. Pages & routage

| Page | Rôle |
| --- | --- |
| `pages/index.tsx` | Accueil. CTA contextuel : « Accéder au SGC-F » si connecté, sinon « Lancer la mission ». |
| `pages/login.tsx` / `signup.tsx` | Authentification (coquille `AuthTerminal`). |
| `pages/dashboard.tsx` | Application principale (route protégée). |

Le **dashboard est une page unique** dont la section active est pilotée par l'URL
`?tab=…` (`sectionFromQuery(router.query.tab)` ; navigation _shallow_ via
`selectSection`). Avantages : conservé au refresh, partageable, compatible avec les
boutons précédent/suivant. Sections : `dashboard`, `sgcf`, `missions`, `alert`,
`rewards`, et `research` (atteinte via la carte Recherche, hors barre de nav).

---

## 5. Composants du dashboard

- **Sidebar / topbar** : navigation, badge d'habilitation + jauge d'XP, statut, déconnexion.
- **`EnergyBar`** : jauge d'énergie (0–100).
- **`ArtifactWindow`** : petit cadre **doré** avec l'**œil de Râ** (`EYE_OF_RA`) +
  compteur d'artefacts ; affiché sur la **page recherche**.
- **`ActionCards`** : cartes carrées holographiques. Par défaut, **flip 3D** au clic
  pour révéler les sous-missions ; si l'action a `opensSection`, le clic **navigue**
  (ex. vers la vue recherche) au lieu du flip.
- **`SubMissionButton`** : bouton d'une sous-mission ; démarre l'action (timer),
  affiche durée puis compte à rebours + **jauge de complétion** quand en cours.
- **`ResearchView`** : vue « Recherche archéologique ». Deux sections —
  recherches lançables, et **coordonnées (adresses) débloquées**.
- **`ActiveMissions`** : récap des missions en cours (une fenêtre + jauge violette
  par mission), sous les ressources.
- **`useActionLauncher`** : hook partagé (cartes + recherche) — état busy/erreur,
  tic d'animation des jauges, démarrage d'action.

**Finalisation des missions** : un poller central dans `Dashboard` rappelle
`refreshPlayer` dès qu'une mission arrive à échéance, **quel que soit l'onglet
affiché** (throttlé, robuste au décalage d'horloge client/serveur). Les jauges, elles,
sont animées localement à partir de `startedAt`/`endsAt` fournis par le Worker.

---

## 6. État & flux de données

```
Firebase Auth ──(ID token)──┐
                            ▼
        AuthContext ──GET /state, /actions──► Worker (serveur-autoritaire)
            │  expose player / actions / authLevel
            ▼
   Dashboard & composants ──performAction()──► Worker  ──► nouvel état → setPlayer
```

Le niveau (`authLevel`) est **dérivé** de `player.level` (calculé par le Worker).
Les ressources affichées proviennent toujours de `player` (jamais calculées/écrites
côté client).

---

## 7. Internationalisation

- Sources dans `packages/i18n/locales/{fr,en}/common.json`.
- `scripts/sync-locales.js` copie ces fichiers vers `public/locales` (lancé en
  `predev`/`prebuild`). **Toute clé i18n se modifie dans `packages/i18n`**, pas dans
  `public/locales` (généré, gitignoré).
- Les noms/descriptions des **actions** viennent du Worker (catalogue), pas de l'i18n.

---

## 8. Styles & thème

`styled-jsx` global, scopé par préfixe (`.dashboard-screen …`, `.auth-screen …`)
pour ne pas fuir. Palette : fond spatial `#030712`, bleu électrique (`--electric`),
violet (`--violet`, missions/XP), **doré** (`#d4af37`, artefacts / œil de Râ). Police
d'affichage : `Allerta Stencil` (titres) + `monospace` (HUD).

---

## 9. Extension Chrome (`apps/extension`)

Extension MV3 (React + Webpack) : popup + content script, partage `@sges/i18n`.
Frontend distinct du site, hors périmètre du cockpit de jeu.

---

## 10. Variables d'environnement & déploiement

`.env.local` (voir `.env.local.example`) :
- `NEXT_PUBLIC_FIREBASE_*` — config Firebase web.
- `NEXT_PUBLIC_WORKER_URL` — URL du Worker (état de jeu).

⚠️ Les variables `NEXT_PUBLIC_*` sont **injectées au build/au démarrage** : après
les avoir ajoutées/modifiées, **redémarrer `npm run dev`** (ou redéployer Vercel).

Déploiement : Vercel (root = `apps/site`). `prebuild` synchronise les locales.
