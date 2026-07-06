import type { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next'; // Uniquement la racine !
import { AuthProvider } from '../context/AuthContext';
import nextI18NextConfig from '../../next-i18next.config.js';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      {/*
        Police « glyphes d'adresse » Stargate, auto-hébergée (fichier dans
        /public/fonts). Déclarée globalement ici ; le navigateur ne télécharge
        le .ttf que lorsqu'un élément utilise réellement
        `font-family: 'Stargate Glyphs'` (liste des coordonnées débloquées,
        vue Recherche du dashboard — cf. `gateGlyphsForAddress`).
      */}
      <style jsx global>{`
        @font-face {
          font-family: 'Stargate Glyphs';
          src: url('/fonts/stargate-glyphs.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `}</style>
    </AuthProvider>
  );
}

export default appWithTranslation(MyApp, nextI18NextConfig);
