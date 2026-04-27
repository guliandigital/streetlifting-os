/**
 * Entry — one athlete-meet record. blueprint v2 §6.9 (REVISED).
 *
 * V1 keeps the flat shape (no Athlete↔Nomination split per D13 — that's V2 work).
 * Added vs blueprint v1: disciplineCode (D24), country (athlete-catalog finding),
 * reweighKg (D2A.2).
 */

import type { CompetitionFormat, Event, Sex, Division } from "./enums";
import type { DisciplineCode } from "./discipline";
import type { AgeCategoryCode } from "./age-category";
import type { ExerciseResult } from "./attempts";

export type Entry = {
  id: string;
  competitionFormat: CompetitionFormat;
  /** Foreign key to discipline catalog (D24). */
  disciplineCode: DisciplineCode;
  event: Event;

  day: number;
  platform: number;
  /** V1 only: ad-hoc string label. V2 introduces Stream/Group entities (D14). */
  flight: string;

  name: string;
  sex: Sex;
  birthDate: string | null;
  /** Operator override for age in years; takes precedence over birthDate-derived age. */
  ageOverride: number | null;

  division: Division;
  team?: string;
  memberId?: string;
  guest: boolean;
  instagram?: string;
  notes?: string;

  /** Athlete's country (ISO 3166-1 alpha-2 or full name). Per PowerTable athlete schema. */
  country: string | null;

  bodyweightKg: number | null;
  /** Optional second weigh-in for placing tiebreak per D2A.2 (ISF v5.1 §7.10.2). */
  reweighKg: number | null;
  assignedAgeCategoryCode?: AgeCategoryCode;
  /** Foreign key into MeetState.weightCategories (matches WeightCategory.code). */
  assignedWeightCategoryCode?: string;

  exercises: {
    PU?: ExerciseResult;
    DI?: ExerciseResult;
    // V2 additions for WC: MU?, SQ?
  };
};
