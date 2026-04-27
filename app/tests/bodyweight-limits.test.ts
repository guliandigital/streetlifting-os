/**
 * Additional points formula test — D7 (decisions-v1).
 *
 * ISF v5.1 §10.9.5: Additional Points = max(0, (bodyweight − limit) × 0.5).
 *   Men: PU = 90, DI = 100, PUDI = 95
 *   Women: PU = 55, DI = 65, PUDI = 60
 */

import { describe, it, expect } from "vitest";
import { additionalPoints } from "@domain/presets";

describe("additionalPoints — ISF v5.1 §10.9.5", () => {
  it("returns 0 when bodyweight ≤ limit (men, PU, 90 kg limit)", () => {
    expect(additionalPoints("M", "PU", 80)).toBe(0);
    expect(additionalPoints("M", "PU", 90)).toBe(0);
  });

  it("returns (bw − 90) × 0.5 for men PU above limit", () => {
    expect(additionalPoints("M", "PU", 100)).toBe(5);
    expect(additionalPoints("M", "PU", 110)).toBe(10);
  });

  it("returns 0 for women PU at exactly 55 kg", () => {
    expect(additionalPoints("F", "PU", 55)).toBe(0);
  });

  it("returns (bw − 55) × 0.5 for women PU at 60 kg", () => {
    expect(additionalPoints("F", "PU", 60)).toBe(2.5);
  });

  it("uses different limit for DI: men 100, women 65", () => {
    expect(additionalPoints("M", "DI", 110)).toBe(5);
    expect(additionalPoints("F", "DI", 75)).toBe(5);
  });

  it("uses combined-event limit for PUDI total: men 95, women 60", () => {
    expect(additionalPoints("M", "PUDI", 105)).toBe(5);
    expect(additionalPoints("F", "PUDI", 70)).toBe(5);
  });

  it("returns 0 for OPEN sex (no Classic limits defined)", () => {
    expect(additionalPoints("OPEN", "PU", 100)).toBe(0);
  });
});
