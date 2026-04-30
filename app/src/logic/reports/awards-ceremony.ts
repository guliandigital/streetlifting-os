/**
 * Awards ceremony — pure service that collects podium rows from result
 * groups and arranges them in announcement order.
 *
 * Two announcement orders supported (PowerTable parity):
 *   - "thirdToFirst": 3 → 2 → 1 (default, builds drama; PowerGage-style)
 *   - "firstToThird": 1 → 2 → 3 (alternative, faster/practical)
 *
 * The absolute group is excluded from the per-category ceremony — it is
 * announced separately on most federations and would otherwise duplicate
 * already-named winners.
 */

import type { ClassicResultGroup } from "@logic/isf/classic-placing";
import type { MultirepResultGroup } from "@logic/isf/multirep-placing";

export type AwardOrder = "firstToThird" | "thirdToFirst";

export type CeremonyAward = {
  id: string;
  format: "classic" | "multirep";
  place: 1 | 2 | 3;
  athleteName: string;
  team: string | null;
  category: string;
  disciplineCode: string;
  /** Display-ready result, e.g. "275 kg" or "32 reps". */
  result: string;
};

export type BuildAwardsInput = {
  classicGroups: ReadonlyArray<ClassicResultGroup>;
  multirepGroups: ReadonlyArray<MultirepResultGroup>;
  /** Display label for kilograms — "kg" / "кг". Only used for Classic format. */
  kgUnitLabel?: string;
  /** Display label for reps — "reps" / "повторов". Only used for Multirep. */
  repsUnitLabel?: string;
};

function collectClassicAwards(
  groups: ReadonlyArray<ClassicResultGroup>,
  kgUnitLabel: string,
): CeremonyAward[] {
  return groups
    .filter((group) => group.sex !== null || group.ageCategoryCode !== null)
    .flatMap((group) =>
      group.rows
        .filter((row) => row.place === 1 || row.place === 2 || row.place === 3)
        .map((row) => ({
          id: `classic:${group.label}:${row.entry.id}`,
          format: "classic" as const,
          place: row.place as 1 | 2 | 3,
          athleteName: row.entry.name,
          team: row.entry.team ?? null,
          category: group.label,
          disciplineCode: row.entry.disciplineCode,
          result: row.total > 0 ? `${row.total} ${kgUnitLabel}` : "–",
        })),
    );
}

function collectMultirepAwards(
  groups: ReadonlyArray<MultirepResultGroup>,
  repsUnitLabel: string,
): CeremonyAward[] {
  return groups.flatMap((group) =>
    group.rows
      .filter((row) => row.place === 1 || row.place === 2 || row.place === 3)
      .map((row) => ({
        id: `multirep:${group.label}:${row.entry.id}`,
        format: "multirep" as const,
        place: row.place as 1 | 2 | 3,
        athleteName: row.entry.name,
        team: row.entry.team ?? null,
        category: group.label,
        disciplineCode: row.entry.disciplineCode,
        result: row.totalReps > 0 ? `${row.totalReps} ${repsUnitLabel}` : "–",
      })),
  );
}

export function buildAwardsList(
  input: BuildAwardsInput,
  order: AwardOrder = "thirdToFirst",
): CeremonyAward[] {
  const kgUnitLabel = input.kgUnitLabel ?? "kg";
  const repsUnitLabel = input.repsUnitLabel ?? "reps";
  const items = [
    ...collectClassicAwards(input.classicGroups, kgUnitLabel),
    ...collectMultirepAwards(input.multirepGroups, repsUnitLabel),
  ];
  return sortAwards(items, order);
}

export function sortAwards(
  items: ReadonlyArray<CeremonyAward>,
  order: AwardOrder,
): CeremonyAward[] {
  const placeDirection = order === "firstToThird" ? 1 : -1;

  return [...items].sort((a, b) => {
    const categoryDiff = a.category.localeCompare(b.category);
    if (categoryDiff !== 0) return categoryDiff;
    const placeDiff = (a.place - b.place) * placeDirection;
    if (placeDiff !== 0) return placeDiff;
    return a.athleteName.localeCompare(b.athleteName);
  });
}

/**
 * Place-specific accent colours for the projector display, per
 * traditional medal hex values. Fallback for any non-podium place
 * is the same as bronze, so the function is total over `place: number`.
 */
export type PlaceAccent = {
  background: string;
  text: string;
  badge: string;
};

export function placeAccent(place: 1 | 2 | 3): PlaceAccent {
  if (place === 1) {
    return { background: "#b8860b", text: "#fffbea", badge: "#fff8c4" };
  }
  if (place === 2) {
    return { background: "#7d7d7d", text: "#f8f8f8", badge: "#e9e9e9" };
  }
  return { background: "#8a4a25", text: "#fdf3e9", badge: "#f3d2b3" };
}

/**
 * Compose the spoken announcement for an active award. Pure function so
 * tests can assert exact wording per locale without invoking the Web
 * Speech API.
 *
 * Russian and English templates use ordinal place names — "first",
 * "second", "third" — instead of cardinals to match how an MC reads
 * results aloud at a real podium.
 */
export type AnnouncerLocale = "ru-RU" | "en-US";

const PLACE_ORDINAL: Record<AnnouncerLocale, Record<1 | 2 | 3, string>> = {
  "ru-RU": { 1: "Первое место", 2: "Второе место", 3: "Третье место" },
  "en-US": { 1: "First place", 2: "Second place", 3: "Third place" },
};

export function announceAward(
  award: CeremonyAward,
  locale: AnnouncerLocale,
): string {
  const place = PLACE_ORDINAL[locale][award.place];
  const team = award.team
    ? locale === "ru-RU"
      ? `, команда ${award.team}`
      : `, team ${award.team}`
    : "";
  return `${place}, ${award.athleteName}${team}, ${award.result}.`;
}
