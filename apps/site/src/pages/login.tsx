import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetStaticProps } from 'next';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import AuthTerminal from '../components/AuthTerminal';
import nextI18NextConfig from '../../next-i18next.config.js';

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'fr', ['common'], nextI18NextConfig)),
  },
});

export default function Login() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirige si l'utilisateur est déjà connecté.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/dashboard');
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : 'unknown';
      setError(t(`login.errors.${code}`, { defaultValue: t('login.errors.default') }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>{`SGES — ${t('login.title')}`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Allerta+Stencil&display=swap"
          rel="stylesheet"
        />
      </Head>

      <AuthTerminal
        hudModule={t('login.hud_module')}
        hudSecure={t('login.hud_secure')}
        title={t('login.title')}
        subtitle={t('login.subtitle')}
        submitLabel={submitting ? t('login.submitting') : t('login.submit')}
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
        footerText={t('login.no_account')}
        footerLinkLabel={t('login.signup_link')}
        footerHref="/signup"
      >
        <label className="field">
          <span className="field-label">{t('login.email')}</span>
          <input
            type="email"
            placeholder="operator@sges.io"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label className="field">
          <span className="field-label">{t('login.password')}</span>
          <input
            type="password"
            placeholder="••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
      </AuthTerminal>
    </>
  );
}
