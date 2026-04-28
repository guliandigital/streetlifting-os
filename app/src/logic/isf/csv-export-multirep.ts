/**
 * CSV export for multirep competition protocol — Sprint 3.
 *
 * UTF-8 with BOM so Excel on Windows reads Cyrillic correctly.
 * Column order mirrors PowerTable multirep protocol layout.
 */

import type {
  MultirepResultGroup,
  MultirepResultRow,
} from "./multirep-placing";

const UTF8_BOM = "﻿";

const HEADERS = [
  "#",
  "Возраст. кат / Age Cat",
  "Команда / Team",
  "Дата рожд / Birth",
  "ВК / Weight Cat",
  "Вес / BW",
  "Подтяг. вес / PU Load",
  "Подтяг. повт / PU Reps",
  "Отжим. вес / DI Load",
  "Отжим. повт / DI Reps",
  "Сумма / Total",
  "Коэф / Coef",
  "Абс / Abs Pts",
  "Место / Place",
  "Тренер / Coach",
];

function escapeCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowToCsvLine(row: MultirepResultRow): string {
  const e = row.entry;

  const placeStr = row.place === null ? "Г/G" : String(row.place);
  const ageCatStr = row.resolvedAgeCategoryCode ?? "";
  const teamStr = e.team ?? "";
  const birthStr =
    e.birthDate ?? (e.ageOverride !== null ? String(e.ageOverride) : "");
  const wcStr = row.resolvedWeightCategoryCode ?? "";
  const bwStr = e.bodyweightKg !== null ? String(e.bodyweightKg) : "";

  const puLoadStr = row.presetLoadKgPU !== null ? String(row.presetLoadKgPU) : "";
  const puRepsStr = row.puReps > 0 ? String(row.puReps) : "0";

  const diLoadStr = row.presetLoadKgDI !== null ? String(row.presetLoadKgDI) : "";
  const diRepsStr = row.diReps > 0 ? String(row.diReps) : "0";

  const totalStr = String(row.totalReps);
  const coefStr = String(row.isfCoefficient);
  const absPtsStr = String(row.isfFinalPoints);
  const coachStr = "";

  const cells = [
    e.name,
    ageCatStr,
    teamStr,
    birthStr,
    wcStr,
    bwStr,
    puLoadStr,
    puRepsStr,
    diLoadStr,
    diRepsStr,
    totalStr,
    coefStr,
    absPtsStr,
    placeStr,
    coachStr,
  ];

  return cells.map(escapeCell).join(",");
}

/**
 * Export multirep protocol to CSV.
 *
 * @param groups  Computed multirep result groups
 * @param meetName  Name of the meet (used in file header comment)
 * @param meetDate  ISO 8601 date of the meet
 */
export function exportMultirepProtocolCsv(
  groups: MultirepResultGroup[],
  meetName: string,
  meetDate: string,
): string {
  const lines: string[] = [];

  lines.push(`# ${meetName} — ${meetDate}`);
  lines.push(HEADERS.map(escapeCell).join(","));

  for (const group of groups) {
    lines.push(`=== ${group.label} ===`);
    for (const row of group.rows) {
      lines.push(rowToCsvLine(row));
    }
  }

  return UTF8_BOM + lines.join("\n");
}
