/**
 * MeetState + sub-configs. blueprint v2 §6.10 (REVISED).
 *
 * V1: ISF v5.1 hardcoded; V2 will introduce RulesPack abstraction (per D32, decisions-v3)
 * — the type shapes here are the "flattened" view that V2's RulesPack-aware code will
 * project from a Pack at meet creation time.
 */

import type { CompetitionFormat, Sex, Division, Exercise } from "./enums";
import type { DisciplineCode } from "./discipline";
import type { AgeCategory, AgeCategoryCode } from "./age-category";
import type { WeightCategory } from "./weight-category";
import type { Plate } from "./plate";
import type { RulesPackRef } from "./rules-pack";

export type ClassicLoadConfig = {
  useBeltLoading: boolean;
  plates: Plate[];
  /** ISF v5.1 §7.5.1 Classic timer = 60s per D10. */
  defaultAttemptDurationSec: number;
};

export type MultirepPreset = {
  sex: Sex;
  exercise: Exercise;
  /** Required per D3 — division differs across multirep two-lift presets. */
  division: Division;
  /** Required per D3 — preset loads vary by age group (sub-jr / open / pro). */
  ageCategoryCodes: AgeCategoryCode[];
  loadKg: number;
};

export type MultirepConfig = {
  /** ISF v5.1 §7.5.1 Multirep timer = 120s per D10. */
  defaultAttemptDurationSec: number;
  presetLoads: MultirepPreset[];
};

export type ScoringFormula = "ISF_POINTS" | "RESULT" | "RESULT_X_COEFFICIENT";

export type MeetState = {
  name: string;
  federation: string;
  country: string;
  state: string;
  city: string;
  date: string;

  /** Pinned rules artifact used to create/validate this meet. */
  rulesPackRef: RulesPackRef;

  competitionFormat: CompetitionFormat;
  /** Per D24: discipline catalog selector for this meet. Empty = all enabled by default. */
  enabledDisciplineCodes: DisciplineCode[];
  divisions: Division[];
  ageCategories: AgeCategory[];
  weightCategories: WeightCategory[];

  formula: ScoringFormula;
  useMastersAdjustment: boolean;
  /**
   * Per D2A + powergage finding §6: when true, ties are broken by lighter bodyweight first
   * vs lot-number. Toggle borrowed from PowerGage's `LowerBWFirstOrderBy` global parameter.
   */
  lowerBodyweightFirstTiebreak: boolean;

  inKg: true;
  showAlternateUnits: boolean;

  classicLoadConfig?: ClassicLoadConfig;
  multirepConfig?: MultirepConfig;
};
