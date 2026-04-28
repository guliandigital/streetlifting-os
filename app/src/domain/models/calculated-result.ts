/**
 * Result-calculator output shapes — blueprint v2 §7.3 + §7.4 (REVISED for D16).
 */

import type {
  Event,
  Exercise,
  ResultUnit,
  Sex,
} from "./enums";
import type { AgeCategoryCode } from "./age-category";
import type { DisciplineCode } from "./discipline";

export type CalculatedResult = {
  unit: ResultUnit;
  pu: number;
  di: number;
  total: number;
};

/**
 * Forecast columns per D16 (decisions-v2). V1 ships a stub returning current values
 * + nulls for projection fields; V2 implements true projection over remaining attempts.
 */
export type ForecastResult = {
  predictedPlace: number | null;
  kgToFirstPlace: number | null;
  predictedAbsolutePlace: number | null;
  predictedCoefficient: number | null;
};

/** ISF points decomposition per blueprint v2 §8.3. */
export type IsfPointBreakdown = {
  coefficient: number;
  basePoints: number;
  /** Per D7: (bodyweight − limit) × 0.5 if bw > limit, else 0. Classic only. */
  additionalPoints: number;
  finalPoints: number;
};

export type MultirepAttemptResultStatus =
  | "pending"
  | "success"
  | "fail"
  | "not_started";

export type MultirepExerciseResultContract = {
  exercise: Exercise;
  presetLoadKg: number | null;
  reps: number;
  noRepCount: number;
  durationSec: number;
  status: MultirepAttemptResultStatus;
};

/**
 * Serializable Multirep result contract for result/export/display integrations.
 *
 * It intentionally contains no Entry object and no UI-only fields, so exports can
 * consume it without depending on table row internals.
 */
export type MultirepResultContract = {
  format: "multirep";
  entryId: string;
  entryIndex: number;
  athleteName: string;
  disciplineCode: DisciplineCode;
  event: Event;
  sex: Sex;
  bodyweightKg: number | null;
  ageCategoryCode: AgeCategoryCode | null;
  weightCategoryCode: string | null;
  guest: boolean;
  exercises: MultirepExerciseResultContract[];
  puReps: number;
  diReps: number;
  totalReps: number;
  noRepCount: number;
  isfCoefficient: number;
  isfFinalPoints: number;
  place: number | null;
  tiedWithPrev: boolean;
  vacantNextPlace: boolean;
  attemptStatus: MultirepAttemptResultStatus;
};
