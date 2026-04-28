/**
 * home-stats.test.ts — Sprint 5
 *
 * Tests for the pure stat computation functions extracted from the Home dashboard.
 */

import { describe, it, expect } from "vitest";
import {
  countWeighedIn,
  countAttemptsDone,
  countAttemptsTotal,
} from "@pages/home/home-stats";
import {
  buildClassicEntry,
  buildMultirepEntry,
  classicAttempt,
  classicExercise,
  multirepAttempt,
  multirepExercise,
  VOTES_GOOD,
  VOTES_NO,
  VOTES_PENDING,
} from "./fixtures/builders";

// ─── countWeighedIn ───────────────────────────────────────────────────────────

describe("countWeighedIn", () => {
  it("returns 0 for empty entries", () => {
    expect(countWeighedIn([])).toBe(0);
  });

  it("returns 0 when no entries have a bodyweight", () => {
    const entries = [
      buildClassicEntry("A", { bodyweightKg: null }),
      buildClassicEntry("B", { bodyweightKg: null }),
    ];
    expect(countWeighedIn(entries)).toBe(0);
  });

  it("counts only entries with non-null bodyweightKg", () => {
    const entries = [
      buildClassicEntry("A", { bodyweightKg: 75.5 }),
      buildClassicEntry("B", { bodyweightKg: null }),
      buildClassicEntry("C", { bodyweightKg: 82.0 }),
    ];
    expect(countWeighedIn(entries)).toBe(2);
  });

  it("counts all entries when all have bodyweightKg", () => {
    const entries = [
      buildClassicEntry("A", { bodyweightKg: 70.0 }),
      buildClassicEntry("B", { bodyweightKg: 80.0 }),
      buildClassicEntry("C", { bodyweightKg: 90.0 }),
    ];
    expect(countWeighedIn(entries)).toBe(3);
  });
});

// ─── countAttemptsDone ────────────────────────────────────────────────────────

describe("countAttemptsDone", () => {
  it("returns 0 for empty entries", () => {
    expect(countAttemptsDone([])).toBe(0);
  });

  it("returns 0 when all attempts are pending", () => {
    const entry = buildClassicEntry("A", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 80, VOTES_PENDING),
          classicAttempt(2, 85, VOTES_PENDING),
        ]),
        DI: classicExercise("DI", [
          classicAttempt(1, 60, VOTES_PENDING),
        ]),
      },
    });
    expect(countAttemptsDone([entry])).toBe(0);
  });

  it("counts completed (success + fail) attempts correctly", () => {
    const entry = buildClassicEntry("A", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 80, VOTES_GOOD),   // done
          classicAttempt(2, 85, VOTES_NO),      // done
          classicAttempt(3, 85, VOTES_PENDING), // pending
        ]),
        DI: classicExercise("DI", [
          classicAttempt(1, 60, VOTES_GOOD),   // done
        ]),
      },
    });
    expect(countAttemptsDone([entry])).toBe(3);
  });

  it("excludes sequence-4 record attempts from count", () => {
    const entry = buildClassicEntry("A", {
      event: "PU",
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 80, VOTES_GOOD),
          classicAttempt(4, 90, VOTES_GOOD), // record attempt — excluded
        ]),
      },
    });
    expect(countAttemptsDone([entry])).toBe(1);
  });

  it("counts multirep attempts that are done", () => {
    const entry = buildMultirepEntry("A", {
      event: "PUDI",
      exercises: {
        PU: multirepExercise("PU", [
          multirepAttempt(10, VOTES_GOOD),
        ]),
        DI: multirepExercise("DI", [
          multirepAttempt(8, VOTES_NO),
        ]),
      },
    });
    expect(countAttemptsDone([entry])).toBe(2);
  });

  it("sums across multiple entries", () => {
    const e1 = buildClassicEntry("A", {
      event: "PU",
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 80, VOTES_GOOD),
          classicAttempt(2, 85, VOTES_GOOD),
          classicAttempt(3, 90, VOTES_PENDING),
        ]),
      },
    });
    const e2 = buildClassicEntry("B", {
      event: "PU",
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 70, VOTES_NO),
        ]),
      },
    });
    expect(countAttemptsDone([e1, e2])).toBe(3);
  });
});

// ─── countAttemptsTotal ───────────────────────────────────────────────────────

describe("countAttemptsTotal", () => {
  it("returns 0 for empty entries", () => {
    expect(countAttemptsTotal([])).toBe(0);
  });

  it("classic PUDI entry = 6 total attempts (3 PU + 3 DI)", () => {
    const entry = buildClassicEntry("A", { event: "PUDI", competitionFormat: "classic" });
    expect(countAttemptsTotal([entry])).toBe(6);
  });

  it("classic PU-only entry = 3 total attempts", () => {
    const entry = buildClassicEntry("A", { event: "PU", competitionFormat: "classic" });
    expect(countAttemptsTotal([entry])).toBe(3);
  });

  it("classic DI-only entry = 3 total attempts", () => {
    const entry = buildClassicEntry("A", { event: "DI", competitionFormat: "classic" });
    expect(countAttemptsTotal([entry])).toBe(3);
  });

  it("multirep PUDI entry = 2 total attempts (1 PU + 1 DI)", () => {
    const entry = buildMultirepEntry("A", { event: "PUDI", competitionFormat: "multirep" });
    expect(countAttemptsTotal([entry])).toBe(2);
  });

  it("multirep PU-only entry = 1 total attempt", () => {
    const entry = buildMultirepEntry("A", { event: "PU", competitionFormat: "multirep" });
    expect(countAttemptsTotal([entry])).toBe(1);
  });

  it("sums across mixed classic and multirep entries", () => {
    const classic = buildClassicEntry("A", { event: "PUDI", competitionFormat: "classic" }); // 6
    const multirepPUDI = buildMultirepEntry("B", { event: "PUDI", competitionFormat: "multirep" }); // 2
    const classicPU = buildClassicEntry("C", { event: "PU", competitionFormat: "classic" }); // 3
    expect(countAttemptsTotal([classic, multirepPUDI, classicPU])).toBe(11);
  });
});
