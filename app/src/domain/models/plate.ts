/**
 * Plate model — extended per D25 (decisions-v2) with `recordOnly` flag.
 *
 * Sub-1.25 kg plates and 50 kg plates are record-only and ignored in standard
 * weight-progression validation (ISF v5.1 §7: total weight must be a multiple of 1.25 kg
 * unless attempt is flagged as record).
 *
 * ISF v5.1 §6.6 colors (canonical): 25=red, 20=blue, 15=yellow, 10=green, 5=white.
 * PowerTable's display 50=green is decorative; we use ISF colors.
 */

export type Plate = {
  weightKg: number;
  pairCount: number;
  /** ISF v5.1 §6.6 color name. Examples: "red", "blue", "yellow", "green", "white", "black", "gray". */
  color: string;
  /** When true, this plate only counts on attempts flagged isRecordAttempt. */
  recordOnly?: boolean;
};
