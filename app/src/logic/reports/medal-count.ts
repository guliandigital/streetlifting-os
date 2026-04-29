/**
 * Medal-count summary — pure service.
 *
 * Aggregates medal counts (1st/2nd/3rd) per team and per country across all
 * Classic and Multirep result groups, excluding the absolute group (which
 * is awarded separately) and excluding guests.
 *
 * Output is sorted by gold DESC → silver DESC → bronze DESC → name ASC,
 * and rows are placed using the same tie+vacancy logic as team scoring.
 */

import type { ClassicResultGroup } from "@logic/isf/classic-placing";
import type { MultirepResultGroup } from "@logic/isf/multirep-placing";

export type MedalRow = {
  /** Aggregation key — team name or country label. "—" for un-affiliated rows. */
  label: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
  place: number;
};

export type MedalCountReport = {
  byTeam: MedalRow[];
  byCountry: MedalRow[];
};

const UNAFFILIATED = "—";

function bumpRow(
  bucket: Map<string, { gold: number; silver: number; bronze: number }>,
  key: string,
  place: 1 | 2 | 3,
): void {
  if (!bucket.has(key)) {
    bucket.set(key, { gold: 0, silver: 0, bronze: 0 });
  }
  const row = bucket.get(key)!;
  if (place === 1) row.gold++;
  else if (place === 2) row.silver++;
  else row.bronze++;
}

function rank(
  bucket: Map<string, { gold: number; silver: number; bronze: number }>,
): MedalRow[] {
  const rows = Array.from(bucket.entries()).map(([label, m]) => ({
    label,
    gold: m.gold,
    silver: m.silver,
    bronze: m.bronze,
    total: m.gold + m.silver + m.bronze,
  }));

  rows.sort((a, b) => {
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    if (b.bronze !== a.bronze) return b.bronze - a.bronze;
    return a.label.localeCompare(b.label);
  });

  // Tie + vacancy place assignment.
  const places: number[] = Array.from({ length: rows.length }, () => 0);
  for (let i = 0; i < rows.length; i++) {
    if (i === 0) {
      places[i] = 1;
      continue;
    }
    const prev = rows[i - 1]!;
    const cur = rows[i]!;
    const sameAsPrev =
      prev.gold === cur.gold &&
      prev.silver === cur.silver &&
      prev.bronze === cur.bronze;
    if (sameAsPrev) {
      places[i] = places[i - 1]!;
    } else {
      const prevPlace = places[i - 1]!;
      let countAtPrevPlace = 0;
      for (let j = 0; j < i; j++) {
        if (places[j] === prevPlace) countAtPrevPlace++;
      }
      places[i] = prevPlace + countAtPrevPlace;
    }
  }

  return rows.map((r, i) => ({ ...r, place: places[i]! }));
}

export function buildMedalCountReport(
  classicGroups: ReadonlyArray<ClassicResultGroup>,
  multirepGroups: ReadonlyArray<MultirepResultGroup>,
): MedalCountReport {
  const teamBucket = new Map<
    string,
    { gold: number; silver: number; bronze: number }
  >();
  const countryBucket = new Map<
    string,
    { gold: number; silver: number; bronze: number }
  >();

  for (const group of classicGroups) {
    // Skip absolute group (sex===null && ageCategoryCode===null).
    if (group.sex === null && group.ageCategoryCode === null) continue;
    for (const row of group.rows) {
      if (row.entry.guest) continue;
      const place = row.place;
      if (place !== 1 && place !== 2 && place !== 3) continue;
      const team = row.entry.team?.trim();
      bumpRow(teamBucket, team && team.length > 0 ? team : UNAFFILIATED, place);
      const country = row.entry.country?.trim();
      bumpRow(
        countryBucket,
        country && country.length > 0 ? country : UNAFFILIATED,
        place,
      );
    }
  }

  for (const group of multirepGroups) {
    if (group.sex === null && group.ageCategoryCode === null) continue;
    for (const row of group.rows) {
      if (row.entry.guest) continue;
      const place = row.place;
      if (place !== 1 && place !== 2 && place !== 3) continue;
      const team = row.entry.team?.trim();
      bumpRow(teamBucket, team && team.length > 0 ? team : UNAFFILIATED, place);
      const country = row.entry.country?.trim();
      bumpRow(
        countryBucket,
        country && country.length > 0 ? country : UNAFFILIATED,
        place,
      );
    }
  }

  return {
    byTeam: rank(teamBucket),
    byCountry: rank(countryBucket),
  };
}
