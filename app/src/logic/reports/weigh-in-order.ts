/**
 * Weigh-in order printout — pure service.
 *
 * Builds the printable weigh-in queue used at the secretariat. Weigh-ins
 * traditionally proceed by lot order within each (day, platform, flight)
 * group, so the output groups entries by that triple and orders within
 * each group by their position in registration.entries[] (which is the
 * effective lot order after `applyLotAssignment`).
 *
 * Each row carries the full minimum identification needed at the scale:
 * lot number, name, sex, division, discipline code, declared bodyweight
 * (if known), and the proposed weight category code.
 */

import type { Entry } from "@domain/models";

export type WeighInOrderRow = {
  /** 1-based lot number — derived from entries[] order. */
  lot: number;
  entry: Entry;
};

export type WeighInOrderGroup = {
  day: number;
  platform: number;
  flight: string;
  /** Human-readable group label, e.g. "Day 1 · Platform 1 · A". */
  label: string;
  rows: WeighInOrderRow[];
};

export function buildWeighInOrder(
  entries: ReadonlyArray<Entry>,
): WeighInOrderGroup[] {
  const map = new Map<string, WeighInOrderGroup>();

  entries.forEach((entry, index) => {
    const key = `${entry.day}|${entry.platform}|${entry.flight}`;
    if (!map.has(key)) {
      map.set(key, {
        day: entry.day,
        platform: entry.platform,
        flight: entry.flight,
        label: `Day ${entry.day} · Platform ${entry.platform} · ${entry.flight}`,
        rows: [],
      });
    }
    map.get(key)!.rows.push({ lot: index + 1, entry });
  });

  const groups = Array.from(map.values());

  groups.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    if (a.platform !== b.platform) return a.platform - b.platform;
    return a.flight.localeCompare(b.flight);
  });

  return groups;
}
