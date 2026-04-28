/**
 * multirep-queue.test.ts — Sprint 3
 *
 * Tests for buildMultirepQueue() / getActiveMultirepItem().
 * Multirep V1 uses manual fixed-order (entryIndex ASC) per blueprint v2 §9.2.
 */

import { describe, it, expect } from "vitest";
import {
  buildMultirepQueue,
  getActiveMultirepItem,
} from "@logic/isf/multirep-queue";
import {
  buildClassicEntry,
  buildMultirepEntry,
  multirepAttempt,
  multirepExercise,
  classicExercise,
  classicAttempt,
  VOTES_GOOD,
  VOTES_NO,
  VOTES_PENDING,
} from "./fixtures/builders";

describe("buildMultirepQueue", () => {
  it("returns empty for empty entries", () => {
    expect(buildMultirepQueue([], "PU")).toEqual([]);
  });

  it("skips classic-format entries", () => {
    const c = buildClassicEntry("Classic", {
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 100)]) },
    });
    expect(buildMultirepQueue([c], "PU")).toEqual([]);
  });

  it("includes a multirep entry with no attempt yet", () => {
    const e = buildMultirepEntry("Solo", {
      exercises: { PU: multirepExercise("PU", []) },
    });
    const q = buildMultirepQueue([e], "PU");
    expect(q).toHaveLength(1);
    expect(q[0]!.entry.name).toBe("Solo");
    expect(q[0]!.attempt).toBeUndefined();
  });

  it("includes a multirep entry with pending attempt", () => {
    const e = buildMultirepEntry("Pending", {
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, null, VOTES_PENDING)]),
      },
    });
    const q = buildMultirepQueue([e], "PU");
    expect(q).toHaveLength(1);
    expect(q[0]!.attempt).toBeDefined();
    expect(q[0]!.attempt?.presetLoadKg).toBe(24);
  });

  it("excludes already-judged (success) entries", () => {
    const e = buildMultirepEntry("Done", {
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 15, VOTES_GOOD)]),
      },
    });
    expect(buildMultirepQueue([e], "PU")).toHaveLength(0);
  });

  it("excludes already-judged (fail) entries", () => {
    const e = buildMultirepEntry("Failed", {
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 0, VOTES_NO)]),
      },
    });
    expect(buildMultirepQueue([e], "PU")).toHaveLength(0);
  });

  it("sorts by entryIndex ASC (lot order)", () => {
    const a = buildMultirepEntry("A", {
      exercises: { PU: multirepExercise("PU", []) },
    });
    const b = buildMultirepEntry("B", {
      exercises: { PU: multirepExercise("PU", []) },
    });
    const c = buildMultirepEntry("C", {
      exercises: { PU: multirepExercise("PU", []) },
    });
    const q = buildMultirepQueue([a, b, c], "PU");
    expect(q.map((i) => i.entry.name)).toEqual(["A", "B", "C"]);
  });

  it("DI exercise independent of PU", () => {
    const e = buildMultirepEntry("DIonly", {
      event: "DI",
      exercises: { DI: multirepExercise("DI", []) },
    });
    expect(buildMultirepQueue([e], "DI")).toHaveLength(1);
    expect(buildMultirepQueue([e], "PU")).toHaveLength(0);
  });

  it("excludes entries that don't compete in the requested exercise", () => {
    const puOnly = buildMultirepEntry("PUOnly", {
      event: "PU",
      exercises: { PU: multirepExercise("PU", []) },
    });
    const diOnly = buildMultirepEntry("DIOnly", {
      event: "DI",
      exercises: { DI: multirepExercise("DI", []) },
    });
    const q = buildMultirepQueue([puOnly, diOnly], "PU");
    expect(q).toHaveLength(1);
    expect(q[0]!.entry.name).toBe("PUOnly");
  });
});

describe("getActiveMultirepItem", () => {
  it("returns null for empty entries", () => {
    expect(getActiveMultirepItem([], "PU", null)).toBeNull();
  });

  it("falls back to first item when activeEntryIndex is null", () => {
    const a = buildMultirepEntry("A", {
      exercises: { PU: multirepExercise("PU", []) },
    });
    const b = buildMultirepEntry("B", {
      exercises: { PU: multirepExercise("PU", []) },
    });
    const result = getActiveMultirepItem([a, b], "PU", null);
    expect(result?.entry.name).toBe("A");
  });

  it("returns matching item when activeEntryIndex found in queue", () => {
    const a = buildMultirepEntry("A", {
      exercises: { PU: multirepExercise("PU", []) },
    });
    const b = buildMultirepEntry("B", {
      exercises: { PU: multirepExercise("PU", []) },
    });
    const result = getActiveMultirepItem([a, b], "PU", 1);
    expect(result?.entry.name).toBe("B");
  });

  it("falls back to first when active entry is no longer in the queue (judged)", () => {
    const a = buildMultirepEntry("A", {
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 12, VOTES_GOOD)]),
      },
    });
    const b = buildMultirepEntry("B", {
      exercises: { PU: multirepExercise("PU", []) },
    });
    // active was index 0 but it's done now → fallback to first remaining (B at index 1)
    const result = getActiveMultirepItem([a, b], "PU", 0);
    expect(result?.entry.name).toBe("B");
  });

  it("returns null when queue is empty (all judged)", () => {
    const e = buildMultirepEntry("Done", {
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 15, VOTES_GOOD)]),
      },
    });
    expect(getActiveMultirepItem([e], "PU", 0)).toBeNull();
  });
});
