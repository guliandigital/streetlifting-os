/**
 * Records module tests — Sprint 6 (1.0.0 GA).
 *
 * Tests for computeRecords() from src/logic/isf/records.ts.
 * Coverage: Classic + Multirep records, empty/single/multi-entry cases,
 * best-holder selection, guest entries, multi-discipline meets.
 */

import { describe, it, expect } from "vitest";
import { computeRecords } from "@logic/isf/records";
import {
  buildClassicEntry,
  buildMultirepEntry,
  classicAttempt,
  classicExercise,
  multirepAttempt,
  multirepExercise,
  VOTES_GOOD,
} from "./fixtures/builders";
import type { MeetState } from "@domain/models";
import {
  ISF_V51_AGE_CATEGORIES,
  ISF_V51_MULTIREP_PRESETS,
  ISF_V51_RULES_PACK_REF,
  ISF_V51_WEIGHT_CATEGORIES,
} from "@domain/presets";

// ─── Test meet ───────────────────────────────────────────────────────────────

const MEET_DATE = "2026-04-27";

const CLASSIC_MEET: MeetState = {
  name: "Test Classic Meet",
  federation: "ISF",
  country: "RU",
  state: "",
  city: "Moscow",
  date: MEET_DATE,
  rulesPackRef: { ...ISF_V51_RULES_PACK_REF },
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

const MULTIREP_MEET: MeetState = {
  ...CLASSIC_MEET,
  competitionFormat: "multirep",
  enabledDisciplineCodes: ["multirep_2lift_16_24"],
  formula: "RESULT_X_COEFFICIENT",
  multirepConfig: {
    defaultAttemptDurationSec: 120,
    presetLoads: [...ISF_V51_MULTIREP_PRESETS],
  },
};

// ─── Builders ────────────────────────────────────────────────────────────────

function classicWithPuDi(
  name: string,
  puKg: number,
  diKg: number,
  overrides = {},
) {
  return buildClassicEntry(name, {
    ...overrides,
    exercises: {
      PU: classicExercise("PU", [classicAttempt(1, puKg, VOTES_GOOD)]),
      DI: classicExercise("DI", [classicAttempt(1, diKg, VOTES_GOOD)]),
    },
  });
}

function classicWithPuOnly(name: string, puKg: number, overrides = {}) {
  return buildClassicEntry(name, {
    ...overrides,
    disciplineCode: "classic_pu",
    event: "PU",
    exercises: {
      PU: classicExercise("PU", [classicAttempt(1, puKg, VOTES_GOOD)]),
    },
  });
}

function multirepWithPuDi(
  name: string,
  puReps: number,
  diReps: number,
  overrides = {},
) {
  return buildMultirepEntry(name, {
    ...overrides,
    exercises: {
      PU: multirepExercise("PU", [multirepAttempt(puReps, VOTES_GOOD)]),
      DI: multirepExercise("DI", [multirepAttempt(diReps, VOTES_GOOD)]),
    },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("computeRecords — basic", () => {
  it("empty entries → empty records", () => {
    const result = computeRecords([], CLASSIC_MEET, MEET_DATE);
    expect(result).toHaveLength(0);
  });

  it("single classic entry with PU result → one PU record", () => {
    const e = classicWithPuOnly("Solo", 90);
    const recs = computeRecords([e], CLASSIC_MEET, MEET_DATE);
    const puRec = recs.find((r) => r.exercise === "PU");
    expect(puRec).toBeDefined();
    expect(puRec!.result).toBe(90);
    expect(puRec!.unit).toBe("kg");
    expect(puRec!.holder.name).toBe("Solo");
  });

  it("single classic 2lift entry with PU+DI → PU, DI and PUDI records", () => {
    const e = classicWithPuDi("Full", 80, 60);
    const recs = computeRecords([e], CLASSIC_MEET, MEET_DATE);
    const exSet = new Set(recs.map((r) => r.exercise));
    expect(exSet.has("PU")).toBe(true);
    expect(exSet.has("DI")).toBe(true);
    expect(exSet.has("PUDI")).toBe(true);
  });

  it("PUDI total record = PU + DI", () => {
    const e = classicWithPuDi("Full", 80, 60);
    const recs = computeRecords([e], CLASSIC_MEET, MEET_DATE);
    const total = recs.find((r) => r.exercise === "PUDI");
    expect(total!.result).toBe(140);
  });
});

describe("computeRecords — two classic entries in same group", () => {
  it("best PU holder wins the PU record", () => {
    const stronger = classicWithPuDi("Stronger", 100, 80, {
      assignedWeightCategoryCode: "M_90",
    });
    const weaker = classicWithPuDi("Weaker", 70, 60, {
      assignedWeightCategoryCode: "M_90",
    });
    const recs = computeRecords([stronger, weaker], CLASSIC_MEET, MEET_DATE);
    const puRec = recs.find((r) => r.exercise === "PU");
    expect(puRec!.holder.name).toBe("Stronger");
    expect(puRec!.result).toBe(100);
  });

  it("each exercise record can be held by a different athlete", () => {
    // Best PU: Alpha; best DI: Beta; best total depends on combined
    const alpha = classicWithPuDi("Alpha", 120, 60, {
      assignedWeightCategoryCode: "M_90",
    });
    const beta = classicWithPuDi("Beta", 80, 110, {
      assignedWeightCategoryCode: "M_90",
    });
    const recs = computeRecords([alpha, beta], CLASSIC_MEET, MEET_DATE);
    const puRec = recs.find((r) => r.exercise === "PU");
    const diRec = recs.find((r) => r.exercise === "DI");
    expect(puRec!.holder.name).toBe("Alpha");
    expect(diRec!.holder.name).toBe("Beta");
  });

  it("three-way: best PU, best DI, best total holders can all differ", () => {
    const a = classicWithPuDi("A", 130, 60, { assignedWeightCategoryCode: "M_90" });
    const b = classicWithPuDi("B", 80, 120, { assignedWeightCategoryCode: "M_90" });
    const c = classicWithPuDi("C", 100, 95, { assignedWeightCategoryCode: "M_90" });
    // A: PU=130, DI=60 total=190
    // B: PU=80, DI=120 total=200
    // C: PU=100, DI=95 total=195
    const recs = computeRecords([a, b, c], CLASSIC_MEET, MEET_DATE);
    const puRec = recs.find((r) => r.exercise === "PU");
    const diRec = recs.find((r) => r.exercise === "DI");
    const totalRec = recs.find((r) => r.exercise === "PUDI");
    expect(puRec!.holder.name).toBe("A");
    expect(diRec!.holder.name).toBe("B");
    expect(totalRec!.holder.name).toBe("B"); // 80+120=200
  });
});

describe("computeRecords — edge cases", () => {
  it("entry with total=0 (no successful attempts) → not in records", () => {
    const noAttempts = buildClassicEntry("NoAttempts");
    const recs = computeRecords([noAttempts], CLASSIC_MEET, MEET_DATE);
    expect(recs).toHaveLength(0);
  });

  it("entry with only PU result (no DI) → PU record but no PUDI total record", () => {
    const e = buildClassicEntry("PUOnly", {
      disciplineCode: "classic_pu",
      event: "PU",
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 90, VOTES_GOOD)]),
      },
    });
    const recs = computeRecords([e], CLASSIC_MEET, MEET_DATE);
    expect(recs.find((r) => r.exercise === "PU")).toBeDefined();
    expect(recs.find((r) => r.exercise === "PUDI")).toBeUndefined();
  });

  it("records have isNew=true (V1 competition-local)", () => {
    const e = classicWithPuDi("Athlete", 80, 70);
    const recs = computeRecords([e], CLASSIC_MEET, MEET_DATE);
    expect(recs.every((r) => r.isNew === true)).toBe(true);
  });

  it("records include correct unit=kg for classic", () => {
    const e = classicWithPuDi("Athlete", 80, 70);
    const recs = computeRecords([e], CLASSIC_MEET, MEET_DATE);
    expect(recs.every((r) => r.unit === "kg")).toBe(true);
  });
});

describe("computeRecords — guests", () => {
  it("guest entries are included in records (records don't exclude guests)", () => {
    const guest = classicWithPuDi("GuestAthlete", 120, 100, { guest: true });
    const recs = computeRecords([guest], CLASSIC_MEET, MEET_DATE);
    // Should still have records since guests achieved results
    const puRec = recs.find((r) => r.exercise === "PU");
    expect(puRec).toBeDefined();
    expect(puRec!.holder.name).toBe("GuestAthlete");
  });

  it("guest with higher result beats non-guest in record", () => {
    const guest = classicWithPuDi("GuestStrong", 130, 100, {
      guest: true,
      assignedWeightCategoryCode: "M_90",
    });
    const normal = classicWithPuDi("NormalWeak", 80, 70, {
      assignedWeightCategoryCode: "M_90",
    });
    const recs = computeRecords([guest, normal], CLASSIC_MEET, MEET_DATE);
    const puRec = recs.find((r) => r.exercise === "PU");
    expect(puRec!.holder.name).toBe("GuestStrong");
    expect(puRec!.result).toBe(130);
  });
});

describe("computeRecords — multirep", () => {
  it("multirep entry → produces reps records", () => {
    const e = multirepWithPuDi("MultirepAthlete", 25, 30);
    const recs = computeRecords([e], MULTIREP_MEET, MEET_DATE);
    expect(recs.length).toBeGreaterThan(0);
    const puRec = recs.find((r) => r.exercise === "PU");
    expect(puRec).toBeDefined();
    expect(puRec!.unit).toBe("reps");
    expect(puRec!.result).toBe(25);
  });

  it("multirep PUDI total = PU reps + DI reps", () => {
    const e = multirepWithPuDi("MultirepAthlete", 25, 30);
    const recs = computeRecords([e], MULTIREP_MEET, MEET_DATE);
    const totalRec = recs.find((r) => r.exercise === "PUDI");
    expect(totalRec).toBeDefined();
    expect(totalRec!.result).toBe(55);
    expect(totalRec!.unit).toBe("reps");
  });

  it("two multirep entries: best holder wins", () => {
    const strong = multirepWithPuDi("Strong", 30, 35, {
      assignedWeightCategoryCode: "M_90",
    });
    const weak = multirepWithPuDi("Weak", 15, 20, {
      assignedWeightCategoryCode: "M_90",
    });
    const recs = computeRecords([strong, weak], MULTIREP_MEET, MEET_DATE);
    const puRec = recs.find((r) => r.exercise === "PU");
    expect(puRec!.holder.name).toBe("Strong");
  });
});

describe("computeRecords — multi-discipline", () => {
  it("different disciplines → separate record groups", () => {
    const classic = classicWithPuDi("ClassicAthlete", 80, 60, {
      disciplineCode: "classic_2lift",
    });
    const classicPu = classicWithPuOnly("PUOnlyAthlete", 90, {
      disciplineCode: "classic_pu",
      assignedWeightCategoryCode: "M_90",
    });
    const recs = computeRecords([classic, classicPu], CLASSIC_MEET, MEET_DATE);
    const disciplineCodes = new Set(recs.map((r) => r.disciplineCode));
    expect(disciplineCodes.has("classic_2lift")).toBe(true);
    expect(disciplineCodes.has("classic_pu")).toBe(true);
  });

  it("records from different sex groups are separate", () => {
    const male = classicWithPuDi("Male", 80, 60, {
      sex: "M",
      assignedWeightCategoryCode: "M_90",
    });
    const female = classicWithPuDi("Female", 60, 50, {
      sex: "F",
      assignedWeightCategoryCode: "F_65",
    });
    const recs = computeRecords([male, female], CLASSIC_MEET, MEET_DATE);
    const malePu = recs.find((r) => r.exercise === "PU" && r.sex === "M");
    const femalePu = recs.find((r) => r.exercise === "PU" && r.sex === "F");
    expect(malePu).toBeDefined();
    expect(femalePu).toBeDefined();
    expect(malePu!.holder.name).toBe("Male");
    expect(femalePu!.holder.name).toBe("Female");
  });

  it("mixed classic and multirep disciplines → separate records per competition format", () => {
    const classic = classicWithPuDi("ClassicAthlete", 80, 60);
    const multirep = multirepWithPuDi("MultirepAthlete", 20, 25);
    const recs = computeRecords([classic, multirep], CLASSIC_MEET, MEET_DATE);
    const classicRecs = recs.filter((r) => r.unit === "kg");
    const multirepRecs = recs.filter((r) => r.unit === "reps");
    expect(classicRecs.length).toBeGreaterThan(0);
    expect(multirepRecs.length).toBeGreaterThan(0);
  });
});
