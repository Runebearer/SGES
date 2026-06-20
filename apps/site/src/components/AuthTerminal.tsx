import Link from 'next/link';
import type { ReactNode } from 'react';

type AuthTerminalProps = {
  hudModule: string;
  hudSecure: string;
  title: string;
  subtitle: string;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (e: React.FormEvent) => void;
  /** Champs du formulaire (utiliser le markup <label className="field">...). */
  children: ReactNode;
  /** Lien de pied de formulaire (vers login / signup). */
  footerText: string;
  footerLinkLabel: string;
  footerHref: string;
};

/**
 * Coquille « terminal » cyberpunk partagée par les pages d'authentification
 * (login, signup). Reprend la palette de la homepage. Les styles sont globaux
 * mais préfixés par `.auth-screen` pour ne pas fuir vers le reste du site.
 */
export default function AuthTerminal({
  hudModule,
  hudSecure,
  title,
  subtitle,
  submitLabel,
  submitting,
  error,
  onSubmit,
  children,
  footerText,
  footerLinkLabel,
  footerHref,
}: AuthTerminalProps) {
  return (
    <main className="auth-screen">
      {/* Calques décoratifs cyberpunk */}
      <div className="grid-overlay" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />

      <form onSubmit={onSubmit} className="terminal">
        {/* Brackets dans les coins */}
        <span className="bracket tl" aria-hidden="true" />
        <span className="bracket tr" aria-hidden="true" />
        <span className="bracket bl" aria-hidden="true" />
        <span className="bracket br" aria-hidden="true" />

        {/* Barre HUD supérieure */}
        <div className="hud-bar">
          <span>{hudModule}</span>
          <span className="hud-status">
            <i className="dot" />
            {hudSecure}
          </span>
        </div>

        <h1 className="title" data-text={title}>
          {title}
        </h1>
        <p className="subtitle">{subtitle}</p>

        {children}

        {error && (
          <p role="alert" className="login-error">
            <span aria-hidden="true">⚠</span> {error}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          <span>{submitLabel}</span>
        </button>

        <p className="auth-footer">
          {footerText}{' '}
          <Link href={footerHref}>{footerLinkLabel}</Link>
        </p>
      </form>

      <style jsx global>{`
        /* Réinitialise la marge par défaut du body (sinon un cadre blanc
           entoure la page) et applique le fond sombre jusqu'aux bords. */
        html,
        body {
          margin: 0;
          padding: 0;
          background-color: #030712;
        }

        .auth-screen {
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

        /* Grille néon */
        .auth-screen .grid-overlay {
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
        .auth-screen .scanlines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0px,
            rgba(0, 0, 0, 0) 2px,
            rgba(0, 0, 0, 0.18) 3px,
            rgba(0, 0, 0, 0) 4px
          );
          animation: auth-scan 8s linear infinite;
          pointer-events: none;
          opacity: 0.5;
        }

        @keyframes auth-scan {
          from {
            background-position-y: 0;
          }
          to {
            background-position-y: 100px;
          }
        }

        /* ---- TERMINAL / PANNEAU ---- */
        .auth-screen .terminal {
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

        .auth-screen .terminal::before {
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
          animation: auth-sweep 3s ease-in-out infinite;
        }

        @keyframes auth-sweep {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }

        /* Brackets dans les coins */
        .auth-screen .bracket {
          position: absolute;
          width: 16px;
          height: 16px;
          border: 2px solid var(--cyan);
          opacity: 0.8;
        }
        .auth-screen .bracket.tl {
          top: 8px;
          left: 8px;
          border-right: none;
          border-bottom: none;
        }
        .auth-screen .bracket.tr {
          top: 8px;
          right: 8px;
          border-left: none;
          border-bottom: none;
        }
        .auth-screen .bracket.bl {
          bottom: 8px;
          left: 8px;
          border-right: none;
          border-top: none;
        }
        .auth-screen .bracket.br {
          bottom: 8px;
          right: 8px;
          border-left: none;
          border-top: none;
        }

        /* ---- HUD ---- */
        .auth-screen .hud-bar {
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

        .auth-screen .hud-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--cyan);
        }

        .auth-screen .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 8px #4ade80;
          animation: auth-blink 1.4s infinite;
        }

        @keyframes auth-blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.25;
          }
        }

        /* ---- TITRE avec glitch ---- */
        .auth-screen .title {
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

        .auth-screen .title::before,
        .auth-screen .title::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          overflow: hidden;
        }
        .auth-screen .title::before {
          color: var(--cyan);
          transform: translate(-2px, 0);
          clip-path: inset(0 0 55% 0);
          animation: auth-glitch 3.5s infinite linear alternate;
          opacity: 0.7;
        }
        .auth-screen .title::after {
          color: var(--violet);
          transform: translate(2px, 0);
          clip-path: inset(55% 0 0 0);
          animation: auth-glitch 2.7s infinite linear alternate-reverse;
          opacity: 0.7;
        }

        @keyframes auth-glitch {
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

        .auth-screen .subtitle {
          font-family: monospace;
          font-size: 0.78rem;
          letter-spacing: 1px;
          color: var(--deep-blue);
          margin: -6px 0 6px;
          filter: brightness(1.6);
        }

        /* ---- CHAMPS ---- */
        .auth-screen .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .auth-screen .field-label {
          font-family: monospace;
          font-size: 0.7rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--cyan);
          opacity: 0.85;
        }

        .auth-screen .field input {
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

        .auth-screen .field input::placeholder {
          color: rgba(209, 225, 248, 0.35);
        }

        .auth-screen .field input:focus {
          outline: none;
          border-color: var(--cyan);
          background: rgba(0, 210, 255, 0.06);
          box-shadow: 0 0 14px rgba(0, 210, 255, 0.3);
        }

        /* ---- BOUTON ---- */
        .auth-screen button {
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
          clip-path: polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%);
          transition: all 0.25s;
          box-shadow: 0 0 16px rgba(30, 58, 138, 0.5);
        }

        .auth-screen button:hover:not(:disabled) {
          background: var(--cyan);
          color: #030712;
          box-shadow: 0 0 26px rgba(0, 210, 255, 0.7);
        }

        .auth-screen button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .auth-screen button:not(:disabled)::after {
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
          animation: auth-shine 3.5s ease-in-out infinite;
        }

        @keyframes auth-shine {
          0%,
          70% {
            left: -60%;
          }
          100% {
            left: 130%;
          }
        }

        /* ---- ERREUR ---- */
        .auth-screen .login-error {
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

        /* ---- PIED / LIEN ---- */
        .auth-screen .auth-footer {
          margin: 4px 0 0;
          text-align: center;
          font-family: monospace;
          font-size: 0.78rem;
          letter-spacing: 1px;
          color: rgba(209, 225, 248, 0.6);
        }

        .auth-screen .auth-footer a {
          color: var(--cyan);
          text-decoration: none;
          border-bottom: 1px solid rgba(0, 210, 255, 0.4);
          transition: all 0.2s;
        }

        .auth-screen .auth-footer a:hover {
          color: #fff;
          text-shadow: 0 0 10px var(--cyan);
        }

        @media (max-width: 480px) {
          .auth-screen .title {
            font-size: 1.9rem;
            letter-spacing: 4px;
          }
          .auth-screen .terminal {
            padding: 28px 22px 30px;
          }
        }
      `}</style>
    </main>
  );
}
