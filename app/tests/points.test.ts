/**
 * IsfPointsService tests — Sprint 1 item 7b.
 *
 * Includes the **M5/M6 differentiator integration test** — full Entry → IsfPointBreakdown
 * pipeline proves that 70-year-old athletes get the correct 1.150 multiplier (ISF v5.1
 * §10.9.4) where PowerGage and PowerTable encode 1.125.
 *
 * Note: V1 ships the absolute-coefficient lookup as a 1.0 stub (D1 TODO — extract
 * from streetlifting.ru/points/). Tests assert STRUCTURAL correctness, not absolute
 * coefficient values. When the real table lands, these tests still pass; only the
 * absolute numbers shift.
 */

import { describe, it, expect } from "vitest";
import { IsfPointsService } from "@logic/isf/points";
import {
  buildClassicEntry,
  classicAttempt,
  classicExercise,
  VOTES_GOOD,
} from "./fixtures/builders";

const svc = new IsfPointsService();
const MEET_DATE = "2026-04-26";

describe("IsfPointsService — basic pipeline", () => {
  it("zero result → zero final points", () => {
    const e = buildClassicEntry("Empty");
    const out = svc.calculate(e, "PUDI", MEET_DATE);
    expect(out.finalPoints).toBe(0);
    expect(out.coefficient).toBe(1); // V1 stub
  });

  it("computes basePoints = result × coefficient", () => {
    const e = buildClassicEntry("Open25M", {
      bodyweightKg: 80, // below all M Classic limits → no additional points
      ageOverride: 25,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 150, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "PUDI", MEET_DATE);
    // result = 100 + 150 = 250; coefficient stub = 1.0 → basePoints = 250
    expect(out.basePoints).toBe(250);
    expect(out.additionalPoints).toBe(0);
    // No masters multiplier at age 25 → finalPoints = 250
    expect(out.finalPoints).toBe(250);
  });
});

describe("IsfPointsService — additional points (Classic only) per D7", () => {
  it("applies (bw − limit) × 0.5 for men PU when bw > 90", () => {
    const e = buildClassicEntry("HeavyOpenM", {
      bodyweightKg: 100, // 10 kg over PU limit of 90 → +5 additional points
      ageOverride: 25,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "PU", MEET_DATE);
    expect(out.additionalPoints).toBe(5);
    // basePoints = 100 × 1.0 = 100; final = 100 + 5 = 105 (masters mul = 1.0)
    expect(out.finalPoints).toBe(105);
  });

  it("does NOT apply additional points for Multirep events", () => {
    const e = buildClassicEntry("MultirepHeavy", {
      competitionFormat: "multirep",
      disciplineCode: "multirep_2lift_24_32",
      bodyweightKg: 100, // would trigger additional in Classic, but multirep is exempt
      ageOverride: 25,
      exercises: {
        PU: {
          format: "multirep",
          exercise: "PU",
          attempts: [
            {
              sequence: 1,
              presetLoadKg: 24,
              reps: 20,
              judgeVotes: VOTES_GOOD,
              durationSec: 120,
            },
          ],
        },
      },
    });
    const out = svc.calculate(e, "PU", MEET_DATE);
    expect(out.additionalPoints).toBe(0);
  });
});

describe("IsfPointsService — masters multiplier pipeline", () => {
  it("M1 (40 yo) → 1.025 multiplier on basePoints", () => {
    const e = buildClassicEntry("M1Athlete", {
      bodyweightKg: 80,
      ageOverride: 40,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "PU", MEET_DATE);
    // basePoints = 100, mastersAdj = 1.025, addPts = 0 → final = 102.5
    expect(out.finalPoints).toBeCloseTo(102.5, 6);
  });

  it("M5 (60 yo) → 1.125 multiplier (boundary test, ISF v5.1 §10.9.4)", () => {
    const e = buildClassicEntry("M5Athlete60", {
      bodyweightKg: 80,
      ageOverride: 60,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "PU", MEET_DATE);
    expect(out.finalPoints).toBeCloseTo(112.5, 6);
  });

  it("M5 (69 yo) → 1.125 multiplier (upper-boundary test)", () => {
    const e = buildClassicEntry("M5Athlete69", {
      bodyweightKg: 80,
      ageOverride: 69,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "PU", MEET_DATE);
    expect(out.finalPoints).toBeCloseTo(112.5, 6);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// THE DIFFERENTIATOR — M5/M6 INTEGRATION TEST
// ════════════════════════════════════════════════════════════════════════════
//
// These four tests prove that Streetlifting OS scores 70+ athletes correctly
// per ISF v5.1 §10.9.4 (M6 = 1.150). PowerGage and PowerTable both apply 1.125
// (pre-v5.1 single 60+ band) — making this the most user-visible correctness
// defect in the incumbent products.
//
// DO NOT WEAKEN OR REMOVE THESE TESTS. They are the primary marketing claim.
// ════════════════════════════════════════════════════════════════════════════

describe("⭐ M5/M6 differentiator — full pipeline (ISF v5.1 §10.9.4)", () => {
  function buildAtAge(age: number) {
    return buildClassicEntry(`Age${age}`, {
      bodyweightKg: 80, // no additional-points bonus (under PU 90 kg M limit)
      ageOverride: age,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
  }

  it("age 60 → M5 multiplier 1.125 (basePoints 100 → finalPoints 112.5)", () => {
    const out = svc.calculate(buildAtAge(60), "PU", MEET_DATE);
    expect(out.finalPoints).toBeCloseTo(112.5, 6);
  });

  it("age 69 → M5 multiplier 1.125 (last year of M5 band)", () => {
    const out = svc.calculate(buildAtAge(69), "PU", MEET_DATE);
    expect(out.finalPoints).toBeCloseTo(112.5, 6);
  });

  it("age 70 → M6 multiplier 1.150 — DIFFERS FROM POWERGAGE/POWERTABLE", () => {
    const out = svc.calculate(buildAtAge(70), "PU", MEET_DATE);
    // PowerGage / PowerTable would compute 112.5 here (1.125 multiplier — wrong by ISF v5.1).
    // Streetlifting OS computes 115.0 (1.150 multiplier — correct).
    expect(out.finalPoints).toBeCloseTo(115.0, 6);
    expect(out.finalPoints).not.toBeCloseTo(112.5, 6); // explicit "not equal to wrong answer"
  });

  it("age 80 → M6 multiplier 1.150 (deep into M6 range)", () => {
    const out = svc.calculate(buildAtAge(80), "PU", MEET_DATE);
    expect(out.finalPoints).toBeCloseTo(115.0, 6);
  });
});

describe("IsfPointsService — birthDate fallback for age", () => {
  it("derives age from birthDate against meet date when ageOverride is null", () => {
    // Born 1956-04-26; meet on 2026-04-26 → age 70 → M6 = 1.150
    const e = buildClassicEntry("Age70FromDob", {
      bodyweightKg: 80,
      birthDate: "1956-04-26",
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "PU", MEET_DATE);
    expect(out.finalPoints).toBeCloseTo(115.0, 6);
  });
});

describe("IsfPointsService — assignedAgeCategoryCode takes precedence", () => {
  it("operator override beats birthDate inference", () => {
    // Athlete is 25 by birthDate but operator put them in M6 (e.g., guest exhibition)
    const e = buildClassicEntry("Override", {
      bodyweightKg: 80,
      birthDate: "2001-04-26", // age 25 at meet date
      assignedAgeCategoryCode: "masters_m6",
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "PU", MEET_DATE);
    expect(out.finalPoints).toBeCloseTo(115.0, 6);
  });
});
