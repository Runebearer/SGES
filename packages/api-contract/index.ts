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
  /**
   * Points d'expérience (accumulateur ≥ 0). Le niveau d'habilitation
   * (authLevel) reste géré séparément dans Firestore : aucun lien automatique.
   */
  xp: number;
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
