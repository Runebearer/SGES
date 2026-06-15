import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources, defaultLanguage, supportedLanguages, SupportedLanguage } from '@sges/i18n';

// Détecte la langue préférée du navigateur (gérée par Chrome),
// avec repli sur le français si la langue n'est pas supportée.
function detectLanguage(): SupportedLanguage {
  const uiLang = chrome?.i18n?.getUILanguage?.() ?? navigator.language;
  const short = uiLang.split('-')[0];
  return (supportedLanguages as readonly string[]).includes(short)
    ? (short as SupportedLanguage)
    : defaultLanguage;
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: defaultLanguage,
  ns: ['common', 'extension'],
  defaultNS: 'extension',
  interpolation: {
    escapeValue: false, // pas de risque XSS, React échappe déjà
  },
});

export default i18n;
