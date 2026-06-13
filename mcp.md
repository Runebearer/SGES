mon-projet-root/
├── package.json               # Configuration globale (workspaces)
├── README.md                  # Documentation générale
├── apps/
│   ├── extension/             # SOURCING EXTENSION CHROME
│   │   ├── manifest.json      # Configuration (Manifest v3 obligatoire)
│   │   ├── src/
│   │   │   ├── popup/         # Code de l'Overlay (Menus, redirection si logout)
│   │   │   ├── content/       # Code du Content Script (Là où l'action se passe)
│   │   │   └── firebase.ts    # Initialisation Firebase locale
│   │   └── vite.config.ts
│   │
│   └── site-web/              # SOURCING APPLICATION WEB (Vercel)
│       ├── src/
│       │   ├── pages/
│       │   │   ├── index.ts   # Page de présentation
│       │   │   └── login.ts   # Page de connexion Firebase
│       │   └── firebase.ts    # Initialisation Firebase Web
│       └── next.config.js