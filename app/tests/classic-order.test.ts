/**
 * Classic order tests — Sprint 1 item 8 (D2B 3-level tiebreak).
 *
 * Tiebreak hierarchy:
 *   1. declared weight ASC
 *   2. bodyweight ASC (if lowerBodyweightFirstTiebreak === true) | id surrogate (otherwise)
 *   3. lastDeclarationAt ASC
 *   4. name (final fallback)
 */

import { describe, it, expect } from "vitest";
import {
  compareClassicOrder,
  sortClassicAttemptOrder,
} from "@logic/isf/classic-order";
import {
  buildClassicEntry,
  classicAttempt,
  classicExercise,
} from "./fixtures/builders";
import type { OrderOptions } from "@logic/isf/classic-order";

const opts1Pu: OrderOptions = {
  exercise: "PU",
  attemptSequence: 1,
  lowerBodyweightFirstTiebreak: true,
};

describe("compareClassicOrder — primary: declared weight ASC", () => {
  it("lighter declared weight lifts first", () => {
    const a = buildClassicEntry("A", {
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100)]),
      },
    });
    const b = buildClassicEntry("B", {
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 110)]),
      },
    });
    expect(Math.sign(compareClassicOrder(a, b, opts1Pu))).toBe(-1);
    expect(Math.sign(compareClassicOrder(b, a, opts1Pu))).toBe(1);
  });

  it("equal declared weights → fall through to tiebreak", () => {
    const a = buildClassicEntry("A", {
      bodyweightKg: 75,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 100)]) },
    });
    const b = buildClassicEntry("B", {
      bodyweightKg: 80,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 100)]) },
    });
    // BW tiebreak active → lighter (A, 75 kg) first
    expect(Math.sign(compareClassicOrder(a, b, opts1Pu))).toBe(-1);
  });
});

describe("compareClassicOrder — tiebreak A: bodyweight (toggle ON)", () => {
  it("lighter bodyweight lifts first when weights equal", () => {
    const heavy = buildClassicEntry("Heavy", {
      bodyweightKg: 90,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 100)]) },
    });
    const light = buildClassicEntry("Light", {
      bodyweightKg: 70,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 100)]) },
    });
    expect(Math.sign(compareClassicOrder(light, heavy, opts1Pu))).toBe(-1);
  });
});

describe("compareClassicOrder — tiebreak A: id surrogate (toggle OFF)", () => {
  it("uses id when lowerBodyweightFirstTiebreak is OFF (V1 lot stand-in)", () => {
    const opts: OrderOptions = { ...opts1Pu, lowerBodyweightFirstTiebreak: false };
    const a = buildClassicEntry("A", {
      bodyweightKg: 90, // heavier athlete
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 100)]) },
    });
    const b = buildClassicEntry("B", {
      bodyweightKg: 70, // lighter, but id ordering wins under toggle OFF
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 100)]) },
    });
    // a.id < b.id (sequential build order) → a sorts first regardless of bodyweight
    expect(Math.sign(compareClassicOrder(a, b, opts))).toBe(-1);
  });
});

describe("compareClassicOrder — tiebreak B: lastDeclarationAt ASC", () => {
  it("earlier declaration lifts first when weight + bodyweight tied", () => {
    const earlier = buildClassicEntry("Earlier", {
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 100, undefined, "2026-04-26T09:00:00Z"),
        ]),
      },
    });
    const later = buildClassicEntry("Later", {
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 100, undefined, "2026-04-26T09:30:00Z"),
        ]),
      },
    });
    expect(Math.sign(compareClassicOrder(earlier, later, opts1Pu))).toBe(-1);
  });

  it("never-declared sorts after declared (null lastDeclarationAt)", () => {
    const declared = buildClassicEntry("Declared", {
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 100, undefined, "2026-04-26T09:00:00Z"),
        ]),
      },
    });
    const nullDecl = buildClassicEntry("NullDecl", {
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 100, undefined, null)]),
      },
    });
    expect(Math.sign(compareClassicOrder(declared, nullDecl, opts1Pu))).toBe(
      -1,
    );
  });
});

describe("compareClassicOrder — tiebreak C: name fallback", () => {
  it("alphabetic name ordering when everything else equal", () => {
    const ann = buildClassicEntry("Ann", {
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 100, undefined, "2026-04-26T09:00:00Z"),
        ]),
      },
    });
    const bob = buildClassicEntry("Bob", {
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 100, undefined, "2026-04-26T09:00:00Z"),
        ]),
      },
    });
    expect(Math.sign(compareClassicOrder(ann, bob, opts1Pu))).toBe(-1);
  });
});

describe("sortClassicAttemptOrder", () => {
  it("orders 5-athlete flight by all 4 tiebreak levels", () => {
    const e1 = buildClassicEntry("Heaviest opener", {
      bodyweightKg: 95,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 130)]) },
    });
    const e2 = buildClassicEntry("Light 110", {
      bodyweightKg: 75,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 110)]) },
    });
    const e3 = buildClassicEntry("Heavy 110", {
      bodyweightKg: 90,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 110)]) },
    });
    const e4 = buildClassicEntry("Lightest opener", {
      bodyweightKg: 65,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 100)]) },
    });
    const e5 = buildClassicEntry("Same as e4 by weight", {
      bodyweightKg: 70,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 100)]) },
    });

    const sorted = sortClassicAttemptOrder([e1, e2, e3, e4, e5], opts1Pu);
    // Expected order: 100 kg first (e4 lighter, then e5), 110 kg next (e2 lighter, then e3), 130 kg last.
    expect(sorted.map((e) => e.name)).toEqual([
      "Lightest opener",
      "Same as e4 by weight",
      "Light 110",
      "Heavy 110",
      "Heaviest opener",
    ]);
  });

  it("does not mutate the input array", () => {
    const a = buildClassicEntry("A", {
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 110)]) },
    });
    const b = buildClassicEntry("B", {
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 100)]) },
    });
    const input = [a, b] as const;
    sortClassicAttemptOrder(input, opts1Pu);
    expect(input).toEqual([a, b]);
  });
});
