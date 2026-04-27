/**
 * Weight category model per ISF v5.1 (D28, decisions-v2).
 *
 * Bodyweight-to-category match rule (D12, ISF §7.2): an athlete weighed at exactly
 * the upper bound counts as "up to N kg". Boundary is upper-inclusive.
 *
 * M_52 men's category restriction: «Доступно для: Юноши, девушки» — sub-juniors and
 * juniors only. Senior men cannot enter M_52.
 */

import type { Sex } from "./enums";
import type { AgeCategoryCode } from "./age-category";

export type WeightCategory = {
  /** Stable identifier, e.g., "F_60", "M_82_5", "M_140_PLUS" */
  code: string;
  sex: Sex;
  /** Lower bound exclusive (athlete must weigh > minKg). null = no lower bound. */
  minKg: number | null;
  /** Upper bound inclusive (athlete must weigh ≤ maxKg). null = no upper bound (+plus categories). */
  maxKg: number | null;
  /** If present, the category is restricted to these age categories only. */
  ageCategoryCodes?: AgeCategoryCode[];
};
