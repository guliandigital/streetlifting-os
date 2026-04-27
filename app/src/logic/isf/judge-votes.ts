/**
 * Judge-votes domain logic — D15 (decisions-v2).
 *
 * 3-judge majority decision per ISF v5.1 §7.6 + PowerTable evidence (3 separate
 * judge-remote URLs + audio split-decision callouts «Вес взят два к одному»).
 *
 * Pure functions, no side effects, fully unit-tested.
 */

import type { AttemptStatus } from "@domain/models";
import type { JudgeVotes, JudgeVote } from "@domain/models";

/**
 * Aggregate the three judge votes into an attempt status.
 *
 * Decision rule (ISF v5.1 §7.6 + D15):
 *   - 2 or more "good lift" votes  → "success"
 *   - 2 or more "no lift" votes    → "fail"
 *   - fewer than 2 votes cast      → "pending"
 *
 * Important: status is NEVER stored in the save-file. Always derive from JudgeVotes.
 */
export function attemptStatusFromVotes(v: JudgeVotes): AttemptStatus {
  const decided: boolean[] = [v.left, v.center, v.right].filter(
    (x): x is boolean => x !== null,
  );
  if (decided.length < 2) return "pending";
  const trues = decided.filter((x) => x === true).length;
  const falses = decided.filter((x) => x === false).length;
  if (trues >= 2) return "success";
  if (falses >= 2) return "fail";
  return "pending";
}

/**
 * Whether the decision was a 2-1 split (either direction).
 * Drives the audio callout «… два к одному» / "… two to one" per D18.
 *
 * Returns false unless all three judges have cast a vote (no nulls).
 */
export function isSplitDecision(v: JudgeVotes): boolean {
  const arr: JudgeVote[] = [v.left, v.center, v.right];
  if (arr.some((x) => x === null)) return false;
  const trues = arr.filter((x) => x === true).length;
  return trues === 1 || trues === 2;
}

/** Count of judges who have cast a vote. Used by UI to show progress. */
export function votesCast(v: JudgeVotes): number {
  return [v.left, v.center, v.right].filter((x) => x !== null).length;
}

/**
 * Operator override: aggregate-set all three judges to the same decision.
 * Used when running solo (no remote judges available) — operator presses big
 * GOOD/NO buttons in the Judging UI per blueprint v2 §11.6.
 */
export function aggregateVote(decision: boolean): JudgeVotes {
  return { left: decision, center: decision, right: decision };
}
