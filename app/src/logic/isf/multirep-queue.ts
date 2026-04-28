/**
 * Multirep attempt queue — Sprint 3.
 *
 * Simpler than Classic: each entry has exactly ONE attempt per exercise.
 * Queue contains all entries whose single attempt is not yet done (no decision).
 * Order: entryIndex ASC (lot order); lowerBodyweightFirst applied as secondary sort.
 */

import type { Entry } from "@domain/models";
import type { MultirepAttempt } from "@domain/models";
import { attemptStatusFromVotes } from "./judge-votes";

export type MultirepQueueItem = {
  /** Index of this entry in registration.entries[]. */
  entryIndex: number;
  entry: Entry;
  exercise: "PU" | "DI" | "PUDI";
  /** undefined = not yet started (attempt not created yet). */
  attempt: MultirepAttempt | undefined;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** True if this entry competes in the given exercise as multirep format. */
function multirepCompetesIn(entry: Entry, exercise: "PU" | "DI"): boolean {
  const ex = entry.exercises[exercise];
  return ex !== undefined && ex.format === "multirep";
}

/**
 * Get the single MultirepAttempt for an exercise, or undefined if not started.
 */
function getMultirepAttempt(
  entry: Entry,
  exercise: "PU" | "DI",
): MultirepAttempt | undefined {
  const ex = entry.exercises[exercise];
  if (!ex || ex.format !== "multirep") return undefined;
  return ex.attempts.find((a) => a.sequence === 1);
}

/**
 * Returns true if the single multirep attempt for an exercise is "done"
 * (judge decision = success or fail). Pending or not-started = not done.
 */
function isMultirepAttemptDone(entry: Entry, exercise: "PU" | "DI"): boolean {
  const att = getMultirepAttempt(entry, exercise);
  if (!att) return false; // not started
  const status = attemptStatusFromVotes(att.judgeVotes);
  return status !== "pending";
}

// ─── Primary exports ──────────────────────────────────────────────────────────

/**
 * Build the Multirep attempt queue.
 *
 * Returns all multirep entries that have NOT completed their single attempt
 * (status !== success/fail). For PUDI disciplines, we treat the entry as a
 * single queue item (exercise = "PUDI"). For single-lift (PU or DI only),
 * we expose the actual exercise.
 *
 * Order:
 *   1. entryIndex ASC (lot order)
 *   2. bodyweightKg ASC if lowerBodyweightFirst (secondary, applies when index same — N/A but safe)
 */
export function buildMultirepQueue(
  entries: readonly Entry[],
  lowerBodyweightFirst: boolean,
): MultirepQueueItem[] {
  const items: MultirepQueueItem[] = [];

  entries.forEach((entry, entryIndex) => {
    if (entry.competitionFormat !== "multirep") return;

    const event = entry.event; // "PU" | "DI" | "PUDI"

    if (event === "PUDI") {
      // Two-lift multirep: each exercise judged separately, but we emit one
      // queue item per pending exercise for each entry.
      for (const ex of ["PU", "DI"] as const) {
        if (!multirepCompetesIn(entry, ex)) continue;
        if (isMultirepAttemptDone(entry, ex)) continue;
        const attempt = getMultirepAttempt(entry, ex);
        items.push({ entryIndex, entry, exercise: ex, attempt });
      }
    } else if (event === "PU" || event === "DI") {
      if (!multirepCompetesIn(entry, event)) return;
      if (isMultirepAttemptDone(entry, event)) return;
      const attempt = getMultirepAttempt(entry, event);
      items.push({ entryIndex, entry, exercise: event, attempt });
    }
  });

  // Sort: entryIndex ASC, then bodyweightKg ASC if lowerBodyweightFirst
  items.sort((a, b) => {
    if (a.entryIndex !== b.entryIndex) return a.entryIndex - b.entryIndex;
    if (lowerBodyweightFirst) {
      const bwA = a.entry.bodyweightKg ?? Number.POSITIVE_INFINITY;
      const bwB = b.entry.bodyweightKg ?? Number.POSITIVE_INFINITY;
      if (bwA !== bwB) return bwA - bwB;
    }
    return 0;
  });

  return items;
}

/**
 * Returns the active MultirepQueueItem — either the item matching
 * `activeEntryIndex`, or the first item in the queue if none is set.
 */
export function getMultirepActiveItem(
  entries: readonly Entry[],
  activeEntryIndex: number | null,
  lowerBodyweightFirst: boolean = true,
): MultirepQueueItem | null {
  const queue = buildMultirepQueue(entries, lowerBodyweightFirst);
  if (queue.length === 0) return null;

  if (activeEntryIndex !== null) {
    const found = queue.find((item) => item.entryIndex === activeEntryIndex);
    if (found) return found;
  }

  return queue[0] ?? null;
}
