/**
 * ISF v5.1 weight categories — D28 (decisions-v2).
 *
 * Source: PowerTable «Весовые категории» tab (cross-validated with ISF rulebook).
 *
 * - Women: 7 categories
 * - Men: 12 categories
 * - M_52 «Доступно для: Юноши, девушки» — restricted to youth/junior (sub-juniors and juniors).
 */

import type { WeightCategory } from "../models/weight-category";

export const ISF_V51_WEIGHT_CATEGORIES: ReadonlyArray<WeightCategory> = [
  // ─── Women — 7 categories ───────────────────────────────────────────────
  { code: "F_44", sex: "F", minKg: null, maxKg: 44 },
  { code: "F_48", sex: "F", minKg: 44, maxKg: 48 },
  { code: "F_52", sex: "F", minKg: 48, maxKg: 52 },
  { code: "F_56", sex: "F", minKg: 52, maxKg: 56 },
  { code: "F_60", sex: "F", minKg: 56, maxKg: 60 },
  { code: "F_67_5", sex: "F", minKg: 60, maxKg: 67.5 },
  { code: "F_67_5_PLUS", sex: "F", minKg: 67.5, maxKg: null },

  // ─── Men — 12 categories ─────────────────────────────────────────────────
  // M_52 youth/junior only per PowerTable «Доступно для: Юноши, девушки»:
  {
    code: "M_52",
    sex: "M",
    minKg: null,
    maxKg: 52,
    ageCategoryCodes: ["youth", "junior"],
  },
  { code: "M_56", sex: "M", minKg: 52, maxKg: 56 },
  { code: "M_60", sex: "M", minKg: 56, maxKg: 60 },
  { code: "M_67_5", sex: "M", minKg: 60, maxKg: 67.5 },
  { code: "M_75", sex: "M", minKg: 67.5, maxKg: 75 },
  { code: "M_82_5", sex: "M", minKg: 75, maxKg: 82.5 },
  { code: "M_90", sex: "M", minKg: 82.5, maxKg: 90 },
  { code: "M_100", sex: "M", minKg: 90, maxKg: 100 },
  { code: "M_110", sex: "M", minKg: 100, maxKg: 110 },
  { code: "M_125", sex: "M", minKg: 110, maxKg: 125 },
  { code: "M_140", sex: "M", minKg: 125, maxKg: 140 },
  { code: "M_140_PLUS", sex: "M", minKg: 140, maxKg: null },
];
