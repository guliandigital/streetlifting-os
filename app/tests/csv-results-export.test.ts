import { describe, expect, it } from "vitest";
import {
  exportClassicProtocolCsv,
  exportMultirepProtocolCsv,
  exportOpenPowerliftingCsv,
  exportResultsProtocolCsv,
} from "../src/logic/isf/csv-export-classic";
import { computeClassicResults } from "../src/logic/isf/classic-placing";
import {
  ISF_V51_AGE_CATEGORIES,
  ISF_V51_WEIGHT_CATEGORIES,
} from "../src/domain/presets";
import type { MeetState } from "../src/domain/models";
import {
  buildClassicEntry,
  classicAttempt,
  classicExercise,
  VOTES_GOOD,
  VOTES_NO,
} from "./fixtures/builders";

const BOM = "﻿";

const MEET: MeetState = {
  name: "Open Test",
  federation: "ISF",
  country: "RU",
  state: "Krasnodar",
  city: "Krasnodar",
  date: "2026-04-29",
  competitionFormat: "classic",
  enabledDisciplineCodes: [],
  divisions: ["amateur", "pro"],
  ageCategories: [...ISF_V51_AGE_CATEGORIES],
  weightCategories: [...ISF_V51_WEIGHT_CATEGORIES],
  formula: "ISF_POINTS",
  useMastersAdjustment: true,
  lowerBodyweightFirstTiebreak: true,
  inKg: true,
  showAlternateUnits: false,
};

describe("results CSV export", () => {
  it("keeps standalone classic and multirep exports Excel-friendly", () => {
    expect(exportClassicProtocolCsv([], "Meet", "2026-04-29").startsWith(BOM))
      .toBe(true);
    expect(exportMultirepProtocolCsv([], "Meet", "2026-04-29").startsWith(BOM))
      .toBe(true);
  });

  it("uses exactly one BOM in combined results export", () => {
    const csv = exportResultsProtocolCsv([], [], "Meet", "2026-04-29");
    const bomCount = [...csv].filter((char) => char === BOM).length;

    expect(csv.startsWith(BOM)).toBe(true);
    expect(bomCount).toBe(1);
  });

  it("exports OpenPowerlifting-shaped classic rows without BOM or duplicate absolute rows", () => {
    const entries = [
      buildClassicEntry("Doe, John", {
        birthDate: "1990-04-29",
        bodyweightKg: 82.5,
        country: "RU",
        assignedWeightCategoryCode: "M_90",
        exercises: {
          PU: classicExercise("PU", [
            classicAttempt(1, 50, VOTES_GOOD),
            classicAttempt(2, 55, VOTES_NO),
          ]),
          DI: classicExercise("DI", [
            classicAttempt(1, 75, VOTES_GOOD),
          ]),
        },
      }),
    ];
    const groups = computeClassicResults(entries, MEET, MEET.date);
    const csv = exportOpenPowerliftingCsv(groups, {
      meetName: MEET.name,
      meetDate: MEET.date,
      federation: MEET.federation,
      parentFederation: "ISF",
      meetCountry: MEET.country,
      meetState: MEET.state,
    });
    const lines = csv.split("\n");

    expect(csv.startsWith(BOM)).toBe(false);
    expect(lines).toHaveLength(2);
    expect(lines[0]?.startsWith("Name,Sex,Event,Equipment")).toBe(true);
    expect(lines[1]).toContain("Doe John,M,BD,Raw,36,,");
    expect(lines[1]).toContain(",82.5,90,");
    expect(lines[1]).toContain(",75,50,,,-55,");
    expect(lines[1]).toContain(",75,50,125,1,");
    expect(lines[1]).toContain(",RU,,ISF,ISF,2026-04-29,RU,Krasnodar,Open Test,Yes");
  });

  it("marks guest lifters as G in OpenPowerlifting export", () => {
    const entries = [
      buildClassicEntry("Guest", {
        guest: true,
        assignedWeightCategoryCode: "M_90",
        exercises: {
          PU: classicExercise("PU", [classicAttempt(1, 50, VOTES_GOOD)]),
          DI: classicExercise("DI", [classicAttempt(1, 75, VOTES_GOOD)]),
        },
      }),
    ];
    const groups = computeClassicResults(entries, MEET, MEET.date);
    const csv = exportOpenPowerliftingCsv(groups, {
      meetName: MEET.name,
      meetDate: MEET.date,
    });

    expect(csv.split("\n")[1]?.split(",")[26]).toBe("G");
  });
});
