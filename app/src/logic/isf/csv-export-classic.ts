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

const UTF8_BOM = "﻿";

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

  return UTF8_BOM + lines.join("\n");
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

  return UTF8_BOM + lines.join("\n");
}
