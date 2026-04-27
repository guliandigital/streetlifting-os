/**
 * ISF v5.1 default plate set — D25 (decisions-v2), supersedes D8 (decisions-v1).
 *
 * Source: PowerTable «Диски» visualization + ISF v5.1 §6.6 colors.
 *
 * Standard ISF set: 25, 20, 15, 10, 5 kg with §6.6 colors.
 * Additional: 2.5 kg (smallest standard), 1.25 kg (smallest required for plate-increment validation).
 * Record-only plates: 50 / 2 / 1.5 / 1 / 0.75 / 0.5 / 0.25 kg.
 *
 * Plate-increment validation per ISF v5.1 §7: total weight must be a multiple of 1.25 kg
 * unless the attempt is flagged isRecordAttempt.
 */

import type { Plate } from "../models/plate";

export const ISF_V51_DEFAULT_PLATES: ReadonlyArray<Plate> = [
  // Record-only top-end:
  { weightKg: 50, pairCount: 0, color: "green", recordOnly: true },

  // Standard ISF v5.1 §6.6 set with canonical colors:
  { weightKg: 25, pairCount: 4, color: "red" },
  { weightKg: 20, pairCount: 2, color: "blue" },
  { weightKg: 15, pairCount: 2, color: "yellow" },
  { weightKg: 10, pairCount: 2, color: "green" },
  { weightKg: 5, pairCount: 2, color: "white" },
  { weightKg: 2.5, pairCount: 2, color: "black" },

  // Smallest plate required for the 1.25 kg increment rule:
  { weightKg: 1.25, pairCount: 2, color: "gray" },

  // Record-only fractional plates (do not count for increment validation):
  { weightKg: 2, pairCount: 1, color: "gray", recordOnly: true },
  { weightKg: 1.5, pairCount: 1, color: "gray", recordOnly: true },
  { weightKg: 1, pairCount: 1, color: "gray", recordOnly: true },
  { weightKg: 0.75, pairCount: 1, color: "gray", recordOnly: true },
  { weightKg: 0.5, pairCount: 1, color: "gray", recordOnly: true },
  { weightKg: 0.25, pairCount: 1, color: "gray", recordOnly: true },
];

/** ISF v5.1 §7: total belt weight must be a multiple of this (kg) unless recording. */
export const ISF_V51_PLATE_INCREMENT_KG = 1.25;
