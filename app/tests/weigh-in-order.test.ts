/**
 * Weigh-in order printout tests.
 */

import { describe, it, expect } from "vitest";
import { buildWeighInOrder } from "@logic/reports/weigh-in-order";
import { buildClassicEntry } from "./fixtures/builders";

describe("buildWeighInOrder", () => {
  it("returns empty for no entries", () => {
    expect(buildWeighInOrder([])).toEqual([]);
  });

  it("groups by (day, platform, flight) and assigns 1-based lots", () => {
    const entries = [
      buildClassicEntry("A", { day: 1, platform: 1, flight: "A" }),
      buildClassicEntry("B", { day: 1, platform: 1, flight: "A" }),
      buildClassicEntry("C", { day: 1, platform: 2, flight: "A" }),
    ];
    const groups = buildWeighInOrder(entries);
    expect(groups).toHaveLength(2);
    const first = groups[0]!;
    expect(first.day).toBe(1);
    expect(first.platform).toBe(1);
    expect(first.flight).toBe("A");
    expect(first.rows).toHaveLength(2);
    expect(first.rows[0]!.lot).toBe(1);
    expect(first.rows[1]!.lot).toBe(2);
  });

  it("sorts groups by day then platform then flight", () => {
    const entries = [
      buildClassicEntry("A", { day: 2, platform: 1, flight: "A" }),
      buildClassicEntry("B", { day: 1, platform: 2, flight: "B" }),
      buildClassicEntry("C", { day: 1, platform: 1, flight: "B" }),
      buildClassicEntry("D", { day: 1, platform: 1, flight: "A" }),
    ];
    const groups = buildWeighInOrder(entries);
    const labels = groups.map((g) => `${g.day}-${g.platform}-${g.flight}`);
    expect(labels).toEqual(["1-1-A", "1-1-B", "1-2-B", "2-1-A"]);
  });

  it("preserves entries[] order within a group as the lot order", () => {
    const entries = [
      buildClassicEntry("Petrov", { day: 1, platform: 1, flight: "A" }),
      buildClassicEntry("Sidorov", { day: 1, platform: 1, flight: "A" }),
      buildClassicEntry("Ivanov", { day: 1, platform: 1, flight: "A" }),
    ];
    const groups = buildWeighInOrder(entries);
    const names = groups[0]!.rows.map((r) => r.entry.name);
    expect(names).toEqual(["Petrov", "Sidorov", "Ivanov"]);
  });

  it("assigns lots from the absolute index, not the group-local index", () => {
    const entries = [
      buildClassicEntry("A", { day: 1, platform: 1, flight: "A" }),
      buildClassicEntry("B", { day: 1, platform: 2, flight: "A" }),
      buildClassicEntry("C", { day: 1, platform: 1, flight: "A" }),
    ];
    const groups = buildWeighInOrder(entries);
    const platform1 = groups.find((g) => g.platform === 1)!;
    const platform2 = groups.find((g) => g.platform === 2)!;
    expect(platform1.rows.map((r) => r.lot)).toEqual([1, 3]);
    expect(platform2.rows.map((r) => r.lot)).toEqual([2]);
  });
});
