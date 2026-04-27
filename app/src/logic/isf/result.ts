/**
 * Result calculators — blueprint v2 §7.
 *
 * Two pure-function calculators (Classic + Multirep) implementing the shared
 * `ResultCalculator` interface from blueprint v2 §7.3 (REVISED for D16: forecast()).
 *
 * Per blueprint v2 §7.1 (Classic):
 *   - per-exercise result = best successful declared load
 *   - total result = bestPU + bestDI
 *   - result unit = kg
 *   - sequence === 4 (record-only) is excluded from "best" computation per D11
 *
 * Per blueprint v2 §7.2 (Multirep):
 *   - per-exercise result = counted reps from the single successful attempt
 *   - total result = repsPU + repsDI
 *   - result unit = reps
 */

import type {
  Entry,
  Exercise,
  CalculatedResult,
  ForecastResult,
} from "@domain/models";
import { attemptStatusFromVotes } from "./judge-votes";

/**
 * Common interface for result calculators.
 * blueprint v2 §7.3 (REVISED for D16 — forecast() added in V1, stubbed).
 */
export interface ResultCalculator {
  getExerciseResult(entry: Entry, exercise: Exercise): number;
  getTotal(entry: Entry): CalculatedResult;
  forecast(entry: Entry, allEntries: ReadonlyArray<Entry>): ForecastResult;
}

// ─── Classic ────────────────────────────────────────────────────────────────

/**
 * Best successful Classic attempt for one exercise. Returns 0 if no successful
 * attempt exists. Excludes sequence === 4 (record-only attempts per D11).
 */
export function getClassicBest(entry: Entry, exercise: Exercise): number {
  if (exercise !== "PU" && exercise !== "DI") return 0;
  const ex = entry.exercises[exercise];
  if (!ex || ex.format !== "classic") return 0;

  let best = 0;
  for (const att of ex.attempts) {
    if (att.sequence === 4) continue; // record-only; doesn't count toward best
    if (att.declaredLoadKg === null) continue;
    if (attemptStatusFromVotes(att.judgeVotes) !== "success") continue;
    if (att.declaredLoadKg > best) best = att.declaredLoadKg;
  }
  return best;
}

export class ClassicResultCalculator implements ResultCalculator {
  getExerciseResult(entry: Entry, exercise: Exercise): number {
    return getClassicBest(entry, exercise);
  }

  getTotal(entry: Entry): CalculatedResult {
    const pu = getClassicBest(entry, "PU");
    const di = getClassicBest(entry, "DI");
    return { unit: "kg", pu, di, total: pu + di };
  }

  /**
   * V1 stub per D16 — returns trivial values; full projection deferred to V2.
   * Interface is locked now so V2 only fills in real values, no schema break.
   */
  forecast(_entry: Entry, _allEntries: ReadonlyArray<Entry>): ForecastResult {
    return {
      predictedPlace: null,
      kgToFirstPlace: null,
      predictedAbsolutePlace: null,
      predictedCoefficient: null,
    };
  }
}

// ─── Multirep ───────────────────────────────────────────────────────────────

/**
 * Reps from the (single) successful Multirep attempt. Returns 0 if not yet
 * succeeded or reps not entered.
 */
export function getMultirepReps(entry: Entry, exercise: Exercise): number {
  if (exercise !== "PU" && exercise !== "DI") return 0;
  const ex = entry.exercises[exercise];
  if (!ex || ex.format !== "multirep") return 0;

  for (const att of ex.attempts) {
    if (attemptStatusFromVotes(att.judgeVotes) !== "success") continue;
    return att.reps ?? 0;
  }
  return 0;
}

export class MultirepResultCalculator implements ResultCalculator {
  getExerciseResult(entry: Entry, exercise: Exercise): number {
    return getMultirepReps(entry, exercise);
  }

  getTotal(entry: Entry): CalculatedResult {
    const pu = getMultirepReps(entry, "PU");
    const di = getMultirepReps(entry, "DI");
    return { unit: "reps", pu, di, total: pu + di };
  }

  forecast(_entry: Entry, _allEntries: ReadonlyArray<Entry>): ForecastResult {
    return {
      predictedPlace: null,
      kgToFirstPlace: null,
      predictedAbsolutePlace: null,
      predictedCoefficient: null,
    };
  }
}

/**
 * Factory: pick the right calculator for the entry's competition format.
 * V2 will swap this for a RulesPack-aware factory per D32.
 */
export function getResultCalculator(entry: Entry): ResultCalculator {
  switch (entry.competitionFormat) {
    case "classic":
      return new ClassicResultCalculator();
    case "multirep":
      return new MultirepResultCalculator();
    case "weighted_calisthenics":
      // Reserved per D35 — V2 work.
      throw new Error(
        "Weighted Calisthenics calculator is V2 scope; not implemented in V1.",
      );
  }
}
