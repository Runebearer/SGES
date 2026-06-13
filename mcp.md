mon-projet-root/
├── packages/
│   └── i18n/                          # NOUVEAU : package partagé
│       ├── package.json
│       ├── index.ts                   # export des ressources pour l'extension
│       └── locales/
│           ├── fr/
│           │   ├── common.json        # textes du site web
│           │   └── extension.json     # textes de l'extension
│           └── en/
│               ├── common.json
│               └── extension.json
│
├── apps/
│   ├── site/
│   │   ├── next-i18next.config.js     # NOUVEAU
│   │   ├── next.config.js             # MODIFIÉ (ajout i18n)
│   │   ├── scripts/
│   │   │   └── sync-locales.js        # NOUVEAU
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── _app.tsx           # MODIFIÉ (appWithTranslation)
│   │       │   └── index.tsx          # MODIFIÉ (useTranslation + t())
│   │       └── components/
│   │           └── LanguageSwitcher.tsx  # NOUVEAU
│   │
│   └── extension/
│       └── src/
│           ├── i18n/
│           │   └── index.ts           # NOUVEAU : init i18next
│           └── popup/
│               └── Popup.tsx          # MODIFIÉ (exemple d'utilisation)