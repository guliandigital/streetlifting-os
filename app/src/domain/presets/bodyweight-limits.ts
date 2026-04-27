/**
 * ISF v5.1 §10.9.5 additional points body-weight thresholds — D7 (decisions-v1).
 *
 * Verbatim:
 * > Body weight limits:
 * > Men: Pull-Up — 90 kg, Dip — 100 kg, Total (2 lifts) — 95 kg
 * > Women: Pull-Up — 55 kg, Dip — 65 kg, Total (2 lifts) — 60 kg
 * > Bonus formula: Additional Points = (Bodyweight − Limit) × 0.5
 * > If Bodyweight ≤ Limit, then Additional Points = 0.
 *
 * Applies to Classic only (not Multirep, not WC).
 */

import type { Sex, Event } from "../models/enums";

export type BodyweightLimits = { PU: number; DI: number; PUDI: number };

export const ISF_V51_BW_LIMITS: Readonly<Record<"M" | "F", BodyweightLimits>> =
  {
    M: { PU: 90, DI: 100, PUDI: 95 },
    F: { PU: 55, DI: 65, PUDI: 60 },
  };

/**
 * Compute additional-points bonus for Classic per ISF v5.1 §10.9.5.
 * Returns 0 for non-Classic events / unsupported sex.
 */
export function additionalPoints(
  sex: Sex,
  event: Event,
  bodyweightKg: number,
): number {
  if (sex !== "M" && sex !== "F") return 0;
  if (event !== "PU" && event !== "DI" && event !== "PUDI") return 0;
  const limit = ISF_V51_BW_LIMITS[sex][event];
  return Math.max(0, (bodyweightKg - limit) * 0.5);
}
