// Catalogue d'actions serveur-autoritaire. C'est l'UNIQUE source de vérité des
// coûts et gains : le client ne fait que l'afficher (via GET /actions) et
// déclencher une action (via POST /action/{id}). Modifier une action ici suffit.
//
// `requiredLevel` et `requiredAddressStatus` sont conservés comme données mais
// NE SONT PAS encore appliqués (systèmes d'XP/niveau et d'adresses à venir).

import type { ActionDef, Address } from '@sges/api-contract';
import addressCatalog from './addresses.json';

// Catalogue des coordonnées spécifiques (cf. addresses.json) : chaque monde y
// est décrit (lore) une seule fois, puis référencé par id dans les pools
// `unlocksAddresses` des sous-missions ci-dessous (qui n'exposent que id/name
// au client, cf. type `Address`).
const ADDRESSES_BY_ID: Record<string, Address> = Object.fromEntries(
  (addressCatalog as { id: string; name: string }[]).map((a) => [
    a.id,
    { id: a.id, name: a.name },
  ])
);

export const ACTIONS: ActionDef[] = [
  {
    id: 'generator_activation',
    name: 'Activation des générateurs',
    section: 'sgcf',
    requiredLevel: 1,
    requiredAddressStatus: null,
    cost: { energy: 5, electricity: 0, artifacts: 0 },
    gain: {
      electricity: 30,
      artifactsMin: 0,
      artifactsMax: 0,
      genericCoordinatesMin: 0,
      genericCoordinatesMax: 0,
      xp: 5,
    },
    durationSec: 30,
    description:
      "Configurer et alimenter les générateurs à Naquadah de la base. Une alimentation stable est indispensable avant d'initier toute séquence de numérotation.",
    subMissions: [
      { id: 'nuclear', name: 'Nucléaire' },
      // Masquées pour l'instant : déblocage sous conditions à venir.
      { id: 'naquadah', name: 'Naquadah', available: false },
      { id: 'naquadria', name: 'Naquadria', available: false },
    ],
  },
  {
    id: 'earth_archaeology',
    name: 'Archéologie Terrienne',
    section: 'sgcf',
    requiredLevel: 1,
    requiredAddressStatus: null,
    cost: { energy: 8, electricity: 5, artifacts: 0 },
    gain: {
      electricity: 0,
      artifactsMin: 2,
      artifactsMax: 2,
      genericCoordinatesMin: 0,
      genericCoordinatesMax: 0,
      xp: 8,
    },
    durationSec: 120,
    description:
      "Bien des secrets sont enfouis dans les artefacts antiques. C'est une ressource rare mais nécessaire pour les recherches",
    subMissions: [{ id: 'gizeh', name: 'Plateau de Gizeh' }],
  },
  {
    id: 'archaeological_research',
    name: 'Recherche Archéologique',
    section: 'sgcf',
    // Cliquer la carte ouvre la vue dédiée « research » (au lieu du flip).
    opensSection: 'research',
    requiredLevel: 1,
    requiredAddressStatus: null,
    cost: { energy: 20, electricity: 15, artifacts: 10 },
    gain: {
      electricity: 0,
      artifactsMin: 0,
      artifactsMax: 0,
      // Traduire un cartouche révèle des coordonnées génériques (en plus de la
      // coordonnée spécifique éventuellement débloquée via unlocksAddresses).
      genericCoordinatesMin: 1,
      genericCoordinatesMax: 3,
      xp: 20,
    },
    durationSec: 900,
    description:
      "Le Dr. Daniel Jackson tente de traduire les cartouches de symboles récupérés pour calculer la dérive stellaire.",
    subMissions: [
      {
        id: 'abydos',
        name: "Cartouche d'Abydos",
        // Pool d'adresses débloquées (1 par complétion, dans l'ordre, sous
        // réserve de leur condition). Autres mondes disponibles dans
        // addresses.json, à ajouter ici quand voulu.
        unlocksAddresses: [
          {
            address: ADDRESSES_BY_ID.chulak,
            condition: { minLevel: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'malp_recon',
    name: 'Reconnaissance MALP',
    section: 'missions',
    requiredLevel: 1,
    requiredAddressStatus: 'Découverte',
    cost: { energy: 10, electricity: 20, artifacts: 0 },
    gain: {
      electricity: 0,
      artifactsMin: 0,
      artifactsMax: 0,
      genericCoordinatesMin: 0,
      genericCoordinatesMax: 0,
      xp: 10,
    },
    durationSec: 300,
    description:
      "Composer le code d'une adresse découverte et envoyer une sonde automatisée MALP à travers le vortex pour s'assurer que le site est viable.",
    subMissions: [],
    travel: true,
  },
  {
    id: 'planetary_archaeology',
    name: 'Astro-archéologie',
    section: 'missions',
    requiredLevel: 1,
    requiredAddressStatus: 'Vivable',
    cost: { energy: 15, electricity: 30, artifacts: 0 },
    gain: {
      electricity: 0,
      artifactsMin: 5,
      artifactsMax: 10,
      genericCoordinatesMin: 0,
      genericCoordinatesMax: 0,
      xp: 15,
    },
    durationSec: 600,
    description:
      "Établissez un horizon des événements stable et envoyez une équipe SG explorer les ruines extraterrestres sécurisées pour y extraire des reliques.",
    subMissions: [],
    travel: true,
  },
  {
    id: 'chulak_diplomacy',
    name: 'Mission Diplomatique (Chulak)',
    section: null,
    requiredLevel: 2,
    requiredAddressStatus: 'Chulak',
    cost: { energy: 20, electricity: 40, artifacts: 0 },
    gain: {
      electricity: 0,
      artifactsMin: 4,
      artifactsMax: 6,
      genericCoordinatesMin: 0,
      genericCoordinatesMax: 0,
      xp: 30,
    },
    durationSec: 1800,
    description:
      "Traversez la Porte vers le monde d'origine d'Apophis pour sceller une alliance avec la rébellion Jaffa naissante. Mission nerveuse et riche en XP.",
    subMissions: [],
    travel: true,
  },
];

export const ACTIONS_BY_ID: Record<string, ActionDef> = Object.fromEntries(
  ACTIONS.map((a) => [a.id, a])
);
