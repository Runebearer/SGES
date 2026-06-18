import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetStaticProps } from 'next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../context/AuthContext';
import nextI18NextConfig from '../../next-i18next.config.js';

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'fr', ['common'], nextI18NextConfig)),
  },
});

type SectionId = 'dashboard' | 'sgcf' | 'missions' | 'alert';

// Glyphes SVG du menu (trait fin, style HUD).
const ICONS: Record<SectionId, JSX.Element> = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  sgcf: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  missions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 3h11l3 3v15H5z" />
      <path d="M9 9h7M9 13h7M9 17h4" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l9 16H3z" />
      <path d="M12 10v4M12 17v.5" />
    </svg>
  ),
};

export default function Dashboard() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { user, authLevel, loading, signOut } = useAuth();

  const [active, setActive] = useState<SectionId>('dashboard');

  // Route réservée : renvoie vers le login si non authentifié.
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  const navItems: SectionId[] = ['dashboard', 'sgcf', 'missions', 'alert'];

  return (
    <>
      <Head>
        <title>SGES — {t('dashboard.page_title')}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Allerta+Stencil&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="dashboard-screen">
        <div className="grid-overlay" aria-hidden="true" />
        <div className="scanlines" aria-hidden="true" />

        {/* ===== MENU DE NAVIGATION ===== */}
        <aside className="sidebar">
          <div className="brand">
            SGC<span>-f</span>
          </div>

          <nav className="nav">
            {navItems.map((id) => (
              <button
                key={id}
                type="button"
                className={`nav-item${active === id ? ' active' : ''}`}
                onClick={() => setActive(id)}
                aria-current={active === id ? 'page' : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  {ICONS[id]}
                </span>
                <span className="nav-label">{t(`dashboard.nav.${id}`)}</span>
                {id === 'alert' && <i className="nav-badge" aria-hidden="true" />}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            {authLevel != null && (
              <span className="clearance">
                {t('account.clearance', { level: authLevel })}
              </span>
            )}
            <button type="button" className="logout" onClick={() => signOut()}>
              {t('account.logout')}
            </button>
          </div>
        </aside>

        {/* ===== ZONE PRINCIPALE ===== */}
        <main className="content">
          <header className="topbar">
            <span className="hud-module">{t('dashboard.hud_module')}</span>
            <span className="hud-right">
              <span className="hud-status">
                <i className="dot" />
                {t('dashboard.hud_status')}
              </span>
              <LanguageSwitcher />
            </span>
          </header>

          <section className="panel-area">
            <h1 className="section-title" data-text={t(`dashboard.sections.${active}.title`)}>
              {t(`dashboard.sections.${active}.title`)}
            </h1>
            <p className="section-subtitle">
              {t(`dashboard.sections.${active}.subtitle`)}
            </p>

            {active === 'dashboard' && (
              <div className="stats-grid">
                <div className="stat">
                  <span className="stat-value">07</span>
                  <span className="stat-label">{t('dashboard.sections.dashboard.stats.missions')}</span>
                </div>
                <div className="stat">
                  <span className="stat-value">82%</span>
                  <span className="stat-label">{t('dashboard.sections.dashboard.stats.energy')}</span>
                </div>
                <div className="stat stat-warn">
                  <span className="stat-value">03</span>
                  <span className="stat-label">{t('dashboard.sections.dashboard.stats.alerts')}</span>
                </div>
                <div className="stat">
                  <span className="stat-value">12</span>
                  <span className="stat-label">{t('dashboard.sections.dashboard.stats.sync')}</span>
                </div>
              </div>
            )}

            {active === 'sgcf' && (
              <div className="panel">
                <p>{t('dashboard.sections.sgcf.body')}</p>
              </div>
            )}

            {active === 'missions' && (
              <div className="panel panel-flush">
                <table className="missions">
                  <thead>
                    <tr>
                      <th>{t('dashboard.sections.missions.columns.code')}</th>
                      <th>{t('dashboard.sections.missions.columns.objective')}</th>
                      <th>{t('dashboard.sections.missions.columns.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>SG-09</td>
                      <td>{t('dashboard.sections.missions.items.m1')}</td>
                      <td><span className="tag tag-active">{t('dashboard.sections.missions.status.active')}</span></td>
                    </tr>
                    <tr>
                      <td>SG-14</td>
                      <td>{t('dashboard.sections.missions.items.m2')}</td>
                      <td><span className="tag tag-standby">{t('dashboard.sections.missions.status.standby')}</span></td>
                    </tr>
                    <tr>
                      <td>SG-21</td>
                      <td>{t('dashboard.sections.missions.items.m3')}</td>
                      <td><span className="tag tag-done">{t('dashboard.sections.missions.status.done')}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {active === 'alert' && (
              <div className="panel panel-empty">
                <p>{t('dashboard.sections.alert.empty')}</p>
              </div>
            )}
          </section>
        </main>
      </div>

      <style jsx global>{`
        .dashboard-screen {
          /* Palette : bleu électrique en remplacement du cyan/bleu d'origine. */
          --bg-space: #030712;
          --panel-bg: rgba(10, 22, 47, 0.72);
          --electric: #2563ff;
          --electric-bright: #4d8bff;
          --electric-deep: #0b3aa8;
          --violet: #a855f7;
          --text-main: #d1e1f8;
          --text-heading: #ffffff;

          /* Alias consommés par LanguageSwitcher / styles partagés. */
          --cyan: var(--electric-bright);
          --deep-blue: var(--electric-deep);

          position: relative;
          display: grid;
          grid-template-columns: 248px 1fr;
          min-height: 100vh;
          color: var(--text-main);
          background-color: var(--bg-space);
          background-image: radial-gradient(
              white,
              rgba(255, 255, 255, 0.18) 2px,
              transparent 40px
            ),
            radial-gradient(white, rgba(255, 255, 255, 0.12) 1px, transparent 30px);
          background-size: 550px 550px, 350px 350px;
          background-position: 0 0, 40px 60px;
          overflow-x: hidden;
        }

        .dashboard-screen * {
          box-sizing: border-box;
        }

        .dashboard-screen .grid-overlay {
          position: fixed;
          inset: 0;
          z-index: 0;
          background-image: linear-gradient(
              rgba(37, 99, 255, 0.07) 1px,
              transparent 1px
            ),
            linear-gradient(90deg, rgba(37, 99, 255, 0.07) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(
            ellipse 90% 70% at 50% 40%,
            #000 30%,
            transparent 80%
          );
          pointer-events: none;
        }

        .dashboard-screen .scanlines {
          position: fixed;
          inset: 0;
          z-index: 0;
          background: repeating-linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0px,
            rgba(0, 0, 0, 0) 2px,
            rgba(0, 0, 0, 0.16) 3px,
            rgba(0, 0, 0, 0) 4px
          );
          animation: dash-scan 8s linear infinite;
          pointer-events: none;
          opacity: 0.45;
        }

        @keyframes dash-scan {
          from { background-position-y: 0; }
          to { background-position-y: 100px; }
        }

        /* ===== SIDEBAR ===== */
        .dashboard-screen .sidebar {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 26px;
          padding: 26px 18px;
          background: rgba(3, 7, 18, 0.85);
          backdrop-filter: blur(10px);
          border-right: 1px solid rgba(37, 99, 255, 0.3);
          box-shadow: 4px 0 30px rgba(37, 99, 255, 0.12);
        }

        .dashboard-screen .brand {
          font-family: 'Allerta Stencil', sans-serif;
          font-size: 1.7rem;
          font-weight: 900;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: #fff;
          text-shadow: 0 0 14px rgba(37, 99, 255, 0.6);
          padding: 4px 8px 18px;
          border-bottom: 1px solid rgba(37, 99, 255, 0.25);
        }

        .dashboard-screen .brand span {
          color: var(--electric-bright);
          text-shadow: 0 0 12px var(--electric-bright);
        }

        .dashboard-screen .nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-grow: 1;
        }

        .dashboard-screen .nav-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 14px;
          background: transparent;
          border: 1px solid transparent;
          border-left: 3px solid transparent;
          color: var(--text-main);
          font-family: 'Segoe UI', Roboto, sans-serif;
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          text-align: left;
          cursor: pointer;
          transition: all 0.22s ease;
        }

        .dashboard-screen .nav-icon {
          display: inline-flex;
          width: 20px;
          height: 20px;
          color: var(--electric-bright);
          opacity: 0.8;
          flex-shrink: 0;
        }

        .dashboard-screen .nav-icon svg {
          width: 100%;
          height: 100%;
        }

        .dashboard-screen .nav-item:hover {
          color: #fff;
          border-color: rgba(37, 99, 255, 0.4);
          border-left-color: var(--electric);
          background: rgba(37, 99, 255, 0.08);
        }

        .dashboard-screen .nav-item.active {
          color: #fff;
          border-color: rgba(77, 139, 255, 0.5);
          border-left-color: var(--electric-bright);
          background: rgba(37, 99, 255, 0.16);
          box-shadow: inset 0 0 18px rgba(37, 99, 255, 0.18),
            0 0 14px rgba(37, 99, 255, 0.25);
        }

        .dashboard-screen .nav-item.active .nav-icon {
          opacity: 1;
          filter: drop-shadow(0 0 6px var(--electric-bright));
        }

        .dashboard-screen .nav-badge {
          margin-left: auto;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f87171;
          box-shadow: 0 0 8px #f87171;
          animation: dash-blink 1.4s infinite;
        }

        .dashboard-screen .sidebar-footer {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid rgba(37, 99, 255, 0.2);
        }

        .dashboard-screen .clearance {
          font-family: monospace;
          font-size: 0.72rem;
          letter-spacing: 2px;
          color: var(--violet);
          border: 1px solid rgba(168, 85, 247, 0.4);
          padding: 6px 10px;
          text-align: center;
          text-transform: uppercase;
        }

        .dashboard-screen .logout {
          font-size: 0.78rem;
          font-weight: bold;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--electric-bright);
          background: transparent;
          border: 1px solid var(--electric-deep);
          padding: 8px 14px;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .dashboard-screen .logout:hover {
          background: var(--electric);
          color: #030712;
          box-shadow: 0 0 16px rgba(37, 99, 255, 0.6);
        }

        /* ===== CONTENU ===== */
        .dashboard-screen .content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
        }

        .dashboard-screen .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 16px 32px;
          font-family: monospace;
          font-size: 0.74rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--violet);
          background: rgba(3, 7, 18, 0.7);
          border-bottom: 1px solid rgba(37, 99, 255, 0.25);
          backdrop-filter: blur(8px);
        }

        .dashboard-screen .hud-right {
          display: inline-flex;
          align-items: center;
          gap: 20px;
        }

        .dashboard-screen .hud-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--electric-bright);
        }

        .dashboard-screen .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 8px #4ade80;
          animation: dash-blink 1.4s infinite;
        }

        @keyframes dash-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }

        .dashboard-screen .panel-area {
          padding: 38px 32px 48px;
        }

        .dashboard-screen .section-title {
          position: relative;
          font-family: 'Allerta Stencil', sans-serif;
          font-size: 2.4rem;
          line-height: 1;
          text-transform: uppercase;
          letter-spacing: 6px;
          color: var(--text-heading);
          text-shadow: 0 0 14px rgba(37, 99, 255, 0.5);
          margin: 0;
        }

        .dashboard-screen .section-title::before,
        .dashboard-screen .section-title::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          overflow: hidden;
        }
        .dashboard-screen .section-title::before {
          color: var(--electric-bright);
          transform: translate(-2px, 0);
          clip-path: inset(0 0 55% 0);
          animation: dash-glitch 3.5s infinite linear alternate;
          opacity: 0.6;
        }
        .dashboard-screen .section-title::after {
          color: var(--violet);
          transform: translate(2px, 0);
          clip-path: inset(55% 0 0 0);
          animation: dash-glitch 2.7s infinite linear alternate-reverse;
          opacity: 0.6;
        }

        @keyframes dash-glitch {
          0%, 92%, 100% { transform: translate(0, 0); }
          93% { transform: translate(-3px, -1px); }
          96% { transform: translate(3px, 1px); }
        }

        .dashboard-screen .section-subtitle {
          font-family: monospace;
          font-size: 0.82rem;
          letter-spacing: 1px;
          color: var(--electric-bright);
          margin: 10px 0 32px;
          opacity: 0.85;
        }

        /* ---- STATS ---- */
        .dashboard-screen .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 22px;
        }

        .dashboard-screen .stat {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 26px 24px;
          background: var(--panel-bg);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(37, 99, 255, 0.3);
          border-left: 4px solid var(--electric);
          clip-path: polygon(0 14px, 14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .dashboard-screen .stat:hover {
          transform: translateY(-6px);
          box-shadow: 0 0 24px rgba(37, 99, 255, 0.22);
        }

        .dashboard-screen .stat-value {
          font-family: 'Allerta Stencil', sans-serif;
          font-size: 2.6rem;
          line-height: 1;
          color: #fff;
          text-shadow: 0 0 14px rgba(37, 99, 255, 0.55);
        }

        .dashboard-screen .stat-warn {
          border-left-color: var(--violet);
        }
        .dashboard-screen .stat-warn .stat-value {
          color: var(--violet);
          text-shadow: 0 0 14px rgba(168, 85, 247, 0.5);
        }

        .dashboard-screen .stat-label {
          font-family: monospace;
          font-size: 0.74rem;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--text-main);
          opacity: 0.8;
        }

        /* ---- PANEL ---- */
        .dashboard-screen .panel {
          max-width: 820px;
          padding: 28px 30px;
          background: var(--panel-bg);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(37, 99, 255, 0.3);
          border-left: 4px solid var(--electric);
          clip-path: polygon(0 16px, 16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%);
        }

        .dashboard-screen .panel p {
          line-height: 1.7;
          color: var(--text-main);
        }

        .dashboard-screen .panel-flush {
          padding: 0;
          overflow: hidden;
        }

        .dashboard-screen .panel-empty {
          color: #4ade80;
        }
        .dashboard-screen .panel-empty p {
          font-family: monospace;
          letter-spacing: 1px;
          color: #4ade80;
        }

        /* ---- TABLE MISSIONS ---- */
        .dashboard-screen .missions {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.92rem;
        }

        .dashboard-screen .missions th {
          text-align: left;
          padding: 14px 22px;
          font-family: monospace;
          font-size: 0.72rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--electric-bright);
          background: rgba(37, 99, 255, 0.12);
          border-bottom: 1px solid rgba(37, 99, 255, 0.3);
        }

        .dashboard-screen .missions td {
          padding: 14px 22px;
          color: var(--text-main);
          border-bottom: 1px solid rgba(37, 99, 255, 0.12);
        }

        .dashboard-screen .missions tbody tr:hover {
          background: rgba(37, 99, 255, 0.07);
        }

        .dashboard-screen .missions td:first-child {
          font-family: monospace;
          color: var(--electric-bright);
          letter-spacing: 1px;
        }

        .dashboard-screen .tag {
          display: inline-block;
          padding: 4px 12px;
          font-family: monospace;
          font-size: 0.7rem;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          border: 1px solid currentColor;
        }
        .dashboard-screen .tag-active { color: #4ade80; }
        .dashboard-screen .tag-standby { color: var(--electric-bright); }
        .dashboard-screen .tag-done { color: rgba(209, 225, 248, 0.55); }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 760px) {
          .dashboard-screen {
            grid-template-columns: 1fr;
          }
          .dashboard-screen .sidebar {
            flex-direction: row;
            flex-wrap: wrap;
            align-items: center;
            gap: 14px;
            border-right: none;
            border-bottom: 1px solid rgba(37, 99, 255, 0.3);
          }
          .dashboard-screen .brand {
            border-bottom: none;
            padding: 4px 8px;
          }
          .dashboard-screen .nav {
            flex-direction: row;
            flex-wrap: wrap;
            flex-grow: 1;
          }
          .dashboard-screen .nav-item {
            width: auto;
          }
          .dashboard-screen .nav-label {
            display: none;
          }
          .dashboard-screen .sidebar-footer {
            flex-direction: row;
            border-top: none;
            padding-top: 0;
          }
          .dashboard-screen .panel-area {
            padding: 28px 18px 40px;
          }
          .dashboard-screen .section-title {
            font-size: 1.8rem;
            letter-spacing: 4px;
          }
        }
      `}</style>
    </>
  );
}
