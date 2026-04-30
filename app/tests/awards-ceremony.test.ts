/**
 * Awards ceremony pure-logic tests.
 */

import { describe, it, expect } from "vitest";
import {
  buildAwardsList,
  placeAccent,
  sortAwards,
  type CeremonyAward,
} from "@logic/reports/awards-ceremony";
import type { ClassicResultGroup, ClassicResultRow } from "@logic/isf/classic-placing";
import type { MultirepResultGroup, MultirepResultRow } from "@logic/isf/multirep-placing";
import { buildClassicEntry, buildMultirepEntry } from "./fixtures/builders";

function classicRow(
  name: string,
  place: number | null,
  total: number,
  team?: string,
): ClassicResultRow {
  return {
    entry: buildClassicEntry(name, { team }),
    entryIndex: 0,
    puBest: 0,
    diBest: 0,
    total,
    isfCoefficient: 1,
    isfBasePoints: 0,
    isfAdditionalPoints: 0,
    isfFinalPoints: 0,
    puAttempts: [null, null, null],
    diAttempts: [null, null, null],
    resolvedAgeCategoryCode: null,
    resolvedWeightCategoryCode: null,
    place,
    tiedWithPrev: false,
    vacantNextPlace: false,
  };
}

function classicGroup(label: string, rows: ClassicResultRow[]): ClassicResultGroup {
  return {
    sex: "M",
    ageCategoryCode: "open",
    weightCategoryCode: label,
    label,
    rows,
  };
}

function multirepRow(
  name: string,
  place: number | null,
  totalReps: number,
): MultirepResultRow {
  return {
    entry: buildMultirepEntry(name),
    entryIndex: 0,
    puReps: 0,
    diReps: 0,
    totalReps,
    presetLoadKgPu: null,
    presetLoadKgDi: null,
    isfCoefficient: 1,
    isfFinalPoints: 0,
    place,
    tiedWithPrev: false,
    vacantNextPlace: false,
    resolvedAgeCategoryCode: null,
    resolvedWeightCategoryCode: null,
    attemptStatus: "success",
    noRepCount: 0,
  };
}

function multirepGroup(label: string, rows: MultirepResultRow[]): MultirepResultGroup {
  return {
    sex: "F",
    ageCategoryCode: "open",
    weightCategoryCode: label,
    label,
    disciplineCode: "multirep_2lift_16_24",
    disciplineLabelRu: "Multirep RU",
    disciplineLabelEn: "Multirep EN",
    rows,
  };
}

describe("buildAwardsList", () => {
  it("returns empty list for empty groups", () => {
    expect(
      buildAwardsList({ classicGroups: [], multirepGroups: [] }),
    ).toEqual([]);
  });

  it("collects only places 1-3 from classic groups", () => {
    const g = classicGroup("M_82_5", [
      classicRow("A", 1, 300),
      classicRow("B", 2, 280),
      classicRow("C", 3, 260),
      classicRow("D", 4, 240),
      classicRow("Guest", null, 350),
    ]);
    const list = buildAwardsList({ classicGroups: [g], multirepGroups: [] });
    expect(list).toHaveLength(3);
    expect(list.every((a) => a.place >= 1 && a.place <= 3)).toBe(true);
    expect(list.map((a) => a.athleteName).sort()).toEqual(["A", "B", "C"]);
  });

  it("excludes the absolute classic group (sex=null && ageCategoryCode=null)", () => {
    const absolute: ClassicResultGroup = {
      sex: null,
      ageCategoryCode: null,
      weightCategoryCode: null,
      label: "Absolute",
      rows: [classicRow("A", 1, 350)],
    };
    const list = buildAwardsList({ classicGroups: [absolute], multirepGroups: [] });
    expect(list).toEqual([]);
  });

  it("formats classic results with kg unit label", () => {
    const g = classicGroup("M_82_5", [classicRow("A", 1, 300)]);
    const list = buildAwardsList(
      { classicGroups: [g], multirepGroups: [], kgUnitLabel: "кг" },
      "thirdToFirst",
    );
    expect(list[0]?.result).toBe("300 кг");
  });

  it("formats multirep results with reps unit label", () => {
    const g = multirepGroup("F_60", [multirepRow("Anna", 1, 32)]);
    const list = buildAwardsList(
      { classicGroups: [], multirepGroups: [g], repsUnitLabel: "повт" },
      "thirdToFirst",
    );
    expect(list[0]?.result).toBe("32 повт");
  });

  it("renders en-dash for zero result (no successful attempts)", () => {
    const g = classicGroup("M_82_5", [classicRow("A", 1, 0)]);
    const list = buildAwardsList({ classicGroups: [g], multirepGroups: [] });
    expect(list[0]?.result).toBe("–");
  });

  it("merges classic + multirep awards", () => {
    const c = classicGroup("M_82_5", [classicRow("A", 1, 300)]);
    const m = multirepGroup("F_60", [multirepRow("B", 2, 20)]);
    const list = buildAwardsList({ classicGroups: [c], multirepGroups: [m] });
    expect(list).toHaveLength(2);
    expect(list.map((a) => a.format).sort()).toEqual(["classic", "multirep"]);
  });
});

describe("sortAwards", () => {
  function awards(specs: Array<[string, 1 | 2 | 3, string]>): CeremonyAward[] {
    return specs.map(([name, place, category], i) => ({
      id: `id-${i}`,
      format: "classic",
      place,
      athleteName: name,
      team: null,
      category,
      disciplineCode: "classic_2lift",
      result: "0",
    }));
  }

  it("thirdToFirst orders 3 → 2 → 1 within a category", () => {
    const sorted = sortAwards(
      awards([
        ["A", 1, "M_82_5"],
        ["B", 3, "M_82_5"],
        ["C", 2, "M_82_5"],
      ]),
      "thirdToFirst",
    );
    expect(sorted.map((a) => a.athleteName)).toEqual(["B", "C", "A"]);
  });

  it("firstToThird orders 1 → 2 → 3 within a category", () => {
    const sorted = sortAwards(
      awards([
        ["A", 3, "M_82_5"],
        ["B", 1, "M_82_5"],
        ["C", 2, "M_82_5"],
      ]),
      "firstToThird",
    );
    expect(sorted.map((a) => a.athleteName)).toEqual(["B", "C", "A"]);
  });

  it("groups categories alphabetically before applying place order", () => {
    const sorted = sortAwards(
      awards([
        ["X", 1, "M_90"],
        ["Y", 1, "M_82_5"],
      ]),
      "thirdToFirst",
    );
    expect(sorted.map((a) => a.category)).toEqual(["M_82_5", "M_90"]);
  });

  it("breaks place ties alphabetically by athlete name", () => {
    const sorted = sortAwards(
      awards([
        ["B", 1, "M_82_5"],
        ["A", 1, "M_82_5"],
      ]),
      "thirdToFirst",
    );
    expect(sorted.map((a) => a.athleteName)).toEqual(["A", "B"]);
  });
});

describe("placeAccent", () => {
  it("returns gold-ish accent for place 1", () => {
    const a = placeAccent(1);
    expect(a.background.toLowerCase()).toContain("b8860b");
  });
  it("returns silver-ish accent for place 2", () => {
    const a = placeAccent(2);
    expect(a.background.toLowerCase()).toContain("7d7d7d");
  });
  it("returns bronze-ish accent for place 3", () => {
    const a = placeAccent(3);
    expect(a.background.toLowerCase()).toContain("8a4a25");
  });
  it("returns distinct backgrounds for each podium place", () => {
    expect(placeAccent(1).background).not.toBe(placeAccent(2).background);
    expect(placeAccent(2).background).not.toBe(placeAccent(3).background);
    expect(placeAccent(1).background).not.toBe(placeAccent(3).background);
  });
});
