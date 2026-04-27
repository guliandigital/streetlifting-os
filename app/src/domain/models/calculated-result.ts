/**
 * Result-calculator output shapes — blueprint v2 §7.3 + §7.4 (REVISED for D16).
 */

import type { ResultUnit } from "./enums";

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
