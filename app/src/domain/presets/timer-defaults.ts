/**
 * ISF v5.1 §7.5.1 attempt time limits — D10 (decisions-v1).
 */

export const ISF_V51_TIMER_DEFAULTS = {
  /** Classic Streetlifting attempt timer in seconds. */
  classicSec: 60,
  /** Multirep Streetlifting attempt timer in seconds. */
  multirepSec: 120,
  /** Weighted Calisthenics — same as Classic per ISF v5.1; V2 use. */
  weightedCalisthenicsSec: 60,
  /**
   * D9 — declaration window after a successful or failed attempt.
   * After 60s of inactivity:
   *   - successful attempt → weight auto-increases by +2.5 kg
   *   - failed attempt → previous weight is repeated
   */
  declarationWindowSec: 60,
} as const;
