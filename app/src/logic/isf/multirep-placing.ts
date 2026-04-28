/**
 * Multirep placing — pure service, no Redux, no UI.
 *
 * Mirrors classic-placing.ts shape. Per D7 + ISF v5.1 §10.9.5: NO additional
 * points formula for Multirep (additional points are Classic-only). Masters
 * multipliers still apply via IsfPointsService.
 *
 * blueprint v2 §7.2 + §10 (tiebreaks per ISF v5.1 §7.10).
 */

import type {
  Entry,
  Sex,
  AgeCategoryCode,
  MeetState,
  MultirepPreset,
} from "@domain/models";
import { getMultirepReps } from "./result";
import { IsfPointsService } from "./points";
import { ageInYears, resolveAgeCategory } from "./age";
import { resolveWeightCategory } from "./weight-category-resolver";
import { resolveMultirepPreset } from "./multirep-resolver";
import { ISF_V51_AGE_CATEGORIES } from "@domain/presets";

// ─── Types ─────────────────────────────────────────────────────────────────

export type MultirepResultRow = {
  entry: Entry;
  /** Index in registration.entries[] */
  entryIndex: number;

  // Computed reps
  puReps: number;
  diReps: number;
  totalReps: number;

  // Resolved preset loads (null when no preset matches → operator override needed)
  presetLoadKgPU: number | null;
  presetLoadKgDI: number | null;

  // ISF points (no additional-points contribution per D7)
  isfCoefficient: number;
  isfBasePoints: number;
  isfFinalPoints: number;

  // Resolved categories
  resolvedAgeCategoryCode: AgeCategoryCode | null;
  resolvedWeightCategoryCode: string | null;

  // Placing
  /** null for guests */
  place: number | null;
  tiedWithPrev: boolean;
  vacantNextPlace: boolean;
};

export type MultirepResultGroup = {
  sex: Sex | null;
  ageCategoryCode: AgeCategoryCode | null;
  weightCategoryCode: string | null;
  /** Human-readable group label */
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

function resolvePresetLoad(
  entry: Entry,
  exercise: "PU" | "DI",
  ageCategoryCode: AgeCategoryCode | null,
  presets: ReadonlyArray<MultirepPreset>,
): number | null {
  // Honor an explicit attempt-level presetLoadKg override (operator entered manually).
  const ex = entry.exercises[exercise];
  if (ex && ex.format === "multirep") {
    const att = ex.attempts.find((a) => a.sequence === 1);
    if (att && att.presetLoadKg !== null && att.presetLoadKg !== undefined) {
      return att.presetLoadKg;
    }
  }
  const match = resolveMultirepPreset(entry, exercise, presets, ageCategoryCode);
  return match ? match.loadKg : null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Compute result rows for all multirep-format entries.
 * Skips non-multirep entries.
 */
export function computeMultirepRows(
  entries: ReadonlyArray<Entry>,
  meet: MeetState,
  meetDate: string,
): MultirepResultRow[] {
  const rows: MultirepResultRow[] = [];
  const presets = meet.multirepConfig?.presetLoads ?? [];

  entries.forEach((entry, entryIndex) => {
    if (entry.competitionFormat !== "multirep") return;

    const puReps = getMultirepReps(entry, "PU");
    const diReps = getMultirepReps(entry, "DI");
    const totalReps = puReps + diReps;

    const breakdown = pointsService.calculate(entry, entry.event, meetDate);

    const resolvedAgeCategoryCode = resolveAgeCategoryCode(entry, meetDate);
    const resolvedWeightCategoryCode = resolveWeightCategoryCode(
      entry,
      resolvedAgeCategoryCode,
      meet,
    );

    const presetLoadKgPU = resolvePresetLoad(
      entry,
      "PU",
      resolvedAgeCategoryCode,
      presets,
    );
    const presetLoadKgDI = resolvePresetLoad(
      entry,
      "DI",
      resolvedAgeCategoryCode,
      presets,
    );

    rows.push({
      entry,
      entryIndex,
      puReps,
      diReps,
      totalReps,
      presetLoadKgPU,
      presetLoadKgDI,
      isfCoefficient: breakdown.coefficient,
      isfBasePoints: breakdown.basePoints,
      isfFinalPoints: breakdown.finalPoints,
      resolvedAgeCategoryCode,
      resolvedWeightCategoryCode,
      place: null,
      tiedWithPrev: false,
      vacantNextPlace: false,
    });
  });

  return rows;
}

/**
 * Compare two rows for ranking:
 *   1. totalReps DESC
 *   2. isfFinalPoints DESC
 *   3. bodyweightKg ASC (§7.10 tiebreak)
 *   4. reweighKg ASC
 *   5. entryIndex ASC (stable fallback)
 */
export function compareMultirepRows(
  a: MultirepResultRow,
  b: MultirepResultRow,
): number {
  if (b.totalReps !== a.totalReps) return b.totalReps - a.totalReps;
  if (b.isfFinalPoints !== a.isfFinalPoints)
    return b.isfFinalPoints - a.isfFinalPoints;
  const bwA = a.entry.bodyweightKg ?? Number.MAX_SAFE_INTEGER;
  const bwB = b.entry.bodyweightKg ?? Number.MAX_SAFE_INTEGER;
  if (bwA !== bwB) return bwA - bwB;
  const rwA = a.entry.reweighKg ?? Number.MAX_SAFE_INTEGER;
  const rwB = b.entry.reweighKg ?? Number.MAX_SAFE_INTEGER;
  if (rwA !== rwB) return rwA - rwB;
  return a.entryIndex - b.entryIndex;
}

function cloneRow(r: MultirepResultRow): MultirepResultRow {
  return {
    entry: r.entry,
    entryIndex: r.entryIndex,
    puReps: r.puReps,
    diReps: r.diReps,
    totalReps: r.totalReps,
    presetLoadKgPU: r.presetLoadKgPU,
    presetLoadKgDI: r.presetLoadKgDI,
    isfCoefficient: r.isfCoefficient,
    isfBasePoints: r.isfBasePoints,
    isfFinalPoints: r.isfFinalPoints,
    resolvedAgeCategoryCode: r.resolvedAgeCategoryCode,
    resolvedWeightCategoryCode: r.resolvedWeightCategoryCode,
    place: null,
    tiedWithPrev: false,
    vacantNextPlace: false,
  };
}

/**
 * Assign places to rows.
 *
 * Guests (entry.guest === true) are included but get place=null and are sorted
 * after all placed athletes.
 *
 * Place assignment with tie vacancies: if two athletes tie for place 1, both get
 * place=1, place 2 is vacant, next athlete gets place=3.
 */
export function assignPlacesMultirep(
  rows: MultirepResultRow[],
): MultirepResultRow[] {
  if (rows.length === 0) return [];

  const nonGuests = rows.filter((r) => !r.entry.guest);
  const guests = rows.filter((r) => r.entry.guest);

  nonGuests.sort(compareMultirepRows);
  guests.sort(compareMultirepRows);

  const placed: MultirepResultRow[] = nonGuests.map(cloneRow);

  let nextPlace = 1;

  for (let i = 0; i < placed.length; i++) {
    const current = placed[i];
    if (current === undefined) continue;

    if (i === 0) {
      current.place = nextPlace;
    } else {
      const prev = placed[i - 1];
      if (prev === undefined) {
        current.place = nextPlace;
        continue;
      }
      const isTied =
        current.totalReps === prev.totalReps &&
        current.isfFinalPoints === prev.isfFinalPoints &&
        (current.entry.bodyweightKg ?? Number.MAX_SAFE_INTEGER) ===
          (prev.entry.bodyweightKg ?? Number.MAX_SAFE_INTEGER) &&
        (current.entry.reweighKg ?? Number.MAX_SAFE_INTEGER) ===
          (prev.entry.reweighKg ?? Number.MAX_SAFE_INTEGER);

      if (isTied) {
        current.place = prev.place;
        current.tiedWithPrev = true;
      } else {
        const prevPlace = prev.place ?? 1;
        let countAtPrevPlace = 0;
        for (const p of placed) {
          if (p.place === prevPlace) countAtPrevPlace++;
        }
        nextPlace = prevPlace + countAtPrevPlace;
        current.place = nextPlace;
      }
    }
  }

  for (let i = 0; i < placed.length - 1; i++) {
    const curr = placed[i];
    const next = placed[i + 1];
    if (curr === undefined || next === undefined) continue;
    const currPlace = curr.place ?? 0;
    const nextPlace2 = next.place ?? 0;
    if (!next.tiedWithPrev && nextPlace2 > currPlace + 1) {
      curr.vacantNextPlace = true;
    }
  }

  const guestRows: MultirepResultRow[] = guests.map(cloneRow);

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
  sex: Sex | null,
  ageCategoryCode: AgeCategoryCode | null,
  weightCategoryCode: string | null,
): string {
  const sexLabel = sex ?? "All";
  const ageLabel = ageCategoryCode ?? "Open";
  const wcLabel = weightCategoryCode ?? "All";
  return `${sexLabel} / ${ageLabel} / ${wcLabel}`;
}

/**
 * Group rows by (sex × resolvedAgeCategoryCode × resolvedWeightCategoryCode),
 * run assignPlacesMultirep() within each group, sort groups, append absolute group.
 */
export function groupByCategoryMultirep(
  rows: MultirepResultRow[],
  meet: MeetState,
): MultirepResultGroup[] {
  const groupMap = new Map<string, MultirepResultRow[]>();

  for (const row of rows) {
    const key = `${row.entry.sex}|${row.resolvedAgeCategoryCode ?? ""}|${row.resolvedWeightCategoryCode ?? ""}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(row);
  }

  const groups: MultirepResultGroup[] = [];
  for (const [key, groupRows] of groupMap.entries()) {
    const parts = key.split("|");
    // Casts: the key was built with `${entry.sex}|${ageCode}|${wcCode}`, so parts
    // by construction match these stringly-typed unions.
    const sex = (parts[0] || null) as Sex | null;
    const ageCategoryCode = (parts[1] || null) as AgeCategoryCode | null;
    const weightCategoryCode = parts[2] || null;

    groups.push({
      sex,
      ageCategoryCode,
      weightCategoryCode,
      label: buildGroupLabel(sex, ageCategoryCode, weightCategoryCode),
      rows: assignPlacesMultirep(groupRows),
    });
  }

  groups.sort((a, b) => {
    const sexDiff = sexSortKey(a.sex) - sexSortKey(b.sex);
    if (sexDiff !== 0) return sexDiff;
    const ageDiff =
      ageCatSortKey(a.ageCategoryCode) - ageCatSortKey(b.ageCategoryCode);
    if (ageDiff !== 0) return ageDiff;
    return (
      weightCatSortKey(a.weightCategoryCode, meet) -
      weightCatSortKey(b.weightCategoryCode, meet)
    );
  });

  // Absolute group: all non-guest rows sorted by isfFinalPoints DESC
  const nonGuestRows = rows.filter((r) => !r.entry.guest);
  if (nonGuestRows.length > 0) {
    const absoluteRows = [...nonGuestRows]
      .sort((a, b) => b.isfFinalPoints - a.isfFinalPoints)
      .map((r, i) => ({
        ...r,
        place: i + 1,
        tiedWithPrev: false,
        vacantNextPlace: false,
      }));

    groups.push({
      sex: null,
      ageCategoryCode: null,
      weightCategoryCode: null,
      label: "Absolute / Абсолютный",
      rows: absoluteRows,
    });
  }

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
  return groupByCategoryMultirep(rows, meet);
}
