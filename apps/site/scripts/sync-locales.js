// Copie les traductions du package partagé @mon-projet/i18n
// vers apps/site/public/locales, où next-i18next va les chercher.
//
// À lancer avant `next dev` / `next build` (voir scripts "predev"/"prebuild"
// dans package.json).

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', '..', 'packages', 'i18n', 'locales');
const DEST = path.join(__dirname, '..', 'public', 'locales');

if (!fs.existsSync(SRC)) {
  console.error(`[sync-locales] Dossier source introuvable : ${SRC}`);
  process.exit(1);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.cpSync(SRC, DEST, { recursive: true });

console.log(`[sync-locales] Traductions synchronisées : ${SRC} -> ${DEST}`);
