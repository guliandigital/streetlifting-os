/**
 * Weight category resolution per ISF v5.1 §7.2 (D12, decisions-v1).
 *
 * Boundary rule: athlete's bodyweight `bw` falls into a category whose
 * `minKg < bw <= maxKg` — lower bound exclusive, upper bound inclusive.
 *
 * Sex-restricted: only categories whose `sex` matches the athlete are eligible.
 *
 * Age-restricted: if the category has an `ageCategoryCodes` allow-list (e.g.,
 * M_52 is youth/junior only per D28), the athlete must fall into one of those
 * age categories. If the athlete's resolved age category is not on the list,
 * the next sex-matching, bw-matching category up is used.
 */

import type { Sex, WeightCategory, AgeCategoryCode } from "@domain/models";

/**
 * Resolve which weight category an athlete falls into.
 *
 * @param bodyweightKg athlete's measured bodyweight in kg
 * @param sex          athlete's sex (only "M" / "F" supported here; "OPEN" returns null)
 * @param ageCategoryCode resolved age category code (used to filter ageCategoryCodes-restricted categories)
 * @param categories  enabled weight-category list (default order respected; we sort by maxKg ASC ourselves)
 * @returns matching WeightCategory, or null if none fits
 */
export function resolveWeightCategory(
  bodyweightKg: number | null,
  sex: Sex,
  ageCategoryCode: AgeCategoryCode | null,
  categories: ReadonlyArray<WeightCategory>,
): WeightCategory | null {
  if (bodyweightKg === null || !Number.isFinite(bodyweightKg)) return null;
  if (bodyweightKg <= 0) return null;
  if (sex !== "M" && sex !== "F") return null;

  // Filter by sex; sort by maxKg ASC (null = +∞ goes last) so we walk from
  // lightest category upward and return the first match.
  const sorted = categories
    .filter((c) => c.sex === sex)
    .slice()
    .sort((a, b) => {
      const am = a.maxKg ?? Number.POSITIVE_INFINITY;
      const bm = b.maxKg ?? Number.POSITIVE_INFINITY;
      return am - bm;
    });

  for (const cat of sorted) {
    const minOk = cat.minKg === null || bodyweightKg > cat.minKg;
    const maxOk = cat.maxKg === null || bodyweightKg <= cat.maxKg;
    if (!minOk || !maxOk) continue;

    if (cat.ageCategoryCodes && cat.ageCategoryCodes.length > 0) {
      if (ageCategoryCode === null) continue;
      if (!cat.ageCategoryCodes.includes(ageCategoryCode)) continue;
    }
    return cat;
  }
  return null;
}
