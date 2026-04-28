/**
 * multirep-resolver.test.ts — Sprint 3
 *
 * Tests for resolveMultirepPreset() per ISF v5.1 §2.2 (D3).
 * Verifies preset matching across (sex × exercise × division × age category).
 */

import { describe, it, expect } from "vitest";
import { resolveMultirepPreset } from "@logic/isf/multirep-resolver";
import { ISF_V51_MULTIREP_PRESETS } from "@domain/presets";
import { buildMultirepEntry } from "./fixtures/builders";

const PRESETS = ISF_V51_MULTIREP_PRESETS;

describe("resolveMultirepPreset", () => {
  it("M Open amateur PU → 24 kg", () => {
    const e = buildMultirepEntry("X", { sex: "M", division: "amateur" });
    const match = resolveMultirepPreset(e, "PU", PRESETS, "open");
    expect(match).not.toBeNull();
    expect(match!.loadKg).toBe(24);
  });

  it("M Open pro PU → 32 kg", () => {
    const e = buildMultirepEntry("X", { sex: "M", division: "pro" });
    const match = resolveMultirepPreset(e, "PU", PRESETS, "open");
    expect(match).not.toBeNull();
    expect(match!.loadKg).toBe(32);
  });

  it("M masters M3 amateur PU → 16 kg (junior+masters band)", () => {
    const e = buildMultirepEntry("X", { sex: "M", division: "amateur" });
    const match = resolveMultirepPreset(e, "PU", PRESETS, "masters_m3");
    expect(match).not.toBeNull();
    expect(match!.loadKg).toBe(16);
  });

  it("M masters M6 (70+) amateur DI → 24 kg", () => {
    const e = buildMultirepEntry("X", { sex: "M", division: "amateur" });
    const match = resolveMultirepPreset(e, "DI", PRESETS, "masters_m6");
    expect(match).not.toBeNull();
    expect(match!.loadKg).toBe(24);
  });

  it("M youth amateur PU → 8 kg", () => {
    const e = buildMultirepEntry("X", { sex: "M", division: "amateur" });
    const match = resolveMultirepPreset(e, "PU", PRESETS, "youth");
    expect(match).not.toBeNull();
    expect(match!.loadKg).toBe(8);
  });

  it("F Open amateur DI → 16 kg", () => {
    const e = buildMultirepEntry("X", { sex: "F", division: "amateur" });
    const match = resolveMultirepPreset(e, "DI", PRESETS, "open");
    expect(match).not.toBeNull();
    expect(match!.loadKg).toBe(16);
  });

  it("F Open amateur PU → 12 kg", () => {
    const e = buildMultirepEntry("X", { sex: "F", division: "amateur" });
    const match = resolveMultirepPreset(e, "PU", PRESETS, "open");
    expect(match).not.toBeNull();
    expect(match!.loadKg).toBe(12);
  });

  it("F junior amateur DI → 12 kg", () => {
    const e = buildMultirepEntry("X", { sex: "F", division: "amateur" });
    const match = resolveMultirepPreset(e, "DI", PRESETS, "junior");
    expect(match).not.toBeNull();
    expect(match!.loadKg).toBe(12);
  });

  it("M masters M5 (60-69) pro PU → null (no pro/masters preset exists)", () => {
    const e = buildMultirepEntry("X", { sex: "M", division: "pro" });
    const match = resolveMultirepPreset(e, "PU", PRESETS, "masters_m5");
    expect(match).toBeNull();
  });

  it("F pro PU → null (no pro/female preset exists)", () => {
    const e = buildMultirepEntry("X", { sex: "F", division: "pro" });
    const match = resolveMultirepPreset(e, "PU", PRESETS, "open");
    expect(match).toBeNull();
  });

  it("null age category → null", () => {
    const e = buildMultirepEntry("X", { sex: "M", division: "amateur" });
    const match = resolveMultirepPreset(e, "PU", PRESETS, null);
    expect(match).toBeNull();
  });

  it("SQ exercise → null (V1 only supports PU/DI)", () => {
    const e = buildMultirepEntry("X", { sex: "M", division: "amateur" });
    const match = resolveMultirepPreset(e, "SQ", PRESETS, "open");
    expect(match).toBeNull();
  });

  it("MU_BAR exercise → null (V1 only supports PU/DI)", () => {
    const e = buildMultirepEntry("X", { sex: "M", division: "amateur" });
    const match = resolveMultirepPreset(e, "MU_BAR", PRESETS, "open");
    expect(match).toBeNull();
  });

  it("empty preset list → null", () => {
    const e = buildMultirepEntry("X", { sex: "M", division: "amateur" });
    const match = resolveMultirepPreset(e, "PU", [], "open");
    expect(match).toBeNull();
  });

  it("returns the preset object alongside loadKg", () => {
    const e = buildMultirepEntry("X", { sex: "M", division: "amateur" });
    const match = resolveMultirepPreset(e, "DI", PRESETS, "open");
    expect(match).not.toBeNull();
    expect(match!.preset.sex).toBe("M");
    expect(match!.preset.exercise).toBe("DI");
    expect(match!.preset.division).toBe("amateur");
    expect(match!.preset.ageCategoryCodes).toContain("open");
  });
});
