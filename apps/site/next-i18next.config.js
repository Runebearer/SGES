/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
  },
  // Les fichiers de traduction sont synchronisés depuis packages/i18n/locales
  // vers public/locales par scripts/sync-locales.js (voir package.json -> "predev"/"prebuild")
  localePath: './public/locales',
  reloadOnPrerender: process.env.NODE_ENV === 'development',
};
