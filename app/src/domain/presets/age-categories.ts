/**
 * ISF v5.1 age categories — D27 (decisions-v2).
 *
 * CRITICAL CORRECTNESS: M5 covers 60–69 inclusive, M6 covers 70+ — per ISF v5.1 §10.9.4.
 * Both PowerGage and PowerTable encode the pre-v5.1 single 60+ band → 1.125 multiplier.
 * Streetlifting OS is the only product that scores 70+ correctly with M6 → 1.150.
 *
 * Test fixtures must include boundary tests at ages 60, 69, 70, 80 to prove M5/M6 split.
 */

import type { AgeCategory } from "../models/age-category";

export const ISF_V51_AGE_CATEGORIES: ReadonlyArray<AgeCategory> = [
  {
    code: "open",
    label: "Open",
    labelRu: "Open",
    minAge: 13,
    maxAge: null,
    ratingEligible: true,
  },
  {
    code: "youth",
    label: "Sub-Juniors",
    labelRu: "Юноши",
    minAge: 13,
    maxAge: 17,
    ratingEligible: true,
  },
  {
    code: "junior",
    label: "Juniors",
    labelRu: "Юниоры",
    minAge: 18,
    maxAge: 22,
    ratingEligible: true,
  },
  {
    code: "masters_m1",
    label: "Masters M1",
    labelRu: "Masters M1",
    minAge: 40,
    maxAge: 44,
    ratingEligible: true,
  },
  {
    code: "masters_m2",
    label: "Masters M2",
    labelRu: "Masters M2",
    minAge: 45,
    maxAge: 49,
    ratingEligible: true,
  },
  {
    code: "masters_m3",
    label: "Masters M3",
    labelRu: "Masters M3",
    minAge: 50,
    maxAge: 54,
    ratingEligible: true,
  },
  {
    code: "masters_m4",
    label: "Masters M4",
    labelRu: "Masters M4",
    minAge: 55,
    maxAge: 59,
    ratingEligible: true,
  },
  {
    code: "masters_m5",
    label: "Masters M5",
    labelRu: "Masters M5",
    minAge: 60,
    // CORRECT vs PowerTable (60–99) and PowerGage (60+ as single band):
    maxAge: 69,
    ratingEligible: true,
  },
  {
    code: "masters_m6",
    label: "Masters M6",
    labelRu: "Masters M6",
    // CORRECT vs PowerTable (99–99 placeholder) and PowerGage (M6 absent):
    minAge: 70,
    maxAge: null,
    ratingEligible: true,
  },
];

/**
 * Masters multipliers per ISF v5.1 §10.9.4.
 *
 * D6 (decisions-v1) + D26 (decisions-v2) — the M6 = 1.150 entry is the single largest
 * user-visible correctness differentiator vs both PowerGage and PowerTable.
 */
export const ISF_V51_MASTERS_MULTIPLIERS: ReadonlyMap<string, number> = new Map(
  [
    ["masters_m1", 1.025],
    ["masters_m2", 1.05],
    ["masters_m3", 1.075],
    ["masters_m4", 1.1],
    ["masters_m5", 1.125],
    ["masters_m6", 1.15],
  ],
);
