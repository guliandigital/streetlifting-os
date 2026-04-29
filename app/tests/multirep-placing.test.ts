/**
 * multirep-placing.test.ts — Sprint 3
 *
 * Tests for the Multirep placing service.
 */

import { describe, it, expect } from "vitest";
import {
  computeMultirepResultContracts,
  computeMultirepResults,
  computeMultirepRows,
} from "@logic/isf/multirep-placing";
import {
  buildMultirepEntry,
  multirepAttempt,
  multirepExercise,
  VOTES_GOOD,
  VOTES_NO,
  VOTES_PENDING,
} from "./fixtures/builders";
import type { MeetState } from "@domain/models";
import {
  ISF_V51_AGE_CATEGORIES,
  ISF_V51_MULTIREP_PRESETS,
  ISF_V51_RULES_PACK_REF,
  ISF_V51_WEIGHT_CATEGORIES,
} from "@domain/presets";

// ─── Test meet state ────────────────────────────────────────────────────────

function buildTestMeet(overrides: Partial<MeetState> = {}): MeetState {
  return {
    name: "Test Multirep Meet",
    federation: "ISF",
    country: "RU",
    state: "",
    city: "Moscow",
    date: "2026-04-27",
    rulesPackRef: { ...ISF_V51_RULES_PACK_REF },
    competitionFormat: "multirep",
    enabledDisciplineCodes: [
      "multirep_2lift_16_24",
      "multirep_pu_8",
      "multirep_di_12",
    ],
    divisions: ["amateur", "pro"],
    ageCategories: [...ISF_V51_AGE_CATEGORIES],
    weightCategories: [...ISF_V51_WEIGHT_CATEGORIES],
    formula: "RESULT_X_COEFFICIENT",
    useMastersAdjustment: false,
    lowerBodyweightFirstTiebreak: true,
    inKg: true,
    showAlternateUnits: false,
    multirepConfig: {
      defaultAttemptDurationSec: 120,
      presetLoads: [...ISF_V51_MULTIREP_PRESETS],
    },
    ...overrides,
  };
}

const MEET = buildTestMeet();
const MEET_DATE = "2026-04-27";

// ─── computeMultirepResults — empty ─────────────────────────────────────────

describe("computeMultirepResults — empty", () => {
  it("returns empty groups for empty entries", () => {
    expect(computeMultirepResults([], MEET, MEET_DATE)).toHaveLength(0);
  });

  it("ignores classic entries", () => {
    // Classic entries should produce no groups
    const classicLike = buildMultirepEntry("Classic", {
      competitionFormat: "classic" as const,
      disciplineCode: "classic_2lift",
      event: "PUDI",
      exercises: {},
    });
    const results = computeMultirepResults([classicLike], MEET, MEET_DATE);
    expect(results).toHaveLength(0);
  });
});

// ─── Single entry, no attempt ────────────────────────────────────────────────

describe("single entry, no attempt started", () => {
  it("produces one group, one row, totalReps=0, place=1 (only entry)", () => {
    const entry = buildMultirepEntry("Alice", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: {
        PU: multirepExercise("PU", []),
      },
    });
    const groups = computeMultirepResults([entry], MEET, MEET_DATE);
    expect(groups).toHaveLength(1);
    const row = groups[0]?.rows[0];
    expect(row).toBeDefined();
    expect(row!.totalReps).toBe(0);
    expect(row!.place).toBe(1); // only non-guest entry
    expect(row!.attemptStatus).toBe("not_started");
  });

  it("two entries no attempts — lighter athlete wins tiebreak (both assigned same weight cat)", () => {
    const light = buildMultirepEntry("Light", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      bodyweightKg: 75,
      assignedWeightCategoryCode: "M_82_5",
      exercises: { PU: multirepExercise("PU", []) },
    });
    const heavy = buildMultirepEntry("Heavy", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      bodyweightKg: 80,
      assignedWeightCategoryCode: "M_82_5",
      exercises: { PU: multirepExercise("PU", []) },
    });
    const groups = computeMultirepResults([light, heavy], MEET, MEET_DATE);
    expect(groups).toHaveLength(1);
    const rows = groups[0]?.rows;
    expect(rows).toHaveLength(2);
    // Both have totalReps=0; lighter BW wins → light gets place 1
    const lightRow = rows!.find((r) => r.entry.name === "Light");
    const heavyRow = rows!.find((r) => r.entry.name === "Heavy");
    expect(lightRow!.place).toBe(1);
    expect(heavyRow!.place).toBe(2);
  });
});

// ─── Successful attempt ───────────────────────────────────────────────────────

describe("successful multirep attempt", () => {
  it("PU only: puReps set, diReps=0, totalReps=puReps", () => {
    const entry = buildMultirepEntry("Bob", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(12, VOTES_GOOD, 8)]),
      },
    });
    const groups = computeMultirepResults([entry], MEET, MEET_DATE);
    const row = groups[0]?.rows[0];
    expect(row!.puReps).toBe(12);
    expect(row!.diReps).toBe(0);
    expect(row!.totalReps).toBe(12);
    expect(row!.presetLoadKgPu).toBe(8);
    expect(row!.presetLoadKgDi).toBeNull();
    expect(row!.attemptStatus).toBe("success");
  });

  it("DI only: diReps set, puReps=0", () => {
    const entry = buildMultirepEntry("Carol", {
      disciplineCode: "multirep_di_12",
      event: "DI",
      exercises: {
        DI: multirepExercise("DI", [multirepAttempt(20, VOTES_GOOD, 12)]),
      },
    });
    const groups = computeMultirepResults([entry], MEET, MEET_DATE);
    const row = groups[0]?.rows[0];
    expect(row!.diReps).toBe(20);
    expect(row!.puReps).toBe(0);
    expect(row!.totalReps).toBe(20);
    expect(row!.presetLoadKgDi).toBe(12);
    expect(row!.presetLoadKgPu).toBeNull();
  });

  it("PUDI: 12 PU reps + 20 DI reps = totalReps=32", () => {
    const entry = buildMultirepEntry("Dave", {
      disciplineCode: "multirep_2lift_16_24",
      event: "PUDI",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(12, VOTES_GOOD, 16)]),
        DI: multirepExercise("DI", [multirepAttempt(20, VOTES_GOOD, 24)]),
      },
    });
    const groups = computeMultirepResults([entry], MEET, MEET_DATE);
    const row = groups[0]?.rows[0];
    expect(row!.puReps).toBe(12);
    expect(row!.diReps).toBe(20);
    expect(row!.totalReps).toBe(32);
    expect(row!.presetLoadKgPu).toBe(16);
    expect(row!.presetLoadKgDi).toBe(24);
  });
});

// ─── Failed attempt ───────────────────────────────────────────────────────────

describe("failed multirep attempt", () => {
  it("failed attempt: totalReps stays 0", () => {
    const entry = buildMultirepEntry("Fail", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(5, VOTES_NO)]),
      },
    });
    const groups = computeMultirepResults([entry], MEET, MEET_DATE);
    const row = groups[0]?.rows[0];
    expect(row!.puReps).toBe(0);
    expect(row!.totalReps).toBe(0);
    expect(row!.attemptStatus).toBe("fail");
  });

  it("failed athlete ranked below successful athlete", () => {
    const success = buildMultirepEntry("Success", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(15, VOTES_GOOD)]),
      },
    });
    const fail = buildMultirepEntry("Fail", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(0, VOTES_NO)]),
      },
    });
    const groups = computeMultirepResults([success, fail], MEET, MEET_DATE);
    const rows = groups[0]?.rows;
    const successRow = rows!.find((r) => r.entry.name === "Success");
    const failRow = rows!.find((r) => r.entry.name === "Fail");
    expect(successRow!.place).toBe(1);
    expect(failRow!.place).toBe(2);
  });
});

// ─── Placing: more reps = better ─────────────────────────────────────────────

describe("placing rules", () => {
  it("more reps → higher place (lower number)", () => {
    const a = buildMultirepEntry("A", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: { PU: multirepExercise("PU", [multirepAttempt(20, VOTES_GOOD)]) },
    });
    const b = buildMultirepEntry("B", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: { PU: multirepExercise("PU", [multirepAttempt(10, VOTES_GOOD)]) },
    });
    const groups = computeMultirepResults([a, b], MEET, MEET_DATE);
    const rows = groups[0]?.rows;
    expect(rows!.find((r) => r.entry.name === "A")?.place).toBe(1);
    expect(rows!.find((r) => r.entry.name === "B")?.place).toBe(2);
  });

  it("tiebreak: same total, lighter BW wins (same weight category)", () => {
    const heavy = buildMultirepEntry("Heavy", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      bodyweightKg: 80,
      assignedWeightCategoryCode: "M_82_5",
      exercises: { PU: multirepExercise("PU", [multirepAttempt(15, VOTES_GOOD)]) },
    });
    const light = buildMultirepEntry("Light", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      bodyweightKg: 75,
      assignedWeightCategoryCode: "M_82_5",
      exercises: { PU: multirepExercise("PU", [multirepAttempt(15, VOTES_GOOD)]) },
    });
    const groups = computeMultirepResults([heavy, light], MEET, MEET_DATE);
    const rows = groups[0]?.rows;
    expect(rows).toHaveLength(2);
    expect(rows!.find((r) => r.entry.name === "Light")?.place).toBe(1);
    expect(rows!.find((r) => r.entry.name === "Heavy")?.place).toBe(2);
  });

  it("guest: place=null, sorted after placed athletes", () => {
    const guest = buildMultirepEntry("Guest", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      guest: true,
      exercises: { PU: multirepExercise("PU", [multirepAttempt(25, VOTES_GOOD)]) },
    });
    const nonGuest = buildMultirepEntry("Official", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: { PU: multirepExercise("PU", [multirepAttempt(10, VOTES_GOOD)]) },
    });
    const groups = computeMultirepResults([guest, nonGuest], MEET, MEET_DATE);
    const rows = groups[0]?.rows;
    const guestRow = rows!.find((r) => r.entry.name === "Guest");
    const officialRow = rows!.find((r) => r.entry.name === "Official");
    expect(guestRow!.place).toBeNull();
    expect(officialRow!.place).toBe(1);
    // Guest should appear after the placed athletes
    const guestIdx = rows!.indexOf(guestRow!);
    const officialIdx = rows!.indexOf(officialRow!);
    expect(guestIdx).toBeGreaterThan(officialIdx);
  });

  it("tied athletes get same place, next place is vacant (all same category)", () => {
    const a = buildMultirepEntry("A", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      bodyweightKg: 80,
      assignedWeightCategoryCode: "M_82_5",
      exercises: { PU: multirepExercise("PU", [multirepAttempt(15, VOTES_GOOD)]) },
    });
    const b = buildMultirepEntry("B", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      bodyweightKg: 80,
      assignedWeightCategoryCode: "M_82_5",
      exercises: { PU: multirepExercise("PU", [multirepAttempt(15, VOTES_GOOD)]) },
    });
    const c = buildMultirepEntry("C", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      bodyweightKg: 80,
      assignedWeightCategoryCode: "M_82_5",
      exercises: { PU: multirepExercise("PU", [multirepAttempt(10, VOTES_GOOD)]) },
    });
    const groups = computeMultirepResults([a, b, c], MEET, MEET_DATE);
    const rows = groups[0]?.rows;
    expect(rows).toHaveLength(3);
    const rowA = rows!.find((r) => r.entry.name === "A")!;
    const rowB = rows!.find((r) => r.entry.name === "B")!;
    const rowC = rows!.find((r) => r.entry.name === "C")!;
    // A and B tied at place 1; C gets place 3 (place 2 vacant)
    expect(rowA.place).toBe(1);
    expect(rowB.place).toBe(1);
    expect(rowB.tiedWithPrev).toBe(true);
    expect(rowC.place).toBe(3);
    // One of the tied rows should have vacantNextPlace=true
    const hasVacant = rowA.vacantNextPlace || rowB.vacantNextPlace;
    expect(hasVacant).toBe(true);
  });
});

// ─── Multiple discipline groups ──────────────────────────────────────────────

describe("multiple discipline groups", () => {
  it("produces separate groups for different discipline codes", () => {
    const pu = buildMultirepEntry("PU Athlete", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: { PU: multirepExercise("PU", [multirepAttempt(10, VOTES_GOOD)]) },
    });
    const di = buildMultirepEntry("DI Athlete", {
      disciplineCode: "multirep_di_12",
      event: "DI",
      exercises: { DI: multirepExercise("DI", [multirepAttempt(20, VOTES_GOOD)]) },
    });
    const groups = computeMultirepResults([pu, di], MEET, MEET_DATE);
    expect(groups).toHaveLength(2);
    const codes = groups.map((g) => g.disciplineCode);
    expect(codes).toContain("multirep_pu_8");
    expect(codes).toContain("multirep_di_12");
  });

  it("multirep_2lift_16_24 and multirep_pu_8 produce separate groups", () => {
    const twoLift = buildMultirepEntry("Two-lift Athlete", {
      disciplineCode: "multirep_2lift_16_24",
      event: "PUDI",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(12, VOTES_GOOD)]),
        DI: multirepExercise("DI", [multirepAttempt(20, VOTES_GOOD)]),
      },
    });
    const puOnly = buildMultirepEntry("PU Athlete", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: { PU: multirepExercise("PU", [multirepAttempt(15, VOTES_GOOD)]) },
    });
    const groups = computeMultirepResults([twoLift, puOnly], MEET, MEET_DATE);
    expect(groups).toHaveLength(2);
    const g2lift = groups.find((g) => g.disciplineCode === "multirep_2lift_16_24");
    const gPU = groups.find((g) => g.disciplineCode === "multirep_pu_8");
    expect(g2lift).toBeDefined();
    expect(gPU).toBeDefined();
    expect(g2lift!.rows).toHaveLength(1);
    expect(gPU!.rows).toHaveLength(1);
  });

  it("group label contains human-readable discipline name", () => {
    const entry = buildMultirepEntry("A", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: { PU: multirepExercise("PU", []) },
    });
    const groups = computeMultirepResults([entry], MEET, MEET_DATE);
    // Should contain the Russian and English label in the group label
    expect(groups[0]?.disciplineLabelEn).toBe("Pull-Ups with 8 kg");
    expect(groups[0]?.disciplineLabelRu).toBe("Подтягивания с 8 кг");
    // Label should include both discipline names
    expect(groups[0]?.label).toContain("Pull-Ups with 8 kg");
    expect(groups[0]?.label).toContain("Подтягивания с 8 кг");
  });
});

// ─── Row fields ──────────────────────────────────────────────────────────────

describe("computeMultirepRows — field population", () => {
  it("noRepCount is reported separately and does not reduce accepted reps", () => {
    const entry = buildMultirepEntry("NoRep", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(12, VOTES_GOOD, 8, 4)]),
      },
    });

    const rows = computeMultirepRows([entry], MEET, MEET_DATE);

    expect(rows[0]?.puReps).toBe(12);
    expect(rows[0]?.totalReps).toBe(12);
    expect(rows[0]?.noRepCount).toBe(4);
  });

  it("noRepCount: sum of noRepCount across exercises", () => {
    const entry = buildMultirepEntry("A", {
      disciplineCode: "multirep_2lift_16_24",
      event: "PUDI",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(10, VOTES_GOOD, 16, 2)]),
        DI: multirepExercise("DI", [multirepAttempt(15, VOTES_GOOD, 24, 3)]),
      },
    });
    const rows = computeMultirepRows([entry], MEET, MEET_DATE);
    expect(rows[0]?.noRepCount).toBe(5);
  });

  it("pendingAttempt status = 'pending'", () => {
    const entry = buildMultirepEntry("Pending", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(10, VOTES_PENDING)]),
      },
    });
    const rows = computeMultirepRows([entry], MEET, MEET_DATE);
    expect(rows[0]?.attemptStatus).toBe("pending");
  });

  it("isfCoefficient and isfFinalPoints are numbers (even if stub 1.0)", () => {
    const entry = buildMultirepEntry("ISF", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(10, VOTES_GOOD)]),
      },
    });
    const rows = computeMultirepRows([entry], MEET, MEET_DATE);
    expect(typeof rows[0]?.isfCoefficient).toBe("number");
    expect(typeof rows[0]?.isfFinalPoints).toBe("number");
  });

  it("multirep ISF points use reps × coefficient without Classic additional points", () => {
    const entry = buildMultirepEntry("Points", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      bodyweightKg: 140,
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(10, VOTES_GOOD, 8)]),
      },
    });

    const rows = computeMultirepRows([entry], MEET, MEET_DATE);

    expect(rows[0]?.isfFinalPoints).toBeCloseTo(
      rows[0]!.totalReps * rows[0]!.isfCoefficient,
      8,
    );
  });
});

describe("Multirep result contract", () => {
  it("returns export-ready contracts without embedding Entry objects", () => {
    const entry = buildMultirepEntry("Contract", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(9, VOTES_GOOD, 8, 1)]),
      },
    });

    const contracts = computeMultirepResultContracts([entry], MEET, MEET_DATE);

    expect(contracts).toHaveLength(1);
    expect(contracts[0]).toMatchObject({
      format: "multirep",
      entryId: entry.id,
      athleteName: "Contract",
      disciplineCode: "multirep_pu_8",
      event: "PU",
      puReps: 9,
      diReps: 0,
      totalReps: 9,
      noRepCount: 1,
      place: 1,
      attemptStatus: "success",
    });
    expect("entry" in contracts[0]!).toBe(false);
    expect(contracts[0]?.exercises).toEqual([
      {
        exercise: "PU",
        presetLoadKg: 8,
        reps: 9,
        noRepCount: 1,
        durationSec: 120,
        status: "success",
      },
    ]);
  });

  it("preserves tie metadata in the serializable contract", () => {
    const a = buildMultirepEntry("A", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      bodyweightKg: 80,
      assignedWeightCategoryCode: "M_82_5",
      exercises: { PU: multirepExercise("PU", [multirepAttempt(10, VOTES_GOOD)]) },
    });
    const b = buildMultirepEntry("B", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      bodyweightKg: 80,
      assignedWeightCategoryCode: "M_82_5",
      exercises: { PU: multirepExercise("PU", [multirepAttempt(10, VOTES_GOOD)]) },
    });
    const c = buildMultirepEntry("C", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      bodyweightKg: 80,
      assignedWeightCategoryCode: "M_82_5",
      exercises: { PU: multirepExercise("PU", [multirepAttempt(5, VOTES_GOOD)]) },
    });

    const contracts = computeMultirepResultContracts([a, b, c], MEET, MEET_DATE);

    expect(contracts.map((r) => r.place)).toEqual([1, 1, 3]);
    expect(contracts[1]?.tiedWithPrev).toBe(true);
    expect(contracts.some((r) => r.vacantNextPlace)).toBe(true);
  });
});
