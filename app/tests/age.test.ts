/**
 * Age-category and masters-multiplier tests — D6 + D26 (the largest correctness
 * differentiator vs PowerGage and PowerTable).
 *
 * Mandatory boundary tests per blueprint v2 §17: ages 60, 69, 70, 80.
 */

import { describe, it, expect } from "vitest";
import {
  ageInYears,
  resolveAgeCategory,
  mastersMultiplier,
} from "@logic/isf/age";

describe("ageInYears", () => {
  it("computes age before birthday in calendar year", () => {
    // Born 1990-07-15; meet date 2026-04-26 (before July) → 35
    expect(ageInYears("1990-07-15", "2026-04-26")).toBe(35);
  });

  it("computes age on the birthday", () => {
    expect(ageInYears("1990-07-15", "2026-07-15")).toBe(36);
  });

  it("computes age after birthday", () => {
    expect(ageInYears("1990-07-15", "2026-07-16")).toBe(36);
  });
});

describe("resolveAgeCategory — ISF v5.1 §10.9.4", () => {
  it("13 → Sub-Juniors (and Open is the secondary match)", () => {
    expect(resolveAgeCategory(13)?.code).toBe("youth");
  });

  it("17 → Sub-Juniors (upper bound inclusive)", () => {
    expect(resolveAgeCategory(17)?.code).toBe("youth");
  });

  it("18 → Juniors", () => {
    expect(resolveAgeCategory(18)?.code).toBe("junior");
  });

  it("22 → Juniors (upper bound inclusive)", () => {
    expect(resolveAgeCategory(22)?.code).toBe("junior");
  });

  it("23 → Open (no junior, no master yet)", () => {
    expect(resolveAgeCategory(23)?.code).toBe("open");
  });

  it("39 → Open (just before M1)", () => {
    expect(resolveAgeCategory(39)?.code).toBe("open");
  });

  it("40 → Masters M1", () => {
    expect(resolveAgeCategory(40)?.code).toBe("masters_m1");
  });

  it("44 → Masters M1 (upper bound inclusive)", () => {
    expect(resolveAgeCategory(44)?.code).toBe("masters_m1");
  });

  // ─── M5 / M6 BOUNDARY TESTS — the differentiator vs PowerGage + PowerTable ───
  it("60 → Masters M5", () => {
    expect(resolveAgeCategory(60)?.code).toBe("masters_m5");
  });

  it("69 → Masters M5 (upper bound inclusive)", () => {
    expect(resolveAgeCategory(69)?.code).toBe("masters_m5");
  });

  it("70 → Masters M6 — CORRECT vs PowerGage/PowerTable", () => {
    // PowerGage: M6 absent, 70-year-old gets 1.125 (wrong by ISF v5.1)
    // PowerTable: M6 = 99–99 placeholder, 70-year-old gets 1.125 via M5 (wrong by ISF v5.1)
    // Streetlifting OS: M6 = 70+, 70-year-old gets 1.150 (correct)
    expect(resolveAgeCategory(70)?.code).toBe("masters_m6");
  });

  it("80 → Masters M6", () => {
    expect(resolveAgeCategory(80)?.code).toBe("masters_m6");
  });

  it("100 → Masters M6 (no upper bound)", () => {
    expect(resolveAgeCategory(100)?.code).toBe("masters_m6");
  });
});

describe("mastersMultiplier — ISF v5.1 §10.9.4", () => {
  it("non-masters returns 1.0", () => {
    expect(mastersMultiplier("open")).toBe(1.0);
    expect(mastersMultiplier("youth")).toBe(1.0);
    expect(mastersMultiplier("junior")).toBe(1.0);
  });

  it("M1 → 1.025", () => {
    expect(mastersMultiplier("masters_m1")).toBe(1.025);
  });

  it("M2 → 1.050", () => {
    expect(mastersMultiplier("masters_m2")).toBe(1.05);
  });

  it("M3 → 1.075", () => {
    expect(mastersMultiplier("masters_m3")).toBe(1.075);
  });

  it("M4 → 1.100", () => {
    expect(mastersMultiplier("masters_m4")).toBe(1.1);
  });

  it("M5 → 1.125", () => {
    expect(mastersMultiplier("masters_m5")).toBe(1.125);
  });

  it("M6 → 1.150 — primary correctness differentiator", () => {
    // Streetlifting OS only — PowerGage + PowerTable both encode 1.125 here.
    expect(mastersMultiplier("masters_m6")).toBe(1.15);
  });

  it("null returns 1.0 (no category resolved)", () => {
    expect(mastersMultiplier(null)).toBe(1.0);
  });
});
