/**
 * Multirep judging queue — Sprint 3.
 *
 * Multirep has ONE attempt per athlete per exercise (no rounds — see ISF v5.1 §7.5).
 * Per blueprint v2 §9.2: V1 ships "manual fixed order" → sort by entryIndex (lot order).
 * Filter: only entries that compete in the exercise at multirep format and have
 * a pending (or absent) attempt for sequence=1.
 */

import type { Entry, MultirepAttempt } from "@domain/models";
import { attemptStatusFromVotes } from "./judge-votes";

export type MultirepQueueItem = {
  entryIndex: number;
  entry: Entry;
  exercise: "PU" | "DI";
  /** undefined if attempt has not been created yet. */
  attempt: MultirepAttempt | undefined;
};

function competesInMultirep(entry: Entry, exercise: "PU" | "DI"): boolean {
  const ex = entry.exercises[exercise];
  return ex !== undefined && ex.format === "multirep";
}

function getMultirepAttempt(
  entry: Entry,
  exercise: "PU" | "DI",
): MultirepAttempt | undefined {
  const ex = entry.exercises[exercise];
  if (!ex || ex.format !== "multirep") return undefined;
  return ex.attempts.find((a) => a.sequence === 1);
}

function isPending(att: MultirepAttempt | undefined): boolean {
  if (att === undefined) return true;
  return attemptStatusFromVotes(att.judgeVotes) === "pending";
}

/**
 * Build the multirep queue for a given exercise.
 *
 * Includes only entries that compete in the exercise at multirep format AND
 * whose attempt is still pending (or hasn't been created yet).
 * Sorted by entryIndex ASC (lot order) per V1 manual fixed-order rule.
 */
export function buildMultirepQueue(
  entries: ReadonlyArray<Entry>,
  exercise: "PU" | "DI",
): MultirepQueueItem[] {
  const items: MultirepQueueItem[] = [];
  entries.forEach((entry, entryIndex) => {
    if (!competesInMultirep(entry, exercise)) return;
    const attempt = getMultirepAttempt(entry, exercise);
    if (!isPending(attempt)) return;
    items.push({ entryIndex, entry, exercise, attempt });
  });

  items.sort((a, b) => a.entryIndex - b.entryIndex);
  return items;
}

/**
 * Returns the active queue item — match by activeEntryIndex if it is in the
 * queue, otherwise fall back to the first item. null when queue is empty.
 */
export function getActiveMultirepItem(
  entries: ReadonlyArray<Entry>,
  exercise: "PU" | "DI",
  activeEntryIndex: number | null,
): MultirepQueueItem | null {
  const queue = buildMultirepQueue(entries, exercise);
  if (queue.length === 0) return null;

  if (activeEntryIndex !== null) {
    const found = queue.find((item) => item.entryIndex === activeEntryIndex);
    if (found) return found;
  }

  return queue[0] ?? null;
}
