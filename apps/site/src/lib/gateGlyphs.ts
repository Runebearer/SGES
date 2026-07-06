// Glyphes de la Porte des étoiles pour une adresse (police auto-hébergée
// « Stargate Glyphs », cf. `_app.tsx` + `public/fonts/stargate-glyphs.ttf`).
// Dans cette police, seuls les caractères A–Z et a–n portent un symbole ; le
// caractère `A` dessine le point d'origine (triangle surmonté d'un point).
//
// Une adresse de Porte = 7 symboles : 6 symboles de destination + le point
// d'origine, toujours en dernier. Aucune combinaison n'est stockée côté
// serveur : elle est dérivée de façon déterministe à partir de l'identifiant
// de l'adresse (même adresse ⇒ mêmes glyphes, à chaque affichage).

const POINT_OF_ORIGIN = 'A';
const GLYPH_POOL = 'BCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn'.split('');

// Hash de chaîne (FNV-1a, 32 bits) : rapide, déterministe, suffisant pour de
// la sélection pseudo-aléatoire d'affichage (pas de besoin cryptographique).
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Dérive les 7 symboles de l'adresse de Porte pour l'identifiant donné :
 * 6 symboles de destination (tirés sans répétition du pool) puis le point
 * d'origine. À afficher avec `font-family: 'Stargate Glyphs'`.
 */
export function gateGlyphsForAddress(id: string): string {
  const pool = [...GLYPH_POOL];
  const symbols: string[] = [];
  let seed = hash(id);
  for (let i = 0; i < 6 && pool.length > 0; i++) {
    seed = Math.imul(seed ^ (seed >>> 15), 0x2545f491) >>> 0;
    const idx = seed % pool.length;
    symbols.push(pool.splice(idx, 1)[0]);
  }
  symbols.push(POINT_OF_ORIGIN);
  return symbols.join('');
}
