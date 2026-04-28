/**
 * Test fixtures + builder helpers — used across multiple test files to construct
 * Entry / ClassicAttempt / MultirepAttempt fixtures without verbose object-literal noise.
 */

import type {
  ClassicAttempt,
  Entry,
  ExerciseResult,
  JudgeVotes,
  MultirepAttempt,
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
 * Build a Multirep multirep_2lift_24_32 entry with sane defaults.
 *
 * Defaults: male, 80 kg, division=amateur, format=multirep, event=PUDI,
 * disciplineCode=multirep_2lift_24_32 (the standard M-Open two-lift discipline).
 */
export function buildMultirepEntry(
  name: string,
  overrides: EntryOverrides = {},
): Entry {
  const base: Entry = {
    id: nextId(),
    competitionFormat: "multirep",
    disciplineCode: "multirep_2lift_24_32",
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

export function multirepAttempt(
  presetLoadKg: number | null,
  reps: number | null,
  votes: JudgeVotes = VOTES_PENDING,
  durationSec = 120,
): MultirepAttempt {
  return {
    sequence: 1,
    presetLoadKg,
    reps,
    judgeVotes: votes,
    durationSec,
  };
}

export function multirepExercise(
  exercise: "PU" | "DI",
  attempts: MultirepAttempt[],
): ExerciseResult {
  return { format: "multirep", exercise, attempts };
}
