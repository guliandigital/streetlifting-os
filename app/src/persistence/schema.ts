/**
 * Runtime validation schemas (zod) for SaveFile and all sub-shapes.
 *
 * Two purposes:
 *  1. Defensive parsing of incoming JSON (corrupted file, hand-edited, version mismatch).
 *  2. Living documentation of the save-file structure — zod IS the schema.
 *
 * Source-of-truth: TypeScript types in `src/domain/models/`. The zod schemas
 * mirror those types; both must be updated together if the shape changes.
 */

import { z } from "zod";

// ─── Shared primitives ──────────────────────────────────────────────────────

const exerciseEnum = z.enum(["PU", "DI", "MU_BAR", "MU_RING", "SQ"]);
const eventEnum = z.enum(["PU", "DI", "PUDI", "MU", "SQ", "MUPDISQ"]);
const sexEnum = z.enum(["M", "F", "OPEN"]);
const divisionEnum = z.enum(["amateur", "pro", "adaptive"]);
const competitionFormatEnum = z.enum([
  "classic",
  "multirep",
  "weighted_calisthenics",
]);
const ageCategoryCodeEnum = z.enum([
  "open",
  "youth",
  "junior",
  "masters_m1",
  "masters_m2",
  "masters_m3",
  "masters_m4",
  "masters_m5",
  "masters_m6",
]);

// ─── JudgeVotes (D15) ───────────────────────────────────────────────────────

const judgeVoteSchema = z.union([z.boolean(), z.null()]);

const judgeVotesSchema = z.object({
  left: judgeVoteSchema,
  center: judgeVoteSchema,
  right: judgeVoteSchema,
});

// ─── Attempts ───────────────────────────────────────────────────────────────

const classicAttemptSchema = z.object({
  sequence: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  declaredLoadKg: z.number().nullable(),
  judgeVotes: judgeVotesSchema,
  lastDeclarationAt: z.string().nullable(),
  changesUsedInRound: z.number().int().nonnegative(),
  isRecordAttempt: z.boolean().optional(),
});

const multirepAttemptSchema = z.object({
  sequence: z.literal(1),
  presetLoadKg: z.number().nullable(),
  reps: z.number().int().nonnegative().nullable(),
  judgeVotes: judgeVotesSchema,
  durationSec: z.number().positive(),
  noRepCount: z.number().int().nonnegative().optional(),
});

const exerciseResultSchema = z.discriminatedUnion("format", [
  z.object({
    format: z.literal("classic"),
    exercise: exerciseEnum,
    attempts: z.array(classicAttemptSchema),
  }),
  z.object({
    format: z.literal("multirep"),
    exercise: exerciseEnum,
    attempts: z.array(multirepAttemptSchema),
  }),
]);

// ─── Entry ──────────────────────────────────────────────────────────────────

const entrySchema = z.object({
  id: z.string().min(1),
  competitionFormat: competitionFormatEnum,
  disciplineCode: z.string().min(1),
  event: eventEnum,
  day: z.number().int().positive(),
  platform: z.number().int().positive(),
  flight: z.string(),
  name: z.string().min(1),
  sex: sexEnum,
  birthDate: z.string().nullable(),
  ageOverride: z.number().int().nullable(),
  division: divisionEnum,
  team: z.string().optional(),
  memberId: z.string().optional(),
  guest: z.boolean(),
  instagram: z.string().optional(),
  notes: z.string().optional(),
  country: z.string().nullable(),
  bodyweightKg: z.number().positive().nullable(),
  reweighKg: z.number().positive().nullable(),
  assignedAgeCategoryCode: ageCategoryCodeEnum.optional(),
  assignedWeightCategoryCode: z.string().optional(),
  exercises: z.object({
    PU: exerciseResultSchema.optional(),
    DI: exerciseResultSchema.optional(),
  }),
});

// ─── Athlete/Nomination (V2 identity split) ────────────────────────────────

const athleteSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sex: sexEnum,
  birthDate: z.string().nullable(),
  ageOverride: z.number().int().nullable(),
  country: z.string().nullable(),
  memberId: z.string().optional(),
  instagram: z.string().optional(),
});

const nominationSchema = z.object({
  id: z.string().min(1),
  athleteId: z.string().min(1),
  competitionFormat: competitionFormatEnum,
  disciplineCode: z.string().min(1),
  event: eventEnum,
  day: z.number().int().positive(),
  platform: z.number().int().positive(),
  flight: z.string(),
  division: divisionEnum,
  team: z.string().optional(),
  guest: z.boolean(),
  notes: z.string().optional(),
  bodyweightKg: z.number().positive().nullable(),
  reweighKg: z.number().positive().nullable(),
  assignedAgeCategoryCode: ageCategoryCodeEnum.optional(),
  assignedWeightCategoryCode: z.string().optional(),
  exercises: z.object({
    PU: exerciseResultSchema.optional(),
    DI: exerciseResultSchema.optional(),
  }),
});

// ─── MeetState sub-shapes ──────────────────────────────────────────────────

const plateSchema = z.object({
  weightKg: z.number().positive(),
  pairCount: z.number().int().nonnegative(),
  color: z.string(),
  recordOnly: z.boolean().optional(),
});

const ageCategorySchema = z.object({
  code: ageCategoryCodeEnum,
  label: z.string(),
  labelRu: z.string(),
  minAge: z.number().int().nullable(),
  maxAge: z.number().int().nullable(),
  ratingEligible: z.boolean(),
});

const weightCategorySchema = z.object({
  code: z.string(),
  sex: sexEnum,
  minKg: z.number().nullable(),
  maxKg: z.number().nullable(),
  ageCategoryCodes: z.array(ageCategoryCodeEnum).optional(),
});

const classicLoadConfigSchema = z.object({
  useBeltLoading: z.boolean(),
  plates: z.array(plateSchema),
  defaultAttemptDurationSec: z.number().positive(),
});

const multirepPresetSchema = z.object({
  sex: sexEnum,
  exercise: exerciseEnum,
  division: divisionEnum,
  ageCategoryCodes: z.array(ageCategoryCodeEnum),
  loadKg: z.number().positive(),
});

const multirepConfigSchema = z.object({
  defaultAttemptDurationSec: z.number().positive(),
  presetLoads: z.array(multirepPresetSchema),
});

const meetStateSchema = z.object({
  name: z.string(),
  federation: z.string(),
  country: z.string(),
  state: z.string(),
  city: z.string(),
  date: z.string(),
  competitionFormat: competitionFormatEnum,
  enabledDisciplineCodes: z.array(z.string()),
  divisions: z.array(divisionEnum),
  ageCategories: z.array(ageCategorySchema),
  weightCategories: z.array(weightCategorySchema),
  formula: z.enum(["ISF_POINTS", "RESULT", "RESULT_X_COEFFICIENT"]),
  useMastersAdjustment: z.boolean(),
  lowerBodyweightFirstTiebreak: z.boolean(),
  inKg: z.literal(true),
  showAlternateUnits: z.boolean(),
  classicLoadConfig: classicLoadConfigSchema.optional(),
  multirepConfig: multirepConfigSchema.optional(),
});

// ─── Top-level SaveFile envelope ────────────────────────────────────────────

const registrationStateSchema = z.object({
  athletes: z.array(athleteSchema),
  nominations: z.array(nominationSchema),
  entries: z.array(entrySchema),
  lastLotNumber: z.number().int().nonnegative(),
});

const judgingStateSchema = z.object({
  activeDisciplineIndex: z.number().int().nonnegative(),
  activeEntryIndex: z.number().int().nonnegative().nullable(),
  activeAttemptSequence: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
    .nullable(),
  attemptStartedAt: z.string().nullable(),
});

const uiStateSchema = z.object({
  locale: z.string(),
  workTableSortMode: z.enum([
    "by_name",
    "by_weight_cat_then_name",
    "by_age_then_weight_then_name",
    "by_forecast_then_weight_then_name",
  ]),
  showForecastColumns: z.boolean(),
});

const licenseEnvelopeSchema = z.object({
  licenseTokenId: z.string().nullable(),
  quotaAllocationId: z.string().nullable(),
  billedNominationIds: z.array(z.string()),
});

const saveFileSignatureSchema = z
  .object({
    federationKeyId: z.string(),
    sanctioningCertId: z.string(),
    ed25519Sig: z.string(),
  })
  .nullable();

export const saveFileSchema = z.object({
  versions: z.object({
    stateVersion: z.literal("3"),
    releaseVersion: z.string(),
  }),
  meet: meetStateSchema,
  registration: registrationStateSchema,
  judging: judgingStateSchema,
  ui: uiStateSchema,
  license: licenseEnvelopeSchema.optional(),
  signature: saveFileSignatureSchema.optional(),
});

/** Lightweight envelope-only schema for migration step (only checks versions). */
export const versionEnvelopeSchema = z.object({
  versions: z.object({
    stateVersion: z.string(),
    releaseVersion: z.string().optional(),
  }),
});

export type ValidatedSaveFile = z.infer<typeof saveFileSchema>;
