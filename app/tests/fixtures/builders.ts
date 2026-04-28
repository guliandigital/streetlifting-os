/**
 * Test fixtures + builder helpers — used across multiple test files to construct
 * Entry / ClassicAttempt / MultirepAttempt fixtures without verbose object-literal noise.
 */

import type {
  ClassicAttempt,
  MultirepAttempt,
  Entry,
  ExerciseResult,
  JudgeVotes,
} from "@domain/models";
import { PENDING_VOTES } from "@domain/models";

/** All-true unanimous good lift (3-0). */
export const VOTES_GOOD: JudgeVotes = {
  left: true,
  center: true,
  right: true,
};
/** All-false unanimous no lift (0-3). */
export const VOTES_NO: JudgeVotes = {
  left: false,
  center: false,
  right: false,
};
/** Pending — no decisions yet. */
export const VOTES_PENDING: JudgeVotes = PENDING_VOTES;

export function classicAttempt(
  sequence: 1 | 2 | 3 | 4,
  loadKg: number | null,
  votes: JudgeVotes = VOTES_PENDING,
  declaredAt: string | null = null,
): ClassicAttempt {
  return {
    sequence,
    declaredLoadKg: loadKg,
    judgeVotes: votes,
    lastDeclarationAt: declaredAt,
    changesUsedInRound: 0,
    isRecordAttempt: sequence === 4,
  };
}

export function classicExercise(
  exercise: "PU" | "DI",
  attempts: ClassicAttempt[],
): ExerciseResult {
  return { format: "classic", exercise, attempts };
}

export function multirepAttempt(
  reps: number | null,
  votes: JudgeVotes = VOTES_PENDING,
  presetLoadKg: number | null = null,
  noRepCount?: number,
): MultirepAttempt {
  const att: MultirepAttempt = {
    sequence: 1,
    presetLoadKg,
    reps,
    judgeVotes: votes,
    durationSec: 120,
  };
  if (noRepCount !== undefined) att.noRepCount = noRepCount;
  return att;
}

export function multirepExercise(
  exercise: "PU" | "DI",
  attempts: MultirepAttempt[],
): ExerciseResult {
  return { format: "multirep", exercise, attempts };
}

export type EntryOverrides = Partial<Entry>;

let _idCounter = 0;
function nextId(): string {
  _idCounter += 1;
  return `ent-${String(_idCounter).padStart(4, "0")}`;
}

/**
 * Build a Classic entry with sane defaults. Override any field via the second arg.
 *
 * Defaults: male, 80 kg bodyweight, no birthDate, division=amateur, classic_2lift discipline.
 */
export function buildClassicEntry(
  name: string,
  overrides: EntryOverrides = {},
): Entry {
  const base: Entry = {
    id: nextId(),
    competitionFormat: "classic",
    disciplineCode: "classic_2lift",
    event: "PUDI",
    day: 1,
    platform: 1,
    flight: "A",
    name,
    sex: "M",
    birthDate: null,
    ageOverride: null,
    division: "amateur",
    guest: false,
    country: null,
    bodyweightKg: 80,
    reweighKg: null,
    exercises: {},
  };
  return { ...base, ...overrides };
}

/**
 * Build a Multirep entry with sane defaults. Override any field via the second arg.
 *
 * Defaults: male, 80 kg bodyweight, no birthDate, division=amateur, multirep_2lift_16_24.
 */
export function buildMultirepEntry(
  name: string,
  overrides: EntryOverrides = {},
): Entry {
  const base: Entry = {
    id: nextId(),
    competitionFormat: "multirep",
    disciplineCode: "multirep_2lift_16_24",
    event: "PUDI",
    day: 1,
    platform: 1,
    flight: "A",
    name,
    sex: "M",
    birthDate: null,
    ageOverride: null,
    division: "amateur",
    guest: false,
    country: null,
    bodyweightKg: 80,
    reweighKg: null,
    exercises: {},
  };
  return { ...base, ...overrides };
}
