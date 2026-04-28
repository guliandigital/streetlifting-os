/**
 * multirep-placing.test.ts — Sprint 3
 *
 * Mirrors classic-placing.test.ts shape. Covers:
 *   - computeMultirepRows: empty, skip non-multirep, reps + total + ISF points
 *   - assignPlacesMultirep: ordering, tiebreaks, vacancies, guests
 *   - groupByCategoryMultirep: multi-group, absolute group, ordering
 */

import { describe, it, expect } from "vitest";
import {
  computeMultirepRows,
  assignPlacesMultirep,
  groupByCategoryMultirep,
  computeMultirepResults,
} from "@logic/isf/multirep-placing";
import {
  buildClassicEntry,
  buildMultirepEntry,
  multirepAttempt,
  multirepExercise,
  VOTES_GOOD,
  VOTES_NO,
} from "./fixtures/builders";
import type { MeetState } from "@domain/models";
import {
  ISF_V51_WEIGHT_CATEGORIES,
  ISF_V51_AGE_CATEGORIES,
  ISF_V51_MULTIREP_PRESETS,
} from "@domain/presets";

const MEET_DATE = "2026-04-27";

const TEST_MEET: MeetState = {
  name: "Test Multirep Meet",
  federation: "ISF",
  country: "RU",
  state: "",
  city: "Moscow",
  date: MEET_DATE,
  competitionFormat: "multirep",
  enabledDisciplineCodes: ["multirep_2lift_24_32"],
  divisions: ["amateur", "pro"],
  ageCategories: [...ISF_V51_AGE_CATEGORIES],
  weightCategories: [...ISF_V51_WEIGHT_CATEGORIES],
  formula: "ISF_POINTS",
  useMastersAdjustment: true,
  lowerBodyweightFirstTiebreak: true,
  inKg: true,
  showAlternateUnits: false,
  multirepConfig: {
    defaultAttemptDurationSec: 120,
    presetLoads: [...ISF_V51_MULTIREP_PRESETS],
  },
};

// ─── computeMultirepRows ──────────────────────────────────────────────────

describe("computeMultirepRows", () => {
  it("returns empty for empty entries", () => {
    expect(computeMultirepRows([], TEST_MEET, MEET_DATE)).toHaveLength(0);
  });

  it("skips non-multirep (classic) entries", () => {
    const c = buildClassicEntry("ClassicGuy");
    expect(computeMultirepRows([c], TEST_MEET, MEET_DATE)).toHaveLength(0);
  });

  it("single entry no attempts: totalReps=0, place=null", () => {
    const e = buildMultirepEntry("Solo");
    const rows = computeMultirepRows([e], TEST_MEET, MEET_DATE);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.totalReps).toBe(0);
    expect(rows[0]!.puReps).toBe(0);
    expect(rows[0]!.diReps).toBe(0);
    expect(rows[0]!.place).toBeNull();
  });

  it("single entry with successful PU+DI: correct reps and total", () => {
    const e = buildMultirepEntry("Full", {
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 15, VOTES_GOOD)]),
        DI: multirepExercise("DI", [multirepAttempt(32, 20, VOTES_GOOD)]),
      },
    });
    const rows = computeMultirepRows([e], TEST_MEET, MEET_DATE);
    const row = rows[0]!;
    expect(row.puReps).toBe(15);
    expect(row.diReps).toBe(20);
    expect(row.totalReps).toBe(35);
  });

  it("failed attempt counts as 0 reps", () => {
    const e = buildMultirepEntry("Fail", {
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 5, VOTES_NO)]),
      },
    });
    const rows = computeMultirepRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.puReps).toBe(0);
    expect(rows[0]!.totalReps).toBe(0);
  });

  it("entryIndex matches position in entries array", () => {
    const a = buildMultirepEntry("A");
    const b = buildMultirepEntry("B");
    const c = buildMultirepEntry("C");
    const rows = computeMultirepRows([a, b, c], TEST_MEET, MEET_DATE);
    expect(rows[0]!.entryIndex).toBe(0);
    expect(rows[1]!.entryIndex).toBe(1);
    expect(rows[2]!.entryIndex).toBe(2);
  });

  it("preset load auto-resolved from presets table (M open amateur PU = 24)", () => {
    const e = buildMultirepEntry("PresetMan", {
      assignedAgeCategoryCode: "open",
      sex: "M",
      division: "amateur",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(null, 12, VOTES_GOOD)]),
      },
    });
    const rows = computeMultirepRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.presetLoadKgPU).toBe(24);
  });

  it("manual override on attempt overrides resolved preset", () => {
    const e = buildMultirepEntry("Override", {
      assignedAgeCategoryCode: "open",
      sex: "M",
      division: "amateur",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(20, 10, VOTES_GOOD)]),
      },
    });
    const rows = computeMultirepRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.presetLoadKgPU).toBe(20);
  });

  it("no preset match → presetLoadKgPU=null (e.g. F pro PU has no preset)", () => {
    const e = buildMultirepEntry("NoPreset", {
      assignedAgeCategoryCode: "open",
      sex: "F",
      division: "pro",
      exercises: {
        PU: multirepExercise("PU", []),
      },
    });
    const rows = computeMultirepRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.presetLoadKgPU).toBeNull();
  });

  it("ISF points: no additional points contribution for multirep (D7)", () => {
    const e = buildMultirepEntry("Points", {
      sex: "M",
      bodyweightKg: 80,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 10, VOTES_GOOD)]),
      },
    });
    const rows = computeMultirepRows([e], TEST_MEET, MEET_DATE);
    const row = rows[0]!;
    // basePoints = reps × coefficient (stub=1) → 10
    expect(row.isfBasePoints).toBe(10);
    // No additional points → finalPoints = basePoints × mastersMult (1.0 for open)
    expect(row.isfFinalPoints).toBe(10);
  });
});

// ─── assignPlacesMultirep ─────────────────────────────────────────────────

describe("assignPlacesMultirep", () => {
  it("empty input returns empty", () => {
    expect(assignPlacesMultirep([])).toHaveLength(0);
  });

  it("single non-guest gets place=1", () => {
    const e = buildMultirepEntry("Solo");
    const rows = computeMultirepRows([e], TEST_MEET, MEET_DATE);
    const placed = assignPlacesMultirep(rows);
    expect(placed[0]!.place).toBe(1);
  });

  it("higher totalReps gets place 1", () => {
    const winner = buildMultirepEntry("Winner", {
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 25, VOTES_GOOD)]),
        DI: multirepExercise("DI", [multirepAttempt(32, 30, VOTES_GOOD)]),
      },
    });
    const loser = buildMultirepEntry("Loser", {
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 10, VOTES_GOOD)]),
        DI: multirepExercise("DI", [multirepAttempt(32, 12, VOTES_GOOD)]),
      },
    });
    const rows = computeMultirepRows([winner, loser], TEST_MEET, MEET_DATE);
    const placed = assignPlacesMultirep(rows);
    expect(placed.find((r) => r.entry.name === "Winner")?.place).toBe(1);
    expect(placed.find((r) => r.entry.name === "Loser")?.place).toBe(2);
  });

  it("tiebreak by bodyweight ASC when reps equal", () => {
    const lighter = buildMultirepEntry("Lighter", {
      bodyweightKg: 70,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 15, VOTES_GOOD)]),
      },
    });
    const heavier = buildMultirepEntry("Heavier", {
      bodyweightKg: 90,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 15, VOTES_GOOD)]),
      },
    });
    const rows = computeMultirepRows([lighter, heavier], TEST_MEET, MEET_DATE);
    const placed = assignPlacesMultirep(rows);
    expect(placed.find((r) => r.entry.name === "Lighter")?.place).toBe(1);
    expect(placed.find((r) => r.entry.name === "Heavier")?.place).toBe(2);
  });

  it("guest entry: place=null and sorted after placed athletes", () => {
    const guest = buildMultirepEntry("Guest", {
      guest: true,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 99, VOTES_GOOD)]),
      },
    });
    const competitor = buildMultirepEntry("Competitor", {
      assignedAgeCategoryCode: "open",
    });
    const rows = computeMultirepRows([guest, competitor], TEST_MEET, MEET_DATE);
    const placed = assignPlacesMultirep(rows);

    expect(placed.find((r) => r.entry.name === "Guest")?.place).toBeNull();
    expect(placed.find((r) => r.entry.name === "Competitor")?.place).toBe(1);
    const guestIdx = placed.findIndex((r) => r.entry.name === "Guest");
    const compIdx = placed.findIndex((r) => r.entry.name === "Competitor");
    expect(guestIdx).toBeGreaterThan(compIdx);
  });

  it("tie + vacancy: two tied for place 1, third gets place 3", () => {
    const a = buildMultirepEntry("A", {
      bodyweightKg: 80,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 15, VOTES_GOOD)]),
      },
    });
    const b = buildMultirepEntry("B", {
      bodyweightKg: 80,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 15, VOTES_GOOD)]),
      },
    });
    const c = buildMultirepEntry("C", {
      bodyweightKg: 80,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 10, VOTES_GOOD)]),
      },
    });
    const rows = computeMultirepRows([a, b, c], TEST_MEET, MEET_DATE);
    const placed = assignPlacesMultirep(rows);
    expect(placed.find((r) => r.entry.name === "A")?.place).toBe(1);
    expect(placed.find((r) => r.entry.name === "B")?.place).toBe(1);
    expect(placed.find((r) => r.entry.name === "C")?.place).toBe(3);
  });

  it("sequential places without ties", () => {
    const entries = [
      buildMultirepEntry("P1", {
        bodyweightKg: 80,
        assignedAgeCategoryCode: "open",
        exercises: {
          PU: multirepExercise("PU", [multirepAttempt(24, 30, VOTES_GOOD)]),
        },
      }),
      buildMultirepEntry("P2", {
        bodyweightKg: 80,
        assignedAgeCategoryCode: "open",
        exercises: {
          PU: multirepExercise("PU", [multirepAttempt(24, 20, VOTES_GOOD)]),
        },
      }),
      buildMultirepEntry("P3", {
        bodyweightKg: 80,
        assignedAgeCategoryCode: "open",
        exercises: {
          PU: multirepExercise("PU", [multirepAttempt(24, 10, VOTES_GOOD)]),
        },
      }),
    ];
    const rows = computeMultirepRows(entries, TEST_MEET, MEET_DATE);
    const placed = assignPlacesMultirep(rows);
    expect(placed[0]!.place).toBe(1);
    expect(placed[1]!.place).toBe(2);
    expect(placed[2]!.place).toBe(3);
  });

  it("vacantNextPlace flag set on tied row before vacant place", () => {
    const a = buildMultirepEntry("A", {
      bodyweightKg: 80,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 15, VOTES_GOOD)]),
      },
    });
    const b = buildMultirepEntry("B", {
      bodyweightKg: 80,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 15, VOTES_GOOD)]),
      },
    });
    const c = buildMultirepEntry("C", {
      bodyweightKg: 80,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 10, VOTES_GOOD)]),
      },
    });
    const rows = computeMultirepRows([a, b, c], TEST_MEET, MEET_DATE);
    const placed = assignPlacesMultirep(rows);
    expect(placed.some((r) => r.vacantNextPlace)).toBe(true);
  });
});

// ─── groupByCategoryMultirep ──────────────────────────────────────────────

describe("groupByCategoryMultirep", () => {
  it("single entry → ≥2 groups (category + absolute)", () => {
    const e = buildMultirepEntry("Solo", {
      sex: "M",
      bodyweightKg: 87,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 10, VOTES_GOOD)]),
      },
    });
    const rows = computeMultirepRows([e], TEST_MEET, MEET_DATE);
    const groups = groupByCategoryMultirep(rows, TEST_MEET);
    expect(groups.length).toBeGreaterThanOrEqual(2);
    const absolute = groups.find((g) =>
      g.label.includes("Абсолютный") || g.label.includes("Absolute"),
    );
    expect(absolute).toBeDefined();
    expect(absolute!.rows).toHaveLength(1);
  });

  it("M and F produce separate groups", () => {
    const m = buildMultirepEntry("Male", {
      sex: "M",
      bodyweightKg: 87,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 10, VOTES_GOOD)]),
      },
    });
    const f = buildMultirepEntry("Female", {
      sex: "F",
      bodyweightKg: 58,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(12, 10, VOTES_GOOD)]),
      },
    });
    const rows = computeMultirepRows([m, f], TEST_MEET, MEET_DATE);
    const groups = groupByCategoryMultirep(rows, TEST_MEET);

    const maleGroup = groups.find(
      (g) => g.sex === "M" && g.weightCategoryCode !== null,
    );
    const femaleGroup = groups.find(
      (g) => g.sex === "F" && g.weightCategoryCode !== null,
    );
    expect(maleGroup).toBeDefined();
    expect(femaleGroup).toBeDefined();
  });

  it("absolute group: guests excluded, sorted by isfFinalPoints DESC", () => {
    const e1 = buildMultirepEntry("High", {
      bodyweightKg: 80,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 30, VOTES_GOOD)]),
        DI: multirepExercise("DI", [multirepAttempt(32, 25, VOTES_GOOD)]),
      },
    });
    const e2 = buildMultirepEntry("Low", {
      bodyweightKg: 80,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 5, VOTES_GOOD)]),
      },
    });
    const guest = buildMultirepEntry("Guest", {
      guest: true,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 999, VOTES_GOOD)]),
      },
    });
    const rows = computeMultirepRows([e1, e2, guest], TEST_MEET, MEET_DATE);
    const groups = groupByCategoryMultirep(rows, TEST_MEET);

    const absolute = groups.find((g) =>
      g.label.includes("Абсолютный") || g.label.includes("Absolute"),
    );
    expect(absolute).toBeDefined();
    expect(absolute!.rows.every((r) => !r.entry.guest)).toBe(true);
    expect(absolute!.rows[0]!.isfFinalPoints).toBeGreaterThanOrEqual(
      absolute!.rows[1]!.isfFinalPoints,
    );
  });

  it("groups sorted: M before F", () => {
    const m = buildMultirepEntry("Male", {
      sex: "M",
      bodyweightKg: 87,
      assignedAgeCategoryCode: "open",
    });
    const f = buildMultirepEntry("Female", {
      sex: "F",
      bodyweightKg: 58,
      assignedAgeCategoryCode: "open",
    });
    const rows = computeMultirepRows([m, f], TEST_MEET, MEET_DATE);
    const groups = groupByCategoryMultirep(rows, TEST_MEET);
    const nonAbsolute = groups.filter((g) => g.sex !== null);
    const maleIdx = nonAbsolute.findIndex((g) => g.sex === "M");
    const femaleIdx = nonAbsolute.findIndex((g) => g.sex === "F");
    expect(maleIdx).toBeLessThan(femaleIdx);
  });

  it("intra-group placing assigned correctly", () => {
    const e1 = buildMultirepEntry("Winner", {
      sex: "M",
      bodyweightKg: 80,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 30, VOTES_GOOD)]),
      },
    });
    const e2 = buildMultirepEntry("Loser", {
      sex: "M",
      bodyweightKg: 80,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 10, VOTES_GOOD)]),
      },
    });
    const rows = computeMultirepRows([e1, e2], TEST_MEET, MEET_DATE);
    const groups = groupByCategoryMultirep(rows, TEST_MEET);
    const grp = groups.find(
      (g) => g.sex === "M" && g.weightCategoryCode !== null,
    );
    expect(grp).toBeDefined();
    const winner = grp!.rows.find((r) => r.entry.name === "Winner");
    const loser = grp!.rows.find((r) => r.entry.name === "Loser");
    expect(winner?.place).toBe(1);
    expect(loser?.place).toBe(2);
  });

  it("guests excluded from absolute group", () => {
    const guest = buildMultirepEntry("Guest", {
      guest: true,
      assignedAgeCategoryCode: "open",
    });
    const rows = computeMultirepRows([guest], TEST_MEET, MEET_DATE);
    const groups = groupByCategoryMultirep(rows, TEST_MEET);
    const absolute = groups.find((g) =>
      g.label.includes("Абсолютный") || g.label.includes("Absolute"),
    );
    expect(absolute).toBeUndefined();
  });
});

// ─── computeMultirepResults ──────────────────────────────────────────────

describe("computeMultirepResults", () => {
  it("empty entries → empty groups", () => {
    expect(computeMultirepResults([], TEST_MEET, MEET_DATE)).toHaveLength(0);
  });

  it("one multirep entry → groups returned", () => {
    const e = buildMultirepEntry("One", {
      assignedAgeCategoryCode: "open",
    });
    const groups = computeMultirepResults([e], TEST_MEET, MEET_DATE);
    expect(groups.length).toBeGreaterThan(0);
  });

  it("classic entry not included", () => {
    const c = buildClassicEntry("Classic");
    const groups = computeMultirepResults([c], TEST_MEET, MEET_DATE);
    expect(groups).toHaveLength(0);
  });

  it("PU-only event entry counts only PU reps", () => {
    const e = buildMultirepEntry("PUOnly", {
      event: "PU",
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 12, VOTES_GOOD)]),
      },
    });
    const rows = computeMultirepRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.puReps).toBe(12);
    expect(rows[0]!.diReps).toBe(0);
    expect(rows[0]!.totalReps).toBe(12);
  });

  it("DI-only event entry counts only DI reps", () => {
    const e = buildMultirepEntry("DIOnly", {
      event: "DI",
      assignedAgeCategoryCode: "open",
      exercises: {
        DI: multirepExercise("DI", [multirepAttempt(32, 18, VOTES_GOOD)]),
      },
    });
    const rows = computeMultirepRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.puReps).toBe(0);
    expect(rows[0]!.diReps).toBe(18);
    expect(rows[0]!.totalReps).toBe(18);
  });

  it("PUDI event combines both reps", () => {
    const e = buildMultirepEntry("PUDI", {
      event: "PUDI",
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 10, VOTES_GOOD)]),
        DI: multirepExercise("DI", [multirepAttempt(32, 15, VOTES_GOOD)]),
      },
    });
    const rows = computeMultirepRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.totalReps).toBe(25);
  });

  it("derives age category from birthDate", () => {
    const e = buildMultirepEntry("Young", {
      birthDate: "2010-01-01", // 16 in 2026 → youth
    });
    const rows = computeMultirepRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.resolvedAgeCategoryCode).toBe("youth");
  });

  it("derives age category from ageOverride", () => {
    const e = buildMultirepEntry("Master", {
      ageOverride: 62, // → masters_m5
    });
    const rows = computeMultirepRows([e], TEST_MEET, MEET_DATE);
    expect(rows[0]!.resolvedAgeCategoryCode).toBe("masters_m5");
  });
});
