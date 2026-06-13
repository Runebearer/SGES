const { i18n } = require('./next-i18next.config.js');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  i18n, // <-- Next.js partage ainsi la config nativement avec serverSideTranslations
};

module.exports = nextConfig;