/**
 * Classic attempt-order logic — blueprint v2 §9.1 (D2B 3-level tiebreak).
 *
 * Per ISF v5.1 §7.4.3 + D2B + powergage finding §3.7:
 *   1. declared weight ASC
 *   2. tiebreak A — bodyweight ASC if MeetState.lowerBodyweightFirstTiebreak === true,
 *                   otherwise lot-number / id surrogate (PowerGage's `LowerBWFirstOrderBy = 0`)
 *   3. tiebreak B — lastDeclarationAt ASC (earlier declaration lifts first)
 *   4. final fallback — name (deterministic)
 */

import type { Entry } from "@domain/models";

export type AttemptSequence = 1 | 2 | 3;
export type Side = "PU" | "DI";

export type OrderOptions = {
  exercise: Side;
  attemptSequence: AttemptSequence;
  /** From MeetState.lowerBodyweightFirstTiebreak. */
  lowerBodyweightFirstTiebreak: boolean;
};

/** Get declared weight for the active attempt; 0 if not declared yet. */
export function declaredWeightAt(
  entry: Entry,
  exercise: Side,
  sequence: AttemptSequence,
): number {
  const ex = entry.exercises[exercise];
  if (!ex || ex.format !== "classic") return 0;
  const att = ex.attempts.find((a) => a.sequence === sequence);
  return att?.declaredLoadKg ?? 0;
}

/** Get last declaration timestamp for the active attempt; null if never declared. */
export function lastDeclarationAt(
  entry: Entry,
  exercise: Side,
  sequence: AttemptSequence,
): string | null {
  const ex = entry.exercises[exercise];
  if (!ex || ex.format !== "classic") return null;
  const att = ex.attempts.find((a) => a.sequence === sequence);
  return att?.lastDeclarationAt ?? null;
}

/**
 * Compare two entries for Classic round-system attempt order.
 * Returns standard `Array.sort` comparator value (negative = a first).
 */
export function compareClassicOrder(
  a: Entry,
  b: Entry,
  opts: OrderOptions,
): number {
  // 1. declared weight ASC — primary ordering
  const wa = declaredWeightAt(a, opts.exercise, opts.attemptSequence);
  const wb = declaredWeightAt(b, opts.exercise, opts.attemptSequence);
  if (wa !== wb) return wa - wb;

  // 2. bodyweight ASC if toggle is set; otherwise id surrogate (lot-number stand-in for V1)
  if (opts.lowerBodyweightFirstTiebreak) {
    const bwa = a.bodyweightKg ?? Number.POSITIVE_INFINITY;
    const bwb = b.bodyweightKg ?? Number.POSITIVE_INFINITY;
    if (bwa !== bwb) return bwa - bwb;
  } else {
    // V1: stable surrogate by id (V2 will use real lot numbers when assigned).
    const cmp = a.id.localeCompare(b.id);
    if (cmp !== 0) return cmp;
  }

  // 3. lastDeclarationAt ASC — earlier declaration lifts first
  const la = lastDeclarationAt(a, opts.exercise, opts.attemptSequence);
  const lb = lastDeclarationAt(b, opts.exercise, opts.attemptSequence);
  if (la !== lb) {
    if (la === null) return 1; // never-declared lifts last among ties
    if (lb === null) return -1;
    return la.localeCompare(lb);
  }

  // 4. final fallback — name (deterministic)
  return a.name.localeCompare(b.name);
}

/**
 * Sort a flight of entries for the active Classic attempt round.
 * Returns a NEW array (does not mutate input).
 */
export function sortClassicAttemptOrder(
  entries: ReadonlyArray<Entry>,
  opts: OrderOptions,
): Entry[] {
  return [...entries].sort((a, b) => compareClassicOrder(a, b, opts));
}
