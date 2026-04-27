/**
 * 3-judge majority vote model per D15 (decisions-v2).
 *
 * Evidence base: PowerTable broadcast catalog has 3 separate URL endpoints for
 * left / center / right judges. PowerTable audio system announces «Вес взят два
 * к одному» / «Попытка неудачная два к одному» on split decisions, naming the
 * specific 2-1 outcome.
 *
 * `status` is NEVER stored — always computed via attemptStatusFromVotes().
 */

/** A single judge's verdict. null = pending (judge hasn't pressed yet). */
export type JudgeVote = boolean | null;

/**
 * Per-attempt votes from the three officiating judges.
 * Per ISF v5.1 §7.6: 3 judges, simple majority decides.
 */
export type JudgeVotes = {
  left: JudgeVote;
  center: JudgeVote;
  right: JudgeVote;
};

/** Initial state for a new attempt — all judges pending. */
export const PENDING_VOTES: JudgeVotes = {
  left: null,
  center: null,
  right: null,
};
