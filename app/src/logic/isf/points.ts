/**
 * ISF points service — blueprint v2 §8 (REVISED for D6 + D26 + D7).
 *
 * Pipeline (per ISF v5.1 §10.9 + D6/D7 + PowerGage CALC_PTS evidence):
 *   1. coefficient = isf_abs_coef(bodyweight, exercise, sex)
 *   2. basePoints  = result × coefficient
 *   3. mastersAdj  = mastersMultiplier(ageCategory)
 *   4. additional  = additionalPoints(sex, event, bw)   // Classic only per D7
 *   5. final       = basePoints × mastersAdj + additional
 *
 * ISF absolute coefficient formula (source: streetlifting.ru/points/):
 *   ISF Coefficient = 100 / (A − B × e^(−C × bodyweightKg))
 * where A, B, C constants are tabulated by (sex × event).
 */

import type {
  Entry,
  Event,
  IsfPointBreakdown,
} from "@domain/models";
import { additionalPoints } from "@domain/presets";
import { ageInYears, mastersMultiplier, resolveAgeCategory } from "./age";
import {
  ClassicResultCalculator,
  MultirepResultCalculator,
} from "./result";

/**
 * ISF absolute-coefficient constants per (sex × event).
 * Source: https://streetlifting.ru/points/
 * Formula: ISF Coefficient = 100 / (A − B × e^(−C × bodyweightKg))
 */
const ISF_COEF_PARAMS: Record<string, { A: number; B: number; C: number }> = {
  "M:PU":   { A: 320.98, B: 281.40, C: 0.01008 },
  "M:DI":   { A: 381.22, B: 733.79, C: 0.02398 },
  "M:PUDI": { A: 799.82, B: 681.45, C: 0.00614 },
  "F:PU":   { A: 142.40, B: 442.53, C: 0.04724 },
  "F:DI":   { A: 221.82, B: 357.00, C: 0.02937 },
  "F:PUDI": { A: 406.89, B: 697.06, C: 0.02032 },
};

/**
 * ISF absolute coefficient lookup.
 *
 * Source: https://streetlifting.ru/points/ (D1).
 * Formula: ISF Coefficient = 100 / (A − B × e^(−C × bodyweightKg))
 *
 * Returns 1.0 fallback for unsupported events (MU, SQ, etc.) or sex = OPEN.
 */
function isfAbsCoef(
  bodyweightKg: number,
  event: Event,
  sex: "M" | "F",
): number {
  const eventKey = event === "PU" ? "PU" : event === "DI" ? "DI" : event === "PUDI" ? "PUDI" : null;
  if (!eventKey) return 1.0; // fallback for unsupported events (MU, SQ, etc.)
  const key = `${sex}:${eventKey}`;
  const p = ISF_COEF_PARAMS[key];
  if (!p) return 1.0;
  const { A, B, C } = p;
  const denom = A - B * Math.exp(-C * bodyweightKg);
  if (denom <= 0) return 0; // protect against division by zero/negative
  return 100 / denom;
}

/**
 * Resolve the masters multiplier for an entry, honouring the operator's explicit
 * `assignedAgeCategoryCode` first, then deriving from birthDate / ageOverride.
 */
function resolveMastersMultiplier(entry: Entry, meetDate: string): number {
  if (entry.assignedAgeCategoryCode) {
    return mastersMultiplier(entry.assignedAgeCategoryCode);
  }

  let age: number | null = null;
  if (entry.ageOverride !== null) {
    age = entry.ageOverride;
  } else if (entry.birthDate !== null) {
    age = ageInYears(entry.birthDate, meetDate);
  }
  if (age === null) return 1.0;

  const cat = resolveAgeCategory(age);
  return cat ? mastersMultiplier(cat.code) : 1.0;
}

/**
 * Resolve the result (kg for Classic, reps for Multirep) for the requested event.
 */
function resolveResult(entry: Entry, event: Event): number {
  const calc =
    entry.competitionFormat === "classic"
      ? new ClassicResultCalculator()
      : new MultirepResultCalculator();
  const totals = calc.getTotal(entry);
  switch (event) {
    case "PU":
      return totals.pu;
    case "DI":
      return totals.di;
    case "PUDI":
      return totals.total;
    // V2 events (MU / SQ / MUPDISQ) — not in V1 scope.
    default:
      return 0;
  }
}

export class IsfPointsService {
  /**
   * Compute the ISF point breakdown for one entry on one event.
   * @param meetDate ISO 8601 date used for age resolution when birthDate is set.
   */
  calculate(
    entry: Entry,
    event: Event,
    meetDate: string,
  ): IsfPointBreakdown {
    const result = resolveResult(entry, event);
    const bw = entry.bodyweightKg ?? 0;
    const sex = entry.sex;

    // Sex must be M or F for the formula; OPEN entries get neutral fallback.
    if (sex !== "M" && sex !== "F") {
      return {
        coefficient: 1,
        basePoints: result,
        additionalPoints: 0,
        finalPoints: result,
      };
    }

    const coefficient = isfAbsCoef(bw, event, sex);
    const basePoints = result * coefficient;
    const mastersAdj = resolveMastersMultiplier(entry, meetDate);

    // Additional points apply only to Classic (D7 + ISF v5.1 §10.9.5).
    const addPts =
      entry.competitionFormat === "classic"
        ? additionalPoints(sex, event, bw)
        : 0;

    const finalPoints = basePoints * mastersAdj + addPts;

    return {
      coefficient,
      basePoints,
      additionalPoints: addPts,
      finalPoints,
    };
  }
}
