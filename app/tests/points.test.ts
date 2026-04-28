/**
 * IsfPointsService tests — Sprint 1 item 7b + Sprint 4 real ISF coefficient.
 *
 * Includes the **M5/M6 differentiator integration test** — full Entry → IsfPointBreakdown
 * pipeline proves that 70-year-old athletes get the correct 1.150 multiplier (ISF v5.1
 * §10.9.4) where PowerGage and PowerTable encode 1.125.
 *
 * Sprint 4: `isfAbsCoef` is now the real formula from streetlifting.ru/points/:
 *   ISF Coefficient = 100 / (A − B × e^(−C × bodyweightKg))
 * Tests use toBeCloseTo / range checks since the real formula returns floating-point values.
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
    // coefficient is real formula value for M/PUDI/80kg — should be positive finite
    expect(out.coefficient).toBeGreaterThan(0);
    expect(Number.isFinite(out.coefficient)).toBe(true);
  });

  it("computes basePoints = result × coefficient (positive, non-zero for real result)", () => {
    const e = buildClassicEntry("Open25M", {
      bodyweightKg: 80,
      ageOverride: 25,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 150, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "PUDI", MEET_DATE);
    // result = 250; coefficient = real ISF formula for M/PUDI/80kg ≈ 0.261
    expect(out.basePoints).toBeGreaterThan(0);
    expect(out.basePoints).toBeCloseTo(out.coefficient * 250, 5);
    expect(out.additionalPoints).toBe(0);
    // No masters multiplier at age 25 → finalPoints = basePoints
    expect(out.finalPoints).toBeCloseTo(out.basePoints, 5);
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
    // basePoints = 100 × real_coef; final = basePoints × 1.0 + 5
    expect(out.finalPoints).toBeCloseTo(out.basePoints + 5, 5);
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
    // mastersAdj = 1.025, addPts = 0 → finalPoints = basePoints × 1.025
    expect(out.finalPoints).toBeCloseTo(out.basePoints * 1.025, 5);
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
    expect(out.finalPoints).toBeCloseTo(out.basePoints * 1.125, 5);
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
    expect(out.finalPoints).toBeCloseTo(out.basePoints * 1.125, 5);
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

  it("age 60 → M5 multiplier 1.125 (basePoints × 1.125)", () => {
    const out = svc.calculate(buildAtAge(60), "PU", MEET_DATE);
    expect(out.finalPoints).toBeCloseTo(out.basePoints * 1.125, 5);
  });

  it("age 69 → M5 multiplier 1.125 (last year of M5 band)", () => {
    const out = svc.calculate(buildAtAge(69), "PU", MEET_DATE);
    expect(out.finalPoints).toBeCloseTo(out.basePoints * 1.125, 5);
  });

  it("age 70 → M6 multiplier 1.150 — DIFFERS FROM POWERGAGE/POWERTABLE", () => {
    const out60 = svc.calculate(buildAtAge(60), "PU", MEET_DATE);
    const out70 = svc.calculate(buildAtAge(70), "PU", MEET_DATE);
    // Both use same bodyweight=80 so same basePoints; ratio of finalPoints = 1.150/1.125
    expect(out70.finalPoints).toBeCloseTo(out60.finalPoints * (1.150 / 1.125), 4);
    // PowerGage / PowerTable would compute finalPoints60 × 1.0 (same multiplier — wrong by ISF v5.1).
    // Streetlifting OS correctly applies 1.150 to M6 vs 1.125 to M5.
    expect(out70.finalPoints).toBeGreaterThan(out60.finalPoints);
    // Verify M6 multiplier: finalPoints = basePoints × 1.150
    expect(out70.finalPoints).toBeCloseTo(out70.basePoints * 1.150, 5);
  });

  it("age 80 → M6 multiplier 1.150 (deep into M6 range)", () => {
    const out = svc.calculate(buildAtAge(80), "PU", MEET_DATE);
    expect(out.finalPoints).toBeCloseTo(out.basePoints * 1.150, 5);
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
    // M6 multiplier = 1.150; finalPoints = basePoints × 1.150
    expect(out.finalPoints).toBeCloseTo(out.basePoints * 1.150, 5);
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
    // Overridden to M6 → 1.150 multiplier despite young birthDate
    expect(out.finalPoints).toBeCloseTo(out.basePoints * 1.150, 5);
  });
});

// ─── Sprint 4: Real ISF coefficient formula tests ───────────────────────────

describe("ISF absolute coefficient — real formula (Sprint 4)", () => {
  it("M/PU 80 kg → coefficient within [0.50, 0.53]", () => {
    const e = buildClassicEntry("M_PU_80", {
      bodyweightKg: 80,
      sex: "M",
      ageOverride: 25,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "PU", MEET_DATE);
    expect(out.coefficient).toBeGreaterThanOrEqual(0.50);
    expect(out.coefficient).toBeLessThanOrEqual(0.53);
  });

  it("M/DI 80 kg → coefficient positive", () => {
    const e = buildClassicEntry("M_DI_80", {
      bodyweightKg: 80,
      sex: "M",
      ageOverride: 25,
      exercises: {
        DI: classicExercise("DI", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "DI", MEET_DATE);
    expect(out.coefficient).toBeGreaterThan(0);
    expect(Number.isFinite(out.coefficient)).toBe(true);
  });

  it("M/PUDI 70 kg → coefficient within [0.27, 0.29]", () => {
    const e = buildClassicEntry("M_PUDI_70", {
      bodyweightKg: 70,
      sex: "M",
      ageOverride: 25,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "PUDI", MEET_DATE);
    expect(out.coefficient).toBeGreaterThanOrEqual(0.27);
    expect(out.coefficient).toBeLessThanOrEqual(0.29);
  });

  it("F/PU 55 kg → coefficient within [0.85, 0.95] (verified against formula constants)", () => {
    const e = buildClassicEntry("F_PU_55", {
      bodyweightKg: 55,
      sex: "F",
      ageOverride: 25,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "PU", MEET_DATE);
    // F:PU A=142.40, B=442.53, C=0.04724 → coef(55) ≈ 0.913
    expect(out.coefficient).toBeGreaterThanOrEqual(0.85);
    expect(out.coefficient).toBeLessThanOrEqual(0.95);
  });

  it("F/DI 60 kg → coefficient positive", () => {
    const e = buildClassicEntry("F_DI_60", {
      bodyweightKg: 60,
      sex: "F",
      ageOverride: 25,
      exercises: {
        DI: classicExercise("DI", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "DI", MEET_DATE);
    expect(out.coefficient).toBeGreaterThan(0);
    expect(Number.isFinite(out.coefficient)).toBe(true);
  });

  it("F/PUDI 60 kg → coefficient positive", () => {
    const e = buildClassicEntry("F_PUDI_60", {
      bodyweightKg: 60,
      sex: "F",
      ageOverride: 25,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "PUDI", MEET_DATE);
    expect(out.coefficient).toBeGreaterThan(0);
    expect(Number.isFinite(out.coefficient)).toBe(true);
  });

  it("bodyweight 0 kg → coefficient is finite (formula does not crash)", () => {
    const e = buildClassicEntry("BW0", {
      bodyweightKg: 0,
      sex: "M",
      ageOverride: 25,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "PU", MEET_DATE);
    expect(Number.isFinite(out.coefficient)).toBe(true);
  });

  it("bodyweight 200 kg → coefficient is finite positive", () => {
    const e = buildClassicEntry("BW200", {
      bodyweightKg: 200,
      sex: "M",
      ageOverride: 25,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "PU", MEET_DATE);
    expect(out.coefficient).toBeGreaterThan(0);
    expect(Number.isFinite(out.coefficient)).toBe(true);
  });
});
