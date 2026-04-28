/**
 * classic-placing.ts tests — Sprint 2.
 *
 * Coverage:
 * - computeClassicRows: empty, single entry, attempt encoding, failed attempts,
 *   record-only exclusion, ISF points computed
 * - assignPlaces: ordering, tiebreak by BW, tie + vacancy logic, guest handling
 * - groupByCategory: multi-group, absolute group, group ordering
 * - AttemptDisplay encoding: success=+kg, fail=-kg, null=not declared
 */

import { describe, it, expect } from "vitest";
import {
  computeClassicRows,
  assignPlaces,
  groupByCategory,
  computeClassicResults,
} from "@logic/isf/classic-placing";
import {
  buildClassicEntry,
  classicAttempt,
  classicExercise,
  VOTES_GOOD,
  VOTES_NO,
} from "./fixtures/builders";
import type { MeetState } from "@domain/models";
import { ISF_V51_WEIGHT_CATEGORIES, ISF_V51_AGE_CATEGORIES } from "@domain/presets";

// ─── Shared test meet ────────────────────────────────────────────────────────

const MEET_DATE = "2026-04-27";

const TEST_MEET: MeetState = {
  name: "Test Meet",
  federation: "ISF",
  country: "RU",
  state: "",
  city: "Moscow",
  date: MEET_DATE,
  competitionFormat: "classic",
  enabledDisciplineCodes: ["classic_2lift"],
  divisions: ["amateur"],
  ageCategories: [...ISF_V51_AGE_CATEGORIES],
  weightCategories: [...ISF_V51_WEIGHT_CATEGORIES],
  formula: "ISF_POINTS",
  useMastersAdjustment: true,
  lowerBodyweightFirstTiebreak: true,
  inKg: true,
  showAlternateUnits: false,
};

// ─── computeClassicRows ──────────────────────────────────────────────────────

describe("computeClassicRows", () => {
  it("returns empty array for empty entries", () => {
    const rows = computeClassicRows([], TEST_MEET, MEET_DATE);
    expect(rows).toHaveLength(0);
  });

  it("skips non-classic entries", () => {
    const e = buildClassicEntry("X", { competitionFormat: "multirep" });
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    expect(rows).toHaveLength(0);
  });

  it("single entry with no attempts: total=0, place=null (before assignPlaces)", () => {
    const e = buildClassicEntry("Solo");
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.total).toBe(0);
    expect(row.puBest).toBe(0);
    expect(row.diBest).toBe(0);
    expect(row.place).toBeNull(); // not yet placed
  });

  it("single entry with 3 successful PU + 3 successful DI: correct bests and total", () => {
    const e = buildClassicEntry("Full", {
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 100, VOTES_GOOD),
          classicAttempt(2, 110, VOTES_GOOD),
          classicAttempt(3, 120, VOTES_GOOD),
        ]),
        DI: classicExercise("DI", [
          classicAttempt(1, 80, VOTES_GOOD),
          classicAttempt(2, 85, VOTES_GOOD),
          classicAttempt(3, 90, VOTES_GOOD),
        ]),
      },
    });
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.puBest).toBe(120);
    expect(row.diBest).toBe(90);
    expect(row.total).toBe(210);
  });

  it("failed attempts excluded from best", () => {
    const e = buildClassicEntry("Fails", {
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 100, VOTES_GOOD),
          classicAttempt(2, 110, VOTES_NO),
          classicAttempt(3, 115, VOTES_NO),
        ]),
        DI: classicExercise("DI", [
          classicAttempt(1, 80, VOTES_NO),
          classicAttempt(2, 80, VOTES_NO),
          classicAttempt(3, 80, VOTES_NO),
        ]),
      },
    });
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    const row = rows[0]!;
    expect(row.puBest).toBe(100); // only first succeeded
    expect(row.diBest).toBe(0);    // all failed
    expect(row.total).toBe(100);
  });

  it("record-only attempt (sequence=4) excluded from best", () => {
    const e = buildClassicEntry("RecordOnly", {
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 100, VOTES_GOOD),
          classicAttempt(2, 110, VOTES_GOOD),
          classicAttempt(3, 115, VOTES_NO),
          classicAttempt(4, 130, VOTES_GOOD), // record-only, must not count
        ]),
      },
    });
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.puBest).toBe(110); // sequence 4 not counted
  });

  it("entryIndex matches position in entries array", () => {
    const e1 = buildClassicEntry("First");
    const e2 = buildClassicEntry("Second");
    const e3 = buildClassicEntry("Third");
    const rows = computeClassicRows([e1, e2, e3], TEST_MEET, MEET_DATE);
    expect(rows[0]!.entryIndex).toBe(0);
    expect(rows[1]!.entryIndex).toBe(1);
    expect(rows[2]!.entryIndex).toBe(2);
  });

  it("ISF points computed (coefficient=1 stub, finalPoints=total for M sex)", () => {
    const e = buildClassicEntry("Points", {
      bodyweightKg: 80,
      sex: "M",
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    const row = rows[0]!;
    expect(row.isfCoefficient).toBe(1); // stub returns 1.0
    expect(row.isfBasePoints).toBe(180); // 180 * 1.0
    expect(row.isfFinalPoints).toBeGreaterThan(0);
  });
});

// ─── puAttempts / diAttempts encoding ───────────────────────────────────────

describe("attempt display encoding", () => {
  it("null for undeclared attempt slot", () => {
    const e = buildClassicEntry("Sparse", {
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 100, VOTES_GOOD),
          // no R2, no R3
        ]),
      },
    });
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    const row = rows[0]!;
    expect(row.puAttempts[0]).toBe(100); // success → positive
    expect(row.puAttempts[1]).toBeNull();
    expect(row.puAttempts[2]).toBeNull();
  });

  it("success → positive kg", () => {
    const e = buildClassicEntry("Success", {
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.puAttempts[0]).toBe(100);
  });

  it("fail → negative kg (absolute value = declared kg)", () => {
    const e = buildClassicEntry("Fail", {
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_NO)]),
      },
    });
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.puAttempts[0]).toBe(-100);
  });

  it("diAttempts encoded the same way", () => {
    const e = buildClassicEntry("DI", {
      exercises: {
        DI: classicExercise("DI", [
          classicAttempt(1, 80, VOTES_GOOD),
          classicAttempt(2, 85, VOTES_NO),
        ]),
      },
    });
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    const row = rows[0]!;
    expect(row.diAttempts[0]).toBe(80);
    expect(row.diAttempts[1]).toBe(-85);
    expect(row.diAttempts[2]).toBeNull();
  });
});

// ─── assignPlaces ────────────────────────────────────────────────────────────

describe("assignPlaces", () => {
  it("empty input returns empty", () => {
    expect(assignPlaces([])).toHaveLength(0);
  });

  it("single non-guest entry gets place=1", () => {
    const e = buildClassicEntry("Solo");
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    const placed = assignPlaces(rows);
    expect(placed[0]!.place).toBe(1);
  });

  it("higher total gets place 1", () => {
    const winner = buildClassicEntry("Winner", {
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 120, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const loser = buildClassicEntry("Loser", {
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const rows = computeClassicRows([winner, loser], TEST_MEET, MEET_DATE);
    const placed = assignPlaces(rows);
    const winnerRow = placed.find((r) => r.entry.name === "Winner");
    const loserRow = placed.find((r) => r.entry.name === "Loser");
    expect(winnerRow?.place).toBe(1);
    expect(loserRow?.place).toBe(2);
  });

  it("tiebreak by bodyweight: same total, lighter BW gets place 1", () => {
    const lighter = buildClassicEntry("Lighter", {
      bodyweightKg: 70,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const heavier = buildClassicEntry("Heavier", {
      bodyweightKg: 90,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const rows = computeClassicRows([lighter, heavier], TEST_MEET, MEET_DATE);
    const placed = assignPlaces(rows);
    const lighterRow = placed.find((r) => r.entry.name === "Lighter");
    const heavierRow = placed.find((r) => r.entry.name === "Heavier");
    expect(lighterRow?.place).toBe(1);
    expect(heavierRow?.place).toBe(2);
  });

  it("guest entry: place=null, sorted after placed athletes", () => {
    const guest = buildClassicEntry("Guest", {
      guest: true,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 200, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 200, VOTES_GOOD)]),
      },
    });
    const competitor = buildClassicEntry("Competitor");
    const rows = computeClassicRows([guest, competitor], TEST_MEET, MEET_DATE);
    const placed = assignPlaces(rows);

    const guestRow = placed.find((r) => r.entry.name === "Guest");
    const competitorRow = placed.find((r) => r.entry.name === "Competitor");

    expect(guestRow?.place).toBeNull();
    expect(competitorRow?.place).toBe(1);
    // Guest is last
    const guestIdx = placed.findIndex((r) => r.entry.name === "Guest");
    const competitorIdx = placed.findIndex((r) => r.entry.name === "Competitor");
    expect(guestIdx).toBeGreaterThan(competitorIdx);
  });

  it("tiebreak chain: same total+BW → place 1 shared, place 2 vacant, place 3 assigned to next", () => {
    const a = buildClassicEntry("A", {
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const b = buildClassicEntry("B", {
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const c = buildClassicEntry("C", {
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 90, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 70, VOTES_GOOD)]),
      },
    });
    const rows = computeClassicRows([a, b, c], TEST_MEET, MEET_DATE);
    const placed = assignPlaces(rows);

    const rowA = placed.find((r) => r.entry.name === "A");
    const rowB = placed.find((r) => r.entry.name === "B");
    const rowC = placed.find((r) => r.entry.name === "C");

    expect(rowA?.place).toBe(1);
    expect(rowB?.place).toBe(1);
    expect(rowC?.place).toBe(3); // place 2 is vacant
  });

  it("tiedWithPrev flag: second tied row has tiedWithPrev=true", () => {
    const a = buildClassicEntry("A", {
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const b = buildClassicEntry("B", {
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const rows = computeClassicRows([a, b], TEST_MEET, MEET_DATE);
    const placed = assignPlaces(rows);

    // The second placed row should be tied with the first
    const rowB = placed.find((r) => r.entry.name === "B");
    // One of A or B (whichever comes second) should have tiedWithPrev=true
    const tiedRow = placed.find((r) => r.tiedWithPrev);
    expect(tiedRow).toBeDefined();
    // The tied row should have place=1 too
    expect(rowB?.place).toBe(1);
  });

  it("vacantNextPlace flag: set on tied row before a vacant place", () => {
    const a = buildClassicEntry("A", {
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const b = buildClassicEntry("B", {
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const c = buildClassicEntry("C", {
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 50, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 50, VOTES_GOOD)]),
      },
    });
    const rows = computeClassicRows([a, b, c], TEST_MEET, MEET_DATE);
    const placed = assignPlaces(rows);

    const rowC = placed.find((r) => r.entry.name === "C");
    expect(rowC?.place).toBe(3); // place 2 is vacant

    // One of A or B must signal vacancy
    const hasVacancy = placed.some((r) => r.vacantNextPlace);
    expect(hasVacancy).toBe(true);
  });

  it("places are sequential without ties", () => {
    const entries = [
      buildClassicEntry("P1", {
        bodyweightKg: 80,
        exercises: {
          PU: classicExercise("PU", [classicAttempt(1, 130, VOTES_GOOD)]),
          DI: classicExercise("DI", [classicAttempt(1, 100, VOTES_GOOD)]),
        },
      }),
      buildClassicEntry("P2", {
        bodyweightKg: 80,
        exercises: {
          PU: classicExercise("PU", [classicAttempt(1, 120, VOTES_GOOD)]),
          DI: classicExercise("DI", [classicAttempt(1, 90, VOTES_GOOD)]),
        },
      }),
      buildClassicEntry("P3", {
        bodyweightKg: 80,
        exercises: {
          PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
          DI: classicExercise("DI", [classicAttempt(1, 80, VOTES_GOOD)]),
        },
      }),
    ];
    const rows = computeClassicRows(entries, TEST_MEET, MEET_DATE);
    const placed = assignPlaces(rows);
    expect(placed[0]!.place).toBe(1);
    expect(placed[1]!.place).toBe(2);
    expect(placed[2]!.place).toBe(3);
  });
});

// ─── groupByCategory ─────────────────────────────────────────────────────────

describe("groupByCategory", () => {
  it("single entry → 2 groups (category + absolute)", () => {
    const e = buildClassicEntry("Solo", {
      sex: "M",
      bodyweightKg: 87,
    });
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    const groups = groupByCategory(rows, TEST_MEET);
    // At least 1 category group + absolute group
    expect(groups.length).toBeGreaterThanOrEqual(2);
    const absolute = groups.find((g) => g.label.includes("Абсолютный") || g.label.includes("Absolute"));
    expect(absolute).toBeDefined();
    expect(absolute!.rows).toHaveLength(1);
  });

  it("M/open/M_90 and F/open/F_60 produce separate groups", () => {
    const male = buildClassicEntry("Male", {
      sex: "M",
      bodyweightKg: 87,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const female = buildClassicEntry("Female", {
      sex: "F",
      bodyweightKg: 58,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 60, VOTES_GOOD)]),
      },
    });
    const rows = computeClassicRows([male, female], TEST_MEET, MEET_DATE);
    const groups = groupByCategory(rows, TEST_MEET);

    const maleGroup = groups.find((g) => g.sex === "M" && g.weightCategoryCode !== null);
    const femaleGroup = groups.find((g) => g.sex === "F" && g.weightCategoryCode !== null);

    expect(maleGroup).toBeDefined();
    expect(femaleGroup).toBeDefined();
    expect(maleGroup!.rows).toHaveLength(1);
    expect(femaleGroup!.rows).toHaveLength(1);
  });

  it("absolute group: contains all non-guest rows sorted by isfFinalPoints DESC", () => {
    const e1 = buildClassicEntry("High", {
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 200, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 150, VOTES_GOOD)]),
      },
    });
    const e2 = buildClassicEntry("Low", {
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const guestE = buildClassicEntry("Guest", {
      guest: true,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 999, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 999, VOTES_GOOD)]),
      },
    });
    const rows = computeClassicRows([e1, e2, guestE], TEST_MEET, MEET_DATE);
    const groups = groupByCategory(rows, TEST_MEET);

    const absolute = groups.find((g) => g.label.includes("Абсолютный") || g.label.includes("Absolute"));
    expect(absolute).toBeDefined();
    // Guest excluded from absolute
    expect(absolute!.rows.every((r) => !r.entry.guest)).toBe(true);
    expect(absolute!.rows).toHaveLength(2);
    // First row should have higher or equal isfFinalPoints
    const firstPts = absolute!.rows[0]!.isfFinalPoints;
    const secondPts = absolute!.rows[1]!.isfFinalPoints;
    expect(firstPts).toBeGreaterThanOrEqual(secondPts);
  });

  it("groups sorted: M before F", () => {
    const male = buildClassicEntry("Male", { sex: "M", bodyweightKg: 87 });
    const female = buildClassicEntry("Female", { sex: "F", bodyweightKg: 58 });
    const rows = computeClassicRows([male, female], TEST_MEET, MEET_DATE);
    const groups = groupByCategory(rows, TEST_MEET);

    const nonAbsolute = groups.filter((g) => g.sex !== null);
    const maleIdx = nonAbsolute.findIndex((g) => g.sex === "M");
    const femaleIdx = nonAbsolute.findIndex((g) => g.sex === "F");
    expect(maleIdx).toBeLessThan(femaleIdx);
  });

  it("intra-group placing assigned correctly", () => {
    const e1 = buildClassicEntry("Winner", {
      sex: "M",
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 130, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const e2 = buildClassicEntry("Loser", {
      sex: "M",
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const rows = computeClassicRows([e1, e2], TEST_MEET, MEET_DATE);
    const groups = groupByCategory(rows, TEST_MEET);

    const maleGroup = groups.find((g) => g.sex === "M" && g.weightCategoryCode !== null);
    expect(maleGroup).toBeDefined();
    const winnerRow = maleGroup!.rows.find((r) => r.entry.name === "Winner");
    const loserRow = maleGroup!.rows.find((r) => r.entry.name === "Loser");
    expect(winnerRow?.place).toBe(1);
    expect(loserRow?.place).toBe(2);
  });

  it("guests excluded from absolute group", () => {
    const guest = buildClassicEntry("Guest", {
      guest: true,
      bodyweightKg: 80,
    });
    const rows = computeClassicRows([guest], TEST_MEET, MEET_DATE);
    const groups = groupByCategory(rows, TEST_MEET);
    const absolute = groups.find((g) => g.label.includes("Абсолютный") || g.label.includes("Absolute"));
    // No non-guest rows → no absolute group
    expect(absolute).toBeUndefined();
  });
});

// ─── computeClassicResults ───────────────────────────────────────────────────

describe("computeClassicResults", () => {
  it("empty entries → empty groups", () => {
    const groups = computeClassicResults([], TEST_MEET, MEET_DATE);
    expect(groups).toHaveLength(0);
  });

  it("one classic entry → groups returned", () => {
    const e = buildClassicEntry("One");
    const groups = computeClassicResults([e], TEST_MEET, MEET_DATE);
    expect(groups.length).toBeGreaterThan(0);
  });

  it("non-classic entry not included", () => {
    const e = buildClassicEntry("Multirep", { competitionFormat: "multirep" });
    const groups = computeClassicResults([e], TEST_MEET, MEET_DATE);
    expect(groups).toHaveLength(0);
  });

  it("resolved weight category from bodyweight when not assigned", () => {
    const e = buildClassicEntry("Heavy", {
      sex: "M",
      bodyweightKg: 87, // should resolve to M_90 (82.5–90)
    });
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.resolvedWeightCategoryCode).toBe("M_90");
  });

  it("uses assignedWeightCategoryCode when present", () => {
    const e = buildClassicEntry("Assigned", {
      sex: "M",
      bodyweightKg: 87,
      assignedWeightCategoryCode: "M_100",
    });
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.resolvedWeightCategoryCode).toBe("M_100");
  });

  it("uses assignedAgeCategoryCode when present", () => {
    const e = buildClassicEntry("AgeAssigned", {
      assignedAgeCategoryCode: "masters_m3",
    });
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.resolvedAgeCategoryCode).toBe("masters_m3");
  });

  it("derives age category from birthDate", () => {
    const e = buildClassicEntry("Young", {
      birthDate: "2010-01-01", // 16 years old in 2026 → youth
    });
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.resolvedAgeCategoryCode).toBe("youth");
  });

  it("derives age category from ageOverride", () => {
    const e = buildClassicEntry("Masters", {
      ageOverride: 62, // masters_m5
    });
    const rows = computeClassicRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.resolvedAgeCategoryCode).toBe("masters_m5");
  });

  it("multiple entries in same group: correct intra-group places", () => {
    const entries = [
      buildClassicEntry("Third", {
        sex: "M",
        bodyweightKg: 80,
        exercises: {
          PU: classicExercise("PU", [classicAttempt(1, 80, VOTES_GOOD)]),
          DI: classicExercise("DI", [classicAttempt(1, 60, VOTES_GOOD)]),
        },
      }),
      buildClassicEntry("First", {
        sex: "M",
        bodyweightKg: 80,
        exercises: {
          PU: classicExercise("PU", [classicAttempt(1, 130, VOTES_GOOD)]),
          DI: classicExercise("DI", [classicAttempt(1, 100, VOTES_GOOD)]),
        },
      }),
      buildClassicEntry("Second", {
        sex: "M",
        bodyweightKg: 80,
        exercises: {
          PU: classicExercise("PU", [classicAttempt(1, 110, VOTES_GOOD)]),
          DI: classicExercise("DI", [classicAttempt(1, 90, VOTES_GOOD)]),
        },
      }),
    ];
    const groups = computeClassicResults(entries, TEST_MEET, MEET_DATE);
    const catGroup = groups.find((g) => g.sex === "M" && g.weightCategoryCode !== null);
    expect(catGroup).toBeDefined();

    const first = catGroup!.rows.find((r) => r.entry.name === "First");
    const second = catGroup!.rows.find((r) => r.entry.name === "Second");
    const third = catGroup!.rows.find((r) => r.entry.name === "Third");

    expect(first?.place).toBe(1);
    expect(second?.place).toBe(2);
    expect(third?.place).toBe(3);
  });
});
