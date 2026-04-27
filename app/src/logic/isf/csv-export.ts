/**
 * CSV export for athlete registration.
 *
 * Mirrors the import format (see csv-import.ts) so the round-trip is lossless
 * for the operator-managed fields. Adds two read-only columns showing the
 * current resolved categories — useful for sharing a roster pre-meet.
 *
 * UTF-8 with BOM so Excel on Windows reads cyrillic correctly.
 */

import Papa from "papaparse";
import type { Entry } from "@domain/models";

const CSV_COLUMNS = [
  "name",
  "sex",
  "birthDate",
  "country",
  "division",
  "disciplineCode",
  "team",
  "memberId",
  "guest",
  "instagram",
  "notes",
  "day",
  "platform",
  "flight",
  "bodyweightKg",
  "reweighKg",
  "assignedWeightCategoryCode",
  "assignedAgeCategoryCode",
] as const;

export const REGISTRATION_CSV_HEADERS: ReadonlyArray<string> = CSV_COLUMNS;

const UTF8_BOM = "\uFEFF";

function rowFromEntry(e: Entry): Record<string, string> {
  return {
    name: e.name,
    sex: e.sex,
    birthDate: e.birthDate ?? "",
    country: e.country ?? "",
    division: e.division,
    disciplineCode: e.disciplineCode,
    team: e.team ?? "",
    memberId: e.memberId ?? "",
    guest: e.guest ? "true" : "false",
    instagram: e.instagram ?? "",
    notes: e.notes ?? "",
    day: String(e.day),
    platform: String(e.platform),
    flight: e.flight,
    bodyweightKg: e.bodyweightKg === null ? "" : String(e.bodyweightKg),
    reweighKg: e.reweighKg === null ? "" : String(e.reweighKg),
    assignedWeightCategoryCode: e.assignedWeightCategoryCode ?? "",
    assignedAgeCategoryCode: e.assignedAgeCategoryCode ?? "",
  };
}

/** Serialize entries to CSV (UTF-8 with BOM). */
export function buildRegistrationCsv(entries: ReadonlyArray<Entry>): string {
  const rows = entries.map(rowFromEntry);
  const csv = Papa.unparse(rows, {
    columns: CSV_COLUMNS as unknown as string[],
    quotes: true,
  });
  return UTF8_BOM + csv;
}
