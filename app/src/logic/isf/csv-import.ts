/**
 * CSV import for athlete registration.
 *
 * Format (header row REQUIRED, columns may be in any order):
 *   name, sex, birthDate, country, division, disciplineCode,
 *   team, memberId, guest, instagram, notes,
 *   day, platform, flight, bodyweightKg, reweighKg
 *
 * - `sex`: M / F (case-insensitive). Required.
 * - `division`: amateur / pro / adaptive. Required.
 * - `disciplineCode`: stable code from discipline catalog (e.g., classic_2lift). Required.
 * - `birthDate`: ISO `YYYY-MM-DD` or empty.
 * - `guest`: 1 / 0 / true / false / yes / no. Default false.
 * - Numeric fields: empty cell = null. Locale-agnostic — only `.` decimal separator accepted.
 *
 * Imports are forgiving: rows with errors are skipped and reported. Caller decides
 * whether to abort or accept.
 */

import Papa from "papaparse";
import type { Entry, Sex, Division } from "@domain/models";
import type { DisciplineCode } from "@domain/models";

export type ImportedEntryDraft = Omit<
  Entry,
  | "id"
  | "competitionFormat"
  | "event"
  | "exercises"
  | "ageOverride"
  | "assignedAgeCategoryCode"
  | "assignedWeightCategoryCode"
> & {
  /** Caller fills these from disciplineCode → discipline catalog lookup. */
  __pendingCompetitionFormat: true;
};

export type ImportRowError = {
  rowIndex: number; // 1-based, excluding header
  field: string;
  message: string;
  rawValue?: string;
};

export type ImportResult = {
  drafts: ImportedEntryDraft[];
  errors: ImportRowError[];
  totalRows: number;
};

const VALID_SEX: ReadonlyArray<Sex> = ["M", "F"];
const VALID_DIVISION: ReadonlyArray<Division> = ["amateur", "pro", "adaptive"];

const HEADER_ALIASES: Record<string, string> = {
  // canonical → canonical (no-op); aliases below
  name: "name",
  sex: "sex",
  birthdate: "birthDate",
  birth_date: "birthDate",
  country: "country",
  division: "division",
  discipline: "disciplineCode",
  disciplinecode: "disciplineCode",
  discipline_code: "disciplineCode",
  team: "team",
  memberid: "memberId",
  member_id: "memberId",
  guest: "guest",
  instagram: "instagram",
  notes: "notes",
  day: "day",
  platform: "platform",
  flight: "flight",
  bodyweight: "bodyweightKg",
  bodyweightkg: "bodyweightKg",
  bodyweight_kg: "bodyweightKg",
  reweigh: "reweighKg",
  reweighkg: "reweighKg",
  reweigh_kg: "reweighKg",
};

function normalizeHeader(h: string): string {
  const k = h.trim().toLowerCase().replace(/\s+/g, "_");
  return HEADER_ALIASES[k] ?? h.trim();
}

function parseBool(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "y";
}

function parseNumberOrNull(raw: string): number | null | "ERROR" {
  const v = raw.trim();
  if (v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return "ERROR";
  return n;
}

function parseIntOrDefault(raw: string, fallback: number): number | "ERROR" {
  const v = raw.trim();
  if (v === "") return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return "ERROR";
  return n;
}

/**
 * Parse a CSV string into entry drafts.
 *
 * @param csvText raw CSV (with header row)
 * @param validDisciplineCodes whitelist; rows with unknown codes get an error
 */
export function parseRegistrationCsv(
  csvText: string,
  validDisciplineCodes: ReadonlyArray<DisciplineCode>,
): ImportResult {
  const drafts: ImportedEntryDraft[] = [];
  const errors: ImportRowError[] = [];

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  if (parsed.errors.length > 0) {
    for (const e of parsed.errors) {
      errors.push({
        rowIndex: (e.row ?? 0) + 1,
        field: "_csv",
        message: e.message,
      });
    }
  }

  const rows = parsed.data;

  rows.forEach((row, idx) => {
    const rowIndex = idx + 1;
    const rowErrors: ImportRowError[] = [];

    const name = (row.name ?? "").trim();
    if (!name) {
      rowErrors.push({ rowIndex, field: "name", message: "name is required" });
    }

    const sexRaw = (row.sex ?? "").trim().toUpperCase();
    const sex = (VALID_SEX as ReadonlyArray<string>).includes(sexRaw)
      ? (sexRaw as Sex)
      : null;
    if (sex === null) {
      rowErrors.push({
        rowIndex,
        field: "sex",
        message: "sex must be M or F",
        rawValue: row.sex,
      });
    }

    const divisionRaw = (row.division ?? "").trim().toLowerCase();
    const division = (VALID_DIVISION as ReadonlyArray<string>).includes(
      divisionRaw,
    )
      ? (divisionRaw as Division)
      : null;
    if (division === null) {
      rowErrors.push({
        rowIndex,
        field: "division",
        message: "division must be amateur, pro, or adaptive",
        rawValue: row.division,
      });
    }

    const disciplineRaw = (row.disciplineCode ?? "").trim();
    const disciplineCode = (
      validDisciplineCodes as ReadonlyArray<string>
    ).includes(disciplineRaw)
      ? (disciplineRaw as DisciplineCode)
      : null;
    if (disciplineCode === null) {
      rowErrors.push({
        rowIndex,
        field: "disciplineCode",
        message: "unknown disciplineCode (not in meet's enabled disciplines)",
        rawValue: row.disciplineCode,
      });
    }

    const birthDateRaw = (row.birthDate ?? "").trim();
    let birthDate: string | null = null;
    if (birthDateRaw !== "") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw)) {
        rowErrors.push({
          rowIndex,
          field: "birthDate",
          message: "birthDate must be ISO YYYY-MM-DD",
          rawValue: birthDateRaw,
        });
      } else {
        birthDate = birthDateRaw;
      }
    }

    const day = parseIntOrDefault(row.day ?? "", 1);
    if (day === "ERROR") {
      rowErrors.push({
        rowIndex,
        field: "day",
        message: "day must be integer",
        rawValue: row.day,
      });
    }
    const platform = parseIntOrDefault(row.platform ?? "", 1);
    if (platform === "ERROR") {
      rowErrors.push({
        rowIndex,
        field: "platform",
        message: "platform must be integer",
        rawValue: row.platform,
      });
    }

    const bodyweight = parseNumberOrNull(row.bodyweightKg ?? "");
    if (bodyweight === "ERROR") {
      rowErrors.push({
        rowIndex,
        field: "bodyweightKg",
        message: "bodyweightKg must be a number or empty",
        rawValue: row.bodyweightKg,
      });
    }
    const reweigh = parseNumberOrNull(row.reweighKg ?? "");
    if (reweigh === "ERROR") {
      rowErrors.push({
        rowIndex,
        field: "reweighKg",
        message: "reweighKg must be a number or empty",
        rawValue: row.reweighKg,
      });
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }

    const country = (row.country ?? "").trim();
    const team = (row.team ?? "").trim();
    const memberId = (row.memberId ?? "").trim();
    const flight = (row.flight ?? "").trim();
    const instagram = (row.instagram ?? "").trim();
    const notes = (row.notes ?? "").trim();
    const guest = parseBool(row.guest ?? "");

    const draft: ImportedEntryDraft = {
      __pendingCompetitionFormat: true,
      disciplineCode: disciplineCode as DisciplineCode,
      day: day as number,
      platform: platform as number,
      flight,
      name,
      sex: sex as Sex,
      birthDate,
      division: division as Division,
      ...(team ? { team } : {}),
      ...(memberId ? { memberId } : {}),
      guest,
      ...(instagram ? { instagram } : {}),
      ...(notes ? { notes } : {}),
      country: country || null,
      bodyweightKg: bodyweight as number | null,
      reweighKg: reweigh as number | null,
    };
    drafts.push(draft);
  });

  return { drafts, errors, totalRows: rows.length };
}
