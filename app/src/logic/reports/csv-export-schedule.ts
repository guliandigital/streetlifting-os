/**
 * Schedule plan CSV export.
 *
 * One row per attempt-group (the smallest scheduling unit), so a
 * federation can re-build the day-platform-flight breakdown
 * client-side. Includes the per-group estimate alongside the
 * stream/day rollups for cross-checking.
 *
 * UTF-8 with BOM so Excel on Windows reads Cyrillic correctly.
 */

import Papa from "papaparse";
import type { SchedulePlan } from "@domain/models";

const UTF8_BOM = "﻿";

export const SCHEDULE_CSV_HEADERS = [
  "day",
  "platform",
  "flight",
  "disciplineCode",
  "exercise",
  "competitionFormat",
  "athleteCount",
  "estimatedSec",
  "estimatedHuman",
] as const;

type ScheduleCsvRow = Record<(typeof SCHEDULE_CSV_HEADERS)[number], string>;

function humanize(seconds: number): string {
  const sec = Math.round(seconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

export function exportSchedulePlanCsv(plan: SchedulePlan): string {
  const streamById = new Map(plan.streams.map((s) => [s.id, s]));
  const rows: ScheduleCsvRow[] = plan.groups.map((g) => {
    const stream = streamById.get(g.streamId);
    return {
      day: stream ? String(stream.day) : "",
      platform: stream ? String(stream.platform) : "",
      flight: stream ? stream.flight : "",
      disciplineCode: g.disciplineCode,
      exercise: g.exercise,
      competitionFormat: g.competitionFormat,
      athleteCount: String(g.entryIds.length),
      estimatedSec: String(g.estimatedDurationSec),
      estimatedHuman: humanize(g.estimatedDurationSec),
    };
  });
  const csv = Papa.unparse({ fields: [...SCHEDULE_CSV_HEADERS], data: rows });
  return UTF8_BOM + csv;
}
