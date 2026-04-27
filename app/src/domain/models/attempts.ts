/**
 * Attempt models — REVISED per D15 (decisions-v2): status replaced by judgeVotes.
 *
 * blueprint v2 §6.6 (ClassicAttempt) and §6.7 (MultirepAttempt).
 */

import type { Exercise } from "./enums";
import type { JudgeVotes } from "./judge-votes";

/**
 * Classic attempt — 3 main attempts + 1 record-only slot per ISF v5.1 §7.4.7.
 *
 * Per D15: `status` is NEVER stored. Computed via attemptStatusFromVotes(judgeVotes).
 * Per D11: sequence === 4 is record-only (does not count toward total/placing).
 * Per D2B: lastDeclarationAt is the 3rd-level draw tiebreak.
 * Per D9: changesUsedInRound caps weight changes per ISF v5.1 §7.4.6 (R1: 1, R2: 0, R3: 2).
 */
export type ClassicAttempt = {
  sequence: 1 | 2 | 3 | 4;
  declaredLoadKg: number | null;
  judgeVotes: JudgeVotes;
  /** ISO 8601 timestamp of latest declaration; null if never declared. */
  lastDeclarationAt: string | null;
  changesUsedInRound: number;
  /** Only true for sequence === 4 attempts (record-only). */
  isRecordAttempt?: boolean;
};

/**
 * Multirep attempt — single attempt with timer + reps count per ISF v5.1 §7.5.1 (120s timer).
 */
export type MultirepAttempt = {
  sequence: 1;
  presetLoadKg: number | null;
  reps: number | null;
  judgeVotes: JudgeVotes;
  /** Default 120s per D10 (ISF v5.1 §7.5.1 Multirep timer). */
  durationSec: number;
  /** Optional count of judge-flagged "no rep" sub-events during the attempt. */
  noRepCount?: number;
};

/**
 * Discriminated union representing one exercise's attempt sheet within an Entry.
 * The `format` discriminator picks the attempt model.
 */
export type ExerciseResult =
  | { format: "classic"; exercise: Exercise; attempts: ClassicAttempt[] }
  | { format: "multirep"; exercise: Exercise; attempts: MultirepAttempt[] };
