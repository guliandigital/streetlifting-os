/**
 * Record certificates tests.
 */

import { describe, it, expect } from "vitest";
import { buildRecordCertificates } from "@logic/reports/record-certificates";
import type { CompetitionRecord } from "@logic/isf/records";
import { buildClassicEntry, buildMultirepEntry } from "./fixtures/builders";

function classicRecord(
  exercise: "PU" | "DI" | "PUDI",
  result: number,
  isNew: boolean,
): CompetitionRecord {
  return {
    disciplineCode: "classic_2lift",
    sex: "M",
    ageCategoryCode: "open",
    weightCategoryCode: "m_80",
    exercise,
    result,
    unit: "kg",
    holder: buildClassicEntry("Holder"),
    holderIndex: 0,
    isNew,
  };
}

function multirepRecord(
  exercise: "PU" | "DI" | "PUDI",
  result: number,
  isNew: boolean,
): CompetitionRecord {
  return {
    disciplineCode: "multirep_2lift_16_24",
    sex: "F",
    ageCategoryCode: "open",
    weightCategoryCode: "f_60",
    exercise,
    result,
    unit: "reps",
    holder: buildMultirepEntry("Multirep Holder"),
    holderIndex: 0,
    isNew,
  };
}

describe("buildRecordCertificates", () => {
  it("returns empty for no records", () => {
    expect(buildRecordCertificates([])).toEqual([]);
  });

  it("emits one certificate per new classic record", () => {
    const certs = buildRecordCertificates(
      [classicRecord("PU", 175, true), classicRecord("DI", 200, true)],
      { kgUnitLabel: "кг" },
    );
    expect(certs).toHaveLength(2);
    expect(certs[0]!.resultLabel).toBe("175 кг");
    expect(certs[0]!.exerciseLabel).toBe("PU");
    expect(certs[0]!.categoryLabel).toBe("M · open · m_80");
  });

  it("filters out non-new records (V2 historical comparison case)", () => {
    const certs = buildRecordCertificates([
      classicRecord("PU", 175, true),
      classicRecord("DI", 200, false),
    ]);
    expect(certs).toHaveLength(1);
    expect(certs[0]!.exerciseLabel).toBe("PU");
  });

  it("formats multirep result with reps unit and PU+DI exercise", () => {
    const certs = buildRecordCertificates([multirepRecord("PUDI", 32, true)]);
    expect(certs).toHaveLength(1);
    expect(certs[0]!.resultLabel).toBe("32 reps");
    expect(certs[0]!.exerciseLabel).toBe("PU + DI");
    expect(certs[0]!.categoryLabel).toBe("F · open · f_60");
  });

  it("handles records with no age or weight category", () => {
    const noCat: CompetitionRecord = {
      disciplineCode: "classic_pu",
      sex: "M",
      ageCategoryCode: null,
      weightCategoryCode: null,
      exercise: "PU",
      result: 100,
      unit: "kg",
      holder: buildClassicEntry("Solo"),
      holderIndex: 0,
      isNew: true,
    };
    const certs = buildRecordCertificates([noCat]);
    expect(certs[0]!.categoryLabel).toBe("M");
  });
});
