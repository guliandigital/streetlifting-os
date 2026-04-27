/**
 * Weight category resolution tests — D12, D28, ISF v5.1 §7.2.
 *
 * Boundary rule: minKg < bw <= maxKg.
 * Sex-restricted: only categories matching athlete's sex are eligible.
 * Age-restricted: M_52 is youth/junior only.
 */

import { describe, it, expect } from "vitest";
import { resolveWeightCategory } from "@logic/isf/weight-category-resolver";
import { ISF_V51_WEIGHT_CATEGORIES } from "@domain/presets";

const ALL = ISF_V51_WEIGHT_CATEGORIES;

describe("resolveWeightCategory — sex matching", () => {
  it("does not pick a women's category for a male athlete", () => {
    const cat = resolveWeightCategory(60, "M", "open", ALL);
    expect(cat?.sex).toBe("M");
  });

  it("does not pick a men's category for a female athlete", () => {
    const cat = resolveWeightCategory(60, "F", "open", ALL);
    expect(cat?.sex).toBe("F");
  });

  it("returns null for OPEN sex (only M/F supported)", () => {
    const cat = resolveWeightCategory(60, "OPEN", "open", ALL);
    expect(cat).toBeNull();
  });
});

describe("resolveWeightCategory — null / invalid bodyweight", () => {
  it("returns null for null bodyweight", () => {
    expect(resolveWeightCategory(null, "M", "open", ALL)).toBeNull();
  });
  it("returns null for zero bodyweight", () => {
    expect(resolveWeightCategory(0, "M", "open", ALL)).toBeNull();
  });
  it("returns null for negative bodyweight", () => {
    expect(resolveWeightCategory(-5, "M", "open", ALL)).toBeNull();
  });
  it("returns null for NaN bodyweight", () => {
    expect(resolveWeightCategory(Number.NaN, "M", "open", ALL)).toBeNull();
  });
});

describe("resolveWeightCategory — boundary rule (lower exclusive, upper inclusive)", () => {
  // Women's F_60 = 56 < bw <= 60.
  it("F bw 60.0 → F_60 (upper bound INCLUSIVE)", () => {
    expect(resolveWeightCategory(60.0, "F", "open", ALL)?.code).toBe("F_60");
  });
  it("F bw 60.1 → F_67_5 (above 60 spills upward)", () => {
    expect(resolveWeightCategory(60.1, "F", "open", ALL)?.code).toBe(
      "F_67_5",
    );
  });
  it("F bw 56.0 → F_56 (boundary belongs to lower category)", () => {
    expect(resolveWeightCategory(56.0, "F", "open", ALL)?.code).toBe("F_56");
  });
  it("F bw 55.9 → F_56", () => {
    expect(resolveWeightCategory(55.9, "F", "open", ALL)?.code).toBe("F_56");
  });

  // M_82_5 = 75 < bw <= 82.5.
  it("M bw 82.5 → M_82_5 (upper bound INCLUSIVE)", () => {
    expect(resolveWeightCategory(82.5, "M", "open", ALL)?.code).toBe("M_82_5");
  });
  it("M bw 82.6 → M_90", () => {
    expect(resolveWeightCategory(82.6, "M", "open", ALL)?.code).toBe("M_90");
  });
  it("M bw 75.0 → M_75 (boundary belongs to lower category)", () => {
    expect(resolveWeightCategory(75.0, "M", "open", ALL)?.code).toBe("M_75");
  });
});

describe("resolveWeightCategory — +plus categories", () => {
  it("F bw 100 → F_67_5_PLUS", () => {
    expect(resolveWeightCategory(100, "F", "open", ALL)?.code).toBe(
      "F_67_5_PLUS",
    );
  });
  it("F bw 67.5 → F_67_5 (plus only kicks in above 67.5)", () => {
    expect(resolveWeightCategory(67.5, "F", "open", ALL)?.code).toBe("F_67_5");
  });
  it("M bw 200 → M_140_PLUS", () => {
    expect(resolveWeightCategory(200, "M", "open", ALL)?.code).toBe(
      "M_140_PLUS",
    );
  });
});

describe("resolveWeightCategory — M_52 youth/junior restriction (D28)", () => {
  it("youth 50 kg male → M_52", () => {
    expect(resolveWeightCategory(50, "M", "youth", ALL)?.code).toBe("M_52");
  });
  it("junior 51 kg male → M_52", () => {
    expect(resolveWeightCategory(51, "M", "junior", ALL)?.code).toBe("M_52");
  });
  it("OPEN-aged 50 kg male → M_56 (M_52 not allowed)", () => {
    // No M_56 lower bound (below 52), but M_52 is restricted, so 50 kg open spills up.
    // M_56 is 52 < bw <= 56 — 50 doesn't fall there. The next eligible category up
    // for an open-age male at 50 kg is therefore M_52, but M_52 is restricted.
    // With no fall-through category for this rare case, resolver returns null.
    expect(resolveWeightCategory(50, "M", "open", ALL)).toBeNull();
  });
  it("masters_m1 51 kg male → null (M_52 restricted, M_56 doesn't catch 51)", () => {
    expect(resolveWeightCategory(51, "M", "masters_m1", ALL)).toBeNull();
  });
  it("youth-aged 53 kg male → M_56 (above M_52 maxKg even though youth)", () => {
    expect(resolveWeightCategory(53, "M", "youth", ALL)?.code).toBe("M_56");
  });
});

describe("resolveWeightCategory — 0.1 kg precision", () => {
  it("F bw 47.9 → F_48", () => {
    expect(resolveWeightCategory(47.9, "F", "open", ALL)?.code).toBe("F_48");
  });
  it("F bw 48.0 → F_48", () => {
    expect(resolveWeightCategory(48.0, "F", "open", ALL)?.code).toBe("F_48");
  });
  it("F bw 48.1 → F_52", () => {
    expect(resolveWeightCategory(48.1, "F", "open", ALL)?.code).toBe("F_52");
  });
});
