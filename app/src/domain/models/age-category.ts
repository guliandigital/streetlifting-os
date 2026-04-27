/**
 * Age category model.
 * Preset list ships in src/domain/presets/age-categories.ts (per D27, decisions-v2).
 *
 * Critical correctness note: M5 covers 60-69 and M6 covers 70+ per ISF v5.1 §10.9.4
 * (D6 + D26). Both PowerGage and PowerTable encode pre-v5.1 single-band 60+ → 1.125;
 * Streetlifting OS is the only product that scores 70+ correctly with 1.150 multiplier.
 */

export type AgeCategoryCode =
  | "youth"
  | "junior"
  | "open"
  | "masters_m1"
  | "masters_m2"
  | "masters_m3"
  | "masters_m4"
  | "masters_m5"
  | "masters_m6";

export type AgeCategory = {
  code: AgeCategoryCode;
  /** English label */
  label: string;
  /** Russian label */
  labelRu: string;
  /** Lower bound inclusive; null = no lower bound (rare) */
  minAge: number | null;
  /** Upper bound inclusive; null = no upper bound (Open / M6) */
  maxAge: number | null;
  /** Whether sport-rank ratings can be earned in this category */
  ratingEligible: boolean;
};
