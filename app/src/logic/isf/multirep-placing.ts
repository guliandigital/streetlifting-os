/**
 * Multirep placing — pure service, no Redux, no UI.
 *
 * Computes per-entry result rows, assigns places, and groups by
 * (disciplineCode × sex × ageCategoryCode × weightCategoryCode).
 *
 * Placing rules (§9.2 adapted — no round system, just final result):
 *   Sort by: totalReps DESC → BW ASC → entryIndex ASC
 *   Guests: place = null, sorted last.
 *   Tie/vacancy same logic as Classic.
 *
 * Sprint 3 — blueprint v2 §7.2 + §8.
 */

import type {
  Entry,
  Sex,
  AgeCategoryCode,
  MeetState,
  MultirepAttempt,
  MultirepResultContract,
} from "@domain/models";
import type { DisciplineCode } from "@domain/models";
import { getMultirepReps } from "./result";
import { IsfPointsService } from "./points";
import { ageInYears, resolveAgeCategory } from "./age";
import { resolveWeightCategory } from "./weight-category-resolver";
import { attemptStatusFromVotes } from "./judge-votes";
import { ISF_V51_AGE_CATEGORIES, ISF_V51_DISCIPLINES } from "@domain/presets";

// ─── Types ─────────────────────────────────────────────────────────────────

export type MultirepAttemptStatus =
  | "pending"
  | "success"
  | "fail"
  | "not_started";

export type MultirepResultRow = {
  entry: Entry;
  entryIndex: number;

  // Computed results
  puReps: number;
  diReps: number;
  totalReps: number;
  presetLoadKgPu: number | null;
  presetLoadKgDi: number | null;

  // ISF points
  isfCoefficient: number;
  isfFinalPoints: number;

  // Placing
  place: number | null;
  tiedWithPrev: boolean;
  vacantNextPlace: boolean;

  // Resolved categories
  resolvedAgeCategoryCode: AgeCategoryCode | null;
  resolvedWeightCategoryCode: string | null;

  // Attempt status (for PUDI = aggregate; for PU-only = PU; for DI-only = DI)
  attemptStatus: MultirepAttemptStatus;
  noRepCount: number;
};

export type MultirepResultGroup = {
  disciplineCode: DisciplineCode;
  disciplineLabelRu: string;
  disciplineLabelEn: string;
  sex: Sex | null;
  ageCategoryCode: AgeCategoryCode | null;
  weightCategoryCode: string | null;
  label: string;
  rows: MultirepResultRow[];
};

// ─── Internal helpers ───────────────────────────────────────────────────────

const pointsService = new IsfPointsService();

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

function resolveAttemptStatus(entry: Entry): MultirepAttemptStatus {
  // Look at both PU and DI exercises; return aggregate status
  const puEx = entry.exercises["PU"];
  const diEx = entry.exercises["DI"];

  const statuses: MultirepAttemptStatus[] = [];

  if (puEx && puEx.format === "multirep") {
    const att = puEx.attempts.find((a) => a.sequence === 1);
    if (!att) {
      statuses.push("not_started");
    } else {
      const s = attemptStatusFromVotes(att.judgeVotes);
      statuses.push(s === "pending" ? "pending" : s === "success" ? "success" : "fail");
    }
  }

  if (diEx && diEx.format === "multirep") {
    const att = diEx.attempts.find((a) => a.sequence === 1);
    if (!att) {
      statuses.push("not_started");
    } else {
      const s = attemptStatusFromVotes(att.judgeVotes);
      statuses.push(s === "pending" ? "pending" : s === "success" ? "success" : "fail");
    }
  }

  if (statuses.length === 0) return "not_started";

  // If any are success, and no pending, return success
  // If any are pending, return pending
  // If all are fail or not_started (no success, no pending), return fail/not_started
  if (statuses.some((s) => s === "pending")) return "pending";
  if (statuses.some((s) => s === "success")) return "success";
  if (statuses.some((s) => s === "fail")) return "fail";
  return "not_started";
}

function resolveNoRepCount(entry: Entry): number {
  let total = 0;
  for (const ex of ["PU", "DI"] as const) {
    const exerciseResult = entry.exercises[ex];
    if (!exerciseResult || exerciseResult.format !== "multirep") continue;
    for (const att of exerciseResult.attempts) {
      total += att.noRepCount ?? 0;
    }
  }
  return total;
}

function getPresetLoads(disciplineCode: DisciplineCode): {
  pu: number | null;
  di: number | null;
} {
  const disc = ISF_V51_DISCIPLINES.find((d) => d.code === disciplineCode);
  if (!disc || !disc.presetLoadKg) return { pu: null, di: null };
  return {
    pu: disc.presetLoadKg.PU ?? null,
    di: disc.presetLoadKg.DI ?? null,
  };
}

// ─── Placing logic ──────────────────────────────────────────────────────────

/**
 * Compare two rows for ranking:
 *   1. totalReps DESC
 *   2. bodyweightKg ASC (§9.2 tiebreak)
 *   3. entryIndex ASC (stable fallback)
 */
function compareMultirepRows(
  a: MultirepResultRow,
  b: MultirepResultRow,
): number {
  if (b.totalReps !== a.totalReps) return b.totalReps - a.totalReps;
  const bwA = a.entry.bodyweightKg ?? Number.MAX_SAFE_INTEGER;
  const bwB = b.entry.bodyweightKg ?? Number.MAX_SAFE_INTEGER;
  if (bwA !== bwB) return bwA - bwB;
  return a.entryIndex - b.entryIndex;
}

/**
 * Assign places to a list of Multirep result rows.
 * Guests get place=null, sorted after all placed athletes.
 * Tie/vacancy logic mirrors Classic.
 */
function assignMultirepPlaces(
  rows: MultirepResultRow[],
): MultirepResultRow[] {
  if (rows.length === 0) return [];

  const nonGuests = rows.filter((r) => !r.entry.guest);
  const guests = rows.filter((r) => r.entry.guest);

  nonGuests.sort(compareMultirepRows);
  guests.sort(compareMultirepRows);

  const placed: MultirepResultRow[] = nonGuests.map((r) => ({ ...r, place: null as number | null, tiedWithPrev: false, vacantNextPlace: false }));

  for (let i = 0; i < placed.length; i++) {
    const current = placed[i];
    if (current === undefined) continue;

    if (i === 0) {
      current.place = 1;
    } else {
      const prev = placed[i - 1];
      if (prev === undefined) {
        current.place = 1;
        continue;
      }

      const isTied =
        current.totalReps === prev.totalReps &&
        (current.entry.bodyweightKg ?? Number.MAX_SAFE_INTEGER) ===
          (prev.entry.bodyweightKg ?? Number.MAX_SAFE_INTEGER);

      if (isTied) {
        current.place = prev.place;
        current.tiedWithPrev = true;
      } else {
        const prevPlace = prev.place ?? 1;
        let countAtPrevPlace = 0;
        for (const p of placed) {
          if (p.place === prevPlace) countAtPrevPlace++;
        }
        current.place = prevPlace + countAtPrevPlace;
      }
    }
  }

  // Mark vacantNextPlace
  for (let i = 0; i < placed.length - 1; i++) {
    const curr = placed[i];
    const next = placed[i + 1];
    if (curr === undefined || next === undefined) continue;
    const currPlace = curr.place ?? 0;
    const nextPlace = next.place ?? 0;
    if (!next.tiedWithPrev && nextPlace > currPlace + 1) {
      curr.vacantNextPlace = true;
    }
  }

  const guestRows: MultirepResultRow[] = guests.map((r) => ({
    ...r,
    place: null,
    tiedWithPrev: false,
    vacantNextPlace: false,
  }));

  return [...placed, ...guestRows];
}

// ─── Group ordering ─────────────────────────────────────────────────────────

const SEX_ORDER: Record<string, number> = { M: 0, F: 1, OPEN: 2 };

const AGE_CAT_ORDER: Record<string, number> = {
  open: 0,
  youth: 1,
  junior: 2,
  masters_m1: 3,
  masters_m2: 4,
  masters_m3: 5,
  masters_m4: 6,
  masters_m5: 7,
  masters_m6: 8,
};

function ageCatSortKey(code: AgeCategoryCode | null): number {
  if (code === null) return -1;
  return AGE_CAT_ORDER[code] ?? 99;
}

function sexSortKey(sex: Sex | null): number {
  if (sex === null) return -1;
  return SEX_ORDER[sex] ?? 99;
}

function weightCatSortKey(code: string | null, meet: MeetState): number {
  if (code === null) return Number.MAX_SAFE_INTEGER;
  const cat = meet.weightCategories.find((c) => c.code === code);
  return cat?.maxKg ?? Number.MAX_SAFE_INTEGER;
}

function buildGroupLabel(
  disciplineLabelRu: string,
  disciplineLabelEn: string,
  sex: Sex | null,
  ageCategoryCode: AgeCategoryCode | null,
  weightCategoryCode: string | null,
): string {
  const sexLabel = sex ?? "All";
  const ageLabel = ageCategoryCode ?? "Open";
  const wcLabel = weightCategoryCode ?? "All";
  return `${disciplineLabelRu} / ${disciplineLabelEn} — ${sexLabel} / ${ageLabel} / ${wcLabel}`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Compute result rows for all multirep-format entries.
 */
export function computeMultirepRows(
  entries: ReadonlyArray<Entry>,
  meet: MeetState,
  meetDate: string,
): MultirepResultRow[] {
  const rows: MultirepResultRow[] = [];

  entries.forEach((entry, entryIndex) => {
    if (entry.competitionFormat !== "multirep") return;

    const puReps = getMultirepReps(entry, "PU");
    const diReps = getMultirepReps(entry, "DI");
    const totalReps = puReps + diReps;

    const breakdown = pointsService.calculate(entry, entry.event, meetDate);

    const presetLoads = getPresetLoads(entry.disciplineCode);

    const resolvedAgeCategoryCode = resolveAgeCategoryCode(entry, meetDate);
    const resolvedWeightCategoryCode = resolveWeightCategoryCode(
      entry,
      resolvedAgeCategoryCode,
      meet,
    );

    const attemptStatus = resolveAttemptStatus(entry);
    const noRepCount = resolveNoRepCount(entry);

    rows.push({
      entry,
      entryIndex,
      puReps,
      diReps,
      totalReps,
      presetLoadKgPu: presetLoads.pu,
      presetLoadKgDi: presetLoads.di,
      isfCoefficient: breakdown.coefficient,
      isfFinalPoints: breakdown.finalPoints,
      resolvedAgeCategoryCode,
      resolvedWeightCategoryCode,
      place: null,
      tiedWithPrev: false,
      vacantNextPlace: false,
      attemptStatus,
      noRepCount,
    });
  });

  return rows;
}

/**
 * Group rows by (disciplineCode × sex × ageCategoryCode × weightCategoryCode),
 * run assignMultirepPlaces() within each group, and sort groups.
 */
export function groupMultirepByCategory(
  rows: MultirepResultRow[],
  meet: MeetState,
): MultirepResultGroup[] {
  if (rows.length === 0) return [];

  // Build group key → rows map
  const groupMap = new Map<string, MultirepResultRow[]>();

  for (const row of rows) {
    const key = `${row.entry.disciplineCode}|${row.entry.sex}|${row.resolvedAgeCategoryCode ?? ""}|${row.resolvedWeightCategoryCode ?? ""}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(row);
  }

  const groups: MultirepResultGroup[] = [];

  for (const [key, groupRows] of groupMap.entries()) {
    const parts = key.split("|");
    const disciplineCode = (parts[0] ?? "") as DisciplineCode;
    const sex = (parts[1] || null) as Sex | null;
    const ageCategoryCode = (parts[2] || null) as AgeCategoryCode | null;
    const weightCategoryCode = parts[3] || null;

    const disc = ISF_V51_DISCIPLINES.find((d) => d.code === disciplineCode);
    const disciplineLabelRu = disc?.labelRu ?? disciplineCode;
    const disciplineLabelEn = disc?.labelEn ?? disciplineCode;

    groups.push({
      disciplineCode,
      disciplineLabelRu,
      disciplineLabelEn,
      sex,
      ageCategoryCode,
      weightCategoryCode,
      label: buildGroupLabel(
        disciplineLabelRu,
        disciplineLabelEn,
        sex,
        ageCategoryCode,
        weightCategoryCode,
      ),
      rows: assignMultirepPlaces(groupRows),
    });
  }

  // Sort groups: disciplineCode ASC (stable order), then sex → age → weight
  groups.sort((a, b) => {
    const dcDiff = a.disciplineCode.localeCompare(b.disciplineCode);
    if (dcDiff !== 0) return dcDiff;
    const sexDiff = sexSortKey(a.sex) - sexSortKey(b.sex);
    if (sexDiff !== 0) return sexDiff;
    const ageDiff = ageCatSortKey(a.ageCategoryCode) - ageCatSortKey(b.ageCategoryCode);
    if (ageDiff !== 0) return ageDiff;
    return weightCatSortKey(a.weightCategoryCode, meet) - weightCatSortKey(b.weightCategoryCode, meet);
  });

  return groups;
}

/**
 * Main entry point: compute rows and group by category.
 */
export function computeMultirepResults(
  entries: ReadonlyArray<Entry>,
  meet: MeetState,
  meetDate: string,
): MultirepResultGroup[] {
  const rows = computeMultirepRows(entries, meet, meetDate);
  return groupMultirepByCategory(rows, meet);
}

function findMultirepAttempt(
  entry: Entry,
  exercise: "PU" | "DI",
): MultirepAttempt | undefined {
  const ex = entry.exercises[exercise];
  if (!ex || ex.format !== "multirep") return undefined;
  return ex.attempts.find((a) => a.sequence === 1);
}

function multirepAttemptStatus(
  attempt: MultirepAttempt | undefined,
): MultirepAttemptStatus {
  if (!attempt) return "not_started";
  const status = attemptStatusFromVotes(attempt.judgeVotes);
  return status === "pending"
    ? "pending"
    : status === "success"
      ? "success"
      : "fail";
}

/**
 * Convert a UI/result row into the stable serializable Multirep contract.
 */
export function toMultirepResultContract(
  row: MultirepResultRow,
): MultirepResultContract {
  const exercises: MultirepResultContract["exercises"] = [];

  for (const exercise of ["PU", "DI"] as const) {
    const attempt = findMultirepAttempt(row.entry, exercise);
    const presetLoadKg =
      exercise === "PU" ? row.presetLoadKgPu : row.presetLoadKgDi;
    const reps = exercise === "PU" ? row.puReps : row.diReps;

    if (attempt || presetLoadKg !== null || reps > 0) {
      exercises.push({
        exercise,
        presetLoadKg,
        reps,
        noRepCount: attempt?.noRepCount ?? 0,
        durationSec: attempt?.durationSec ?? 120,
        status: multirepAttemptStatus(attempt),
      });
    }
  }

  return {
    format: "multirep",
    entryId: row.entry.id,
    entryIndex: row.entryIndex,
    athleteName: row.entry.name,
    disciplineCode: row.entry.disciplineCode,
    event: row.entry.event,
    sex: row.entry.sex,
    bodyweightKg: row.entry.bodyweightKg,
    ageCategoryCode: row.resolvedAgeCategoryCode,
    weightCategoryCode: row.resolvedWeightCategoryCode,
    guest: row.entry.guest,
    exercises,
    puReps: row.puReps,
    diReps: row.diReps,
    totalReps: row.totalReps,
    noRepCount: row.noRepCount,
    isfCoefficient: row.isfCoefficient,
    isfFinalPoints: row.isfFinalPoints,
    place: row.place,
    tiedWithPrev: row.tiedWithPrev,
    vacantNextPlace: row.vacantNextPlace,
    attemptStatus: row.attemptStatus,
  };
}

/**
 * Export/display integration point: returns stable contracts instead of UI rows.
 */
export function computeMultirepResultContracts(
  entries: ReadonlyArray<Entry>,
  meet: MeetState,
  meetDate: string,
): MultirepResultContract[] {
  return computeMultirepResults(entries, meet, meetDate).flatMap((group) =>
    group.rows.map(toMultirepResultContract),
  );
}
