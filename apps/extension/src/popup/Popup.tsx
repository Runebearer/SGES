import { useTranslation } from 'react-i18next';
import './i18n'; // initialise i18next au chargement du popup
import { supportedLanguages } from '@mon-projet/i18n';

export default function Popup() {
  const { t, i18n } = useTranslation('extension');

  return (
    <div className="popup">
      <h1>{t('popup.title')}</h1>

      <button>{t('popup.scan_button')}</button>

      <div className="language-switcher">
        <span>{t('language_switcher.label')} :</span>
        {supportedLanguages.map((lng) => (
          <button
            key={lng}
            onClick={() => i18n.changeLanguage(lng)}
            disabled={i18n.language === lng}
          >
            {lng.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
