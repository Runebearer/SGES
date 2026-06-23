import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetStaticProps } from 'next';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../lib/admin';
import { fetchPlayers } from '../../lib/adminClient';
import nextI18NextConfig from '../../../next-i18next.config.js';

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'fr', ['common'], nextI18NextConfig)),
  },
});

// Back-office SGES — liste de tous les joueurs (réservée à l'allowlist admin,
// vérifiée côté serveur par le Worker). Cliquer un joueur ouvre sa fiche éditable.
export default function AdminHome() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const admin = isAdmin(user);
  const [players, setPlayers] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Garde-fou : non connecté → login ; connecté mais non-admin → dashboard.
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (!admin) router.replace('/dashboard');
    // router hors deps (stable) : évite de relancer la redirection à chaque
    // navigation (boucle d'« Abort fetching component »).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, admin]);

  // Charge la liste des joueurs (uniquement si admin confirmé).
  useEffect(() => {
    if (!user || !admin) return;
    let alive = true;
    setError(null);
    fetchPlayers(() => user.getIdToken())
      .then((list) => alive && setPlayers(list))
      .catch((e) => alive && setError(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
  }, [user, admin]);

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
          <button type="button" onClick={() => signOut()}>
            Déconnexion
          </button>
        </header>

        <section className="admin-card">
          <h2>
            Joueurs{players ? ` (${players.length})` : ''}
          </h2>
          {error ? (
            <p className="err">Erreur de chargement : {error}</p>
          ) : players == null ? (
            <p className="muted">Chargement…</p>
          ) : players.length === 0 ? (
            <p className="muted">Aucun joueur enregistré.</p>
          ) : (
            <ul className="players">
              {players.map((uid) => (
                <li key={uid}>
                  <Link href={`/admin/${encodeURIComponent(uid)}`} className="player">
                    <span className="mono">{uid}</span>
                    {uid === user.uid && <span className="badge">vous</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <style jsx>{`
        .admin {
          min-height: 100vh;
          max-width: 760px;
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
        .admin-head button {
          background: transparent;
          border: 1px solid #2a3a4d;
          color: #cfe0f0;
          padding: 0.35rem 0.7rem;
          border-radius: 4px;
          cursor: pointer;
          font: inherit;
        }
        .admin-head button:hover {
          border-color: #5fd0ff;
        }
        .admin-card {
          border: 1px solid #1d2735;
          border-radius: 6px;
          padding: 1rem 1.25rem;
          background: #0d131c;
        }
        .admin-card h2 {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6f8aa3;
          margin: 0 0 0.75rem;
        }
        .players {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .player {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.55rem 0.75rem;
          border: 1px solid #1d2735;
          border-radius: 4px;
          color: #e6f1fb;
          text-decoration: none;
        }
        .player:hover {
          border-color: #5fd0ff;
          background: #0f1722;
        }
        .mono {
          font-size: 0.85rem;
          word-break: break-all;
        }
        .badge {
          flex: none;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #0a0e14;
          background: #5fd0ff;
          border-radius: 3px;
          padding: 0.1rem 0.4rem;
        }
        .muted {
          color: #6f8aa3;
        }
        .err {
          color: #ff8c8c;
        }
      `}</style>
    </>
  );
}
