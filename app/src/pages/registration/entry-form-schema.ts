/**
 * Zod schema + types for the athlete-registration form.
 *
 * Used by react-hook-form via `@hookform/resolvers/zod`.
 * Matches `EntryDraft` from the registration slice.
 */

import { z } from "zod";

export const entryFormSchema = z
  .object({
    name: z.string().trim().min(1, "validation.nameRequired"),
    sex: z.enum(["M", "F"], { errorMap: () => ({ message: "validation.sexRequired" }) }),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "validation.ageOrBirthDate")
      .nullable(),
    ageOverride: z
      .number()
      .int()
      .min(5)
      .max(120)
      .nullable(),
    country: z.string().trim().nullable(),
    division: z.enum(["amateur", "pro", "adaptive"], {
      errorMap: () => ({ message: "validation.divisionRequired" }),
    }),
    disciplineCode: z
      .string()
      .min(1, "validation.disciplineRequired"),
    day: z.number().int().min(1, "validation.dayPositive"),
    platform: z.number().int().min(1, "validation.platformPositive"),
    flight: z.string().trim(),
    team: z.string().trim().optional(),
    memberId: z.string().trim().optional(),
    guest: z.boolean(),
    instagram: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    bodyweightKg: z
      .number()
      .positive("validation.bodyweightPositive")
      .nullable(),
    reweighKg: z
      .number()
      .positive("validation.bodyweightPositive")
      .nullable(),
  })
  .refine((v) => v.birthDate !== null || v.ageOverride !== null, {
    message: "validation.ageOrBirthDate",
    path: ["birthDate"],
  })
  .refine((v) => v.bodyweightKg === null || isOnTenthGrid(v.bodyweightKg), {
    message: "validation.bodyweightPrecision",
    path: ["bodyweightKg"],
  })
  .refine((v) => v.reweighKg === null || isOnTenthGrid(v.reweighKg), {
    message: "validation.bodyweightPrecision",
    path: ["reweighKg"],
  });

/**
 * Check that a value is on the 0.1 kg grid (ISF v5.1 §7.2 precision).
 *
 * Naive `Number.isInteger(v * 10)` fails because `58.4 * 10 = 583.9999…` due
 * to IEEE-754 representation. We compare against the rounded value with a
 * tight epsilon — values like 58.4 round-trip cleanly, 58.45 does not.
 */
function isOnTenthGrid(v: number): boolean {
  const tenths = Math.round(v * 10);
  return Math.abs(v - tenths / 10) < 1e-9;
}

export type EntryFormValues = z.infer<typeof entryFormSchema>;

export const EMPTY_FORM_VALUES: EntryFormValues = {
  name: "",
  sex: "M",
  birthDate: null,
  ageOverride: null,
  country: null,
  division: "amateur",
  disciplineCode: "classic_2lift",
  day: 1,
  platform: 1,
  flight: "",
  team: "",
  memberId: "",
  guest: false,
  instagram: "",
  notes: "",
  bodyweightKg: null,
  reweighKg: null,
};
