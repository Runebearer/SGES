import { Html, Head, Main, NextScript } from 'next/document';

// Document personnalisé : déclare les favicons et le manifest (icônes générées
// via favicon.io, fichiers à la racine de /public). La langue du <html> est
// gérée automatiquement par l'i18n Next (cf. next.config `i18n`), on ne la
// force donc pas ici.
export default function Document() {
  return (
    <Html>
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0a0e14" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
