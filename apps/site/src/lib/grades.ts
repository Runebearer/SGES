// Catalogue des GRADES (récompenses liées à la montée de niveau).
//
// Récompenses purement cosmétiques et DÉRIVÉES du niveau : « débloqué » se
// calcule à la volée depuis `player.level` (déjà serveur-autoritaire) — donc
// pas d'état par joueur, pas de claim, pas de Durable Object. Les futures
// récompenses-ressources / feature-access, elles, passeront par le Worker.
//
// Structure issue du JSON fourni (clés renommées en anglais). La condition est
// volontairement générique (`field`/`operator`/`value`) pour rester extensible
// à d'autres critères que le niveau plus tard.

import type { PlayerState } from '@sges/api-contract';

export type RewardCategory = 'grade';

export interface RewardCondition {
  field: 'level'; // extensible : 'xp', 'artifacts'…
  operator: '>='; // extensible
  value: number;
}

export interface Grade {
  id: string;
  name: string;
  image: string;
  category: RewardCategory;
  conditions: RewardCondition[];
}

// Dossier des illustrations de grades (à déposer dans public/rewards/grades/).
const IMG = (file: string) => `/rewards/grades/${file}`;

export const GRADES: Grade[] = [
  { id: 'mdr', name: 'Militaire du rang', image: IMG('militdr.png'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 1 }] },
  { id: 'av2', name: 'Aviateur de 2ème classe (AV2)', image: IMG('grade_av2.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 1 }] },
  { id: 'av1', name: 'Aviateur de 1ère classe (AV1)', image: IMG('grade_av1.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 5 }] },
  { id: 'cal', name: 'Caporal (CAL)', image: IMG('grade_cal.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 10 }] },
  { id: 'clc', name: 'Caporal-chef (CLC)', image: IMG('grade_clc.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 15 }] },
  { id: 'eso', name: 'Élève sous-officier (ESO)', image: IMG('grade_eso.png'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 21 }] },
  { id: 'sgt', name: 'Sergent (SGT)', image: IMG('grade_sgt.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 26 }] },
  { id: 'sgc', name: 'Sergent-chef (SGC)', image: IMG('grade_sgc.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 32 }] },
  { id: 'adj', name: 'Adjudant (ADJ)', image: IMG('grade_adj.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 38 }] },
  { id: 'adc', name: 'Adjudant-chef (ADC)', image: IMG('grade_adc.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 44 }] },
  { id: 'maj', name: 'Major (MAJ)', image: IMG('grade_maj.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 50 }] },
  { id: 'eo', name: 'Élève-officier (EO)', image: IMG('grade_eo.png'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 51 }] },
  { id: 'asp', name: 'Aspirant (ASP)', image: IMG('grade_asp.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 55 }] },
  { id: 'slt', name: 'Sous-lieutenant (SLT)', image: IMG('grade_slt.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 60 }] },
  { id: 'ltn', name: 'Lieutenant (LTN)', image: IMG('grade_ltn.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 65 }] },
  { id: 'cne', name: 'Capitaine (CNE)', image: IMG('grade_cne.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 70 }] },
  { id: 'cba', name: 'Commandant (CBA)', image: IMG('grade_cba.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 71 }] },
  { id: 'lcl', name: 'Lieutenant-colonel (LCL)', image: IMG('grade_lcl.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 76 }] },
  { id: 'col', name: 'Colonel (COL)', image: IMG('grade_col.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 81 }] },
  { id: 'gba', name: 'Général de brigade aérienne (GBA)', image: IMG('grade_gba.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 86 }] },
  { id: 'gda', name: 'Général de division aérienne (GDA)', image: IMG('grade_gda.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 90 }] },
  { id: 'gca', name: 'Général de corps aérien (GCA)', image: IMG('grade_gca.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 94 }] },
  { id: 'gaa', name: "Général d'armée aérienne (GAA)", image: IMG('grade_gaa.svg'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 98 }] },
  { id: 'mdf', name: 'Maréchal de France', image: IMG('grade_mdf.png'), category: 'grade', conditions: [{ field: 'level', operator: '>=', value: 100 }] },
];

// Évalue une condition contre l'état joueur (serveur-autoritaire).
function meets(cond: RewardCondition, player: PlayerState): boolean {
  const actual = cond.field === 'level' ? player.level : 0;
  switch (cond.operator) {
    case '>=':
      return actual >= cond.value;
    default:
      return false;
  }
}

/** Un grade est débloqué si TOUTES ses conditions sont remplies. */
export function isGradeUnlocked(grade: Grade, player: PlayerState | null): boolean {
  if (!player) return false;
  return grade.conditions.every((c) => meets(c, player));
}

/** Niveau requis (1re condition `level`), pour l'affichage « Niveau X ». */
export function gradeLevel(grade: Grade): number {
  return grade.conditions.find((c) => c.field === 'level')?.value ?? 0;
}
