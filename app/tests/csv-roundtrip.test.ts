/**
 * CSV import/export round-trip tests.
 *
 * Goal: a roster exported via buildRegistrationCsv, when reparsed via
 * parseRegistrationCsv, yields drafts that match the original entries on every
 * operator-managed field.
 */

import { describe, it, expect } from "vitest";

import { buildRegistrationCsv } from "@logic/isf/csv-export";
import { parseRegistrationCsv } from "@logic/isf/csv-import";
import type { Entry, DisciplineCode } from "@domain/models";
import { buildClassicEntry } from "./fixtures/builders";

const VALID: ReadonlyArray<DisciplineCode> = [
  "classic_2lift",
  "classic_pu",
  "classic_di",
];

describe("CSV export → import round-trip", () => {
  it("preserves canonical fields", () => {
    const entries: Entry[] = [
      buildClassicEntry("Alice", {
        sex: "F",
        birthDate: "1995-04-12",
        country: "RU",
        division: "pro",
        team: "Team Atlas",
        memberId: "RU-1234",
        guest: false,
        notes: "left-handed grip",
        bodyweightKg: 58.4,
        reweighKg: 58.6,
        day: 2,
        platform: 3,
        flight: "B",
        disciplineCode: "classic_pu",
        event: "PU",
      }),
      buildClassicEntry("Bob", {
        sex: "M",
        birthDate: "1988-11-30",
        country: "US",
        division: "amateur",
        guest: true,
        bodyweightKg: 87.2,
        reweighKg: null,
        disciplineCode: "classic_2lift",
        event: "PUDI",
      }),
    ];

    const csv = buildRegistrationCsv(entries);
    expect(csv.startsWith("\uFEFF")).toBe(true); // UTF-8 BOM

    const parsed = parseRegistrationCsv(csv, VALID);
    expect(parsed.errors).toEqual([]);
    expect(parsed.drafts.length).toBe(2);

    const [a, b] = parsed.drafts;
    expect(a?.name).toBe("Alice");
    expect(a?.sex).toBe("F");
    expect(a?.birthDate).toBe("1995-04-12");
    expect(a?.country).toBe("RU");
    expect(a?.division).toBe("pro");
    expect(a?.team).toBe("Team Atlas");
    expect(a?.memberId).toBe("RU-1234");
    expect(a?.bodyweightKg).toBe(58.4);
    expect(a?.reweighKg).toBe(58.6);
    expect(a?.disciplineCode).toBe("classic_pu");
    expect(a?.day).toBe(2);
    expect(a?.platform).toBe(3);
    expect(a?.flight).toBe("B");

    expect(b?.guest).toBe(true);
    expect(b?.reweighKg).toBeNull();
    expect(b?.country).toBe("US");
  });
});

describe("CSV parse — error reporting", () => {
  it("rejects rows missing required name", () => {
    const csv = "name,sex,division,disciplineCode\n,M,amateur,classic_2lift\n";
    const result = parseRegistrationCsv(csv, VALID);
    expect(result.drafts.length).toBe(0);
    expect(result.errors.find((e) => e.field === "name")).toBeDefined();
  });

  it("rejects rows with invalid sex", () => {
    const csv =
      "name,sex,division,disciplineCode\nIvan,X,amateur,classic_2lift\n";
    const result = parseRegistrationCsv(csv, VALID);
    expect(result.drafts.length).toBe(0);
    expect(result.errors.find((e) => e.field === "sex")).toBeDefined();
  });

  it("rejects rows with unknown disciplineCode", () => {
    const csv =
      "name,sex,division,disciplineCode\nIvan,M,amateur,not_a_real_code\n";
    const result = parseRegistrationCsv(csv, VALID);
    expect(result.drafts.length).toBe(0);
    expect(result.errors.find((e) => e.field === "disciplineCode")).toBeDefined();
  });

  it("rejects malformed birthDate", () => {
    const csv =
      "name,sex,division,disciplineCode,birthDate\nIvan,M,amateur,classic_2lift,12/03/1990\n";
    const result = parseRegistrationCsv(csv, VALID);
    expect(result.drafts.length).toBe(0);
    expect(result.errors.find((e) => e.field === "birthDate")).toBeDefined();
  });

  it("accepts empty optional fields", () => {
    const csv =
      "name,sex,division,disciplineCode\nIvan,M,amateur,classic_2lift\n";
    const result = parseRegistrationCsv(csv, VALID);
    expect(result.errors).toEqual([]);
    expect(result.drafts.length).toBe(1);
    expect(result.drafts[0]?.bodyweightKg).toBeNull();
    expect(result.drafts[0]?.country).toBeNull();
  });

  it("treats common header aliases (case-insensitive, snake_case)", () => {
    const csv =
      "Name,SEX,Division,Discipline_Code,Bodyweight_Kg\nIvan,M,amateur,classic_2lift,75.5\n";
    const result = parseRegistrationCsv(csv, VALID);
    expect(result.errors).toEqual([]);
    expect(result.drafts[0]?.bodyweightKg).toBe(75.5);
  });

  it("parses guest as boolean", () => {
    const csv =
      "name,sex,division,disciplineCode,guest\n" +
      "A,M,amateur,classic_2lift,true\n" +
      "B,M,amateur,classic_2lift,false\n" +
      "C,M,amateur,classic_2lift,1\n" +
      "D,M,amateur,classic_2lift,no\n";
    const result = parseRegistrationCsv(csv, VALID);
    expect(result.drafts.map((d) => d.guest)).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });
});
