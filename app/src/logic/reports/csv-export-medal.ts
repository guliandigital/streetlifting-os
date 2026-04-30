/**
 * Medal-count CSV export.
 *
 * Emits one row per (bucket × label), where bucket ∈ {"team", "country"}.
 * Federations can split / pivot client-side without losing the structure.
 *
 * UTF-8 with BOM so Excel on Windows reads Cyrillic correctly.
 */

import Papa from "papaparse";
import type { MedalCountReport } from "@logic/reports/medal-count";

const UTF8_BOM = "﻿";

export const MEDAL_CSV_HEADERS = [
  "bucket",
  "place",
  "label",
  "gold",
  "silver",
  "bronze",
  "total",
] as const;

type MedalCsvRow = Record<(typeof MEDAL_CSV_HEADERS)[number], string>;

function rowsFor(
  bucket: "team" | "country",
  rows: MedalCountReport["byTeam"],
): MedalCsvRow[] {
  return rows.map((r) => ({
    bucket,
    place: String(r.place),
    label: r.label,
    gold: String(r.gold),
    silver: String(r.silver),
    bronze: String(r.bronze),
    total: String(r.total),
  }));
}

export function exportMedalCountCsv(report: MedalCountReport): string {
  const data: MedalCsvRow[] = [
    ...rowsFor("team", report.byTeam),
    ...rowsFor("country", report.byCountry),
  ];
  const csv = Papa.unparse({ fields: [...MEDAL_CSV_HEADERS], data });
  return UTF8_BOM + csv;
}
