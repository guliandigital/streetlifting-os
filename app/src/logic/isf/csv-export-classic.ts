/**
 * CSV export for classic and multirep competition protocols.
 *
 * Separate from csv-export.ts (registration import/export).
 * PowerTable-compatible column order per powertable-findings-v2.md §4.3.
 *
 * UTF-8 with BOM so Excel on Windows reads Cyrillic correctly.
 */

import type { ClassicResultGroup, ClassicResultRow, AttemptDisplay } from "./classic-placing";
import type { MultirepResultGroup, MultirepResultRow } from "./multirep-placing";
import { ageInYears } from "./age";

const UTF8_BOM = "﻿";

type CsvExportOptions = {
  includeBom?: boolean;
};

function withOptionalBom(csv: string, options?: CsvExportOptions): string {
  return options?.includeBom === false ? csv : UTF8_BOM + csv;
}

const HEADERS = [
  "#",
  "Возраст. кат / Age Cat",
  "Команда / Team",
  "Дата рожд / Birth",
  "ВК / Weight Cat",
  "Вес / BW",
  "П1/P1",
  "П2/P2",
  "П3/P3",
  "Подтягивания / PU Best",
  "О1/D1",
  "О2/D2",
  "О3/D3",
  "Отжимания / DI Best",
  "Сумма / Total",
  "Разряд / Rank",
  "Коэф / Coef",
  "Абс / Abs Pts",
  "Место / Place",
  "Тренер / Coach",
];

function escapeCell(value: string): string {
  // Wrap in quotes if contains comma, quote, or newline
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatAttemptDisplay(val: AttemptDisplay): string {
  if (val === null) return "";
  if (val < 0) return `-${Math.abs(val)}`;
  return String(val);
}

function rowToCsvLine(row: ClassicResultRow): string {
  const e = row.entry;

  const placeStr = row.place === null ? "Г/G" : String(row.place);
  const ageCatStr = row.resolvedAgeCategoryCode ?? "";
  const teamStr = e.team ?? "";
  const birthStr = e.birthDate ?? (e.ageOverride !== null ? String(e.ageOverride) : "");
  const wcStr = row.resolvedWeightCategoryCode ?? "";
  const bwStr = e.bodyweightKg !== null ? String(e.bodyweightKg) : "";

  const pu1 = formatAttemptDisplay(row.puAttempts[0]);
  const pu2 = formatAttemptDisplay(row.puAttempts[1]);
  const pu3 = formatAttemptDisplay(row.puAttempts[2]);
  const puBest = row.puBest > 0 ? String(row.puBest) : "";

  const di1 = formatAttemptDisplay(row.diAttempts[0]);
  const di2 = formatAttemptDisplay(row.diAttempts[1]);
  const di3 = formatAttemptDisplay(row.diAttempts[2]);
  const diBest = row.diBest > 0 ? String(row.diBest) : "";

  const total = row.total > 0 ? String(row.total) : "0";
  const rank = ""; // sport rank not tracked in V1
  const coef = String(row.isfCoefficient);
  const absPts = String(row.isfFinalPoints);
  const coach = ""; // not tracked in V1

  const cells = [
    e.name,
    ageCatStr,
    teamStr,
    birthStr,
    wcStr,
    bwStr,
    pu1,
    pu2,
    pu3,
    puBest,
    di1,
    di2,
    di3,
    diBest,
    total,
    rank,
    coef,
    absPts,
    placeStr,
    coach,
  ];

  return cells.map(escapeCell).join(",");
}

/**
 * Export classic protocol to CSV (PowerTable-compatible).
 *
 * @param groups  Computed classic result groups
 * @param meetName  Name of the meet (used in header comment)
 * @param meetDate  ISO 8601 date of the meet
 */
export function exportClassicProtocolCsv(
  groups: ClassicResultGroup[],
  meetName: string,
  meetDate: string,
  options?: CsvExportOptions,
): string {
  const lines: string[] = [];

  // File header comment
  lines.push(`# ${meetName} — ${meetDate}`);
  lines.push(HEADERS.map(escapeCell).join(","));

  for (const group of groups) {
    // Section header row
    lines.push(`=== ${group.label} ===`);

    for (const row of group.rows) {
      lines.push(rowToCsvLine(row));
    }
  }

  return withOptionalBom(lines.join("\n"), options);
}

// ─── Multirep CSV export ─────────────────────────────────────────────────────

const MULTIREP_HEADERS = [
  "#",
  "Возраст. кат / Age Cat",
  "Команда / Team",
  "Дата рожд / Birth",
  "ВК / Weight Cat",
  "Вес / BW",
  "Нагрузка PU / PU Load",
  "PU повт / PU Reps",
  "Нагрузка DI / DI Load",
  "DI повт / DI Reps",
  "Сумма повт / Total Reps",
  "Коэф / Coef",
  "ISF очки / ISF Pts",
  "Место / Place",
];

function multirepRowToCsvLine(row: MultirepResultRow): string {
  const e = row.entry;

  const placeStr = row.place === null ? "Г/G" : String(row.place);
  const ageCatStr = row.resolvedAgeCategoryCode ?? "";
  const teamStr = e.team ?? "";
  const birthStr = e.birthDate ?? (e.ageOverride !== null ? String(e.ageOverride) : "");
  const wcStr = row.resolvedWeightCategoryCode ?? "";
  const bwStr = e.bodyweightKg !== null ? String(e.bodyweightKg) : "";

  const puLoad = row.presetLoadKgPu !== null ? String(row.presetLoadKgPu) : "";
  const puReps = String(row.puReps);
  const diLoad = row.presetLoadKgDi !== null ? String(row.presetLoadKgDi) : "";
  const diReps = String(row.diReps);
  const totalReps = String(row.totalReps);
  const coef = String(row.isfCoefficient);
  const isfPts = String(row.isfFinalPoints);

  const cells = [
    e.name,
    ageCatStr,
    teamStr,
    birthStr,
    wcStr,
    bwStr,
    puLoad,
    puReps,
    diLoad,
    diReps,
    totalReps,
    coef,
    isfPts,
    placeStr,
  ];

  return cells.map(escapeCell).join(",");
}

/**
 * Export multirep protocol to CSV.
 *
 * @param groups  Computed multirep result groups
 * @param meetName  Name of the meet (used in header comment)
 * @param meetDate  ISO 8601 date of the meet
 */
export function exportMultirepProtocolCsv(
  groups: MultirepResultGroup[],
  meetName: string,
  meetDate: string,
  options?: CsvExportOptions,
): string {
  const lines: string[] = [];

  lines.push(`# ${meetName} — ${meetDate} — Многоповторный / Multirep`);
  lines.push(MULTIREP_HEADERS.map(escapeCell).join(","));

  for (const group of groups) {
    lines.push(`=== ${group.label} ===`);

    for (const row of group.rows) {
      lines.push(multirepRowToCsvLine(row));
    }
  }

  return withOptionalBom(lines.join("\n"), options);
}

/**
 * Export the combined official results protocol with one UTF-8 BOM.
 */
export function exportResultsProtocolCsv(
  classicGroups: ClassicResultGroup[],
  multirepGroups: MultirepResultGroup[],
  meetName: string,
  meetDate: string,
): string {
  const sections = [
    exportClassicProtocolCsv(classicGroups, meetName, meetDate, {
      includeBom: false,
    }),
  ];

  if (multirepGroups.length > 0) {
    sections.push(
      exportMultirepProtocolCsv(multirepGroups, meetName, meetDate, {
        includeBom: false,
      }),
    );
  }

  return UTF8_BOM + sections.join("\n\n");
}

// ─── OpenPowerlifting-compatible CSV export ─────────────────────────────────

export type OpenPowerliftingMeetInfo = {
  meetName: string;
  meetDate: string;
  federation?: string;
  parentFederation?: string;
  meetCountry?: string;
  meetState?: string;
  sanctioned?: "Yes" | "No" | "";
};

const OPENPOWERLIFTING_HEADERS = [
  "Name",
  "Sex",
  "Event",
  "Equipment",
  "Age",
  "AgeClass",
  "BirthYearClass",
  "Division",
  "BodyweightKg",
  "WeightClassKg",
  "Squat1Kg",
  "Bench1Kg",
  "Deadlift1Kg",
  "Squat2Kg",
  "Bench2Kg",
  "Deadlift2Kg",
  "Squat3Kg",
  "Bench3Kg",
  "Deadlift3Kg",
  "Squat4Kg",
  "Bench4Kg",
  "Deadlift4Kg",
  "Best3SquatKg",
  "Best3BenchKg",
  "Best3DeadliftKg",
  "TotalKg",
  "Place",
  "Dots",
  "Wilks",
  "Glossbrenner",
  "Goodlift",
  "Tested",
  "Country",
  "State",
  "Federation",
  "ParentFederation",
  "Date",
  "MeetCountry",
  "MeetState",
  "MeetName",
  "Sanctioned",
] as const;

function formatKg(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function sanitizeOplCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[,"\r\n]/g, " ").replace(/\s+/g, " ").trim();
}

function formatOplAttempt(attempt: AttemptDisplay): string {
  return attempt === null ? "" : formatKg(attempt);
}

function formatOplSex(sex: ClassicResultRow["entry"]["sex"]): string {
  return sex === "OPEN" ? "Mx" : sex;
}

function formatOplAge(row: ClassicResultRow, meetDate: string): string {
  if (row.entry.ageOverride !== null) return String(row.entry.ageOverride);
  if (row.entry.birthDate === null) return "";
  return String(ageInYears(row.entry.birthDate, meetDate));
}

function formatOplAgeClass(code: ClassicResultRow["resolvedAgeCategoryCode"]): string {
  switch (code) {
    case "youth":
      return "13-17";
    case "junior":
      return "18-22";
    case "masters_m1":
      return "40-44";
    case "masters_m2":
      return "45-49";
    case "masters_m3":
      return "50-54";
    case "masters_m4":
      return "55-59";
    case "masters_m5":
      return "60-69";
    case "masters_m6":
      return "70-999";
    case "open":
    case null:
      return "";
  }
}

function formatOplWeightClass(code: string | null): string {
  if (code === null) return "";
  const withoutSexPrefix = code.replace(/^[MF]_/, "");
  const plus = withoutSexPrefix.endsWith("_PLUS");
  const numeric = withoutSexPrefix.replace(/_PLUS$/, "").replace(/_/g, ".");
  return plus ? `${numeric}+` : numeric;
}

function formatOplPlace(row: ClassicResultRow): string {
  if (row.entry.guest) return "G";
  if (row.total <= 0) return "DQ";
  return row.place === null ? "DQ" : String(row.place);
}

function collectUniqueCategoryRows(groups: ClassicResultGroup[]): ClassicResultRow[] {
  const rows: ClassicResultRow[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    // The absolute group repeats category rows and is not a separate OPL division.
    if (group.sex === null && group.ageCategoryCode === null) continue;

    for (const row of group.rows) {
      if (seen.has(row.entry.id)) continue;
      seen.add(row.entry.id);
      rows.push(row);
    }
  }

  return rows;
}

function openPowerliftingRowToCsvLine(
  row: ClassicResultRow,
  meetInfo: OpenPowerliftingMeetInfo,
): string {
  const cells = [
    row.entry.name,
    formatOplSex(row.entry.sex),
    // OpenPowerlifting has no streetlifting event code. BD is the closest
    // two-lift container; Bench carries DI and Deadlift carries PU.
    "BD",
    "Raw",
    formatOplAge(row, meetInfo.meetDate),
    formatOplAgeClass(row.resolvedAgeCategoryCode),
    "",
    row.entry.division,
    formatKg(row.entry.bodyweightKg),
    formatOplWeightClass(row.resolvedWeightCategoryCode),
    "",
    formatOplAttempt(row.diAttempts[0]),
    formatOplAttempt(row.puAttempts[0]),
    "",
    formatOplAttempt(row.diAttempts[1]),
    formatOplAttempt(row.puAttempts[1]),
    "",
    formatOplAttempt(row.diAttempts[2]),
    formatOplAttempt(row.puAttempts[2]),
    "",
    "",
    "",
    "",
    formatKg(row.diBest > 0 ? row.diBest : null),
    formatKg(row.puBest > 0 ? row.puBest : null),
    row.total > 0 ? formatKg(row.total) : "",
    formatOplPlace(row),
    "",
    "",
    "",
    "",
    "",
    row.entry.country ?? "",
    "",
    meetInfo.federation ?? "ISF",
    meetInfo.parentFederation ?? "ISF",
    meetInfo.meetDate,
    meetInfo.meetCountry ?? "",
    meetInfo.meetState ?? "",
    meetInfo.meetName,
    meetInfo.sanctioned ?? "Yes",
  ];

  return cells.map(sanitizeOplCell).join(",");
}

/**
 * Export Classic streetlifting rows into an OpenPowerlifting-shaped CSV.
 *
 * This is intentionally a lossy compatibility export: OpenPowerlifting does
 * not define PU/DI event columns, so DI is mapped to Bench and PU to Deadlift
 * under a two-lift BD event. Multirep is excluded because reps are not part of
 * the OpenPowerlifting CSV schema.
 */
export function exportOpenPowerliftingCsv(
  classicGroups: ClassicResultGroup[],
  meetInfo: OpenPowerliftingMeetInfo,
  options?: CsvExportOptions,
): string {
  const lines = [
    OPENPOWERLIFTING_HEADERS.join(","),
    ...collectUniqueCategoryRows(classicGroups).map((row) =>
      openPowerliftingRowToCsvLine(row, meetInfo),
    ),
  ];

  return withOptionalBom(lines.join("\n"), {
    includeBom: options?.includeBom ?? false,
  });
}
