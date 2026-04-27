/**
 * Entry-form schema tests — validation rules from blueprint v2 §11.3.
 *
 * Most importantly: bodyweight precision per ISF v5.1 §7.2 (D12) — must be
 * a multiple of 0.1 kg. The naive `Number.isInteger(v * 10)` check fails on
 * IEEE-754 round-tripping (e.g. `58.4 * 10 = 583.999…`); the schema uses an
 * epsilon-based equivalence instead.
 */

import { describe, it, expect } from "vitest";
import {
  entryFormSchema,
  EMPTY_FORM_VALUES,
  type EntryFormValues,
} from "@/pages/registration/entry-form-schema";

function valid(overrides: Partial<EntryFormValues>): EntryFormValues {
  return {
    ...EMPTY_FORM_VALUES,
    name: "Ivan",
    sex: "M",
    division: "amateur",
    disciplineCode: "classic_2lift",
    birthDate: "1990-01-01",
    ...overrides,
  };
}

describe("entryFormSchema — bodyweight 0.1 kg precision (ISF v5.1 §7.2)", () => {
  it("accepts whole-kg bodyweight (60)", () => {
    const r = entryFormSchema.safeParse(valid({ bodyweightKg: 60 }));
    expect(r.success).toBe(true);
  });

  it("accepts a 0.1-grid value with FP rounding (58.4)", () => {
    // 58.4 * 10 = 583.9999… in IEEE-754; naive Number.isInteger fails here.
    const r = entryFormSchema.safeParse(valid({ bodyweightKg: 58.4 }));
    expect(r.success).toBe(true);
  });

  it("accepts another 0.1-grid value (75.7)", () => {
    const r = entryFormSchema.safeParse(valid({ bodyweightKg: 75.7 }));
    expect(r.success).toBe(true);
  });

  it("rejects 0.05 kg precision (58.45)", () => {
    const r = entryFormSchema.safeParse(valid({ bodyweightKg: 58.45 }));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) =>
          i.path.includes("bodyweightKg") &&
          i.message === "validation.bodyweightPrecision",
        ),
      ).toBe(true);
    }
  });

  it("rejects 0.01 kg precision (58.41)", () => {
    const r = entryFormSchema.safeParse(valid({ bodyweightKg: 58.41 }));
    expect(r.success).toBe(false);
  });

  it("accepts null bodyweight (not yet weighed-in)", () => {
    const r = entryFormSchema.safeParse(valid({ bodyweightKg: null }));
    expect(r.success).toBe(true);
  });

  it("rejects zero or negative bodyweight", () => {
    expect(entryFormSchema.safeParse(valid({ bodyweightKg: 0 })).success).toBe(
      false,
    );
    expect(
      entryFormSchema.safeParse(valid({ bodyweightKg: -1 })).success,
    ).toBe(false);
  });

  it("applies the same precision rule to reweighKg", () => {
    expect(
      entryFormSchema.safeParse(valid({ reweighKg: 60.4 })).success,
    ).toBe(true);
    expect(
      entryFormSchema.safeParse(valid({ reweighKg: 60.45 })).success,
    ).toBe(false);
  });
});

describe("entryFormSchema — required fields", () => {
  it("rejects empty name", () => {
    const r = entryFormSchema.safeParse(valid({ name: "" }));
    expect(r.success).toBe(false);
  });

  it("requires birthDate or ageOverride", () => {
    const r = entryFormSchema.safeParse(
      valid({ birthDate: null, ageOverride: null }),
    );
    expect(r.success).toBe(false);
  });

  it("accepts ageOverride alone (no birthDate)", () => {
    const r = entryFormSchema.safeParse(
      valid({ birthDate: null, ageOverride: 35 }),
    );
    expect(r.success).toBe(true);
  });

  it("rejects unparseable birthDate", () => {
    const r = entryFormSchema.safeParse(valid({ birthDate: "12/03/1990" }));
    expect(r.success).toBe(false);
  });
});
