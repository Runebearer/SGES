import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetStaticProps } from 'next';
import type { ActionDef, ActionSection } from '@sges/api-contract';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../context/AuthContext';
import nextI18NextConfig from '../../next-i18next.config.js';

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'fr', ['common'], nextI18NextConfig)),
  },
});

type SectionId = 'dashboard' | 'sgcf' | 'missions' | 'alert' | 'rewards';

const SECTION_IDS: readonly SectionId[] = [
  'dashboard',
  'sgcf',
  'missions',
  'alert',
  'rewards',
];
// Clé localStorage : mémorise l'onglet courant pour le restaurer au refresh.
const SECTION_STORAGE_KEY = 'sges:dashboard:section';

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
      <path d="M5 3h11l3 3v15H5z" />
      <path d="M9 9h7M9 13h7M9 17h4" />
    </svg>
  ),
  missions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l9 16H3z" />
      <path d="M12 10v4M12 17v.5" />
    </svg>
  ),
  rewards: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3" />
      <path d="M17 6h3v1a3 3 0 0 1-3 3" />
      <path d="M12 13v3" />
      <path d="M8.5 20h7l-1-3h-5z" />
    </svg>
  ),
};

// Barre de niveau d'énergie : se remplit selon `value` (0–100). La valeur
// réelle sera fournie plus tard (fonction en cours de développement) ; `null`
// affiche un état « en attente ».
function EnergyBar({ label, value }: { label: string; value: number | null }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="energy">
      <div className="energy-head">
        <span className="energy-label">{label}</span>
        <span className="energy-value">{value == null ? '—' : `${pct}%`}</span>
      </div>
      <div
        className="energy-track"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="energy-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Durée totale lisible (ex. « 30s », « 2 min », « 1 min 30s »).
function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m} min` : `${m} min ${s}s`;
}

// Compte à rebours mm:ss.
function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Récap des missions en cours : une fenêtre par mission, jauge qui se remplit
// avec le timer (calculée localement à partir de startedAt/endsAt fournis par
// le Worker). À l'échéance, on rappelle le Worker pour finaliser (gains).
function ActiveMissions() {
  const { t } = useTranslation('common');
  const { player } = useAuth();
  const missions = player?.missions ?? [];
  const [now, setNow] = useState(() => Date.now());

  // Tic d'animation des jauges (~4×/s) tant qu'il y a des missions. La
  // finalisation (rappel du Worker à l'échéance) est centralisée dans Dashboard.
  useEffect(() => {
    if ((player?.missions ?? []).length === 0) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [player]);

  if (missions.length === 0) return null;

  return (
    <div className="active-missions">
      <h2 className="active-missions-title">
        {t('dashboard.missions_active.title')}
      </h2>
      <div className="active-missions-grid">
        {missions.map((m) => {
          const total = m.endsAt - m.startedAt;
          const elapsed = Math.min(total, Math.max(0, now - m.startedAt));
          const pct = total > 0 ? (elapsed / total) * 100 : 100;
          const remaining = Math.max(0, Math.ceil((m.endsAt - now) / 1000));
          return (
            <div key={m.actionId} className="mission-window">
              <div className="mission-window-head">
                <span className="mission-window-name">{m.name}</span>
                <span className="mission-window-time">
                  {formatClock(remaining)}
                </span>
              </div>
              <div
                className="mission-window-track"
                role="progressbar"
                aria-label={m.name}
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="mission-window-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Cartes d'action : carte carrée holographique qui se retourne au clic (flip 3D)
// pour révéler les sous-missions. Cliquer une sous-mission DÉMARRE l'action
// parente (timer côté Worker). Filtrées par section (cf. ActionDef.section).
function ActionCards({ section }: { section: ActionSection }) {
  const { t } = useTranslation('common');
  const { actions, player, performAction } = useAuth();
  const [flipped, setFlipped] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [errored, setErrored] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const list = actions.filter((a) => a.section === section);
  const hasRunning = (player?.missions ?? []).some((m) =>
    list.some((a) => a.id === m.actionId)
  );

  // Tic d'animation des jauges sur les sous-missions en cours.
  useEffect(() => {
    if (!hasRunning) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [hasRunning]);

  if (list.length === 0) return null;

  const missionFor = (actionId: string) =>
    (player?.missions ?? []).find((m) => m.actionId === actionId);

  const canAfford = (a: ActionDef) =>
    player != null &&
    player.energy.value >= a.cost.energy &&
    player.electricity >= a.cost.electricity &&
    player.artifacts >= a.cost.artifacts;

  const start = async (a: ActionDef) => {
    setBusy(a.id);
    setErrored(null);
    try {
      await performAction(a.id);
    } catch {
      setErrored(a.id);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="actions-list">
      {list.map((a) => {
        const visible = a.subMissions.filter((s) => s.available !== false);
        const mission = missionFor(a.id);
        const running = !!mission;
        const affordable = canAfford(a);
        let pct = 0;
        let remaining = 0;
        if (mission) {
          const total = mission.endsAt - mission.startedAt;
          const done = Math.min(total, Math.max(0, now - mission.startedAt));
          pct = total > 0 ? (done / total) * 100 : 100;
          remaining = Math.max(0, Math.ceil((mission.endsAt - now) / 1000));
        }
        return (
          <div
            key={a.id}
            className={`action-card${flipped === a.id ? ' flipped' : ''}`}
          >
            <div className="action-inner">
              {/* Recto : titre + descriptif. Clic → retourne la carte. */}
              <div
                className="action-face action-front"
                role="button"
                tabIndex={0}
                aria-label={a.name}
                onClick={() => setFlipped(a.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setFlipped(a.id);
                  }
                }}
              >
                <h3 className="action-name">{a.name}</h3>
                <p className="action-desc">{a.description}</p>
              </div>

              {/* Verso : sous-missions (cliquables → démarrent l'action). */}
              <div className="action-face action-back">
                <div className="action-back-head">
                  <button
                    type="button"
                    className="action-back-btn"
                    onClick={() => setFlipped(null)}
                    aria-label="Retour"
                  >
                    ←
                  </button>
                  <h3 className="action-name action-back-title">{a.name}</h3>
                </div>
                <ul className="submission-list">
                  {visible.length === 0 ? (
                    <li className="submission-empty">À venir…</li>
                  ) : (
                    visible.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className="submission"
                          disabled={busy === a.id || running || !affordable}
                          onClick={() => start(a)}
                        >
                          <span className="submission-name">{s.name}</span>
                          <span className="submission-state">
                            {running
                              ? formatClock(remaining)
                              : errored === a.id
                                ? t('dashboard.actions.insufficient')
                                : formatDuration(a.durationSec)}
                          </span>
                        </button>
                        {running && (
                          <div
                            className="submission-track"
                            role="progressbar"
                            aria-label={s.name}
                            aria-valuenow={Math.round(pct)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="submission-fill"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { user, authLevel, player, loading, signOut, refreshPlayer } = useAuth();

  const [active, setActive] = useState<SectionId>('dashboard');

  // Présence d'une alerte transmise. Grisée tant que false ; passe en couleur
  // dès qu'une alerte arrive. TODO: brancher sur le flux d'alertes (à venir).
  const hasAlert = false;

  // Ressources serveur-autoritaires (Worker Cloudflare). null = en attente
  // (non chargées / Worker injoignable).
  const energyLevel: number | null = player ? player.energy.value : null;

  // Expérience : le niveau (authLevel) est dérivé de l'XP côté Worker. La barre
  // affiche la progression au sein du niveau courant (bornes xpFloor → xpNext
  // fournies par le Worker). Au niveau max (xpNext null) : barre pleine.
  const xp: number | null = player ? player.xp : null;
  const atMaxLevel = player != null && player.xpNext == null;
  const xpPct = (() => {
    if (player == null) return 0;
    if (player.xpNext == null) return 100;
    const span = player.xpNext - player.xpFloor;
    return span > 0
      ? Math.max(0, Math.min(100, ((player.xp - player.xpFloor) / span) * 100))
      : 0;
  })();

  // Route réservée : renvoie vers le login si non authentifié.
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  // Rafraîchit l'état joueur (serveur-autoritaire) à l'entrée de la section
  // « Missions » : c'est là que le joueur dépense de l'énergie, on veut donc
  // des valeurs à jour (recharge quotidienne incluse) sans attendre un
  // rechargement de page. refreshPlayer est hors deps (identité instable) :
  // on ne déclenche qu'au changement de section.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (user && active === 'missions') {
      refreshPlayer();
    }
  }, [active, user]);

  // Finalisation centralisée des missions : tant qu'une mission est en cours, on
  // rappelle le Worker dès qu'elle arrive à échéance (quel que soit l'onglet
  // affiché) pour récupérer les gains. Throttlé + robuste au décalage d'horloge.
  const missionRefreshingRef = useRef(false);
  const missionLastRefreshRef = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const missions = player?.missions ?? [];
    if (missions.length === 0) return;
    const id = setInterval(() => {
      const tNow = Date.now();
      if (
        missions.some((m) => m.endsAt <= tNow) &&
        !missionRefreshingRef.current &&
        tNow - missionLastRefreshRef.current > 2000
      ) {
        missionRefreshingRef.current = true;
        missionLastRefreshRef.current = tNow;
        refreshPlayer().finally(() => {
          missionRefreshingRef.current = false;
        });
      }
    }, 500);
    return () => clearInterval(id);
  }, [player]);

  // Restaure le dernier onglet visité après un rafraîchissement de page.
  // Effet (et non valeur initiale) pour éviter tout décalage d'hydratation SSR.
  useEffect(() => {
    const saved = localStorage.getItem(SECTION_STORAGE_KEY);
    if (saved && (SECTION_IDS as readonly string[]).includes(saved)) {
      setActive(saved as SectionId);
    }
  }, []);

  // Sélectionne un onglet ET le mémorise (restauré au prochain chargement).
  const selectSection = (id: SectionId) => {
    setActive(id);
    localStorage.setItem(SECTION_STORAGE_KEY, id);
  };

  const navItems: SectionId[] = ['dashboard', 'sgcf', 'missions', 'alert'];

  return (
    <>
      <Head>
        <title>{`SGES — ${t('dashboard.page_title')}`}</title>
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
          <div className="brand-row">
            <div className="brand">
              SGC<span>-f</span>
            </div>
            <LanguageSwitcher />
          </div>

          <nav className="nav">
            {navItems.map((id) => (
              <button
                key={id}
                type="button"
                className={[
                  'nav-item',
                  active === id ? 'active' : '',
                  // « Alerte » reste grisée tant qu'aucune alerte n'est transmise.
                  id === 'alert' && !hasAlert ? 'nav-item-muted' : '',
                  id === 'alert' && hasAlert ? 'nav-item-alert' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                // La navigation vers « Alerte » n'est ouverte que si une alerte
                // est en cours ; sinon l'entrée est désactivée.
                disabled={id === 'alert' && !hasAlert}
                onClick={() => selectSection(id)}
                aria-current={active === id ? 'page' : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  {ICONS[id]}
                </span>
                <span className="nav-label">{t(`dashboard.nav.${id}`)}</span>
                {id === 'alert' && hasAlert && (
                  <i className="nav-badge" aria-hidden="true" />
                )}
              </button>
            ))}
            {/* Récompenses : poussée en bas du menu (au-dessus de
                l'habilitation) sur desktop ; intégrée à la barre du bas sur mobile. */}
            <button
              type="button"
              className={`nav-item nav-item-bare nav-rewards${active === 'rewards' ? ' active' : ''}`}
              onClick={() => selectSection('rewards')}
              aria-current={active === 'rewards' ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                {ICONS.rewards}
              </span>
              <span className="nav-label">{t('dashboard.nav.rewards')}</span>
            </button>
          </nav>
        </aside>

        {/* ===== ZONE PRINCIPALE ===== */}
        <main className="content">
          <header className="topbar">
            {/* La jauge d'habilitation remplace l'ancien « MODULE : SGC-F ». */}
            {authLevel != null && (
              /* Habilitation + jauge d'expérience : niveau = niveau du
                 compte, remplissage selon les points d'expérience (à venir). */
              <div className="clearance">
                {t('account.clearance', { level: authLevel })}
                <div className="xp">
                  <div
                    className="xp-track"
                    role="progressbar"
                    aria-label={t('dashboard.xp.label')}
                    aria-valuenow={xp ?? undefined}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="xp-fill" style={{ width: `${xpPct}%` }} />
                  </div>
                  <div className="xp-levels">
                    <span>{t('dashboard.xp.level', { level: authLevel })}</span>
                    <span>
                      {atMaxLevel
                        ? t('dashboard.xp.max')
                        : t('dashboard.xp.level', { level: authLevel + 1 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <span className="hud-status">
              <i className="dot" />
              {t('dashboard.hud_status')}
            </span>

            <button
              type="button"
              className="logout"
              onClick={() => signOut()}
              aria-label={t('account.logout')}
              title={t('account.logout')}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M12 3v9" />
                <path d="M7 6.5a7 7 0 1 0 10 0" />
              </svg>
            </button>
          </header>

          <section className="panel-area">
            <h1 className="section-title" data-text={t(`dashboard.sections.${active}.title`)}>
              {t(`dashboard.sections.${active}.title`)}
            </h1>
            <p className="section-subtitle">
              {t(`dashboard.sections.${active}.subtitle`)}
            </p>

            {active === 'dashboard' && (
              <div className="overview">
                <EnergyBar
                  label={t('dashboard.sections.dashboard.energy.title')}
                  value={energyLevel}
                />

                <div className="cards-grid">
                  <div className="stat">
                    {/* Électricité stockée (0–100), gain via mécanique à venir. */}
                    <span className="stat-value">
                      {player ? player.electricity : '—'}
                    </span>
                    <span className="stat-label">
                      {t('dashboard.sections.dashboard.cards.electricity')}
                    </span>
                  </div>
                  <div className="stat">
                    {/* Compteur d'artefacts collectés. */}
                    <span className="stat-value">
                      {player ? player.artifacts : '—'}
                    </span>
                    <span className="stat-label">
                      {t('dashboard.sections.dashboard.cards.artifacts')}
                    </span>
                  </div>
                </div>

                {/* Récap des missions en cours, sous les ressources. */}
                <ActiveMissions />
              </div>
            )}

            {active === 'sgcf' && (
              <>
                <div className="panel">
                  <p>{t('dashboard.sections.sgcf.body')}</p>
                </div>
                <ActionCards section="sgcf" />
              </>
            )}

            {active === 'missions' && <ActionCards section="missions" />}

            {active === 'alert' && (
              <div className="panel panel-empty">
                <p>{t('dashboard.sections.alert.empty')}</p>
              </div>
            )}

            {active === 'rewards' && (
              <div className="panel">
                <p>{t('dashboard.sections.rewards.empty')}</p>
              </div>
            )}
          </section>
        </main>
      </div>

      <style jsx global>{`
        /* Réinitialise la marge par défaut du body (sinon un cadre blanc
           entoure la page) et applique le fond sombre jusqu'aux bords. */
        html,
        body {
          margin: 0;
          padding: 0;
          background-color: #030712;
        }

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

        .dashboard-screen .brand-row {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          padding: 4px 8px 18px;
          border-bottom: 1px solid rgba(37, 99, 255, 0.25);
        }

        .dashboard-screen .brand {
          font-family: 'Allerta Stencil', sans-serif;
          font-size: 1.7rem;
          font-weight: 900;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: #fff;
          text-shadow: 0 0 14px rgba(37, 99, 255, 0.6);
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

        /* « Alerte » grisée et non cliquable tant qu'aucune alerte n'est en cours. */
        .dashboard-screen .nav-item-muted,
        .dashboard-screen .nav-item-muted:hover {
          color: rgba(209, 225, 248, 0.38);
          cursor: not-allowed;
          border-color: transparent;
          border-left-color: transparent;
          background: transparent;
          box-shadow: none;
        }

        .dashboard-screen .nav-item-muted .nav-icon {
          color: rgba(209, 225, 248, 0.38);
          opacity: 0.6;
        }

        /* « Alerte » en couleur dès qu'une alerte est transmise. */
        .dashboard-screen .nav-item-alert {
          color: #fca5a5;
        }

        .dashboard-screen .nav-item-alert .nav-icon {
          color: #f87171;
          opacity: 1;
          filter: drop-shadow(0 0 6px rgba(248, 113, 113, 0.8));
        }

        /* Récompenses poussée en bas du menu (au-dessus de l'habilitation). */
        .dashboard-screen .nav-rewards {
          margin-top: auto;
        }

        /* « Récompenses » sans cadre (ni bordure, ni fond, ni ombre). */
        .dashboard-screen .nav-item-bare,
        .dashboard-screen .nav-item-bare:hover,
        .dashboard-screen .nav-item-bare.active {
          border-color: transparent;
          border-left-color: transparent;
          background: transparent;
          box-shadow: none;
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

        .dashboard-screen .clearance {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 190px;
          font-family: monospace;
          font-size: 0.72rem;
          letter-spacing: 2px;
          color: var(--violet);
          border: 1px solid rgba(168, 85, 247, 0.4);
          padding: 6px 12px;
          text-align: center;
          text-transform: uppercase;
        }

        /* ---- JAUGE D'EXPÉRIENCE (intégrée à l'habilitation, en violet) ---- */
        .dashboard-screen .xp {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .dashboard-screen .xp-track {
          position: relative;
          height: 10px;
          background: rgba(3, 7, 18, 0.7);
          border: 1px solid rgba(168, 85, 247, 0.4);
          overflow: hidden;
        }

        .dashboard-screen .xp-fill {
          height: 100%;
          background: linear-gradient(90deg, #7e22ce, var(--violet));
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.7);
          transition: width 0.6s ease;
        }

        .dashboard-screen .xp-levels {
          display: flex;
          justify-content: space-between;
          font-family: monospace;
          font-size: 0.58rem;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: rgba(168, 85, 247, 0.7);
        }

        .dashboard-screen .logout {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--electric-bright);
          background: transparent;
          border: 1px solid var(--electric-deep);
          padding: 7px;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        .dashboard-screen .logout svg {
          width: 18px;
          height: 18px;
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

        .dashboard-screen .hud-status {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          /* Pousse le statut + la déconnexion vers la droite de la barre,
             en gardant la jauge d'habilitation à gauche. */
          margin-left: auto;
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

        /* ---- VUE D'ENSEMBLE ---- */
        .dashboard-screen .overview {
          display: flex;
          flex-direction: column;
          gap: 22px;
          max-width: 820px;
        }

        /* ---- NIVEAU D'ÉNERGIE ---- */
        .dashboard-screen .energy {
          padding: 24px 26px;
          background: var(--panel-bg);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(37, 99, 255, 0.3);
          border-left: 4px solid var(--electric);
          clip-path: polygon(0 14px, 14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%);
        }

        .dashboard-screen .energy-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 14px;
        }

        .dashboard-screen .energy-label {
          font-family: monospace;
          font-size: 0.78rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--electric-bright);
        }

        .dashboard-screen .energy-value {
          font-family: 'Allerta Stencil', sans-serif;
          font-size: 2rem;
          line-height: 1;
          color: #fff;
          text-shadow: 0 0 14px rgba(37, 99, 255, 0.55);
        }

        .dashboard-screen .energy-track {
          position: relative;
          height: 18px;
          background: rgba(3, 7, 18, 0.7);
          border: 1px solid rgba(37, 99, 255, 0.35);
          overflow: hidden;
        }

        .dashboard-screen .energy-fill {
          position: relative;
          height: 100%;
          background: linear-gradient(
            90deg,
            var(--electric-deep),
            var(--electric),
            var(--electric-bright)
          );
          transition: width 0.6s ease;
          animation: energy-glow 2.4s ease-in-out infinite;
        }

        /* Pulsation lumineuse (« glowing ») de la portion remplie. */
        @keyframes energy-glow {
          0%,
          100% {
            box-shadow: 0 0 8px rgba(37, 99, 255, 0.45),
              0 0 16px rgba(37, 99, 255, 0.2);
            filter: brightness(1);
          }
          50% {
            box-shadow: 0 0 18px rgba(77, 139, 255, 0.85),
              0 0 40px rgba(37, 99, 255, 0.55);
            filter: brightness(1.3);
          }
        }

        /* ---- CARTES ---- */
        .dashboard-screen .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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

        /* ---- ACTIONS (cartes holographiques carrées) ---- */
        .dashboard-screen .actions-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
          gap: 20px;
          max-width: 920px;
          /* Chaque carte prend sa propre hauteur (selon son texte). */
          align-items: start;
        }

        /* Espace entre le panneau d'intro (SGC-F) et la grille de cartes. */
        .dashboard-screen .panel + .actions-list {
          margin-top: 24px;
        }

        /* Conteneur de perspective. Pas de hauteur fixe : la carte se
           dimensionne sur son contenu (cf. .action-inner en grille). */
        .dashboard-screen .action-card {
          position: relative;
          perspective: 1200px;
          transition: transform 0.3s ease;
        }

        .dashboard-screen .action-card:hover {
          transform: translateY(-6px);
        }

        /* Rotateur 3D : les deux faces sont empilées dans la MÊME cellule de
           grille, donc la hauteur = celle de la face la plus haute (contenu). */
        .dashboard-screen .action-inner {
          display: grid;
          transform-style: preserve-3d;
          transition: transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1);
        }

        .dashboard-screen .action-card.flipped .action-inner {
          transform: rotateY(180deg);
        }

        /* Faces (recto/verso) : tout le visuel holographique vit ici. */
        .dashboard-screen .action-face {
          grid-area: 1 / 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 20px 18px;
          overflow: hidden;
          color: var(--text-main);
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          background: linear-gradient(
            155deg,
            rgba(37, 99, 255, 0.16),
            rgba(168, 85, 247, 0.08) 50%,
            rgba(11, 58, 168, 0.18)
          );
          border: 1px solid rgba(120, 170, 255, 0.45);
          backdrop-filter: blur(8px);
          box-shadow: inset 0 0 30px rgba(37, 99, 255, 0.18),
            0 0 18px rgba(37, 99, 255, 0.2);
          clip-path: polygon(
            0 16px,
            16px 0,
            100% 0,
            100% calc(100% - 16px),
            calc(100% - 16px) 100%,
            0 100%
          );
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }

        .dashboard-screen .action-front {
          cursor: pointer;
        }
        .dashboard-screen .action-front:focus-visible {
          outline: 1px solid var(--electric-bright);
          outline-offset: -4px;
        }

        .dashboard-screen .action-back {
          transform: rotateY(180deg);
        }

        .dashboard-screen .action-card:hover .action-face {
          border-color: rgba(150, 200, 255, 0.8);
          box-shadow: inset 0 0 40px rgba(77, 139, 255, 0.28),
            0 0 30px rgba(77, 139, 255, 0.45);
        }

        /* Balayage irisé « hologramme ». */
        .dashboard-screen .action-face::before {
          content: '';
          position: absolute;
          inset: -60%;
          background: linear-gradient(
            115deg,
            transparent 35%,
            rgba(120, 200, 255, 0.2) 45%,
            rgba(168, 85, 247, 0.22) 50%,
            rgba(125, 255, 225, 0.18) 55%,
            transparent 65%
          );
          transform: translate(-25%, -15%);
          animation: holo-sweep 7s linear infinite;
          pointer-events: none;
        }

        @keyframes holo-sweep {
          0% {
            transform: translate(-25%, -15%);
            opacity: 0.45;
          }
          50% {
            opacity: 0.9;
          }
          100% {
            transform: translate(25%, 15%);
            opacity: 0.45;
          }
        }

        /* Lignes de balayage (scanlines). */
        .dashboard-screen .action-face::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.05) 0 1px,
            transparent 1px 3px
          );
          opacity: 0.35;
          pointer-events: none;
        }

        .dashboard-screen .action-name {
          position: relative;
          z-index: 1;
          margin: 0;
          font-family: monospace;
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          background: linear-gradient(90deg, #9bd8ff, #c9b3ff, #7fe9d2);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 8px rgba(99, 150, 255, 0.45));
        }

        .dashboard-screen .action-desc {
          position: relative;
          z-index: 1;
          flex: 1;
          margin: 0;
          font-family: monospace;
          font-size: 0.74rem;
          letter-spacing: 0.5px;
          line-height: 1.5;
          color: var(--electric-bright);
          opacity: 0.9;
        }

        /* ---- VERSO : sous-missions ---- */
        .dashboard-screen .action-back-head {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .dashboard-screen .action-back-btn {
          flex-shrink: 0;
          width: 26px;
          height: 26px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          line-height: 1;
          color: var(--electric-bright);
          background: rgba(37, 99, 255, 0.12);
          border: 1px solid rgba(120, 170, 255, 0.45);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dashboard-screen .action-back-btn:hover {
          background: var(--electric);
          color: #030712;
          box-shadow: 0 0 12px rgba(77, 139, 255, 0.6);
        }

        .dashboard-screen .action-back-title {
          font-size: 0.78rem;
          letter-spacing: 1.5px;
        }

        .dashboard-screen .submission-list {
          position: relative;
          z-index: 1;
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow: auto;
        }

        /* Sous-mission = bouton qui démarre l'action. */
        .dashboard-screen .submission {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          width: 100%;
          text-align: left;
          font-family: monospace;
          font-size: 0.8rem;
          letter-spacing: 1px;
          color: var(--electric-bright);
          padding: 9px 12px;
          background: rgba(37, 99, 255, 0.1);
          border: 1px solid rgba(120, 170, 255, 0.3);
          border-left: 3px solid var(--electric);
          clip-path: polygon(
            0 5px,
            5px 0,
            100% 0,
            100% calc(100% - 5px),
            calc(100% - 5px) 100%,
            0 100%
          );
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dashboard-screen .submission:hover:not(:disabled) {
          background: rgba(37, 99, 255, 0.2);
          box-shadow: 0 0 12px rgba(37, 99, 255, 0.3);
        }
        .dashboard-screen .submission:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .dashboard-screen .submission-name {
          font-weight: 700;
        }
        .dashboard-screen .submission-state {
          flex-shrink: 0;
          font-size: 0.7rem;
          opacity: 0.75;
          white-space: nowrap;
        }

        /* Jauge de complétion sous une sous-mission en cours. */
        .dashboard-screen .submission-track {
          position: relative;
          height: 6px;
          margin-top: 5px;
          background: rgba(3, 7, 18, 0.7);
          border: 1px solid rgba(168, 85, 247, 0.35);
          overflow: hidden;
        }
        .dashboard-screen .submission-fill {
          height: 100%;
          background: linear-gradient(90deg, #7e22ce, var(--violet), #c084fc);
          box-shadow: 0 0 8px rgba(168, 85, 247, 0.6);
          transition: width 0.25s linear;
        }

        .dashboard-screen .submission-empty {
          font-family: monospace;
          font-size: 0.78rem;
          letter-spacing: 1px;
          color: rgba(209, 225, 248, 0.4);
        }

        /* ---- MISSIONS EN COURS (récap) ---- */
        .dashboard-screen .active-missions {
          padding: 20px 22px;
          background: var(--panel-bg);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(37, 99, 255, 0.3);
          border-left: 4px solid var(--violet);
          clip-path: polygon(
            0 14px,
            14px 0,
            100% 0,
            100% calc(100% - 14px),
            calc(100% - 14px) 100%,
            0 100%
          );
        }

        .dashboard-screen .active-missions-title {
          margin: 0 0 16px;
          font-family: monospace;
          font-size: 0.8rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--violet);
        }

        .dashboard-screen .active-missions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }

        .dashboard-screen .mission-window {
          padding: 14px 16px;
          background: rgba(3, 7, 18, 0.5);
          border: 1px solid rgba(168, 85, 247, 0.25);
        }

        .dashboard-screen .mission-window-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 10px;
        }

        .dashboard-screen .mission-window-name {
          font-family: monospace;
          font-size: 0.78rem;
          letter-spacing: 1px;
          color: var(--electric-bright);
        }

        .dashboard-screen .mission-window-time {
          font-family: 'Allerta Stencil', monospace;
          font-size: 1.05rem;
          color: #fff;
          text-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
        }

        .dashboard-screen .mission-window-track {
          position: relative;
          height: 12px;
          background: rgba(3, 7, 18, 0.7);
          border: 1px solid rgba(168, 85, 247, 0.35);
          overflow: hidden;
        }

        .dashboard-screen .mission-window-fill {
          height: 100%;
          background: linear-gradient(90deg, #7e22ce, var(--violet), #c084fc);
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.7);
          transition: width 0.25s linear;
        }

        /* ===== RESPONSIVE / MOBILE ===== */
        @media (max-width: 760px) {
          /* Empilement vertical : en-tête (marque) puis contenu ; la barre de
             navigation est ancrée en bas de l'écran (cf. .nav ci-dessous). On
             réserve l'espace du bas pour ne pas masquer le contenu. */
          .dashboard-screen {
            display: block;
            min-height: 100vh;
            padding-bottom: 78px;
          }

          .dashboard-screen .sidebar {
            flex-direction: column;
            gap: 16px;
            padding: 16px;
            border-right: none;
            border-bottom: 1px solid rgba(37, 99, 255, 0.3);
            box-shadow: none;
            /* Indispensable : un backdrop-filter sur la sidebar créerait un
               bloc conteneur et empêcherait le position:fixed du .nav de se
               caler sur le viewport (la barre resterait collée en haut). */
            backdrop-filter: none;
          }

          /* Mobile : titre à gauche, boutons FR/EN à droite sur la même ligne. */
          .dashboard-screen .brand-row {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            padding: 0 0 12px;
          }

          .dashboard-screen .brand {
            font-size: 1.5rem;
          }

          /* Navigation : barre d'onglets (icône + libellé) ancrée en bas de
             l'écran, fixe et répartie sur toute la largeur. */
          .dashboard-screen .nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 20;
            flex-direction: row;
            gap: 4px;
            flex-grow: 0;
            padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
            background: rgba(3, 7, 18, 0.95);
            backdrop-filter: blur(10px);
            border-top: 1px solid rgba(37, 99, 255, 0.3);
            box-shadow: 0 -4px 24px rgba(37, 99, 255, 0.18);
          }

          .dashboard-screen .nav-item,
          .dashboard-screen .nav-item:hover,
          .dashboard-screen .nav-item.active {
            flex: 1 1 0;
            min-width: 0;
            flex-direction: column;
            gap: 5px;
            width: auto;
            padding: 8px 3px;
            border: none;
            border-left: none;
            background: transparent;
            box-shadow: none;
            text-align: center;
            font-size: 0.54rem;
            letter-spacing: 0.5px;
            color: rgba(209, 225, 248, 0.55);
          }
          .dashboard-screen .nav-rewards {
            margin-top: 0;
          }
          .dashboard-screen .nav-label {
            display: block;
            line-height: 1.2;
          }
          .dashboard-screen .nav-icon {
            width: 22px;
            height: 22px;
            opacity: 0.8;
          }

          /* Onglet actif : surligné par la couleur, sans cadre. */
          .dashboard-screen .nav-item.active {
            color: #fff;
          }
          .dashboard-screen .nav-item.active .nav-icon {
            opacity: 1;
            filter: drop-shadow(0 0 6px var(--electric-bright));
          }
          .dashboard-screen .nav-item-muted,
          .dashboard-screen .nav-item-muted .nav-icon {
            color: rgba(209, 225, 248, 0.3);
          }
          /* Pastille d'alerte en coin de l'onglet. */
          .dashboard-screen .nav-badge {
            position: absolute;
            top: 4px;
            right: 25%;
            margin: 0;
          }

          .dashboard-screen .topbar {
            flex-wrap: wrap;
            gap: 8px 14px;
            padding: 12px 16px;
          }

          /* Mobile : la déconnexion se place à droite de la jauge
             d'habilitation (1re ligne), le statut « Systèmes nominaux » passe
             en dessous. On réordonne via flex order : habilitation → power →
             statut. */
          .dashboard-screen .clearance {
            order: 1;
            flex: 1;
            min-width: 160px;
          }
          .dashboard-screen .logout {
            order: 2;
            white-space: nowrap;
          }
          .dashboard-screen .hud-status {
            order: 3;
            flex-wrap: wrap;
            margin-left: 0;
            gap: 10px 14px;
          }

          .dashboard-screen .panel-area {
            padding: 26px 16px 36px;
          }
          .dashboard-screen .section-title {
            font-size: 1.7rem;
            letter-spacing: 3px;
          }

          /* Tableau des missions plus compact. */
          .dashboard-screen .missions {
            font-size: 0.8rem;
          }
          .dashboard-screen .missions th,
          .dashboard-screen .missions td {
            padding: 10px 12px;
          }
        }

        /* ---- CARTES D'ACTION : adaptation téléphones ---- */
        @media (max-width: 520px) {
          .dashboard-screen .actions-list {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          /* Pleine largeur, hauteur selon le contenu, texte agrandi. */
          .dashboard-screen .action-name {
            font-size: 1.1rem;
          }
          .dashboard-screen .action-desc {
            font-size: 0.92rem;
          }
        }
      `}</style>
    </>
  );
}
