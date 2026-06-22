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
        /public/fonts). Déclarée ici mais appliquée nulle part : le navigateur
        ne télécharge le .ttf que lorsqu'un élément utilise réellement
        `font-family: 'Stargate Glyphs'` (à venir : la liste d'adresses des
        portes des étoiles). Aucun impact sur l'affichage actuel.
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
