import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetStaticProps } from 'next';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_AUTH_LEVEL } from '../lib/authLevels';
import AuthTerminal from '../components/AuthTerminal';
import nextI18NextConfig from '../../next-i18next.config.js';

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'fr', ['common'], nextI18NextConfig)),
  },
});

export default function SignUp() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirige si l'utilisateur est déjà connecté.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError(t('signup.errors.password_mismatch'));
      return;
    }

    setSubmitting(true);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
      // Crée le profil opérateur avec son niveau d'habilitation initial.
      await setDoc(doc(db, 'users', newUser.uid), {
        email: newUser.email,
        authLevel: DEFAULT_AUTH_LEVEL,
        createdAt: serverTimestamp(),
      });
      router.replace('/');
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : 'unknown';
      setError(t(`signup.errors.${code}`, { defaultValue: t('signup.errors.default') }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>SGES — {t('signup.title')}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Allerta+Stencil&display=swap"
          rel="stylesheet"
        />
      </Head>

      <AuthTerminal
        hudModule={t('signup.hud_module')}
        hudSecure={t('signup.hud_secure')}
        title={t('signup.title')}
        subtitle={t('signup.subtitle')}
        submitLabel={submitting ? t('signup.submitting') : t('signup.submit')}
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
        footerText={t('signup.have_account')}
        footerLinkLabel={t('signup.login_link')}
        footerHref="/login"
      >
        <label className="field">
          <span className="field-label">{t('signup.email')}</span>
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
          <span className="field-label">{t('signup.password')}</span>
          <input
            type="password"
            placeholder="••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
          />
        </label>

        <label className="field">
          <span className="field-label">{t('signup.confirm')}</span>
          <input
            type="password"
            placeholder="••••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
          />
        </label>
      </AuthTerminal>
    </>
  );
}
