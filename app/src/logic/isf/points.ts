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
 * NOTE: V1 ships `isf_abs_coef` as a stub returning 1.0 for all inputs (TODO: extract
 * the real coefficient table from streetlifting.ru/points/ — D1). Once the table lands
 * the only change is data, not shape.
 */

import type {
  Entry,
  Event,
  Sex,
  IsfPointBreakdown,
} from "@domain/models";
import { additionalPoints } from "@domain/presets";
import { ageInYears, mastersMultiplier, resolveAgeCategory } from "./age";
import {
  ClassicResultCalculator,
  MultirepResultCalculator,
} from "./result";

/**
 * V1 STUB for ISF absolute-coefficient lookup table.
 *
 * Source of truth: https://streetlifting.ru/points/ (D1). The real table is a
 * 4-D lookup over (sex × exercise × bodyweightKg) returning a multiplier. Until
 * extracted, this stub returns 1.0 — points calculations are structurally
 * correct but absolute values are placeholders.
 *
 * TODO Sprint 2: scrape streetlifting.ru/points/ → ship as a TS constant or
 * JSON in src/domain/presets/isf-coefficients.ts.
 */
function isfAbsCoef(
  _bodyweightKg: number,
  _event: Event,
  _sex: Sex,
): number {
  return 1.0;
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
