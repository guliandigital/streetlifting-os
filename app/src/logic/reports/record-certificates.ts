/**
 * Record certificates — pure adapter over computeRecords.
 *
 * Wraps each CompetitionRecord into a printable certificate row. Every
 * record set during this competition becomes a certificate entry.
 *
 * In V1 every CompetitionRecord has isNew = true, so all of them are
 * emitted. When V2 wires historical comparison, this filter still holds —
 * we only certify records that are genuinely new on the day.
 */

import type { CompetitionRecord } from "@logic/isf/records";

export type RecordCertificate = {
  record: CompetitionRecord;
  /** Display-ready result with unit, e.g. "175 кг" / "32 reps". */
  resultLabel: string;
  /** Display-ready category label. */
  categoryLabel: string;
  /** Display-ready exercise label. */
  exerciseLabel: string;
};

function formatExercise(exercise: "PU" | "DI" | "PUDI"): string {
  if (exercise === "PUDI") return "PU + DI";
  return exercise;
}

function formatCategory(rec: CompetitionRecord): string {
  const parts: string[] = [];
  parts.push(rec.sex === "M" ? "M" : "F");
  if (rec.ageCategoryCode) parts.push(rec.ageCategoryCode);
  if (rec.weightCategoryCode) parts.push(rec.weightCategoryCode);
  return parts.join(" · ");
}

function formatResult(rec: CompetitionRecord, kgUnitLabel: string): string {
  if (rec.unit === "kg") return `${rec.result} ${kgUnitLabel}`;
  return `${rec.result} reps`;
}

export type CertificateOptions = {
  /** Display string for kilograms, e.g. "кг" or "kg". */
  kgUnitLabel?: string;
};

export function buildRecordCertificates(
  records: ReadonlyArray<CompetitionRecord>,
  options: CertificateOptions = {},
): RecordCertificate[] {
  const kgUnitLabel = options.kgUnitLabel ?? "kg";
  return records
    .filter((rec) => rec.isNew)
    .map((record) => ({
      record,
      resultLabel: formatResult(record, kgUnitLabel),
      categoryLabel: formatCategory(record),
      exerciseLabel: formatExercise(record.exercise),
    }));
}
