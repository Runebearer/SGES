import enCommon from './locales/en/common.json';
import enExtension from './locales/en/extension.json';
import frCommon from './locales/fr/common.json';
import frExtension from './locales/fr/extension.json';

export const supportedLanguages = ['fr', 'en'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];
export const defaultLanguage: SupportedLanguage = 'fr';

export const resources = {
  fr: { common: frCommon, extension: frExtension },
  en: { common: enCommon, extension: enExtension },
} as const;
