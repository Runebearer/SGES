import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetStaticProps } from 'next';
import nextI18NextConfig from '../../next-i18next.config.js';

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'fr', ['common'], nextI18NextConfig)),
  },
});

export default function Login() {
  const { t } = useTranslation('common');

  return (
    <>
      <Head>
        <title>SGES — Connexion</title>
      </Head>
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <form>
          <h1>{t('nav.terminal')}</h1>
          <input type="email" placeholder="email" />
          <input type="password" placeholder="••••••••" />
          <button type="submit">{t('hero.cta')}</button>
        </form>
      </main>
    </>
  );
}
