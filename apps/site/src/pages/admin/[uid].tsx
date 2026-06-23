import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetStaticProps } from 'next';
import type { PlayerState, AdminPlayerPatch } from '@sges/api-contract';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from '../../lib/admin';
import { fetchPlayer, updatePlayer, resetPlayer } from '../../lib/adminClient';
import nextI18NextConfig from '../../../next-i18next.config.js';

// Next exige getStaticPaths pour une route dynamique exportée statiquement ; on
// rend toutes les fiches à la demande (fallback 'blocking'), le contenu étant
// chargé côté client après authentification.
export const getStaticPaths = async () => ({ paths: [], fallback: 'blocking' });

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? 'fr', ['common'], nextI18NextConfig)),
  },
});

type FormFields = {
  energy: string;
  electricity: string;
  artifacts: string;
  xp: string;
};

function toForm(p: PlayerState): FormFields {
  return {
    energy: String(p.energy.value),
    electricity: String(p.electricity),
    artifacts: String(p.artifacts),
    xp: String(p.xp),
  };
}

// Fiche d'un joueur : consultation + édition (réservée à l'allowlist admin,
// l'autorisation réelle étant appliquée par le Worker).
export default function AdminPlayer() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const admin = isAdmin(user);

  const rawUid = router.query.uid;
  const uid = typeof rawUid === 'string' ? rawUid : '';

  const [state, setState] = useState<PlayerState | null>(null);
  const [form, setForm] = useState<FormFields | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (!admin) router.replace('/dashboard');
    // router hors deps (stable) : évite de relancer la redirection à chaque
    // navigation (boucle d'« Abort fetching component »).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, admin]);

  useEffect(() => {
    if (!user || !admin || !uid) return;
    let alive = true;
    setError(null);
    fetchPlayer(() => user.getIdToken(), uid)
      .then((p) => {
        if (!alive) return;
        setState(p);
        setForm(toForm(p));
      })
      .catch((e) => alive && setError(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
  }, [user, admin, uid]);

  const apply = (next: PlayerState) => {
    setState(next);
    setForm(toForm(next));
    setSavedAt(Date.now());
  };

  const onSave = async () => {
    if (!user || !form) return;
    setBusy(true);
    setError(null);
    try {
      const patch: AdminPlayerPatch = {
        energy: Number(form.energy),
        electricity: Number(form.electricity),
        artifacts: Number(form.artifacts),
        xp: Number(form.xp),
      };
      const next = await updatePlayer(() => user.getIdToken(), uid, patch);
      apply(next);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const onReset = async () => {
    if (!user) return;
    if (!window.confirm('Réinitialiser ce joueur à l’état par défaut ?')) return;
    setBusy(true);
    setError(null);
    try {
      const next = await resetPlayer(() => user.getIdToken(), uid);
      apply(next);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

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

  const field = (label: string, key: keyof FormFields, hint?: string) => (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <em>{hint}</em>}
      </span>
      <input
        type="number"
        value={form?.[key] ?? ''}
        onChange={(e) =>
          setForm((f) => (f ? { ...f, [key]: e.target.value } : f))
        }
        disabled={!form || busy}
      />
    </label>
  );

  return (
    <>
      <Head>
        <title>SGES — Joueur</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="admin">
        <header className="admin-head">
          <div className="bar">
            <Link href="/admin" className="back">
              ← Joueurs
            </Link>
            <button type="button" onClick={() => signOut()}>
              Déconnexion
            </button>
          </div>
          <h1 className="mono">{uid}</h1>
        </header>

        {error && <p className="err">Erreur : {error}</p>}

        {state == null && !error ? (
          <p className="muted">Chargement…</p>
        ) : (
          <>
            <section className="admin-card">
              <h2>Ressources (édition)</h2>
              <div className="grid">
                {field('Énergie', 'energy', '0–100')}
                {field('Électricité', 'electricity', '0–100')}
                {field('Artefacts', 'artifacts', '0–30')}
                {field('XP', 'xp', '≥ 0')}
              </div>
              <div className="actions">
                <button
                  type="button"
                  className="primary"
                  onClick={onSave}
                  disabled={busy || !form}
                >
                  {busy ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={onReset}
                  disabled={busy}
                >
                  Réinitialiser
                </button>
                {savedAt && !busy && <span className="ok">Enregistré ✓</span>}
              </div>
            </section>

            {state && (
              <section className="admin-card">
                <h2>État courant (lecture seule)</h2>
                <dl>
                  <dt>Niveau</dt>
                  <dd>{state.level}</dd>
                  <dt>XP (floor → next)</dt>
                  <dd>
                    {state.xpFloor} → {state.xpNext ?? '—'}
                  </dd>
                  <dt>Missions en cours</dt>
                  <dd>{state.missions.length}</dd>
                  <dt>Adresses débloquées</dt>
                  <dd>{state.addresses.length}</dd>
                </dl>
              </section>
            )}
          </>
        )}
      </main>

      <style jsx>{`
        .admin {
          min-height: 100vh;
          max-width: 760px;
          margin: 0 auto;
          padding: 1.5rem 1rem 3rem;
          background: #0a0e14;
          color: #cfe0f0;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .admin-head {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          border-bottom: 1px solid #1d2735;
          padding-bottom: 1rem;
          margin-bottom: 1.5rem;
        }
        .bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .back {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          color: #6f8aa3;
          text-decoration: none;
          font-size: 0.9rem;
        }
        .admin-head h1 {
          font-size: 0.9rem;
          margin: 0;
          color: #5fd0ff;
        }
        .admin-head button {
          flex: none;
          min-height: 44px;
          background: transparent;
          border: 1px solid #2a3a4d;
          color: #cfe0f0;
          padding: 0.5rem 0.8rem;
          border-radius: 4px;
          cursor: pointer;
          font: inherit;
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
          margin: 0 0 0.9rem;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.9rem;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .field-label {
          font-size: 0.8rem;
          color: #9fb3c8;
          display: flex;
          justify-content: space-between;
        }
        .field-label em {
          color: #51647a;
          font-style: normal;
        }
        input {
          width: 100%;
          box-sizing: border-box;
          background: #0a0e14;
          border: 1px solid #2a3a4d;
          border-radius: 4px;
          color: #e6f1fb;
          padding: 0.6rem 0.7rem;
          font: inherit;
        }
        input:focus {
          outline: none;
          border-color: #5fd0ff;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.6rem;
          margin-top: 1.25rem;
        }
        .actions button {
          flex: 1 1 auto;
          min-height: 44px;
          border-radius: 4px;
          padding: 0.6rem 0.9rem;
          cursor: pointer;
          font: inherit;
          border: 1px solid #2a3a4d;
          background: transparent;
          color: #cfe0f0;
        }
        .actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .primary {
          border-color: #2f7d9a !important;
          background: #123043 !important;
          color: #aee6ff !important;
        }
        .danger {
          border-color: #6e2a2a !important;
          color: #ff9c9c !important;
        }
        .ok {
          color: #79d98a;
          font-size: 0.85rem;
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
          word-break: break-all;
        }
        .muted {
          color: #6f8aa3;
        }
        .err {
          color: #ff8c8c;
        }
        @media (min-width: 560px) {
          .admin {
            padding: 2rem 1.25rem 4rem;
          }
          .grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .actions button {
            flex: 0 0 auto;
          }
        }
      `}</style>
    </>
  );
}
