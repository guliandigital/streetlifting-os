/**
 * Discipline catalog (D24, decisions-v2).
 *
 * V1 ships 19 ISF disciplines (3 Classic + 16 Multirep). V2 will add WC disciplines
 * once Weighted Calisthenics launches (per D35).
 */

import type { CompetitionFormat, Event, FormulaCode } from "./enums";

/**
 * Stable, machine-readable discipline codes per D24.
 * V3+ reserved (not in V1 catalog): "wc_multiathlon", "wc_muscleup_bar",
 * "wc_muscleup_ring", "wc_squat".
 */
export type DisciplineCode =
  // Classic — formula = isf_points
  | "classic_2lift"
  | "classic_pu"
  | "classic_di"
  // Multirep two-lift — formula = result_x_coefficient
  | "multirep_2lift_8_12"
  | "multirep_2lift_8_16"
  | "multirep_2lift_12_16"
  | "multirep_2lift_16_24"
  | "multirep_2lift_24_32"
  | "multirep_2lift_32_48"
  // Multirep single-lift PU
  | "multirep_pu_8"
  | "multirep_pu_12"
  | "multirep_pu_16"
  | "multirep_pu_24"
  | "multirep_pu_32"
  // Multirep single-lift DI
  | "multirep_di_12"
  | "multirep_di_16"
  | "multirep_di_24"
  | "multirep_di_32"
  | "multirep_di_48";

export type Discipline = {
  code: DisciplineCode;
  labelRu: string;
  labelEn: string;
  competitionFormat: CompetitionFormat;
  event: Event;
  /** For multirep disciplines: required preset load(s) per ISF v5.1 §2.2. */
  presetLoadKg?: { PU?: number; DI?: number };
  formula: FormulaCode;
};
