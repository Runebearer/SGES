// Contrat d'API partagé entre le Worker Cloudflare (@sges/worker) et le site
// (@sges/site). Le site n'importe ces définitions QU'EN `type` : elles sont
// effacées du bundle navigateur. Toute nouvelle ressource serveur-autoritaire
// (régénération, dépense, anti-triche…) étend ce fichier.

/** Énergie maximale : jauge pleine. Exprimée sur 0–100 (donc = pourcentage). */
export const MAX_ENERGY = 100;

/** Électricité maximale stockable (jauge plafonnée). */
export const MAX_ELECTRICITY = 100;

/** Nombre maximal d'artefacts collectables. */
export const MAX_ARTIFACTS = 30;

/**
 * Nombre maximal d'entrées d'historique conservées par joueur (les plus
 * récentes). Borne la taille du document KV ; au-delà, les plus anciennes
 * entrées sont écartées.
 */
export const MAX_HISTORY = 200;

/**
 * Coût en énergie d'une action quand le client n'en précise pas.
 * Avec MAX_ENERGY = 100, un coût de 10 autorise 10 actions par jour.
 */
export const DEFAULT_ACTION_COST = 10;

/** État d'énergie d'un opérateur, tel que renvoyé par le Worker. */
export interface EnergyState {
  /** Énergie courante, 0–MAX_ENERGY. Serveur-autoritaire. */
  value: number;
  /** Énergie maximale (jauge pleine). */
  max: number;
  /** Jour de la dernière remise à plein (YYYY-MM-DD, fuseau de recharge). */
  day: string;
  /** Instant ISO de la prochaine remise à plein (minuit suivant). */
  resetsAt: string;
}

/**
 * État complet d'un joueur, renvoyé par `GET /state`. Toutes les ressources
 * sont serveur-autoritaires (stockées en KV, écrites uniquement par le Worker).
 */
export interface PlayerState {
  /** Énergie : recharge quotidienne à 100 % (cf. EnergyState). */
  energy: EnergyState;
  /**
   * Électricité stockée, 0–MAX_ELECTRICITY. Plafonnée mais SANS recharge
   * quotidienne : gagnée via une mécanique de jeu à définir ultérieurement.
   */
  electricity: number;
  /** Nombre d'artefacts collectés (0–MAX_ARTIFACTS). */
  artifacts: number;
  /** Points d'expérience cumulés (≥ 0). Gagnés via les actions. */
  xp: number;
  /**
   * Niveau d'habilitation, DÉRIVÉ de l'XP par le Worker (serveur-autoritaire).
   * Borné par les habilitations valides (1–MAX_LEVEL).
   */
  level: number;
  /** XP cumulée requise pour le niveau courant (seuil bas de la barre XP). */
  xpFloor: number;
  /** XP cumulée requise pour le niveau suivant ; null au niveau maximum. */
  xpNext: number | null;
  /** Missions en cours (timers serveur-autoritaires). */
  missions: ActiveMission[];
  /** Coordonnées (adresses) débloquées par les recherches terminées. */
  addresses: Address[];
}

/**
 * Mission en cours d'un joueur (action lancée, pas encore terminée). Les
 * horodatages sont en ms epoch, horloge serveur. La jauge côté client se calcule
 * à partir de `startedAt`/`endsAt` ; à `endsAt` dépassé, le Worker applique les
 * gains (complétion paresseuse) et retire la mission.
 */
export interface ActiveMission {
  actionId: string;
  /** Nom de l'action (pour l'affichage). */
  name: string;
  startedAt: number;
  endsAt: number;
  /** Durée totale en secondes (pour la jauge). */
  durationSec: number;
  /** Sous-mission lancée (résout les déblocages d'adresse à la complétion). */
  subMissionId?: string;
}

/** Corps de `POST /energy/spend`. */
export interface SpendEnergyRequest {
  /** Quantité à dépenser (> 0). Coût par défaut côté serveur si omis. */
  amount?: number;
  /** Libellé d'action optionnel (journal / anti-triche). */
  action?: string;
}

/** Réponse de `POST /energy/spend` en cas de succès. */
export interface SpendEnergyResponse extends EnergyState {
  /** Quantité réellement dépensée par cet appel. */
  spent: number;
}

/** Réponse d'erreur normalisée du Worker. */
export interface EnergyError {
  error: string;
  /** Présents pour 402 (énergie insuffisante). */
  available?: number;
  required?: number;
}

// === Actions =================================================================

/** Coût d'une action (déduit des ressources du joueur). */
export interface ActionCost {
  energy: number;
  electricity: number;
  artifacts: number;
}

/** Gains d'une action (ajoutés aux ressources ; artefacts = tirage aléatoire). */
export interface ActionGain {
  electricity: number;
  artifactsMin: number;
  artifactsMax: number;
  xp: number;
}

/** Section du dashboard où afficher la carte d'une action. */
export type ActionSection = 'sgcf' | 'missions';

/** Coordonnée (adresse) de la Porte des étoiles, débloquée par la recherche. */
export interface Address {
  id: string;
  name: string;
}

/**
 * Sous-mission rattachée à une action (révélée au dos de la carte). Pour
 * l'instant purement descriptive ; deviendra exécutable ultérieurement.
 */
export interface SubMission {
  id: string;
  name: string;
  /**
   * Visibilité/accessibilité côté joueur. Absent ou `true` = visible ;
   * `false` = masquée pour l'instant (déblocage sous conditions à venir).
   */
  available?: boolean;
  /**
   * Pool ordonné d'adresses que cette recherche peut débloquer. À chaque
   * complétion, le Worker débloque la PROCHAINE adresse non encore possédée.
   */
  unlocksAddresses?: Address[];
}

/**
 * Définition d'une action du catalogue (serveur-autoritaire, exposée par
 * `GET /actions`). `requiredLevel` et `requiredAddressStatus` sont conservés
 * comme données mais NE SONT PAS encore appliqués (systèmes d'XP/niveau et
 * d'adresses à venir).
 */
export interface ActionDef {
  id: string;
  name: string;
  /** Section du dashboard où afficher la carte ; null = pas encore placée. */
  section: ActionSection | null;
  /**
   * Si défini, cliquer la carte NAVIGUE vers cette vue du dashboard au lieu de
   * se retourner (flip). Ex. 'research'.
   */
  opensSection?: string;
  requiredLevel: number;
  requiredAddressStatus: string | null;
  cost: ActionCost;
  gain: ActionGain;
  description: string;
  /** Durée de la mission en secondes (le timer avant complétion). */
  durationSec: number;
  /** Sous-missions du thème, révélées au dos de la carte (peut être vide). */
  subMissions: SubMission[];
}

/**
 * Réponse de `POST /action/{id}` en cas de succès : l'action est DÉMARRÉE
 * (mission ajoutée à `state.missions`). Les gains sont appliqués à la
 * complétion du timer, pas ici.
 */
export interface PerformActionResult {
  /** État joueur à jour après le démarrage (mission en cours ajoutée). */
  state: PlayerState;
  /** Identifiant de l'action démarrée. */
  actionId: string;
}

// === Historique des actions ==================================================

/**
 * Résultat appliqué d'une action terminée : les gains RÉELLEMENT crédités au
 * joueur (après plafonnement des ressources et tirage aléatoire des artefacts).
 */
export interface ActionResultSummary {
  /** Électricité réellement gagnée (≥ 0, après plafond). */
  electricity: number;
  /** Artefacts réellement gagnés (tirage effectif, ≥ 0, après plafond). */
  artifacts: number;
  /** XP réellement gagnée (≥ 0). */
  xp: number;
  /** Adresse débloquée par cette action, le cas échéant. */
  addressUnlocked?: Address;
}

/**
 * Entrée du journal d'actions d'un joueur : une action TERMINÉE (timer écoulé,
 * gains appliqués). Sert de base serveur-autoritaire à l'attribution de
 * récompenses. Stockée dans le document KV du joueur, exposée via `GET /history`.
 */
export interface ActionHistoryEntry {
  /** Discriminant : action terminée. */
  type: 'action';
  /** Identifiant de l'action (catalogue). */
  actionId: string;
  /** Nom de l'action au moment de l'exécution (pour l'affichage). */
  name: string;
  /** Instant de complétion (ms epoch, horloge serveur). */
  timestamp: number;
  /** Niveau d'habilitation du joueur AU MOMENT de l'action (avant ses gains d'XP). */
  level: number;
  /** Résultat : gains réellement appliqués. */
  result: ActionResultSummary;
}

/**
 * Entrée du journal : PASSAGE DE NIVEAU du joueur, déclenché par le gain d'XP
 * d'une action terminée. Une entrée est ajoutée par niveau franchi (un saut de
 * deux niveaux d'un coup produit donc deux entrées).
 */
export interface LevelUpHistoryEntry {
  /** Discriminant : passage de niveau. */
  type: 'levelup';
  /** Niveau atteint. */
  level: number;
  /** Niveau précédent (= level - 1). */
  fromLevel: number;
  /** Instant du passage (ms epoch, = complétion de l'action déclenchante). */
  timestamp: number;
}

/** Entrée du journal : action terminée OU passage de niveau (union discriminée par `type`). */
export type HistoryEntry = ActionHistoryEntry | LevelUpHistoryEntry;

/** Réponse de `GET /history` : journal, de la plus ancienne à la plus récente. */
export type ActionHistoryResponse = HistoryEntry[];

/** Réponse d'erreur d'une action. */
export interface ActionError {
  error: string;
  /** Présents pour 402 (ressources insuffisantes). */
  cost?: ActionCost;
  have?: { energy: number; electricity: number; artifacts: number };
}
