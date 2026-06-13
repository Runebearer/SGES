const { i18n } = require('./next-i18next.config');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  i18n,
  // ⚠️ Conserve ici le reste de ta configuration Next existante
  // (rewrites, images, env, etc.) — ce fichier est un point de départ,
  // pas un remplacement complet si tu as déjà des options personnalisées.
};

module.exports = nextConfig;
