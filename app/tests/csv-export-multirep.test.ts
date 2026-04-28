/**
 * csv-export-multirep.test.ts — Sprint 3
 *
 * Tests for exportMultirepProtocolCsv. Verifies header order, BOM, and section labels.
 */

import { describe, it, expect } from "vitest";
import { exportMultirepProtocolCsv } from "@logic/isf/csv-export-multirep";
import { computeMultirepResults } from "@logic/isf/multirep-placing";
import {
  buildMultirepEntry,
  multirepAttempt,
  multirepExercise,
  VOTES_GOOD,
} from "./fixtures/builders";
import type { MeetState } from "@domain/models";
import {
  ISF_V51_WEIGHT_CATEGORIES,
  ISF_V51_AGE_CATEGORIES,
  ISF_V51_MULTIREP_PRESETS,
} from "@domain/presets";

const MEET_DATE = "2026-04-27";

const TEST_MEET: MeetState = {
  name: "Multirep Test",
  federation: "ISF",
  country: "RU",
  state: "",
  city: "Moscow",
  date: MEET_DATE,
  competitionFormat: "multirep",
  enabledDisciplineCodes: ["multirep_2lift_24_32"],
  divisions: ["amateur"],
  ageCategories: [...ISF_V51_AGE_CATEGORIES],
  weightCategories: [...ISF_V51_WEIGHT_CATEGORIES],
  formula: "ISF_POINTS",
  useMastersAdjustment: true,
  lowerBodyweightFirstTiebreak: true,
  inKg: true,
  showAlternateUnits: false,
  multirepConfig: {
    defaultAttemptDurationSec: 120,
    presetLoads: [...ISF_V51_MULTIREP_PRESETS],
  },
};

describe("exportMultirepProtocolCsv", () => {
  it("starts with UTF-8 BOM", () => {
    const e = buildMultirepEntry("Solo", { assignedAgeCategoryCode: "open" });
    const groups = computeMultirepResults([e], TEST_MEET, MEET_DATE);
    const csv = exportMultirepProtocolCsv(groups, "Multirep Test", MEET_DATE);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("includes header row with PU/DI columns", () => {
    const groups = computeMultirepResults([], TEST_MEET, MEET_DATE);
    const csv = exportMultirepProtocolCsv(groups, "Empty", MEET_DATE);
    expect(csv).toContain("Подтяг. вес / PU Load");
    expect(csv).toContain("Подтяг. повт / PU Reps");
    expect(csv).toContain("Отжим. вес / DI Load");
    expect(csv).toContain("Отжим. повт / DI Reps");
    expect(csv).toContain("Сумма / Total");
  });

  it("includes meet name + date in file header comment", () => {
    const groups = computeMultirepResults([], TEST_MEET, MEET_DATE);
    const csv = exportMultirepProtocolCsv(groups, "My Meet", MEET_DATE);
    expect(csv).toContain("# My Meet — 2026-04-27");
  });

  it("includes section header per group ('=== ... ===')", () => {
    const e = buildMultirepEntry("Solo", {
      sex: "M",
      bodyweightKg: 80,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 10, VOTES_GOOD)]),
      },
    });
    const groups = computeMultirepResults([e], TEST_MEET, MEET_DATE);
    const csv = exportMultirepProtocolCsv(groups, "M", MEET_DATE);
    expect(csv).toMatch(/=== .+ ===/);
  });

  it("encodes guest with Г/G in place column", () => {
    const guest = buildMultirepEntry("GuestRow", {
      guest: true,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 5, VOTES_GOOD)]),
      },
    });
    const groups = computeMultirepResults([guest], TEST_MEET, MEET_DATE);
    const csv = exportMultirepProtocolCsv(groups, "M", MEET_DATE);
    expect(csv).toContain("Г/G");
  });

  it("includes athlete name in row", () => {
    const e = buildMultirepEntry("Иванов И.И.", {
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 10, VOTES_GOOD)]),
      },
    });
    const groups = computeMultirepResults([e], TEST_MEET, MEET_DATE);
    const csv = exportMultirepProtocolCsv(groups, "M", MEET_DATE);
    expect(csv).toContain("Иванов И.И.");
  });

  it("PU and DI loads/reps in row when both attempted", () => {
    const e = buildMultirepEntry("Both", {
      sex: "M",
      division: "amateur",
      bodyweightKg: 80,
      assignedAgeCategoryCode: "open",
      exercises: {
        PU: multirepExercise("PU", [multirepAttempt(24, 12, VOTES_GOOD)]),
        DI: multirepExercise("DI", [multirepAttempt(32, 18, VOTES_GOOD)]),
      },
    });
    const groups = computeMultirepResults([e], TEST_MEET, MEET_DATE);
    const csv = exportMultirepProtocolCsv(groups, "M", MEET_DATE);
    // Look at the row containing the athlete name
    const lines = csv.split("\n");
    const dataLine = lines.find((l) => l.includes("Both"));
    expect(dataLine).toBeDefined();
    const cells = dataLine!.split(",");
    // 24 (PU load), 12 (PU reps), 32 (DI load), 18 (DI reps)
    expect(cells).toContain("24");
    expect(cells).toContain("12");
    expect(cells).toContain("32");
    expect(cells).toContain("18");
    expect(cells).toContain("30"); // total
  });
});
