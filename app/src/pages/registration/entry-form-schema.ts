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
  .refine(
    (v) =>
      v.bodyweightKg === null ||
      Number.isInteger(Math.round(v.bodyweightKg * 10)),
    {
      message: "validation.bodyweightPrecision",
      path: ["bodyweightKg"],
    },
  )
  .refine(
    (v) =>
      v.reweighKg === null ||
      Number.isInteger(Math.round(v.reweighKg * 10)),
    {
      message: "validation.bodyweightPrecision",
      path: ["reweighKg"],
    },
  );

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
