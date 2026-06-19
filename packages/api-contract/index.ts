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

/**
 * Définition d'une action du catalogue (serveur-autoritaire, exposée par
 * `GET /actions`). `requiredLevel` et `requiredAddressStatus` sont conservés
 * comme données mais NE SONT PAS encore appliqués (systèmes d'XP/niveau et
 * d'adresses à venir).
 */
export interface ActionDef {
  id: string;
  name: string;
  requiredLevel: number;
  requiredAddressStatus: string | null;
  cost: ActionCost;
  gain: ActionGain;
  description: string;
}

/** Réponse de `POST /action/{id}` en cas de succès. */
export interface PerformActionResult {
  /** État joueur à jour après l'action. */
  state: PlayerState;
  /** Identifiant de l'action effectuée. */
  actionId: string;
  /** Gains réellement appliqués (artefacts = valeur tirée dans [min, max]). */
  gained: { electricity: number; artifacts: number; xp: number };
}

/** Réponse d'erreur d'une action. */
export interface ActionError {
  error: string;
  /** Présents pour 402 (ressources insuffisantes). */
  cost?: ActionCost;
  have?: { energy: number; electricity: number; artifacts: number };
}
