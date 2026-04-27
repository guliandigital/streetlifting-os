/**
 * Attempt-queue logic — Sprint 2, Classic judging screen.
 *
 * Pure functions, no Redux. Used by JudgingPage to determine what the
 * current round is and which athletes are next in line.
 *
 * Ordering rules per ISF v5.1 §7.4.3 + D2B:
 *   1. declaredLoadKg ASC (null = not yet declared → sort to end)
 *   2. bodyweightKg ASC (only when lowerBodyweightFirst is true)
 *   3. entryIndex ASC (lot-order surrogate)
 */

import type { Entry } from "@domain/models";
import type { ClassicAttempt } from "@domain/models";
import { attemptStatusFromVotes } from "./judge-votes";

export type QueueItem = {
  /** Index of this entry in registration.entries[]. */
  entryIndex: number;
  entry: Entry;
  exercise: "PU" | "DI";
  /** Round number (1=R1, 2=R2, 3=R3). */
  sequence: 1 | 2 | 3;
  /** undefined if no attempt has been declared for this round yet. */
  attempt: ClassicAttempt | undefined;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** True if this entry competes in the given exercise at the classic format. */
function competesIn(entry: Entry, exercise: "PU" | "DI"): boolean {
  const ex = entry.exercises[exercise];
  return ex !== undefined && ex.format === "classic";
}

/**
 * An attempt is "done" when judges have reached a decision (success or fail).
 * Pending means the attempt has not yet been judged.
 */
function isAttemptDone(attempt: ClassicAttempt): boolean {
  return attemptStatusFromVotes(attempt.judgeVotes) !== "pending";
}

/**
 * Get the attempt object for a given sequence, or undefined.
 */
function getAttempt(
  entry: Entry,
  exercise: "PU" | "DI",
  sequence: 1 | 2 | 3,
): ClassicAttempt | undefined {
  const ex = entry.exercises[exercise];
  if (!ex || ex.format !== "classic") return undefined;
  return ex.attempts.find((a) => a.sequence === sequence);
}

/**
 * Find the next sequence (1,2,3) for an entry that is still pending.
 * Returns null if all 3 attempts are done.
 */
function nextPendingSequence(
  entry: Entry,
  exercise: "PU" | "DI",
): 1 | 2 | 3 | null {
  for (const seq of [1, 2, 3] as const) {
    const att = getAttempt(entry, exercise, seq);
    if (att === undefined) return seq; // not declared/created yet → this is the next round
    if (!isAttemptDone(att)) return seq; // exists but still pending
  }
  return null; // all 3 done
}

// ─── Primary exports ──────────────────────────────────────────────────────────

/**
 * Returns the current round (lowest round number with ≥1 pending/undeclared
 * attempt across all entries that compete in this exercise), or null if all
 * attempts are done.
 */
export function getCurrentRound(
  entries: readonly Entry[],
  exercise: "PU" | "DI",
): 1 | 2 | 3 | null {
  let minSeq: 1 | 2 | 3 | null = null;

  for (const entry of entries) {
    if (!competesIn(entry, exercise)) continue;
    const seq = nextPendingSequence(entry, exercise);
    if (seq === null) continue;
    if (minSeq === null || seq < minSeq) {
      minSeq = seq;
    }
  }

  return minSeq;
}

/**
 * Build the attempt queue for the current round of the given exercise.
 *
 * Returns all entries that are at the current round (= min pending sequence),
 * sorted by ISF round-system order.
 */
export function buildAttemptQueue(
  entries: readonly Entry[],
  exercise: "PU" | "DI",
  lowerBodyweightFirst: boolean,
): QueueItem[] {
  const currentRound = getCurrentRound(entries, exercise);
  if (currentRound === null) return [];

  // Collect all entries that are at the current round.
  const items: QueueItem[] = [];
  entries.forEach((entry, entryIndex) => {
    if (!competesIn(entry, exercise)) return;
    const seq = nextPendingSequence(entry, exercise);
    if (seq !== currentRound) return;
    const attempt = getAttempt(entry, exercise, currentRound);
    items.push({ entryIndex, entry, exercise, sequence: currentRound, attempt });
  });

  // Sort by ISF round-system order.
  items.sort((a, b) => {
    // 1. declaredLoadKg ASC — null sorts to end.
    const la = a.attempt?.declaredLoadKg ?? null;
    const lb = b.attempt?.declaredLoadKg ?? null;
    if (la !== lb) {
      if (la === null) return 1;
      if (lb === null) return -1;
      return la - lb;
    }

    // 2. bodyweightKg ASC (only when lowerBodyweightFirst enabled).
    if (lowerBodyweightFirst) {
      const bwa = a.entry.bodyweightKg ?? Number.POSITIVE_INFINITY;
      const bwb = b.entry.bodyweightKg ?? Number.POSITIVE_INFINITY;
      if (bwa !== bwb) return bwa - bwb;
    }

    // 3. entryIndex ASC (lot-order surrogate).
    return a.entryIndex - b.entryIndex;
  });

  return items;
}

/**
 * Returns the currently active QueueItem — either the item matching
 * `activeEntryIndex`/`activeAttemptSequence`, or the first item in the queue
 * if no active item is set (or the set item is no longer in the queue).
 */
export function getActiveItem(
  entries: readonly Entry[],
  exercise: "PU" | "DI",
  activeEntryIndex: number | null,
  activeAttemptSequence: 1 | 2 | 3 | 4 | null,
  lowerBodyweightFirst: boolean,
): QueueItem | null {
  const queue = buildAttemptQueue(entries, exercise, lowerBodyweightFirst);
  if (queue.length === 0) return null;

  if (activeEntryIndex !== null && activeAttemptSequence !== null) {
    // sequence 4 is record-only and not in the normal queue.
    if (activeAttemptSequence !== 4) {
      const found = queue.find(
        (item) =>
          item.entryIndex === activeEntryIndex &&
          item.sequence === activeAttemptSequence,
      );
      if (found) return found;
    }
  }

  // Fall back to the first item in the queue.
  return queue[0] ?? null;
}
