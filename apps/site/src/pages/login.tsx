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
      router.replace('/');
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/');
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
        <title>SGES — {t('login.title')}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Allerta+Stencil&display=swap"
          rel="stylesheet"
        />
      </Head>

      <main className="login-screen">
        {/* Calques décoratifs cyberpunk */}
        <div className="grid-overlay" aria-hidden="true" />
        <div className="scanlines" aria-hidden="true" />

        <form onSubmit={handleSubmit} className="terminal">
          {/* Coins biseautés / brackets */}
          <span className="bracket tl" aria-hidden="true" />
          <span className="bracket tr" aria-hidden="true" />
          <span className="bracket bl" aria-hidden="true" />
          <span className="bracket br" aria-hidden="true" />

          {/* Barre HUD supérieure */}
          <div className="hud-bar">
            <span>{t('login.hud_module')}</span>
            <span className="hud-status">
              <i className="dot" />
              {t('login.hud_secure')}
            </span>
          </div>

          <h1 className="title" data-text={t('login.title')}>
            {t('login.title')}
          </h1>
          <p className="subtitle">{t('login.subtitle')}</p>

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

          {error && (
            <p role="alert" className="login-error">
              <span aria-hidden="true">⚠</span> {error}
            </p>
          )}

          <button type="submit" disabled={submitting}>
            <span>{submitting ? t('login.submitting') : t('login.submit')}</span>
          </button>
        </form>
      </main>

      <style jsx>{`
        .login-screen {
          --bg-space: #030712;
          --panel-bg: rgba(10, 25, 47, 0.72);
          --deep-blue: #1e3a8a;
          --cyan: #00d2ff;
          --violet: #a855f7;
          --text-main: #d1e1f8;
          --text-heading: #ffffff;

          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          overflow: hidden;
          background-color: var(--bg-space);
          background-image: radial-gradient(
              white,
              rgba(255, 255, 255, 0.2) 2px,
              transparent 40px
            ),
            radial-gradient(white, rgba(255, 255, 255, 0.15) 1px, transparent 30px),
            radial-gradient(white, rgba(255, 255, 255, 0.1) 2px, transparent 40px);
          background-size: 550px 550px, 350px 350px, 250px 250px;
          background-position: 0 0, 40px 60px, 130px 270px;
        }

        /* Grille néon en perspective */
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(
              rgba(0, 210, 255, 0.08) 1px,
              transparent 1px
            ),
            linear-gradient(90deg, rgba(0, 210, 255, 0.08) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(
            ellipse 80% 60% at 50% 50%,
            #000 30%,
            transparent 75%
          );
          pointer-events: none;
        }

        /* Lignes de balayage */
        .scanlines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0px,
            rgba(0, 0, 0, 0) 2px,
            rgba(0, 0, 0, 0.18) 3px,
            rgba(0, 0, 0, 0) 4px
          );
          animation: scan 8s linear infinite;
          pointer-events: none;
          opacity: 0.5;
        }

        @keyframes scan {
          from {
            background-position-y: 0;
          }
          to {
            background-position-y: 100px;
          }
        }

        /* ---- TERMINAL / PANNEAU ---- */
        .terminal {
          position: relative;
          z-index: 1;
          width: min(420px, 92vw);
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding: 34px 32px 36px;
          background: var(--panel-bg);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(0, 210, 255, 0.25);
          clip-path: polygon(
            0 18px,
            18px 0,
            100% 0,
            100% calc(100% - 18px),
            calc(100% - 18px) 100%,
            0 100%
          );
          box-shadow: 0 0 30px rgba(0, 210, 255, 0.12),
            0 0 60px rgba(168, 85, 247, 0.08), inset 0 0 40px rgba(30, 58, 138, 0.15);
        }

        /* Liseré violet animé en haut */
        .terminal::before {
          content: '';
          position: absolute;
          top: 0;
          left: 18px;
          right: 0;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent,
            var(--cyan),
            var(--violet),
            transparent
          );
          animation: sweep 3s ease-in-out infinite;
        }

        @keyframes sweep {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }

        /* Brackets dans les coins */
        .bracket {
          position: absolute;
          width: 16px;
          height: 16px;
          border: 2px solid var(--cyan);
          opacity: 0.8;
        }
        .bracket.tl {
          top: 8px;
          left: 8px;
          border-right: none;
          border-bottom: none;
        }
        .bracket.tr {
          top: 8px;
          right: 8px;
          border-left: none;
          border-bottom: none;
        }
        .bracket.bl {
          bottom: 8px;
          left: 8px;
          border-right: none;
          border-top: none;
        }
        .bracket.br {
          bottom: 8px;
          right: 8px;
          border-left: none;
          border-top: none;
        }

        /* ---- HUD ---- */
        .hud-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: monospace;
          font-size: 0.72rem;
          letter-spacing: 2px;
          color: var(--violet);
          text-transform: uppercase;
          border-bottom: 1px solid rgba(168, 85, 247, 0.2);
          padding-bottom: 10px;
        }

        .hud-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--cyan);
        }

        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 8px #4ade80;
          animation: blink 1.4s infinite;
        }

        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.25;
          }
        }

        /* ---- TITRE avec glitch ---- */
        .title {
          position: relative;
          font-family: 'Allerta Stencil', sans-serif;
          font-size: 2.4rem;
          line-height: 1;
          text-transform: uppercase;
          letter-spacing: 6px;
          color: var(--text-heading);
          text-shadow: 0 0 14px rgba(0, 210, 255, 0.5);
          margin: 4px 0 0;
        }

        .title::before,
        .title::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          overflow: hidden;
        }
        .title::before {
          color: var(--cyan);
          transform: translate(-2px, 0);
          clip-path: inset(0 0 55% 0);
          animation: glitch 3.5s infinite linear alternate;
          opacity: 0.7;
        }
        .title::after {
          color: var(--violet);
          transform: translate(2px, 0);
          clip-path: inset(55% 0 0 0);
          animation: glitch 2.7s infinite linear alternate-reverse;
          opacity: 0.7;
        }

        @keyframes glitch {
          0%,
          92%,
          100% {
            transform: translate(0, 0);
          }
          93% {
            transform: translate(-3px, -1px);
          }
          96% {
            transform: translate(3px, 1px);
          }
        }

        .subtitle {
          font-family: monospace;
          font-size: 0.78rem;
          letter-spacing: 1px;
          color: var(--deep-blue);
          margin: -6px 0 6px;
          filter: brightness(1.6);
        }

        /* ---- CHAMPS ---- */
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-family: monospace;
          font-size: 0.7rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--cyan);
          opacity: 0.85;
        }

        .field input {
          padding: 12px 14px;
          background: rgba(3, 7, 18, 0.7);
          border: 1px solid var(--deep-blue);
          border-left: 3px solid var(--cyan);
          color: var(--text-main);
          font-family: monospace;
          font-size: 1rem;
          letter-spacing: 1px;
          transition: all 0.25s;
        }

        .field input::placeholder {
          color: rgba(209, 225, 248, 0.35);
        }

        .field input:focus {
          outline: none;
          border-color: var(--cyan);
          background: rgba(0, 210, 255, 0.06);
          box-shadow: 0 0 14px rgba(0, 210, 255, 0.3);
        }

        /* ---- BOUTON ---- */
        button {
          position: relative;
          margin-top: 8px;
          padding: 14px;
          background: var(--deep-blue);
          color: #fff;
          border: 1px solid var(--cyan);
          font-family: 'Allerta Stencil', sans-serif;
          text-transform: uppercase;
          letter-spacing: 3px;
          font-size: 1rem;
          cursor: pointer;
          overflow: hidden;
          clip-path: polygon(
            12px 0,
            100% 0,
            calc(100% - 12px) 100%,
            0 100%
          );
          transition: all 0.25s;
          box-shadow: 0 0 16px rgba(30, 58, 138, 0.5);
        }

        button:hover:not(:disabled) {
          background: var(--cyan);
          color: #030712;
          box-shadow: 0 0 26px rgba(0, 210, 255, 0.7);
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* Reflet qui balaie le bouton */
        button:not(:disabled)::after {
          content: '';
          position: absolute;
          top: 0;
          left: -60%;
          width: 40%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.35),
            transparent
          );
          transform: skewX(-20deg);
          animation: shine 3.5s ease-in-out infinite;
        }

        @keyframes shine {
          0%,
          70% {
            left: -60%;
          }
          100% {
            left: 130%;
          }
        }

        /* ---- ERREUR ---- */
        .login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: -4px 0 0;
          padding: 10px 12px;
          font-family: monospace;
          font-size: 0.82rem;
          color: #fca5a5;
          background: rgba(248, 113, 113, 0.08);
          border-left: 3px solid #f87171;
        }

        @media (max-width: 480px) {
          .title {
            font-size: 1.9rem;
            letter-spacing: 4px;
          }
          .terminal {
            padding: 28px 22px 30px;
          }
        }
      `}</style>
    </>
  );
}
