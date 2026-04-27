/**
 * Age category resolution per ISF v5.1 §10.9.4.
 *
 * Critical correctness: M5 covers 60–69, M6 covers 70+ (D6 + D26).
 * Both PowerGage and PowerTable encode the pre-v5.1 single 60+ → 1.125 band.
 */

import type { AgeCategory, AgeCategoryCode } from "@domain/models";
import {
  ISF_V51_AGE_CATEGORIES,
  ISF_V51_MASTERS_MULTIPLIERS,
} from "@domain/presets";

/** Compute age in completed years between birth ISO date and a reference ISO date. */
export function ageInYears(birthIso: string, refIso: string): number {
  const b = new Date(birthIso);
  const r = new Date(refIso);
  let age = r.getUTCFullYear() - b.getUTCFullYear();
  const monthDiff = r.getUTCMonth() - b.getUTCMonth();
  const dayDiff = r.getUTCDate() - b.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age;
}

/**
 * Resolve which age category an athlete falls into based on age and the meet's
 * enabled age categories.
 *
 * Matching rule: minAge ≤ age ≤ maxAge (both inclusive when set; null = no bound).
 *
 * Open is matched LAST so masters/junior take precedence when overlapping.
 */
export function resolveAgeCategory(
  age: number,
  enabled: ReadonlyArray<AgeCategory> = ISF_V51_AGE_CATEGORIES,
): AgeCategory | null {
  // Search masters first (most specific), then junior/youth, then open as fallback.
  const ordered = [...enabled].sort((a, b) => {
    const score = (c: AgeCategory) => (c.code === "open" ? 1 : 0);
    return score(a) - score(b);
  });
  for (const cat of ordered) {
    const minOk = cat.minAge === null || age >= cat.minAge;
    const maxOk = cat.maxAge === null || age <= cat.maxAge;
    if (minOk && maxOk) return cat;
  }
  return null;
}

/**
 * Masters multiplier per ISF v5.1 §10.9.4.
 * Returns 1.0 (no adjustment) for non-masters categories.
 *
 * Sprint 1 boundary tests (per blueprint v2 §17): age 60, 69, 70, 80.
 *   - 60 → masters_m5 → 1.125
 *   - 69 → masters_m5 → 1.125
 *   - 70 → masters_m6 → 1.150  ← differentiator vs PowerGage / PowerTable
 *   - 80 → masters_m6 → 1.150
 */
export function mastersMultiplier(code: AgeCategoryCode | null): number {
  if (code === null) return 1.0;
  return ISF_V51_MASTERS_MULTIPLIERS.get(code) ?? 1.0;
}
