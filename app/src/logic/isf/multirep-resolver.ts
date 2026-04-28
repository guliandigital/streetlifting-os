/**
 * Multirep preset-load resolver — ISF v5.1 §2.2 (D3, decisions-v1).
 *
 * Pure lookup over MultirepPreset[] keyed by (sex × exercise × division × age cat).
 * Returns null when no preset matches; the operator must enter a manual override.
 */

import type {
  Entry,
  Exercise,
  MultirepPreset,
  AgeCategoryCode,
} from "@domain/models";

export type MultirepPresetMatch = {
  loadKg: number;
  preset: MultirepPreset;
};

/**
 * Resolve the preset load for a multirep entry on one exercise.
 *
 * Match rule: every key must equal the entry's value AND the preset's
 * ageCategoryCodes list must contain the athlete's resolved age category code.
 *
 * @returns matching `{ loadKg, preset }` or `null` if no preset fits.
 */
export function resolveMultirepPreset(
  entry: Entry,
  exercise: Exercise,
  presets: ReadonlyArray<MultirepPreset>,
  ageCategoryCode: AgeCategoryCode | null,
): MultirepPresetMatch | null {
  if (ageCategoryCode === null) return null;
  if (exercise !== "PU" && exercise !== "DI") return null;

  for (const preset of presets) {
    if (preset.sex !== entry.sex) continue;
    if (preset.exercise !== exercise) continue;
    if (preset.division !== entry.division) continue;
    if (!preset.ageCategoryCodes.includes(ageCategoryCode)) continue;
    return { loadKg: preset.loadKg, preset };
  }

  return null;
}
