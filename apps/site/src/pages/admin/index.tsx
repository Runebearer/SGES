import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetStaticProps } from 'next';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../lib/admin';
import nextI18NextConfig from '../../../next-i18next.config.js';

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'fr', ['common'], nextI18NextConfig)),
  },
});

// Back-office SGES — page réservée à l'allowlist admin (cf. lib/admin.ts).
// Périmètre actuel : lecture seule de l'état du compte connecté. Les outils
// d'édition (recherche par uid, patch/grant/reset) viendront via les routes
// admin du Worker.
export default function AdminHome() {
  const router = useRouter();
  const { user, player, loading, signOut } = useAuth();
  const admin = isAdmin(user);

  // Garde-fou : non connecté → login ; connecté mais non-admin → dashboard.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (!admin) {
      router.replace('/dashboard');
    }
  }, [loading, user, admin, router]);

  // Tant que l'accès n'est pas confirmé, on n'affiche rien (évite le flash de
  // contenu réservé avant la redirection).
  if (loading || !user || !admin) {
    return (
      <div className="admin-gate">
        <p>Vérification de l’accès…</p>
        <style jsx>{`
          .admin-gate {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #0a0e14;
            color: #9fb3c8;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>SGES — Back-office</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="admin">
        <header className="admin-head">
          <h1>Back-office SGES</h1>
          <div className="admin-actions">
            <Link href="/dashboard" className="admin-link">
              ← Dashboard
            </Link>
            <button type="button" onClick={() => signOut()}>
              Déconnexion
            </button>
          </div>
        </header>

        <section className="admin-card">
          <h2>Compte connecté</h2>
          <dl>
            <dt>uid</dt>
            <dd className="mono">{user.uid}</dd>
            <dt>email</dt>
            <dd>{user.email ?? '—'}</dd>
          </dl>
        </section>

        <section className="admin-card">
          <h2>État joueur (lecture seule)</h2>
          {player ? (
            <dl>
              <dt>Énergie</dt>
              <dd>
                {player.energy.value} / {player.energy.max}
              </dd>
              <dt>Électricité</dt>
              <dd>{player.electricity}</dd>
              <dt>Artefacts</dt>
              <dd>{player.artifacts}</dd>
              <dt>XP</dt>
              <dd>{player.xp}</dd>
              <dt>Niveau</dt>
              <dd>{player.level}</dd>
              <dt>Missions en cours</dt>
              <dd>{player.missions.length}</dd>
              <dt>Adresses</dt>
              <dd>{player.addresses.length}</dd>
            </dl>
          ) : (
            <p className="muted">
              État indisponible (Worker injoignable ou non chargé).
            </p>
          )}
        </section>

        <p className="muted note">
          Prochaine étape : recherche d’un joueur par uid et édition (énergie,
          ressources, récompenses, reset) via les routes admin du Worker.
        </p>
      </main>

      <style jsx>{`
        .admin {
          min-height: 100vh;
          max-width: 720px;
          margin: 0 auto;
          padding: 2rem 1.25rem 4rem;
          background: #0a0e14;
          color: #cfe0f0;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .admin-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 1rem;
          border-bottom: 1px solid #1d2735;
          padding-bottom: 1rem;
          margin-bottom: 1.5rem;
        }
        .admin-head h1 {
          font-size: 1.25rem;
          margin: 0;
          color: #5fd0ff;
        }
        .admin-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .admin-link {
          color: #9fb3c8;
          text-decoration: none;
        }
        .admin-actions button {
          background: transparent;
          border: 1px solid #2a3a4d;
          color: #cfe0f0;
          padding: 0.35rem 0.7rem;
          border-radius: 4px;
          cursor: pointer;
          font: inherit;
        }
        .admin-actions button:hover {
          border-color: #5fd0ff;
        }
        .admin-card {
          border: 1px solid #1d2735;
          border-radius: 6px;
          padding: 1rem 1.25rem;
          margin-bottom: 1.25rem;
          background: #0d131c;
        }
        .admin-card h2 {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6f8aa3;
          margin: 0 0 0.75rem;
        }
        dl {
          display: grid;
          grid-template-columns: max-content 1fr;
          gap: 0.35rem 1rem;
          margin: 0;
        }
        dt {
          color: #6f8aa3;
        }
        dd {
          margin: 0;
          color: #e6f1fb;
        }
        .mono {
          font-size: 0.85rem;
          word-break: break-all;
        }
        .muted {
          color: #6f8aa3;
        }
        .note {
          font-size: 0.85rem;
          border-top: 1px dashed #1d2735;
          padding-top: 1rem;
        }
      `}</style>
    </>
  );
}
