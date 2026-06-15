import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetStaticProps } from 'next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import StargateRing from '../components/StargateRing';
import nextI18NextConfig from '../../next-i18next.config.js';

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common'], nextI18NextConfig)),
    },
  };
};

export default function Home() {
  const { t } = useTranslation('common');

  return (
    <>
      <Head>
        <title>StargateF : Exploration Spatiale</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Allerta+Stencil&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* ===== HEADER / NAVIGATION ===== */}
      <header className="site-header">
        <div className="logo">
          SGF<span>: ES</span>
        </div>
        <nav>
          <ul>
            <li><a href="#" className="active">{t('nav.terminal')}</a></li>
            <li><a href="#features">{t('nav.features')}</a></li>
            <li><a href="#stack">{t('nav.architecture')}</a></li>
            <li><a href="#join">{t('nav.join')}</a></li>
          </ul>
        </nav>
        <LanguageSwitcher />
      </header>

      {/* ===== HERO ===== */}
      <section className="hero">
        <h1>
          <span className="accent">S</span>tar<span className="accent">g</span>ate F :{' '}
          <span className="accent">E</span>xploration{' '}
          <span className="accent">S</span>patiale
        </h1>
        <p>{t('hero.subtitle')}</p>

        <div className="gate">
          <StargateRing />
          <div className="gate-cta">
            <a href="#join" className="btn">{t('hero.cta')}</a>
          </div>
        </div>
      </section>

      {/* ===== MAIN / FEATURES ===== */}
      <main className="main-container">
        <div id="features" className="grid-features">
          <div className="panel">
            <h3>{t('features.extraction.title')}</h3>
            <p>{t('features.extraction.description')}</p>
          </div>

          <div className="panel">
            <h3>{t('features.dashboard.title')}</h3>
            <p>{t('features.dashboard.description')}</p>
          </div>

          <div className="panel">
            <h3>{t('features.sync.title')}</h3>
            <p>{t('features.sync.description')}</p>
          </div>
        </div>

        {/* ===== STATUS BAR / HUD ===== */}
        <div className="hud-status">
          <div>{t('hud.module')}</div>
          <div>
            {t('hud.status_label')}{' '}
            <span style={{ color: '#4ade80' }}>{t('hud.status_value')}</span>
          </div>
          <div className="hud-blink">{t('hud.sync')}</div>
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer id="join">
        {t('footer.copyright')}
      </footer>

      <style jsx global>{`
        :root {
          --bg-space: #030712;
          --panel-bg: rgba(10, 25, 47, 0.7);
          --deep-blue: #1e3a8a;
          --cyan: #00d2ff;
          --violet: #a855f7;
          --text-main: #d1e1f8;
          --text-heading: #ffffff;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        html,
        body {
          background-color: var(--bg-space);
          color: var(--text-main);
          background-image: radial-gradient(
              white,
              rgba(255, 255, 255, 0.2) 2px,
              transparent 40px
            ),
            radial-gradient(white, rgba(255, 255, 255, 0.15) 1px, transparent 30px),
            radial-gradient(white, rgba(255, 255, 255, 0.1) 2px, transparent 40px);
          background-size: 550px 550px, 350px 350px, 250px 250px;
          background-position: 0 0, 40px 60px, 130px 270px;
          overflow-x: hidden;
        }

        #__next {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        /* ---- HEADER ---- */
        .site-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 50px;
          border-bottom: 2px solid var(--deep-blue);
          box-shadow: 0 0 20px rgba(30, 58, 138, 0.4);
          background: rgba(3, 7, 18, 0.85);
          backdrop-filter: blur(10px);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .logo {
          font-size: 1.8rem;
          font-weight: 900;
          letter-spacing: 4px;
          color: #fff;
          text-transform: uppercase;
          text-shadow: 0 0 10px rgba(30, 58, 138, 0.6);
        }

        .logo span {
          color: var(--violet);
          text-shadow: 0 0 10px var(--violet);
        }

        nav ul {
          display: flex;
          list-style: none;
          gap: 30px;
        }

        nav a {
          color: var(--deep-blue);
          text-decoration: none;
          text-transform: uppercase;
          font-size: 0.9rem;
          font-weight: bold;
          letter-spacing: 2px;
          transition: all 0.3s ease;
          padding: 5px 10px;
          border: 1px solid transparent;
        }

        nav a:hover,
        nav a.active {
          color: var(--cyan);
          border: 1px solid var(--deep-blue);
          box-shadow: 0 0 15px rgba(30, 58, 138, 0.3);
          background: rgba(30, 58, 138, 0.1);
        }

        /* ---- HERO ---- */
        .hero {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 80px 20px;
          position: relative;
        }

        .gate {
          position: relative;
          width: min(500px, 80vw);
          height: min(500px, 80vw);
          margin-top: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 0 25px rgba(0, 210, 255, 0.08));
        }

        /* Bouton figé au centre de l'anneau (frère du SVG : il ne tourne pas) */
        .gate-cta {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1;
        }

        .hero h1 {
          font-family: 'Allerta Stencil', sans-serif;
          font-size: 4rem;
          text-transform: uppercase;
          letter-spacing: 5px;
          margin-bottom: 25px;
          color: var(--text-heading);
          text-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
        }

        .hero h1 .accent {
          color: var(--violet);
          text-shadow: 0 0 15px var(--violet);
        }

        .hero p {
          font-size: 1.1rem;
          max-width: 650px;
          margin-bottom: 40px;
          color: var(--deep-blue);
          font-weight: 500;
          line-height: 1.6;
        }

        /* ---- BUTTON ---- */
        .btn {
          display: inline-block;
          padding: 15px 40px;
          text-decoration: none;
          text-transform: uppercase;
          font-weight: bold;
          letter-spacing: 2px;
          transition: all 0.3s;
          clip-path: polygon(15px 0%, 100% 0%, calc(100% - 15px) 100%, 0% 100%);
          background: var(--deep-blue);
          color: #fff;
          border: none;
          box-shadow: 0 0 15px rgba(30, 58, 138, 0.5);
        }

        .btn:hover {
          background: #fff;
          color: #000;
          box-shadow: 0 0 25px rgba(255, 255, 255, 0.7);
          transform: translateY(-3px);
        }

        /* ---- MAIN / PANELS ---- */
        .main-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px 80px 40px;
          width: 100%;
        }

        .grid-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 30px;
          margin-top: 60px;
        }

        .panel {
          background: var(--panel-bg);
          border-left: 5px solid var(--deep-blue);
          border-right: 1px solid rgba(30, 58, 138, 0.3);
          border-top: 1px solid rgba(30, 58, 138, 0.3);
          border-bottom: 1px solid rgba(30, 58, 138, 0.3);
          padding: 30px;
          position: relative;
          backdrop-filter: blur(5px);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .panel:hover {
          transform: translateY(-8px);
          box-shadow: 0 0 25px rgba(0, 210, 255, 0.15);
          border-right: 1px solid var(--cyan);
          border-top: 1px solid var(--cyan);
        }

        .panel::before {
          content: '';
          position: absolute;
          top: -2px;
          right: -2px;
          border-width: 0 15px 15px 0;
          border-style: solid;
          border-color: transparent var(--deep-blue) transparent transparent;
        }

        .panel h3 {
          color: var(--deep-blue);
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 18px;
          font-size: 1.4rem;
          font-weight: 700;
        }

        .panel p {
          color: var(--text-main);
          line-height: 1.7;
          font-size: 1rem;
        }

        /* ---- HUD STATUS BAR ---- */
        .hud-status {
          background: rgba(3, 7, 18, 0.95);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-top: 3px solid var(--violet);
          padding: 15px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: monospace;
          font-size: 0.9rem;
          color: var(--violet);
          margin-top: 80px;
          box-shadow: 0 -5px 25px rgba(168, 85, 247, 0.1);
          flex-wrap: wrap;
          gap: 10px;
        }

        .hud-blink {
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        /* ---- FOOTER ---- */
        footer {
          text-align: center;
          padding: 50px;
          color: #4b5563;
          font-size: 0.85rem;
          letter-spacing: 1px;
          border-top: 1px solid rgba(255, 255, 255, 0.03);
          background: rgba(0, 0, 0, 0.2);
        }

        /* ---- RESPONSIVE ---- */
        @media (max-width: 768px) {
          .site-header {
            flex-direction: column;
            gap: 15px;
            padding: 15px 20px;
          }

          nav ul {
            gap: 15px;
            flex-wrap: wrap;
            justify-content: center;
          }

          .hero h1 {
            font-size: 2.5rem;
          }

          .hud-status {
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
          }
        }
      `}</style>
    </>
  );
}
