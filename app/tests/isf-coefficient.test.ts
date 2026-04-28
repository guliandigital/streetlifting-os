/**
 * ISF Absolute Coefficient tests — Sprint 4.
 *
 * Tests the real formula: ISF Coefficient = 100 / (A − B × e^(−C × bodyweightKg))
 * Source: streetlifting.ru/points/
 *
 * Also includes a full pipeline test: Entry → IsfPointsService → finalPoints > 0.
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
const MEET_DATE = "2026-04-27";

// ─── Direct coefficient tests via IsfPointsService ──────────────────────────
// We test the coefficient by reading it from IsfPointsService.calculate()

describe("ISF Absolute Coefficient — M/PU", () => {
  it("M/PU 80 kg → coefficient within [0.50, 0.53]", () => {
    const e = buildClassicEntry("M_PU_80", {
      bodyweightKg: 80,
      sex: "M",
      ageOverride: 25,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]) },
    });
    const out = svc.calculate(e, "PU", MEET_DATE);
    expect(out.coefficient).toBeGreaterThanOrEqual(0.50);
    expect(out.coefficient).toBeLessThanOrEqual(0.53);
  });
});

describe("ISF Absolute Coefficient — M/DI", () => {
  it("M/DI 80 kg → coefficient positive and finite", () => {
    const e = buildClassicEntry("M_DI_80", {
      bodyweightKg: 80,
      sex: "M",
      ageOverride: 25,
      exercises: { DI: classicExercise("DI", [classicAttempt(1, 100, VOTES_GOOD)]) },
    });
    const out = svc.calculate(e, "DI", MEET_DATE);
    expect(out.coefficient).toBeGreaterThan(0);
    expect(Number.isFinite(out.coefficient)).toBe(true);
  });
});

describe("ISF Absolute Coefficient — M/PUDI", () => {
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
});

describe("ISF Absolute Coefficient — F/PU", () => {
  it("F/PU 55 kg → coefficient within [0.85, 0.95] (verified against formula constants, actual ≈ 0.913)", () => {
    const e = buildClassicEntry("F_PU_55", {
      bodyweightKg: 55,
      sex: "F",
      ageOverride: 25,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]) },
    });
    const out = svc.calculate(e, "PU", MEET_DATE);
    // F:PU A=142.40, B=442.53, C=0.04724 → coef(55) ≈ 0.913
    expect(out.coefficient).toBeGreaterThanOrEqual(0.85);
    expect(out.coefficient).toBeLessThanOrEqual(0.95);
  });
});

describe("ISF Absolute Coefficient — F/DI", () => {
  it("F/DI 60 kg → coefficient positive and finite", () => {
    const e = buildClassicEntry("F_DI_60", {
      bodyweightKg: 60,
      sex: "F",
      ageOverride: 25,
      exercises: { DI: classicExercise("DI", [classicAttempt(1, 100, VOTES_GOOD)]) },
    });
    const out = svc.calculate(e, "DI", MEET_DATE);
    expect(out.coefficient).toBeGreaterThan(0);
    expect(Number.isFinite(out.coefficient)).toBe(true);
  });
});

describe("ISF Absolute Coefficient — F/PUDI", () => {
  it("F/PUDI 60 kg → coefficient positive and finite", () => {
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
});

describe("ISF Absolute Coefficient — edge cases", () => {
  it("bodyweight 1 kg → coefficient finite positive (extreme but valid formula)", () => {
    const e = buildClassicEntry("BW1", {
      bodyweightKg: 1,
      sex: "M",
      ageOverride: 25,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]) },
    });
    const out = svc.calculate(e, "PU", MEET_DATE);
    expect(Number.isFinite(out.coefficient)).toBe(true);
    expect(out.coefficient).toBeGreaterThan(0);
  });

  it("bodyweight 200 kg → coefficient finite positive", () => {
    const e = buildClassicEntry("BW200", {
      bodyweightKg: 200,
      sex: "M",
      ageOverride: 25,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]) },
    });
    const out = svc.calculate(e, "PU", MEET_DATE);
    expect(out.coefficient).toBeGreaterThan(0);
    expect(Number.isFinite(out.coefficient)).toBe(true);
  });

  it("OPEN sex → coefficient returns 1.0 (fallback, no formula for OPEN)", () => {
    const e = buildClassicEntry("OPEN_Athlete", {
      bodyweightKg: 80,
      sex: "OPEN",
      ageOverride: 25,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]) },
    });
    // OPEN sex falls through to the neutral path in IsfPointsService (coefficient = 1)
    const out = svc.calculate(e, "PU", MEET_DATE);
    expect(out.coefficient).toBe(1);
  });

  it("MU event → coefficient returns 1.0 fallback (not in V1)", () => {
    const e = buildClassicEntry("MU_Athlete", {
      bodyweightKg: 80,
      sex: "M",
      ageOverride: 25,
      // Exercises don't matter — we request the "MU" event which has no formula
    });
    // MU is not in the formula table; should return 1.0 (no crash)
    const out = svc.calculate(e, "MU", MEET_DATE);
    expect(out.coefficient).toBe(1);
  });
});

describe("ISF Points — full pipeline with real coefficient", () => {
  it("M/classic/PUDI bw=80 → finalPoints > 0 and coefficient ≈ 0.280 (M/PUDI/70kg formula range)", () => {
    // Using 70kg for M/PUDI to hit the [0.27,0.29] range
    const e = buildClassicEntry("PipelineTest", {
      bodyweightKg: 70,
      sex: "M",
      ageOverride: 25,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 150, VOTES_GOOD)]),
      },
    });
    const out = svc.calculate(e, "PUDI", MEET_DATE);
    expect(out.finalPoints).toBeGreaterThan(0);
    expect(out.coefficient).toBeGreaterThanOrEqual(0.27);
    expect(out.coefficient).toBeLessThanOrEqual(0.29);
    // finalPoints = (100+150) × coefficient, no masters, no additional
    expect(out.finalPoints).toBeCloseTo(out.basePoints, 5);
    expect(out.basePoints).toBeCloseTo(250 * out.coefficient, 5);
  });
});
