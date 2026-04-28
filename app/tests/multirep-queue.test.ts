/**
 * multirep-queue.test.ts — Sprint 3
 *
 * Tests for the Multirep attempt queue builder.
 */

import { describe, it, expect } from "vitest";
import {
  buildMultirepQueue,
  getMultirepActiveItem,
} from "@logic/isf/multirep-queue";
import {
  buildMultirepEntry,
  buildClassicEntry,
  multirepAttempt,
  multirepExercise,
  VOTES_GOOD,
  VOTES_NO,
  VOTES_PENDING,
} from "./fixtures/builders";

// ─── buildMultirepQueue ───────────────────────────────────────────────────────

describe("buildMultirepQueue — empty / no multirep entries", () => {
  it("returns empty array for empty entries list", () => {
    expect(buildMultirepQueue([], true)).toHaveLength(0);
  });

  it("ignores classic entries", () => {
    const classic = buildClassicEntry("Classic Athlete");
    expect(buildMultirepQueue([classic], true)).toHaveLength(0);
  });

  it("includes a multirep entry with no attempt started (PU)", () => {
    const entry = buildMultirepEntry("Alice", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: {
        PU: multirepExercise("PU", []),
      },
    });
    const queue = buildMultirepQueue([entry], true);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.exercise).toBe("PU");
    expect(queue[0]?.attempt).toBeUndefined();
  });

  it("includes a multirep entry with no attempt started (DI)", () => {
    const entry = buildMultirepEntry("Bob", {
      disciplineCode: "multirep_di_12",
      event: "DI",
      exercises: {
        DI: multirepExercise("DI", []),
      },
    });
    const queue = buildMultirepQueue([entry], true);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.exercise).toBe("DI");
  });

  it("includes a PUDI multirep entry — emits two items if both exercises pending", () => {
    const entry = buildMultirepEntry("Charlie", {
      disciplineCode: "multirep_2lift_16_24",
      event: "PUDI",
      exercises: {
        PU: multirepExercise("PU", []),
        DI: multirepExercise("DI", []),
      },
    });
    const queue = buildMultirepQueue([entry], true);
    expect(queue).toHaveLength(2);
    const exercises = queue.map((i) => i.exercise);
    expect(exercises).toContain("PU");
    expect(exercises).toContain("DI");
  });
});

describe("buildMultirepQueue — done attempts excluded", () => {
  it("excludes entry with successful attempt (single lift PU)", () => {
    const entry = buildMultirepEntry("Athlete", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(15, VOTES_GOOD)]),
      },
    });
    expect(buildMultirepQueue([entry], true)).toHaveLength(0);
  });

  it("excludes entry with failed attempt (done is done)", () => {
    const entry = buildMultirepEntry("Athlete", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(0, VOTES_NO)]),
      },
    });
    expect(buildMultirepQueue([entry], true)).toHaveLength(0);
  });

  it("includes entry with pending attempt (not yet decided)", () => {
    const entry = buildMultirepEntry("Athlete", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(10, VOTES_PENDING)]),
      },
    });
    expect(buildMultirepQueue([entry], true)).toHaveLength(1);
    expect(buildMultirepQueue([entry], true)[0]?.attempt).toBeDefined();
  });

  it("PUDI: only includes pending exercises — excludes done ones", () => {
    const entry = buildMultirepEntry("Athlete", {
      disciplineCode: "multirep_2lift_16_24",
      event: "PUDI",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(12, VOTES_GOOD)]), // done
        DI: multirepExercise("DI", []), // not started
      },
    });
    const queue = buildMultirepQueue([entry], true);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.exercise).toBe("DI");
  });
});

describe("buildMultirepQueue — ordering", () => {
  it("orders by entryIndex ASC (lot order)", () => {
    const e1 = buildMultirepEntry("B", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      bodyweightKg: 90,
      exercises: { PU: multirepExercise("PU", []) },
    });
    const e2 = buildMultirepEntry("A", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      bodyweightKg: 60,
      exercises: { PU: multirepExercise("PU", []) },
    });
    // e1 is at index 0, e2 at index 1 → lot order
    const queue = buildMultirepQueue([e1, e2], false);
    expect(queue[0]?.entry.name).toBe("B");
    expect(queue[1]?.entry.name).toBe("A");
  });

  it("secondary: lowerBodyweightFirst applies when indices differ", () => {
    // Two different entries at indices 0 and 1 — entryIndex still dominates
    const e1 = buildMultirepEntry("Heavy", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      bodyweightKg: 100,
      exercises: { PU: multirepExercise("PU", []) },
    });
    const e2 = buildMultirepEntry("Light", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      bodyweightKg: 60,
      exercises: { PU: multirepExercise("PU", []) },
    });
    // Even with lowerBodyweightFirst, entryIndex order is maintained
    const queue = buildMultirepQueue([e1, e2], true);
    expect(queue[0]?.entry.name).toBe("Heavy"); // index 0
    expect(queue[1]?.entry.name).toBe("Light"); // index 1
  });

  it("three entries all pending — correct order", () => {
    const entries = [
      buildMultirepEntry("C", { disciplineCode: "multirep_pu_8", event: "PU", exercises: { PU: multirepExercise("PU", []) } }),
      buildMultirepEntry("A", { disciplineCode: "multirep_pu_8", event: "PU", exercises: { PU: multirepExercise("PU", []) } }),
      buildMultirepEntry("B", { disciplineCode: "multirep_pu_8", event: "PU", exercises: { PU: multirepExercise("PU", []) } }),
    ];
    const queue = buildMultirepQueue(entries, true);
    expect(queue).toHaveLength(3);
    expect(queue[0]?.entry.name).toBe("C"); // index 0
    expect(queue[1]?.entry.name).toBe("A"); // index 1
    expect(queue[2]?.entry.name).toBe("B"); // index 2
  });
});

// ─── getMultirepActiveItem ────────────────────────────────────────────────────

describe("getMultirepActiveItem", () => {
  it("returns null for empty entries", () => {
    expect(getMultirepActiveItem([], null)).toBeNull();
  });

  it("returns null when all attempts done", () => {
    const entry = buildMultirepEntry("Done", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: { PU: multirepExercise("PU", [multirepAttempt(10, VOTES_GOOD)]) },
    });
    expect(getMultirepActiveItem([entry], null)).toBeNull();
  });

  it("returns first queue item when activeEntryIndex is null", () => {
    const e1 = buildMultirepEntry("First", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: { PU: multirepExercise("PU", []) },
    });
    const e2 = buildMultirepEntry("Second", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: { PU: multirepExercise("PU", []) },
    });
    const result = getMultirepActiveItem([e1, e2], null);
    expect(result?.entry.name).toBe("First");
  });

  it("returns the item matching activeEntryIndex", () => {
    const e1 = buildMultirepEntry("First", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: { PU: multirepExercise("PU", []) },
    });
    const e2 = buildMultirepEntry("Second", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: { PU: multirepExercise("PU", []) },
    });
    const result = getMultirepActiveItem([e1, e2], 1);
    expect(result?.entry.name).toBe("Second");
  });

  it("falls back to first item when activeEntryIndex not in queue", () => {
    const entry = buildMultirepEntry("Only", {
      disciplineCode: "multirep_pu_8",
      event: "PU",
      exercises: { PU: multirepExercise("PU", []) },
    });
    const result = getMultirepActiveItem([entry], 99);
    expect(result?.entry.name).toBe("Only");
  });
});
