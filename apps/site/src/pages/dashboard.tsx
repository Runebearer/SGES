import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetStaticProps } from 'next';
import type { ActionDef, ActionSection, SubMission } from '@sges/api-contract';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../context/AuthContext';
import nextI18NextConfig from '../../next-i18next.config.js';

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'fr', ['common'], nextI18NextConfig)),
  },
});

type SectionId =
  | 'dashboard'
  | 'sgcf'
  | 'missions'
  | 'alert'
  | 'rewards'
  | 'research';

const SECTION_IDS: readonly SectionId[] = [
  'dashboard',
  'sgcf',
  'missions',
  'alert',
  'rewards',
  'research',
];
// Onglet déduit du paramètre d'URL `?tab=...` (défaut : dashboard).
function sectionFromQuery(tab: string | string[] | undefined): SectionId {
  const value = Array.isArray(tab) ? tab[0] : tab;
  return value && (SECTION_IDS as readonly string[]).includes(value)
    ? (value as SectionId)
    : 'dashboard';
}

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
  // Non présente dans la barre de navigation (vue atteinte via la carte).
  research: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
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

// Œil de Râ (œil oudjat) : symbole des artefacts.
const EYE_OF_RA = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Sourcil */}
    <path d="M4 8c4.5-3.5 11-3.5 16 0.5" />
    {/* Paupière supérieure */}
    <path d="M3 12.5c4-4.5 13-4.5 18 0" />
    {/* Paupière inférieure */}
    <path d="M21 12.5c-3.5 3.5-9 3.5-13 1" />
    {/* Pupille */}
    <circle cx="11" cy="12.2" r="2.1" fill="currentColor" stroke="none" />
    {/* Larme verticale */}
    <path d="M8 14l-2 4.6" />
    {/* Volute */}
    <path d="M15 14.2c1.2 2.4 0.4 4-2 4.9" />
  </svg>
);

// Éclair : symbole de l'électricité stockée.
const LIGHTNING = (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinejoin="round"
  >
    <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
  </svg>
);

// Trophée : symbole d'une récompense débloquée.
const TROPHY = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
    <path d="M7 6H4v1a3 3 0 0 0 3 3" />
    <path d="M17 6h3v1a3 3 0 0 1-3 3" />
    <path d="M12 13v3" />
    <path d="M8.5 20h7l-1-3h-5z" />
  </svg>
);

// Cadenas : récompense encore verrouillée.
const LOCK = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="5" y="11" width="14" height="9" rx="1.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    <circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

// Petite fenêtre HUD du nombre d'artefacts possédés (toujours visible).
function ArtifactWindow() {
  const { t } = useTranslation('common');
  const { player } = useAuth();
  return (
    <div
      className="artifact-window"
      title={t('dashboard.sections.dashboard.cards.artifacts')}
    >
      <span className="artifact-icon" aria-hidden="true">
        {EYE_OF_RA}
      </span>
      <span className="artifact-count">
        {player ? player.artifacts : '—'}
      </span>
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

// Lancement d'actions partagé (cartes ET vue recherche) : état busy/erreur, tic
// d'animation des jauges, et démarrage d'une sous-mission (timer côté Worker).
function useActionLauncher(scope: ActionDef[]) {
  const { player, performAction } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [errored, setErrored] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const hasRunning = (player?.missions ?? []).some((m) =>
    scope.some((a) => a.id === m.actionId)
  );

  // Tic d'animation des jauges tant qu'une mission du périmètre tourne.
  useEffect(() => {
    if (!hasRunning) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [hasRunning]);

  const missionFor = (actionId: string) =>
    (player?.missions ?? []).find((m) => m.actionId === actionId);

  const canAfford = (a: ActionDef) =>
    player != null &&
    player.energy.value >= a.cost.energy &&
    player.electricity >= a.cost.electricity &&
    player.artifacts >= a.cost.artifacts;

  const start = async (a: ActionDef, sub: SubMission) => {
    setBusy(a.id);
    setErrored(null);
    try {
      await performAction(a.id, sub.id);
    } catch {
      setErrored(a.id);
    } finally {
      setBusy(null);
    }
  };

  return { now, busy, errored, missionFor, canAfford, start };
}

type Launcher = ReturnType<typeof useActionLauncher>;

// Bouton d'une sous-mission : démarre l'action parente, affiche la durée, et —
// en cours — le compte à rebours + une jauge de complétion.
function SubMissionButton({
  action,
  sub,
  launcher,
}: {
  action: ActionDef;
  sub: SubMission;
  launcher: Launcher;
}) {
  const { t } = useTranslation('common');
  const { now, busy, errored, missionFor, canAfford, start } = launcher;
  const mission = missionFor(action.id);
  const running = !!mission;
  const affordable = canAfford(action);
  let pct = 0;
  let remaining = 0;
  if (mission) {
    const total = mission.endsAt - mission.startedAt;
    const done = Math.min(total, Math.max(0, now - mission.startedAt));
    pct = total > 0 ? (done / total) * 100 : 100;
    remaining = Math.max(0, Math.ceil((mission.endsAt - now) / 1000));
  }
  return (
    <li>
      <button
        type="button"
        className="submission"
        disabled={busy === action.id || running || !affordable}
        onClick={() => start(action, sub)}
      >
        <span className="submission-name">{sub.name}</span>
        <span className="submission-state">
          {running
            ? formatClock(remaining)
            : errored === action.id
              ? t('dashboard.actions.insufficient')
              : formatDuration(action.durationSec)}
        </span>
      </button>
      {running && (
        <div
          className="submission-track"
          role="progressbar"
          aria-label={sub.name}
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="submission-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
    </li>
  );
}

// Cartes d'action : carte carrée holographique. Par défaut elle se retourne au
// clic (flip 3D) pour révéler ses sous-missions. Si l'action définit
// `opensSection`, le clic NAVIGUE vers cette vue (ex. recherche) au lieu du flip.
function ActionCards({
  section,
  onOpenSection,
}: {
  section: ActionSection;
  onOpenSection: (s: string) => void;
}) {
  const { actions } = useAuth();
  const [flipped, setFlipped] = useState<string | null>(null);
  const list = actions.filter((a) => a.section === section);
  const launcher = useActionLauncher(list);
  if (list.length === 0) return null;

  return (
    <div className="actions-list">
      {list.map((a) => {
        const navigates = !!a.opensSection;
        const open = () =>
          navigates ? onOpenSection(a.opensSection as string) : setFlipped(a.id);
        const visible = a.subMissions.filter((s) => s.available !== false);
        return (
          <div
            key={a.id}
            className={`action-card${flipped === a.id ? ' flipped' : ''}`}
          >
            <div className="action-inner">
              {/* Recto : titre + descriptif. Clic → flip OU navigation. */}
              <div
                className="action-face action-front"
                role="button"
                tabIndex={0}
                aria-label={a.name}
                onClick={open}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open();
                  }
                }}
              >
                <h3 className="action-name">{a.name}</h3>
                <p className="action-desc">{a.description}</p>
              </div>

              {/* Verso : sous-missions (seulement pour les cartes à flip). */}
              {!navigates && (
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
                        <SubMissionButton
                          key={s.id}
                          action={a}
                          sub={s}
                          launcher={launcher}
                        />
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Vue « Recherche archéologique » (atteinte via la carte). Deux sections :
// 1) recherches lançables (sous-missions) ; 2) coordonnées débloquées.
function ResearchView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation('common');
  const { actions, player } = useAuth();
  const researchActions = actions.filter((a) => a.opensSection === 'research');
  const launcher = useActionLauncher(researchActions);
  const addresses = player?.addresses ?? [];

  return (
    <div className="research-view">
      <div className="research-header">
        <button type="button" className="research-back" onClick={onBack}>
          ← {t('dashboard.research.back')}
        </button>
        <ArtifactWindow />
      </div>

      <section className="research-block">
        <h2 className="research-block-title">
          {t('dashboard.research.available_title')}
        </h2>
        <ul className="submission-list research-missions">
          {researchActions.flatMap((a) =>
            a.subMissions
              .filter((s) => s.available !== false)
              .map((s) => (
                <SubMissionButton
                  key={`${a.id}:${s.id}`}
                  action={a}
                  sub={s}
                  launcher={launcher}
                />
              ))
          )}
        </ul>
      </section>

      <section className="research-block">
        <h2 className="research-block-title">
          {t('dashboard.research.addresses_title')}
        </h2>
        {addresses.length === 0 ? (
          <p className="research-empty">
            {t('dashboard.research.addresses_empty')}
          </p>
        ) : (
          <ul className="address-list">
            {addresses.map((addr) => (
              <li key={addr.id} className="address">
                <span className="address-glyph" aria-hidden="true">
                  ◈
                </span>
                {addr.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// Définition d'un trophée de la galerie des récompenses. `unlocked(player)`
// décide de sa disponibilité à partir de l'état serveur-autoritaire. La clé
// `i18nKey` pointe vers `dashboard.sections.rewards.<i18nKey>.{title,desc,alt}`.
interface Trophy {
  id: string;
  i18nKey: string;
  image: string;
  unlocked: (player: ReturnType<typeof useAuth>['player']) => boolean;
}

// Catalogue des trophées. Pour en ajouter un : déposer l'image dans
// `public/rewards/`, ajouter les libellés i18n et une entrée ici.
const TROPHIES: Trophy[] = [
  {
    id: 'coverstone',
    i18nKey: 'coverstone',
    image: '/rewards/coverstone.jpg',
    // Le plan du couvercle se débloque après la 1re recherche archéologique :
    // c'est la SEULE action qui débloque une adresse, d'où ce test.
    unlocked: (player) => (player?.addresses?.length ?? 0) > 0,
  },
];

// Vue « Récompenses » : galerie de trophées présentés comme les cartes de
// missions (même style holographique). Un trophée débloqué s'ouvre au clic et
// affiche son image en plein écran ; un trophée verrouillé reste grisé.
function RewardsView() {
  const { t } = useTranslation('common');
  const { player } = useAuth();
  const [openedId, setOpenedId] = useState<string | null>(null);

  const trophies = TROPHIES.map((tr) => ({ ...tr, isUnlocked: tr.unlocked(player) }));
  const opened = trophies.find((tr) => tr.id === openedId && tr.isUnlocked) ?? null;

  // Fermeture de la visionneuse plein écran à la touche Échap.
  useEffect(() => {
    if (!opened) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opened]);

  return (
    <>
      <div className="actions-list rewards-gallery">
        {trophies.map((tr) => {
          const title = tr.isUnlocked
            ? t(`dashboard.sections.rewards.${tr.i18nKey}.title`)
            : t('dashboard.sections.rewards.locked');
          const desc = tr.isUnlocked
            ? t(`dashboard.sections.rewards.${tr.i18nKey}.desc`)
            : t('dashboard.sections.rewards.locked_hint');
          const open = () => tr.isUnlocked && setOpenedId(tr.id);
          return (
            <div
              key={tr.id}
              className={`action-card reward-card${tr.isUnlocked ? '' : ' reward-locked'}`}
            >
              <div className="action-inner">
                <div
                  className="action-face action-front reward-front"
                  role="button"
                  tabIndex={tr.isUnlocked ? 0 : -1}
                  aria-disabled={!tr.isUnlocked}
                  aria-label={title}
                  onClick={open}
                  onKeyDown={(e) => {
                    if (tr.isUnlocked && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      open();
                    }
                  }}
                >
                  <span className="reward-trophy-icon" aria-hidden="true">
                    {tr.isUnlocked ? TROPHY : LOCK}
                  </span>
                  <h3 className="action-name">{title}</h3>
                  <p className="action-desc">{desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {opened && (
        <div
          className="reward-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t(`dashboard.sections.rewards.${opened.i18nKey}.alt`)}
          onClick={() => setOpenedId(null)}
        >
          <button
            type="button"
            className="reward-lightbox-close"
            onClick={() => setOpenedId(null)}
            aria-label={t('dashboard.research.back')}
          >
            ×
          </button>
          <img
            src={opened.image}
            alt={t(`dashboard.sections.rewards.${opened.i18nKey}.alt`)}
          />
        </div>
      )}
    </>
  );
}

export default function Dashboard() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { user, authLevel, player, loading, signOut, refreshPlayer } = useAuth();

  // L'onglet actif est piloté par l'URL (?tab=...) : partageable, conservé au
  // rafraîchissement et navigable via les boutons précédent/suivant.
  const active = sectionFromQuery(router.query.tab);

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

  // Sélectionne un onglet via l'URL (?tab=…). L'onglet par défaut (dashboard)
  // garde une URL propre. `active` est dérivé de l'URL → conservé au refresh.
  const selectSection = (id: SectionId) => {
    const query = { ...router.query };
    if (id === 'dashboard') delete query.tab;
    else query.tab = id;
    router.replace({ pathname: router.pathname, query }, undefined, {
      shallow: true,
    });
  };

  const navItems: SectionId[] = ['dashboard', 'sgcf', 'missions', 'alert'];

  return (
    <>
      <Head>
        <title>{`SGES — ${t(`dashboard.sections.${active}.title`)}`}</title>
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
                    <span className="stat-icon stat-icon-power" aria-hidden="true">
                      {LIGHTNING}
                    </span>
                    <span className="stat-value">
                      {player ? player.electricity : '—'}
                    </span>
                    <span className="stat-label">
                      {t('dashboard.sections.dashboard.cards.electricity')}
                    </span>
                  </div>
                  <div className="stat stat-artifact">
                    {/* Compteur d'artefacts collectés (œil de Râ, doré). */}
                    <span className="stat-icon" aria-hidden="true">
                      {EYE_OF_RA}
                    </span>
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
                <ActionCards
                  section="sgcf"
                  onOpenSection={(s) => selectSection(s as SectionId)}
                />
              </>
            )}

            {active === 'missions' && (
              <ActionCards
                section="missions"
                onOpenSection={(s) => selectSection(s as SectionId)}
              />
            )}

            {active === 'research' && (
              <ResearchView onBack={() => selectSection('sgcf')} />
            )}

            {active === 'alert' && (
              <div className="panel panel-empty">
                <p>{t('dashboard.sections.alert.empty')}</p>
              </div>
            )}

            {active === 'rewards' && <RewardsView />}
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

        /* ---- FENÊTRE ARTEFACTS (plume de Maât, thème doré) ---- */
        .dashboard-screen .artifact-window {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          font-family: monospace;
          border: 1px solid rgba(212, 175, 55, 0.45);
          background: rgba(212, 175, 55, 0.08);
          box-shadow: 0 0 12px rgba(212, 175, 55, 0.15),
            inset 0 0 14px rgba(212, 175, 55, 0.06);
          clip-path: polygon(
            0 6px,
            6px 0,
            100% 0,
            100% calc(100% - 6px),
            calc(100% - 6px) 100%,
            0 100%
          );
        }

        .dashboard-screen .artifact-icon {
          display: inline-flex;
          width: 18px;
          height: 18px;
          color: #d4af37;
          filter: drop-shadow(0 0 5px rgba(212, 175, 55, 0.55));
        }
        .dashboard-screen .artifact-icon svg {
          width: 100%;
          height: 100%;
        }

        .dashboard-screen .artifact-count {
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 1px;
          color: #f4e4b8;
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

        /* ---- CARTE ARTEFACTS : œil de Râ, thème doré ---- */
        .dashboard-screen .stat-artifact {
          border-color: rgba(212, 175, 55, 0.35);
          border-left-color: #d4af37;
        }
        .dashboard-screen .stat-artifact:hover {
          box-shadow: 0 0 24px rgba(212, 175, 55, 0.22);
        }
        .dashboard-screen .stat-icon {
          width: 30px;
          height: 30px;
          color: #d4af37;
          filter: drop-shadow(0 0 6px rgba(212, 175, 55, 0.5));
        }
        .dashboard-screen .stat-icon svg {
          width: 100%;
          height: 100%;
        }
        /* Éclair de l'électricité : bleu électrique (et non doré). */
        .dashboard-screen .stat-icon-power {
          color: var(--electric-bright);
          filter: drop-shadow(0 0 6px rgba(77, 139, 255, 0.6));
        }
        .dashboard-screen .stat-artifact .stat-value {
          color: #f4e4b8;
          text-shadow: 0 0 14px rgba(212, 175, 55, 0.5);
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

        /* ---- VUE RECHERCHE ---- */
        .dashboard-screen .research-view {
          display: flex;
          flex-direction: column;
          gap: 26px;
          max-width: 720px;
        }

        /* En-tête de la vue : bouton retour à gauche, widget artefacts à droite. */
        .dashboard-screen .research-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .dashboard-screen .research-back {
          font-family: monospace;
          font-size: 0.76rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--electric-bright);
          background: transparent;
          border: 1px solid var(--electric-deep);
          padding: 8px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dashboard-screen .research-back:hover {
          background: var(--electric);
          color: #030712;
          box-shadow: 0 0 14px rgba(37, 99, 255, 0.5);
        }

        .dashboard-screen .research-block {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 22px 24px;
          background: var(--panel-bg);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(37, 99, 255, 0.3);
          border-left: 4px solid var(--electric);
          clip-path: polygon(
            0 14px,
            14px 0,
            100% 0,
            100% calc(100% - 14px),
            calc(100% - 14px) 100%,
            0 100%
          );
        }

        .dashboard-screen .research-block-title {
          margin: 0;
          font-family: monospace;
          font-size: 0.8rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--electric-bright);
        }

        .dashboard-screen .research-missions {
          max-width: 440px;
        }

        .dashboard-screen .research-empty {
          margin: 0;
          font-family: monospace;
          font-size: 0.82rem;
          letter-spacing: 1px;
          color: rgba(209, 225, 248, 0.4);
        }

        .dashboard-screen .address-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
        }

        .dashboard-screen .address {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: monospace;
          font-size: 0.9rem;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #fff;
          padding: 12px 14px;
          background: rgba(37, 99, 255, 0.1);
          border: 1px solid rgba(120, 170, 255, 0.35);
          border-left: 3px solid var(--electric-bright);
          clip-path: polygon(
            0 6px,
            6px 0,
            100% 0,
            100% calc(100% - 6px),
            calc(100% - 6px) 100%,
            0 100%
          );
        }
        .dashboard-screen .address-glyph {
          color: var(--electric-bright);
          text-shadow: 0 0 8px rgba(77, 139, 255, 0.7);
        }

        /* ---- RÉCOMPENSES (galerie de trophées) ---- */
        /* Réutilise les cartes holographiques des missions
           (.action-card / .action-face) ; mêmes grille et style. */
        .dashboard-screen .rewards-gallery {
          max-width: 920px;
        }

        /* Contenu de la carte trophée : icône, titre, description, centrés. */
        .dashboard-screen .reward-front {
          align-items: center;
          text-align: center;
        }

        .dashboard-screen .reward-trophy-icon {
          position: relative;
          z-index: 1;
          width: 46px;
          height: 46px;
          margin: 6px auto 2px;
          color: #d4af37;
          filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.55));
        }
        .dashboard-screen .reward-trophy-icon svg {
          width: 100%;
          height: 100%;
        }

        /* Trophée débloqué : accent doré sur la carte (cliquable). */
        .dashboard-screen .reward-card:not(.reward-locked) .action-face {
          border-color: rgba(212, 175, 55, 0.5);
          box-shadow: inset 0 0 30px rgba(212, 175, 55, 0.12),
            0 0 18px rgba(212, 175, 55, 0.2);
        }
        .dashboard-screen .reward-card:not(.reward-locked):hover .action-face {
          border-color: rgba(244, 228, 184, 0.8);
          box-shadow: inset 0 0 40px rgba(212, 175, 55, 0.2),
            0 0 30px rgba(212, 175, 55, 0.4);
        }

        /* Trophée verrouillé : grisé, non cliquable, icône cadenas. */
        .dashboard-screen .reward-locked,
        .dashboard-screen .reward-locked .action-front {
          cursor: not-allowed;
        }
        .dashboard-screen .reward-locked:hover {
          transform: none;
        }
        .dashboard-screen .reward-locked .action-face {
          opacity: 0.55;
          filter: grayscale(0.6);
        }
        .dashboard-screen .reward-locked .reward-trophy-icon {
          color: var(--text-main);
          filter: none;
        }

        /* ---- VISIONNEUSE PLEIN ÉCRAN ---- */
        .dashboard-screen .reward-lightbox {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          background: rgba(3, 7, 18, 0.92);
          backdrop-filter: blur(6px);
          cursor: zoom-out;
          animation: reward-fade 0.2s ease;
        }
        .dashboard-screen .reward-lightbox img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border: 1px solid rgba(212, 175, 55, 0.5);
          box-shadow: 0 0 40px rgba(212, 175, 55, 0.25);
        }
        .dashboard-screen .reward-lightbox-close {
          position: absolute;
          top: 18px;
          right: 22px;
          width: 40px;
          height: 40px;
          font-size: 1.6rem;
          line-height: 1;
          color: #f4e4b8;
          background: rgba(3, 7, 18, 0.6);
          border: 1px solid rgba(212, 175, 55, 0.5);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dashboard-screen .reward-lightbox-close:hover {
          background: #d4af37;
          color: #030712;
          box-shadow: 0 0 16px rgba(212, 175, 55, 0.6);
        }

        @keyframes reward-fade {
          from { opacity: 0; }
          to { opacity: 1; }
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
