/**
 * Core domain enums.
 *
 * Per blueprint v2 §6.1 (extended for D39 from decisions-v3) and D35 sport scope.
 *
 * V1 implementations support only "classic" and "multirep" formats and "PU" / "DI"
 * exercises. The other enum values are reserved for V2 (Weighted Calisthenics) per D39
 * to avoid breaking save-file schema migration when V2 launches.
 */

/** Competition format determines attempt model + scoring formula family. */
export type CompetitionFormat = "classic" | "multirep" | "weighted_calisthenics";

/**
 * Exercise codes.
 *
 * V1 disciplines use only "PU" and "DI" (per D24 catalog).
 * "MU_BAR" / "MU_RING" / "SQ" are reserved for V2 WC sport.
 *
 * Per ISF v5.1 Glossary: female default = MU_RING (Ring Muscle-Up), male default = MU_BAR.
 */
export type Exercise = "PU" | "DI" | "MU_BAR" | "MU_RING" | "SQ";

/**
 * Event = exercise(s) scored together as one ranked total.
 *
 * V1 events: PU / DI / PUDI (streetlifting).
 * V2+: MU / SQ (single WC events) and MUPDISQ (full WC tetrathlon per ISF v5.1 §2.3:
 * Muscle-Up + Pull-Ups + Dips + Barbell Squat).
 */
export type Event = "PU" | "DI" | "PUDI" | "MU" | "SQ" | "MUPDISQ";

/** Athletic division. */
export type Division = "amateur" | "pro" | "adaptive";

/**
 * Sex / gender for competition purposes.
 * "OPEN" is for mixed-sex categories where applicable.
 */
export type Sex = "M" | "F" | "OPEN";

/** Result unit per discipline. */
export type ResultUnit = "kg" | "reps";

/**
 * Scoring formula family.
 * - "isf_points": coefficient × result + masters multiplier + additional points (Classic)
 * - "result_x_coefficient": raw result × per-(sex, exercise, ageCat) multiplier (Multirep)
 *
 * V2+ may add: "dots", "wilks", "raw", "ipf_gl" (powerlifting families) when
 * onboarding adjacent federations.
 */
export type FormulaCode = "isf_points" | "result_x_coefficient";

/**
 * Computed attempt status (never stored — derived from JudgeVotes per D15).
 *
 * "pending" = not yet decided (fewer than 2 of 3 votes cast)
 * "success" = 2+ "good lift" votes
 * "fail"    = 2+ "no lift" votes
 */
export type AttemptStatus = "pending" | "success" | "fail";
