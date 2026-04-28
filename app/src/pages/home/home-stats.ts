/**
 * home-stats.ts — pure stat computation functions for the Home dashboard.
 *
 * Extracted as standalone functions so they can be unit-tested without React.
 */

import type { Entry } from "@domain/models";
import { attemptStatusFromVotes } from "@logic/isf/judge-votes";

/**
 * Count entries where bodyweightKg has been recorded (not null).
 */
export function countWeighedIn(entries: Entry[]): number {
  return entries.filter((e) => e.bodyweightKg !== null).length;
}

/**
 * Count total completed (non-pending) attempts across all entries and classic exercises.
 * An attempt is "done" when its status is "success" or "fail" (i.e. all 3 judges have voted).
 */
export function countAttemptsDone(entries: Entry[]): number {
  let total = 0;
  for (const entry of entries) {
    for (const ex of Object.values(entry.exercises)) {
      if (!ex) continue;
      if (ex.format === "classic") {
        for (const att of ex.attempts) {
          // sequence 4 = record-only, exclude from normal count
          if (att.sequence === 4) continue;
          const status = attemptStatusFromVotes(att.judgeVotes);
          if (status !== "pending") total += 1;
        }
      } else if (ex.format === "multirep") {
        for (const att of ex.attempts) {
          const status = attemptStatusFromVotes(att.judgeVotes);
          if (status !== "pending") total += 1;
        }
      }
    }
  }
  return total;
}

/**
 * Count total possible attempts:
 * - Classic entries contribute 3 attempts per exercise (PU and/or DI).
 * - Multirep entries contribute 1 attempt per exercise.
 *
 * Based on the entry's `competitionFormat` and `event` fields.
 */
export function countAttemptsTotal(entries: Entry[]): number {
  let total = 0;
  for (const entry of entries) {
    if (entry.competitionFormat === "classic") {
      // event can be PU, DI, or PUDI (both exercises)
      if (entry.event === "PUDI") {
        total += 6; // 3 PU + 3 DI
      } else {
        total += 3; // either PU or DI
      }
    } else {
      // multirep: 1 attempt per exercise
      if (entry.event === "PUDI") {
        total += 2;
      } else {
        total += 1;
      }
    }
  }
  return total;
}
