import { useRouter } from 'next/router';

const LANGUAGES = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
];

export default function LanguageSwitcher() {
  const router = useRouter();
  const { locale, locales, pathname, query, asPath } = router;

  const changeLanguage = (lng: string) => {
    router.push({ pathname, query }, asPath, { locale: lng });
  };

  return (
    <div className="lang-switcher">
      {LANGUAGES.filter((l) => locales?.includes(l.code)).map((l) => (
        <button
          key={l.code}
          onClick={() => changeLanguage(l.code)}
          className={l.code === locale ? 'active' : ''}
          aria-label={`Switch to ${l.label}`}
        >
          {l.label}
        </button>
      ))}

      <style jsx>{`
        .lang-switcher {
          display: flex;
          gap: 6px;
        }

        button {
          background: transparent;
          border: 1px solid var(--deep-blue);
          color: var(--deep-blue);
          font-size: 0.75rem;
          font-weight: bold;
          letter-spacing: 1px;
          padding: 4px 10px;
          cursor: pointer;
          text-transform: uppercase;
          transition: all 0.3s ease;
          clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
        }

        button:hover {
          color: var(--cyan);
          border-color: var(--cyan);
          box-shadow: 0 0 10px rgba(0, 210, 255, 0.2);
        }

        button.active {
          background: var(--deep-blue);
          color: #fff;
        }
      `}</style>
    </div>
  );
}
