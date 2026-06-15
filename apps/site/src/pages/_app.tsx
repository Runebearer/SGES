import type { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next'; // Uniquement la racine !
import { AuthProvider } from '../context/AuthContext';
import nextI18NextConfig from '../../next-i18next.config.js';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default appWithTranslation(MyApp, nextI18NextConfig);
