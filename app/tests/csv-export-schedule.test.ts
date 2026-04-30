/**
 * Schedule plan CSV export tests.
 */

import { describe, it, expect } from "vitest";
import {
  exportSchedulePlanCsv,
  SCHEDULE_CSV_HEADERS,
} from "@logic/reports/csv-export-schedule";
import type { AttemptGroup, SchedulePlan, ScheduleStream } from "@domain/models";

function stream(
  id: string,
  day: number,
  platform: number,
  flight: string,
  entryIds: string[] = [],
): ScheduleStream {
  return { id, day, platform, flight, entryIds };
}

function group(
  id: string,
  streamId: string,
  exercise: AttemptGroup["exercise"],
  athleteCount: number,
  durationSec: number,
): AttemptGroup {
  return {
    id,
    streamId,
    competitionFormat: "classic",
    disciplineCode: "classic_2lift",
    exercise,
    entryIds: Array.from({ length: athleteCount }, (_, i) => `e${i}`),
    estimatedDurationSec: durationSec,
  };
}

function plan(
  streams: ScheduleStream[],
  groups: AttemptGroup[],
  totalSec = 0,
): SchedulePlan {
  return {
    streams,
    groups,
    totalEstimatedDurationSec: totalSec,
  };
}

function parseCsv(csv: string): { headers: string[]; rows: string[][] } {
  const stripped = csv.startsWith("﻿") ? csv.slice(1) : csv;
  const lines = stripped.split(/\r?\n/).filter((l) => l.length > 0);
  const headers = lines[0]!.split(",");
  const rows = lines.slice(1).map((l) => l.split(","));
  return { headers, rows };
}

describe("exportSchedulePlanCsv", () => {
  it("returns header-only CSV for empty plan", () => {
    const csv = exportSchedulePlanCsv(plan([], []));
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual([...SCHEDULE_CSV_HEADERS]);
    expect(rows).toEqual([]);
  });

  it("emits one row per group with stream day/platform/flight resolved", () => {
    const s = stream("s1", 1, 1, "A");
    const csv = exportSchedulePlanCsv(
      plan([s], [group("g1", "s1", "PU", 3, 450)]),
    );
    const { rows } = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual([
      "1", // day
      "1", // platform
      "A", // flight
      "classic_2lift",
      "PU",
      "classic",
      "3",
      "450",
      "7m 30s",
    ]);
  });

  it("preserves group order from the plan (no re-sorting)", () => {
    const s1 = stream("s1", 1, 1, "A");
    const s2 = stream("s2", 1, 2, "B");
    const csv = exportSchedulePlanCsv(
      plan(
        [s1, s2],
        [
          group("g1", "s1", "PU", 1, 100),
          group("g2", "s1", "DI", 1, 100),
          group("g3", "s2", "PU", 1, 100),
        ],
      ),
    );
    const { rows } = parseCsv(csv);
    expect(rows.map((r) => r[2])).toEqual(["A", "A", "B"]);
    expect(rows.map((r) => r[4])).toEqual(["PU", "DI", "PU"]);
  });

  it("formats duration in compact form (7m 30s, 1h 23m, ...)", () => {
    const s = stream("s1", 1, 1, "A");
    const csv = exportSchedulePlanCsv(
      plan(
        [s],
        [
          group("g0", "s1", "PU", 1, 45),
          group("g1", "s1", "PU", 1, 450),
          group("g2", "s1", "PU", 1, 5000),
        ],
      ),
    );
    const { rows } = parseCsv(csv);
    expect(rows[0]?.[8]).toBe("45s");
    expect(rows[1]?.[8]).toBe("7m 30s");
    expect(rows[2]?.[8]).toBe("1h 23m");
  });

  it("includes UTF-8 BOM", () => {
    const s = stream("s1", 1, 1, "Поток-А");
    const csv = exportSchedulePlanCsv(
      plan([s], [group("g1", "s1", "PU", 1, 100)]),
    );
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Поток-А");
  });

  it("emits empty stream fields if a group references an unknown streamId", () => {
    const csv = exportSchedulePlanCsv(
      plan([], [group("orphan", "missing", "PU", 1, 100)]),
    );
    const { rows } = parseCsv(csv);
    expect(rows[0]).toEqual([
      "",
      "",
      "",
      "classic_2lift",
      "PU",
      "classic",
      "1",
      "100",
      "1m 40s",
    ]);
  });
});
