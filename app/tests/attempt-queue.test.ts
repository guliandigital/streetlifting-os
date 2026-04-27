/**
 * attempt-queue.test.ts — Sprint 2
 *
 * Tests for buildAttemptQueue / getCurrentRound / getActiveItem.
 */

import { describe, it, expect } from "vitest";
import {
  buildAttemptQueue,
  getCurrentRound,
  getActiveItem,
} from "@logic/isf/attempt-queue";
import {
  buildClassicEntry,
  classicAttempt,
  classicExercise,
  VOTES_GOOD,
  VOTES_NO,
  VOTES_PENDING,
} from "./fixtures/builders";

// ─── getCurrentRound ──────────────────────────────────────────────────────────

describe("getCurrentRound", () => {
  it("returns null for empty entries list", () => {
    expect(getCurrentRound([], "PU")).toBeNull();
  });

  it("returns null when no entries compete in PU", () => {
    const e = buildClassicEntry("Alice", {
      event: "DI",
      exercises: { DI: classicExercise("DI", []) },
    });
    expect(getCurrentRound([e], "PU")).toBeNull();
  });

  it("returns 1 when entry has no PU attempts at all", () => {
    const e = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: { PU: classicExercise("PU", []) },
    });
    expect(getCurrentRound([e], "PU")).toBe(1);
  });

  it("returns 1 when R1 attempt is pending", () => {
    const e = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 80, VOTES_PENDING)]),
      },
    });
    expect(getCurrentRound([e], "PU")).toBe(1);
  });

  it("returns 2 when R1 is done and R2 is pending", () => {
    const e = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 80, VOTES_GOOD),
          classicAttempt(2, 85, VOTES_PENDING),
        ]),
      },
    });
    expect(getCurrentRound([e], "PU")).toBe(2);
  });

  it("returns 3 when R1 and R2 done, R3 pending", () => {
    const e = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 80, VOTES_GOOD),
          classicAttempt(2, 82, VOTES_NO),
          classicAttempt(3, 82, VOTES_PENDING),
        ]),
      },
    });
    expect(getCurrentRound([e], "PU")).toBe(3);
  });

  it("returns null when all 3 rounds done", () => {
    const e = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 80, VOTES_GOOD),
          classicAttempt(2, 82, VOTES_GOOD),
          classicAttempt(3, 85, VOTES_NO),
        ]),
      },
    });
    expect(getCurrentRound([e], "PU")).toBeNull();
  });

  it("returns minimum round across multiple entries", () => {
    const e1 = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const e2 = buildClassicEntry("Bob", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 80, VOTES_PENDING)]),
      },
    });
    expect(getCurrentRound([e1, e2], "PU")).toBe(1);
  });

  it("returns 2 only when ALL entries have completed R1", () => {
    const e1 = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const e2 = buildClassicEntry("Bob", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    expect(getCurrentRound([e1, e2], "PU")).toBe(2);
  });

  it("ignores entries without exercises (no PU key)", () => {
    const e = buildClassicEntry("Alice", { event: "DI", exercises: {} });
    expect(getCurrentRound([e], "PU")).toBeNull();
  });

  it("works for DI exercise independently of PU", () => {
    const e = buildClassicEntry("Alice", {
      event: "DI",
      exercises: { DI: classicExercise("DI", []) },
    });
    expect(getCurrentRound([e], "DI")).toBe(1);
    expect(getCurrentRound([e], "PU")).toBeNull();
  });
});

// ─── buildAttemptQueue ────────────────────────────────────────────────────────

describe("buildAttemptQueue", () => {
  it("returns empty queue for empty entries", () => {
    expect(buildAttemptQueue([], "PU", true)).toEqual([]);
  });

  it("returns single item for single R1 entry with no attempt", () => {
    const e = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: { PU: classicExercise("PU", []) },
    });
    const q = buildAttemptQueue([e], "PU", true);
    expect(q).toHaveLength(1);
    expect(q[0]!.sequence).toBe(1);
    expect(q[0]!.attempt).toBeUndefined();
  });

  it("returns R2 item when R1 is done", () => {
    const e = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const q = buildAttemptQueue([e], "PU", true);
    expect(q).toHaveLength(1);
    expect(q[0]!.sequence).toBe(2);
  });

  it("returns empty queue when all 3 rounds done", () => {
    const e = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 80, VOTES_GOOD),
          classicAttempt(2, 82, VOTES_GOOD),
          classicAttempt(3, 85, VOTES_NO),
        ]),
      },
    });
    expect(buildAttemptQueue([e], "PU", true)).toHaveLength(0);
  });

  it("sorts two entries by declared load ASC", () => {
    const e1 = buildClassicEntry("Alice", {
      event: "PUDI",
      bodyweightKg: 80,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 90)]),
      },
    });
    const e2 = buildClassicEntry("Bob", {
      event: "PUDI",
      bodyweightKg: 75,
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 80)]),
      },
    });
    const q = buildAttemptQueue([e1, e2], "PU", true);
    expect(q[0]!.entry.name).toBe("Bob"); // 80 < 90
    expect(q[1]!.entry.name).toBe("Alice");
  });

  it("sorts by bodyweight ASC when loads equal (lowerBodyweightFirst=true)", () => {
    const e1 = buildClassicEntry("Alice", {
      event: "PUDI",
      bodyweightKg: 90,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 80)]) },
    });
    const e2 = buildClassicEntry("Bob", {
      event: "PUDI",
      bodyweightKg: 75,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 80)]) },
    });
    const q = buildAttemptQueue([e1, e2], "PU", true);
    expect(q[0]!.entry.name).toBe("Bob"); // 75 < 90
    expect(q[1]!.entry.name).toBe("Alice");
  });

  it("ignores bodyweight tiebreak when lowerBodyweightFirst=false", () => {
    const e1 = buildClassicEntry("Alice", {
      event: "PUDI",
      bodyweightKg: 90,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 80)]) },
    });
    const e2 = buildClassicEntry("Bob", {
      event: "PUDI",
      bodyweightKg: 75,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 80)]) },
    });
    // With lowerBWFirst=false, tiebreak falls to entryIndex.
    const q = buildAttemptQueue([e1, e2], "PU", false);
    // e1 has a lower entryIndex (added first) → goes first
    expect(q[0]!.entry.name).toBe("Alice");
    expect(q[1]!.entry.name).toBe("Bob");
  });

  it("sorts by entryIndex when load and BW are equal", () => {
    const e1 = buildClassicEntry("Alice", {
      event: "PUDI",
      bodyweightKg: 80,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 80)]) },
    });
    const e2 = buildClassicEntry("Bob", {
      event: "PUDI",
      bodyweightKg: 80,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 80)]) },
    });
    const entries = [e1, e2];
    const q = buildAttemptQueue(entries, "PU", true);
    expect(q[0]!.entryIndex).toBe(0); // e1 is at index 0
    expect(q[1]!.entryIndex).toBe(1); // e2 is at index 1
  });

  it("sorts null (undeclared) load to end", () => {
    const e1 = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: { PU: classicExercise("PU", [classicAttempt(1, null)]) },
    });
    const e2 = buildClassicEntry("Bob", {
      event: "PUDI",
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 80)]) },
    });
    const q = buildAttemptQueue([e1, e2], "PU", true);
    expect(q[0]!.entry.name).toBe("Bob"); // declared load first
    expect(q[1]!.entry.name).toBe("Alice"); // null last
  });

  it("only includes entries at the current round (not mix of R1 and R2)", () => {
    // e1 is at R2 (R1 done), e2 is still at R1 (pending)
    const e1 = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const e2 = buildClassicEntry("Bob", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 80, VOTES_PENDING)]),
      },
    });
    // Current round = 1 (Bob still at R1).
    const q = buildAttemptQueue([e1, e2], "PU", true);
    expect(q).toHaveLength(1);
    expect(q[0]!.entry.name).toBe("Bob");
    expect(q[0]!.sequence).toBe(1);
  });

  it("excludes entries that don't compete in the exercise", () => {
    const e1 = buildClassicEntry("PUOnly", {
      event: "PU",
      exercises: { PU: classicExercise("PU", []) },
    });
    const e2 = buildClassicEntry("DIOnly", {
      event: "DI",
      exercises: { DI: classicExercise("DI", []) },
    });
    const q = buildAttemptQueue([e1, e2], "PU", true);
    expect(q).toHaveLength(1);
    expect(q[0]!.entry.name).toBe("PUOnly");
  });

  it("carries attempt reference when attempt exists for current round", () => {
    const att = classicAttempt(1, 80, VOTES_PENDING);
    const e = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: { PU: classicExercise("PU", [att]) },
    });
    const q = buildAttemptQueue([e], "PU", true);
    expect(q[0]!.attempt).toBeDefined();
    expect(q[0]!.attempt?.declaredLoadKg).toBe(80);
  });

  it("sets attempt=undefined when no attempt exists for current round", () => {
    const e = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: { PU: classicExercise("PU", []) },
    });
    const q = buildAttemptQueue([e], "PU", true);
    expect(q[0]!.attempt).toBeUndefined();
  });

  it("R2 only appears once ALL entries have completed R1", () => {
    const e1 = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const e2 = buildClassicEntry("Bob", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [classicAttempt(1, 80, VOTES_GOOD)]),
      },
    });
    const q = buildAttemptQueue([e1, e2], "PU", true);
    expect(q).toHaveLength(2);
    expect(q.every((item) => item.sequence === 2)).toBe(true);
  });

  it("entryIndex is the position in the entries array", () => {
    const e0 = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: { PU: classicExercise("PU", []) },
    });
    const e1 = buildClassicEntry("Bob", {
      event: "PUDI",
      exercises: { PU: classicExercise("PU", []) },
    });
    const entries = [e0, e1];
    const q = buildAttemptQueue(entries, "PU", false);
    // Alice at index 0 goes first (lower entryIndex), Bob at index 1 second.
    expect(q[0]!.entryIndex).toBe(0);
    expect(q[1]!.entryIndex).toBe(1);
  });

  it("three entries at different loads — sorted by load", () => {
    const entries = [
      buildClassicEntry("C", {
        event: "PUDI",
        exercises: { PU: classicExercise("PU", [classicAttempt(1, 100)]) },
      }),
      buildClassicEntry("A", {
        event: "PUDI",
        exercises: { PU: classicExercise("PU", [classicAttempt(1, 70)]) },
      }),
      buildClassicEntry("B", {
        event: "PUDI",
        exercises: { PU: classicExercise("PU", [classicAttempt(1, 85)]) },
      }),
    ];
    const q = buildAttemptQueue(entries, "PU", true);
    expect(q.map((i) => i.entry.name)).toEqual(["A", "B", "C"]);
  });

  it("three entries with mix of null and declared — null goes to end", () => {
    const entries = [
      buildClassicEntry("C", {
        event: "PUDI",
        exercises: { PU: classicExercise("PU", [classicAttempt(1, null)]) },
      }),
      buildClassicEntry("A", {
        event: "PUDI",
        exercises: { PU: classicExercise("PU", [classicAttempt(1, 70)]) },
      }),
      buildClassicEntry("B", {
        event: "PUDI",
        exercises: { PU: classicExercise("PU", [classicAttempt(1, 85)]) },
      }),
    ];
    const q = buildAttemptQueue(entries, "PU", true);
    expect(q[0]!.entry.name).toBe("A");
    expect(q[1]!.entry.name).toBe("B");
    expect(q[2]!.entry.name).toBe("C");
  });
});

// ─── getActiveItem ────────────────────────────────────────────────────────────

describe("getActiveItem", () => {
  it("returns null for empty entries list", () => {
    expect(getActiveItem([], "PU", null, null, true)).toBeNull();
  });

  it("returns first queue item when activeEntryIndex is null", () => {
    const e1 = buildClassicEntry("Alice", {
      event: "PUDI",
      bodyweightKg: 80,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 90)]) },
    });
    const e2 = buildClassicEntry("Bob", {
      event: "PUDI",
      bodyweightKg: 70,
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 80)]) },
    });
    const result = getActiveItem([e1, e2], "PU", null, null, true);
    // Bob has lower load (80) → first in queue
    expect(result?.entry.name).toBe("Bob");
  });

  it("returns matching item when activeEntryIndex + sequence found in queue", () => {
    const e1 = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 90)]) },
    });
    const e2 = buildClassicEntry("Bob", {
      event: "PUDI",
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 80)]) },
    });
    const entries = [e1, e2];
    // Set active to Alice (index 0, sequence 1)
    const result = getActiveItem(entries, "PU", 0, 1, true);
    expect(result?.entry.name).toBe("Alice");
  });

  it("falls back to first item when active item not found in queue", () => {
    const e1 = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: { PU: classicExercise("PU", [classicAttempt(1, 90, VOTES_GOOD)]) },
    });
    const e2 = buildClassicEntry("Bob", {
      event: "PUDI",
      exercises: { PU: classicExercise("PU", []) },
    });
    const entries = [e1, e2];
    // Alice completed R1, no longer in queue for R1.
    // Active was Alice at sequence 1 — now invalid.
    const result = getActiveItem(entries, "PU", 0, 1, true);
    // Should fall back to Bob at sequence 1.
    expect(result?.entry.name).toBe("Bob");
  });

  it("returns null when queue is empty (all done)", () => {
    const e = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: {
        PU: classicExercise("PU", [
          classicAttempt(1, 80, VOTES_GOOD),
          classicAttempt(2, 82, VOTES_NO),
          classicAttempt(3, 82, VOTES_GOOD),
        ]),
      },
    });
    expect(getActiveItem([e], "PU", 0, 1, true)).toBeNull();
  });

  it("ignores sequence=4 (record attempt) — falls back to first queue item", () => {
    const e = buildClassicEntry("Alice", {
      event: "PUDI",
      exercises: { PU: classicExercise("PU", []) },
    });
    const result = getActiveItem([e], "PU", 0, 4, true);
    expect(result?.sequence).toBe(1); // R1 is the first pending
  });
});
