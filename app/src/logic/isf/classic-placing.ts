/**
 * Classic placing — pure service, no Redux, no UI.
 *
 * Computes per-entry result rows, assigns places, and groups by category.
 * blueprint v2 §7 + §8 + §10 (tiebreak rules per ISF v5.1 §7.10).
 */

import type {
  Entry,
  Sex,
  AgeCategoryCode,
  MeetState,
} from "@domain/models";
import { getClassicBest } from "./result";
import { IsfPointsService } from "./points";
import { ageInYears, resolveAgeCategory } from "./age";
import { resolveWeightCategory } from "./weight-category-resolver";
import { attemptStatusFromVotes } from "./judge-votes";
import { ISF_V51_AGE_CATEGORIES } from "@domain/presets";

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * Attempt display value:
 *   positive number = successful attempt (kg)
 *   negative number = failed attempt (abs value = kg declared)
 *   null = attempt not declared / not taken
 */
export type AttemptDisplay = number | null;

export type ClassicResultRow = {
  entry: Entry;
  /** Index in registration.entries[] */
  entryIndex: number;

  // Computed results
  puBest: number;
  diBest: number;
  total: number;

  // ISF points
  isfCoefficient: number;
  isfBasePoints: number;
  isfAdditionalPoints: number;
  isfFinalPoints: number;

  // Attempt columns — index 0=R1, 1=R2, 2=R3 (sequence 4 is separate)
  puAttempts: [AttemptDisplay, AttemptDisplay, AttemptDisplay];
  diAttempts: [AttemptDisplay, AttemptDisplay, AttemptDisplay];

  // Resolved categories
  resolvedAgeCategoryCode: AgeCategoryCode | null;
  resolvedWeightCategoryCode: string | null;

  // Placing
  /** null for guests */
  place: number | null;
  tiedWithPrev: boolean;
  vacantNextPlace: boolean;
};

export type ClassicResultGroup = {
  sex: Sex | null;
  ageCategoryCode: AgeCategoryCode | null;
  weightCategoryCode: string | null;
  /** Human-readable group label */
  label: string;
  rows: ClassicResultRow[];
};

// ─── Internal helpers ───────────────────────────────────────────────────────

const pointsService = new IsfPointsService();

/**
 * Build the [R1, R2, R3] attempt display array for one exercise.
 * sequence=4 (record-only) is excluded per D11.
 */
function buildAttemptDisplays(
  entry: Entry,
  exercise: "PU" | "DI",
): [AttemptDisplay, AttemptDisplay, AttemptDisplay] {
  const result: [AttemptDisplay, AttemptDisplay, AttemptDisplay] = [
    null,
    null,
    null,
  ];

  const ex = entry.exercises[exercise];
  if (!ex || ex.format !== "classic") return result;

  for (const att of ex.attempts) {
    if (att.sequence === 4) continue; // record-only excluded
    const idx = att.sequence - 1; // sequence 1→0, 2→1, 3→2
    if (idx < 0 || idx > 2) continue;
    if (att.declaredLoadKg === null) continue;

    const status = attemptStatusFromVotes(att.judgeVotes);
    if (status === "success") {
      result[idx] = att.declaredLoadKg; // positive = success
    } else if (status === "fail") {
      result[idx] = -att.declaredLoadKg; // negative = fail
    }
    // pending stays null if no decision yet — treat as not-yet-decided, show load
    else {
      // pending: show as attempted but undecided — use positive for pending
      result[idx] = att.declaredLoadKg;
    }
  }

  return result;
}

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

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Compute result rows for all classic-format entries.
 * Skips non-classic entries.
 */
export function computeClassicRows(
  entries: ReadonlyArray<Entry>,
  meet: MeetState,
  meetDate: string,
): ClassicResultRow[] {
  const rows: ClassicResultRow[] = [];

  entries.forEach((entry, entryIndex) => {
    if (entry.competitionFormat !== "classic") return;

    const puBest = getClassicBest(entry, "PU");
    const diBest = getClassicBest(entry, "DI");
    const total = puBest + diBest;

    const breakdown = pointsService.calculate(entry, entry.event, meetDate);

    const puAttempts = buildAttemptDisplays(entry, "PU");
    const diAttempts = buildAttemptDisplays(entry, "DI");

    const resolvedAgeCategoryCode = resolveAgeCategoryCode(entry, meetDate);
    const resolvedWeightCategoryCode = resolveWeightCategoryCode(
      entry,
      resolvedAgeCategoryCode,
      meet,
    );

    rows.push({
      entry,
      entryIndex,
      puBest,
      diBest,
      total,
      isfCoefficient: breakdown.coefficient,
      isfBasePoints: breakdown.basePoints,
      isfAdditionalPoints: breakdown.additionalPoints,
      isfFinalPoints: breakdown.finalPoints,
      puAttempts,
      diAttempts,
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
 *   1. Total DESC
 *   2. isfFinalPoints DESC
 *   3. bodyweightKg ASC (§7.10 tiebreak)
 *   4. reweighKg ASC
 *   5. entryIndex ASC (stable fallback)
 */
function compareRows(a: ClassicResultRow, b: ClassicResultRow): number {
  if (b.total !== a.total) return b.total - a.total;
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

/**
 * Assign places to rows.
 *
 * Guests (entry.guest === true) are included but get place=null and are sorted
 * after all placed athletes.
 *
 * Place assignment with tie vacancies: if two athletes tie for place 1, both get
 * place=1, place 2 is vacant, next athlete gets place=3.
 */
export function assignPlaces(rows: ClassicResultRow[]): ClassicResultRow[] {
  if (rows.length === 0) return [];

  // Split guests vs non-guests
  const nonGuests = rows.filter((r) => !r.entry.guest);
  const guests = rows.filter((r) => r.entry.guest);

  // Sort non-guests by ranking criteria
  nonGuests.sort(compareRows);

  // Sort guests by same criteria (for consistent display)
  guests.sort(compareRows);

  // Assign places to non-guests with tie + vacancy logic
  // Use mutable objects to avoid spread type-widening issues
  const placed: ClassicResultRow[] = nonGuests.map((r) => ({
    entry: r.entry,
    entryIndex: r.entryIndex,
    puBest: r.puBest,
    diBest: r.diBest,
    total: r.total,
    isfCoefficient: r.isfCoefficient,
    isfBasePoints: r.isfBasePoints,
    isfAdditionalPoints: r.isfAdditionalPoints,
    isfFinalPoints: r.isfFinalPoints,
    puAttempts: r.puAttempts,
    diAttempts: r.diAttempts,
    resolvedAgeCategoryCode: r.resolvedAgeCategoryCode,
    resolvedWeightCategoryCode: r.resolvedWeightCategoryCode,
    place: null as number | null,
    tiedWithPrev: false,
    vacantNextPlace: false,
  }));

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
        current.total === prev.total &&
        current.isfFinalPoints === prev.isfFinalPoints &&
        (current.entry.bodyweightKg ?? Number.MAX_SAFE_INTEGER) ===
          (prev.entry.bodyweightKg ?? Number.MAX_SAFE_INTEGER) &&
        (current.entry.reweighKg ?? Number.MAX_SAFE_INTEGER) ===
          (prev.entry.reweighKg ?? Number.MAX_SAFE_INTEGER);

      if (isTied) {
        current.place = prev.place;
        current.tiedWithPrev = true;
      } else {
        // How many rows share the previous row's place?
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

  // Mark vacantNextPlace: set on the last tied row before a vacant place.
  // A vacancy exists when the next non-tied row's place > current place + 1.
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

  // Guests get place=null, tiedWithPrev=false, vacantNextPlace=false
  const guestRows: ClassicResultRow[] = guests.map((r) => ({
    entry: r.entry,
    entryIndex: r.entryIndex,
    puBest: r.puBest,
    diBest: r.diBest,
    total: r.total,
    isfCoefficient: r.isfCoefficient,
    isfBasePoints: r.isfBasePoints,
    isfAdditionalPoints: r.isfAdditionalPoints,
    isfFinalPoints: r.isfFinalPoints,
    puAttempts: r.puAttempts,
    diAttempts: r.diAttempts,
    resolvedAgeCategoryCode: r.resolvedAgeCategoryCode,
    resolvedWeightCategoryCode: r.resolvedWeightCategoryCode,
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
 * run assignPlaces() within each group, sort groups, and append an absolute group.
 */
export function groupByCategory(
  rows: ClassicResultRow[],
  meet: MeetState,
): ClassicResultGroup[] {
  // Build group key → rows map
  const groupMap = new Map<string, ClassicResultRow[]>();

  for (const row of rows) {
    const key = `${row.entry.sex}|${row.resolvedAgeCategoryCode ?? ""}|${row.resolvedWeightCategoryCode ?? ""}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(row);
  }

  // Build groups with intra-group placing
  const groups: ClassicResultGroup[] = [];
  for (const [key, groupRows] of groupMap.entries()) {
    const parts = key.split("|");
    const sex = (parts[0] || null) as Sex | null;
    const ageCategoryCode = (parts[1] || null) as AgeCategoryCode | null;
    const weightCategoryCode = parts[2] || null;

    groups.push({
      sex,
      ageCategoryCode,
      weightCategoryCode,
      label: buildGroupLabel(sex, ageCategoryCode, weightCategoryCode),
      rows: assignPlaces(groupRows),
    });
  }

  // Sort groups by sex → age category → weight category
  groups.sort((a, b) => {
    const sexDiff = sexSortKey(a.sex) - sexSortKey(b.sex);
    if (sexDiff !== 0) return sexDiff;
    const ageDiff = ageCatSortKey(a.ageCategoryCode) - ageCatSortKey(b.ageCategoryCode);
    if (ageDiff !== 0) return ageDiff;
    return weightCatSortKey(a.weightCategoryCode, meet) - weightCatSortKey(b.weightCategoryCode, meet);
  });

  // Absolute group: all non-guest rows sorted by isfFinalPoints DESC
  const nonGuestRows = rows.filter((r) => !r.entry.guest);
  if (nonGuestRows.length > 0) {
    // Sort by isfFinalPoints DESC for absolute ranking
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
export function computeClassicResults(
  entries: ReadonlyArray<Entry>,
  meet: MeetState,
  meetDate: string,
): ClassicResultGroup[] {
  const rows = computeClassicRows(entries, meet, meetDate);
  return groupByCategory(rows, meet);
}
