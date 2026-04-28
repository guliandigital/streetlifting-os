/**
 * Records module — per-competition records.
 *
 * Computes per-competition records for each
 * (discipline × sex × ageCategory × weightCategory × exercise).
 *
 * V1: competition-local records only (isNew is always true).
 * V2: will compare against historical database.
 */

import type {
  Entry,
  Sex,
  AgeCategoryCode,
  MeetState,
} from "@domain/models";
import { getClassicBest } from "./result";
import { getMultirepReps } from "./result";
import { ageInYears, resolveAgeCategory } from "./age";
import { resolveWeightCategory } from "./weight-category-resolver";
import { ISF_V51_AGE_CATEGORIES } from "@domain/presets";

// ─── Types ──────────────────────────────────────────────────────────────────

export type CompetitionRecord = {
  disciplineCode: string;
  sex: Sex;
  ageCategoryCode: AgeCategoryCode | null;
  weightCategoryCode: string | null;
  exercise: "PU" | "DI" | "PUDI";
  result: number; // best kg (Classic) or best reps (Multirep)
  unit: "kg" | "reps";
  holder: Entry; // the entry that holds this record
  holderIndex: number;
  isNew: boolean; // always true in V1 (competition-local records only)
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function resolveAgeCategoryCode(
  entry: Entry,
  meetDate: string,
): AgeCategoryCode | null {
  if (entry.assignedAgeCategoryCode) return entry.assignedAgeCategoryCode;

  let age: number | null = null;
  if (entry.ageOverride !== null) {
    age = entry.ageOverride;
  } else if (entry.birthDate !== null) {
    age = ageInYears(entry.birthDate, meetDate);
  }
  if (age === null) return null;

  const cat = resolveAgeCategory(age, ISF_V51_AGE_CATEGORIES);
  return cat ? cat.code : null;
}

function resolveWeightCategoryCode(
  entry: Entry,
  ageCategoryCode: AgeCategoryCode | null,
  meet: MeetState,
): string | null {
  if (entry.assignedWeightCategoryCode) return entry.assignedWeightCategoryCode;

  const cat = resolveWeightCategory(
    entry.bodyweightKg,
    entry.sex,
    ageCategoryCode,
    meet.weightCategories,
  );
  return cat ? cat.code : null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute per-competition records.
 *
 * For each (disciplineCode × sex × ageCategoryCode × weightCategoryCode × exercise),
 * find the best result achieved in this competition.
 *
 * Classic records:
 *   - PU record: best successful PU kg
 *   - DI record: best successful DI kg
 *   - PUDI total record: best PU + best DI (only when both > 0)
 *
 * Multirep records:
 *   - PU reps record: most reps in successful attempt
 *   - DI reps record: most reps
 *   - PUDI total record: sum of PU + DI reps (only when both > 0)
 *
 * Guest entries are included in records (records are achievements).
 * Entries with result = 0 are skipped.
 */
export function computeRecords(
  entries: readonly Entry[],
  meet: MeetState,
  meetDate: string,
): CompetitionRecord[] {
  // Map: key → best record so far
  type RecordKey = string;
  type RecordCandidate = {
    result: number;
    unit: "kg" | "reps";
    holder: Entry;
    holderIndex: number;
    disciplineCode: string;
    sex: Sex;
    ageCategoryCode: AgeCategoryCode | null;
    weightCategoryCode: string | null;
    exercise: "PU" | "DI" | "PUDI";
  };

  const best = new Map<RecordKey, RecordCandidate>();

  function tryUpdate(
    key: RecordKey,
    candidate: RecordCandidate,
  ): void {
    const existing = best.get(key);
    if (!existing || candidate.result > existing.result) {
      best.set(key, candidate);
    }
  }

  entries.forEach((entry, entryIndex) => {
    const ageCategoryCode = resolveAgeCategoryCode(entry, meetDate);
    const weightCategoryCode = resolveWeightCategoryCode(entry, ageCategoryCode, meet);
    const sex = entry.sex;
    const disciplineCode = entry.disciplineCode;

    if (entry.competitionFormat === "classic") {
      const puBest = getClassicBest(entry, "PU");
      const diBest = getClassicBest(entry, "DI");
      const total = puBest + diBest;

      if (puBest > 0) {
        const key = `${disciplineCode}|${sex}|${ageCategoryCode ?? ""}|${weightCategoryCode ?? ""}|PU`;
        tryUpdate(key, {
          result: puBest,
          unit: "kg",
          holder: entry,
          holderIndex: entryIndex,
          disciplineCode,
          sex,
          ageCategoryCode,
          weightCategoryCode,
          exercise: "PU",
        });
      }

      if (diBest > 0) {
        const key = `${disciplineCode}|${sex}|${ageCategoryCode ?? ""}|${weightCategoryCode ?? ""}|DI`;
        tryUpdate(key, {
          result: diBest,
          unit: "kg",
          holder: entry,
          holderIndex: entryIndex,
          disciplineCode,
          sex,
          ageCategoryCode,
          weightCategoryCode,
          exercise: "DI",
        });
      }

      if (total > 0 && puBest > 0 && diBest > 0) {
        const key = `${disciplineCode}|${sex}|${ageCategoryCode ?? ""}|${weightCategoryCode ?? ""}|PUDI`;
        tryUpdate(key, {
          result: total,
          unit: "kg",
          holder: entry,
          holderIndex: entryIndex,
          disciplineCode,
          sex,
          ageCategoryCode,
          weightCategoryCode,
          exercise: "PUDI",
        });
      }
    } else if (entry.competitionFormat === "multirep") {
      const puReps = getMultirepReps(entry, "PU");
      const diReps = getMultirepReps(entry, "DI");
      const totalReps = puReps + diReps;

      if (puReps > 0) {
        const key = `${disciplineCode}|${sex}|${ageCategoryCode ?? ""}|${weightCategoryCode ?? ""}|PU`;
        tryUpdate(key, {
          result: puReps,
          unit: "reps",
          holder: entry,
          holderIndex: entryIndex,
          disciplineCode,
          sex,
          ageCategoryCode,
          weightCategoryCode,
          exercise: "PU",
        });
      }

      if (diReps > 0) {
        const key = `${disciplineCode}|${sex}|${ageCategoryCode ?? ""}|${weightCategoryCode ?? ""}|DI`;
        tryUpdate(key, {
          result: diReps,
          unit: "reps",
          holder: entry,
          holderIndex: entryIndex,
          disciplineCode,
          sex,
          ageCategoryCode,
          weightCategoryCode,
          exercise: "DI",
        });
      }

      if (totalReps > 0 && puReps > 0 && diReps > 0) {
        const key = `${disciplineCode}|${sex}|${ageCategoryCode ?? ""}|${weightCategoryCode ?? ""}|PUDI`;
        tryUpdate(key, {
          result: totalReps,
          unit: "reps",
          holder: entry,
          holderIndex: entryIndex,
          disciplineCode,
          sex,
          ageCategoryCode,
          weightCategoryCode,
          exercise: "PUDI",
        });
      }
    }
  });

  return Array.from(best.values()).map((c) => ({
    disciplineCode: c.disciplineCode,
    sex: c.sex,
    ageCategoryCode: c.ageCategoryCode,
    weightCategoryCode: c.weightCategoryCode,
    exercise: c.exercise,
    result: c.result,
    unit: c.unit,
    holder: c.holder,
    holderIndex: c.holderIndex,
    isNew: true,
  }));
}
