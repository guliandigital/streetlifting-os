/**
 * Result calculator tests — Sprint 1 item 7.
 *
 * Coverage:
 * - Classic best = max successful declared load
 * - Failed/pending attempts excluded
 * - sequence === 4 (record-only) excluded per D11
 * - Total = bestPU + bestDI
 * - Multirep best = reps from successful attempt
 */

import { describe, it, expect } from "vitest";
import {
  ClassicResultCalculator,
  MultirepResultCalculator,
  getClassicBest,
  getMultirepReps,
  getResultCalculator,
} from "@logic/isf/result";
import {
  buildClassicEntry,
  classicAttempt,
  classicExercise,
  VOTES_GOOD,
  VOTES_NO,
  VOTES_PENDING,
} from "./fixtures/builders";

describe("getClassicBest", () => {
  it("returns 0 when no exercise data is present", () => {
    const e = buildClassicEntry("Empty");
    expect(getClassicBest(e, "PU")).toBe(0);
  });

  it("returns 0 when all attempts are pending", () => {
    const e = buildClassicEntry("Pending", {
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 100, VOTES_PENDING),
          classicAttempt(2, 110, VOTES_PENDING),
          classicAttempt(3, 120, VOTES_PENDING),
        ]),
      },
    });
    expect(getClassicBest(e, "PU")).toBe(0);
  });

  it("returns 0 when all attempts are failed", () => {
    const e = buildClassicEntry("AllFail", {
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 100, VOTES_NO),
          classicAttempt(2, 110, VOTES_NO),
          classicAttempt(3, 120, VOTES_NO),
        ]),
      },
    });
    expect(getClassicBest(e, "PU")).toBe(0);
  });

  it("returns max successful declared load", () => {
    const e = buildClassicEntry("Lifter", {
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 100, VOTES_GOOD),
          classicAttempt(2, 110, VOTES_NO),
          classicAttempt(3, 120, VOTES_GOOD),
        ]),
      },
    });
    expect(getClassicBest(e, "PU")).toBe(120);
  });

  it("does not count failed last attempt; falls back to earlier success", () => {
    const e = buildClassicEntry("FailLast", {
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 100, VOTES_GOOD),
          classicAttempt(2, 110, VOTES_GOOD),
          classicAttempt(3, 120, VOTES_NO),
        ]),
      },
    });
    expect(getClassicBest(e, "PU")).toBe(110);
  });

  it("excludes sequence === 4 (record-only) from best per D11", () => {
    const e = buildClassicEntry("RecordHolder", {
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 100, VOTES_GOOD),
          classicAttempt(2, 110, VOTES_GOOD),
          classicAttempt(3, 120, VOTES_GOOD),
          classicAttempt(4, 130, VOTES_GOOD), // record attempt — counts for records, not for total
        ]),
      },
    });
    // Best for ranking purposes is 120 (slot 4 ignored).
    expect(getClassicBest(e, "PU")).toBe(120);
  });
});

describe("ClassicResultCalculator.getTotal", () => {
  const calc = new ClassicResultCalculator();

  it("sums bestPU + bestDI", () => {
    const e = buildClassicEntry("TotalLifter", {
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
        DI: classicExercise("DI", [classicAttempt(1, 150, VOTES_GOOD)]),
      },
    });
    const t = calc.getTotal(e);
    expect(t).toEqual({ unit: "kg", pu: 100, di: 150, total: 250 });
  });

  it("treats missing exercise as 0", () => {
    const e = buildClassicEntry("PUOnly", {
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, VOTES_GOOD)]),
      },
    });
    const t = calc.getTotal(e);
    expect(t.di).toBe(0);
    expect(t.total).toBe(100);
  });
});

describe("ClassicResultCalculator.forecast (V1 stub)", () => {
  const calc = new ClassicResultCalculator();
  const e = buildClassicEntry("Anyone");

  it("returns nulls for all four forecast fields per D16 stub spec", () => {
    const f = calc.forecast(e, []);
    expect(f.predictedPlace).toBeNull();
    expect(f.kgToFirstPlace).toBeNull();
    expect(f.predictedAbsolutePlace).toBeNull();
    expect(f.predictedCoefficient).toBeNull();
  });
});

describe("getMultirepReps", () => {
  it("returns reps from the successful Multirep attempt", () => {
    const e = buildClassicEntry("MultirepLifter", {
      competitionFormat: "multirep",
      disciplineCode: "multirep_2lift_24_32",
      exercises: {
        PU: {
          format: "multirep",
          exercise: "PU",
          attempts: [
            {
              sequence: 1,
              presetLoadKg: 24,
              reps: 18,
              judgeVotes: VOTES_GOOD,
              durationSec: 120,
            },
          ],
        },
      },
    });
    expect(getMultirepReps(e, "PU")).toBe(18);
  });

  it("returns 0 if attempt failed", () => {
    const e = buildClassicEntry("FailedMultirep", {
      competitionFormat: "multirep",
      exercises: {
        PU: {
          format: "multirep",
          exercise: "PU",
          attempts: [
            {
              sequence: 1,
              presetLoadKg: 24,
              reps: 18,
              judgeVotes: VOTES_NO,
              durationSec: 120,
            },
          ],
        },
      },
    });
    expect(getMultirepReps(e, "PU")).toBe(0);
  });
});

describe("MultirepResultCalculator.getTotal", () => {
  it("sums repsPU + repsDI", () => {
    const calc = new MultirepResultCalculator();
    const e = buildClassicEntry("MR", {
      competitionFormat: "multirep",
      disciplineCode: "multirep_2lift_24_32",
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
        DI: {
          format: "multirep",
          exercise: "DI",
          attempts: [
            {
              sequence: 1,
              presetLoadKg: 32,
              reps: 12,
              judgeVotes: VOTES_GOOD,
              durationSec: 120,
            },
          ],
        },
      },
    });
    const t = calc.getTotal(e);
    expect(t).toEqual({ unit: "reps", pu: 20, di: 12, total: 32 });
  });
});

describe("getResultCalculator factory", () => {
  it("returns ClassicResultCalculator for classic format", () => {
    const e = buildClassicEntry("Classic");
    expect(getResultCalculator(e)).toBeInstanceOf(ClassicResultCalculator);
  });

  it("returns MultirepResultCalculator for multirep format", () => {
    const e = buildClassicEntry("MR", { competitionFormat: "multirep" });
    expect(getResultCalculator(e)).toBeInstanceOf(MultirepResultCalculator);
  });

  it("throws for weighted_calisthenics (V2 scope)", () => {
    const e = buildClassicEntry("WC", {
      competitionFormat: "weighted_calisthenics",
    });
    expect(() => getResultCalculator(e)).toThrow(/V2 scope/);
  });
});
