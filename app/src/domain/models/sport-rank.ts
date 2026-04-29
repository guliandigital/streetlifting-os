/**
 * Sport-rank standards.
 *
 * The actual ISF classification table is a federation data artifact, not a
 * competition-rule constant. V2 loads it through RulesPack data; this model is
 * deliberately generic enough for ISF and partner federations.
 */

import type { AgeCategoryCode } from "./age-category";
import type { DisciplineCode } from "./discipline";
import type { Division, Sex } from "./enums";

export type SportRankMetric =
  | "classic_total_kg"
  | "classic_isf_points"
  | "multirep_total_reps"
  | "multirep_isf_points";

export type SportRankStandard = {
  code: string;
  label: string;
  labelRu: string;
  /** Higher priority wins when multiple standards match. */
  priority: number;
  metric: SportRankMetric;
  minValue: number;
  disciplineCodes?: DisciplineCode[];
  sex?: Sex;
  divisions?: Division[];
  ageCategoryCodes?: AgeCategoryCode[];
  weightCategoryCodes?: string[];
};

export type SportRankEvaluationInput = {
  disciplineCode: DisciplineCode;
  sex: Sex;
  division: Division;
  ageCategoryCode: AgeCategoryCode | null;
  weightCategoryCode: string | null;
  metricValues: Partial<Record<SportRankMetric, number>>;
};

export type SportRankAchievement = {
  standard: SportRankStandard;
  achievedValue: number;
};
