/**
 * Medal-count CSV export tests.
 */

import { describe, it, expect } from "vitest";
import {
  exportMedalCountCsv,
  MEDAL_CSV_HEADERS,
} from "@logic/reports/csv-export-medal";
import type { MedalCountReport } from "@logic/reports/medal-count";

function row(
  label: string,
  place: number,
  gold: number,
  silver: number,
  bronze: number,
): MedalCountReport["byTeam"][number] {
  return { label, place, gold, silver, bronze, total: gold + silver + bronze };
}

function parseCsv(csv: string): { headers: string[]; rows: string[][] } {
  const stripped = csv.startsWith("﻿") ? csv.slice(1) : csv;
  const lines = stripped.split(/\r?\n/).filter((l) => l.length > 0);
  const headers = lines[0]!.split(",");
  const rows = lines.slice(1).map((l) => l.split(","));
  return { headers, rows };
}

describe("exportMedalCountCsv", () => {
  it("returns header-only CSV for empty report", () => {
    const csv = exportMedalCountCsv({ byTeam: [], byCountry: [] });
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual([...MEDAL_CSV_HEADERS]);
    expect(rows).toEqual([]);
  });

  it("emits team rows then country rows with bucket marker", () => {
    const csv = exportMedalCountCsv({
      byTeam: [row("Alpha", 1, 2, 1, 0), row("Beta", 2, 0, 1, 1)],
      byCountry: [row("RU", 1, 2, 2, 1)],
    });
    const { rows } = parseCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.[0]).toBe("team");
    expect(rows[0]?.[2]).toBe("Alpha");
    expect(rows[1]?.[0]).toBe("team");
    expect(rows[1]?.[2]).toBe("Beta");
    expect(rows[2]?.[0]).toBe("country");
    expect(rows[2]?.[2]).toBe("RU");
  });

  it("preserves bucket order: team rows first, country rows second", () => {
    const csv = exportMedalCountCsv({
      byTeam: [row("A", 1, 1, 0, 0)],
      byCountry: [row("X", 1, 1, 0, 0)],
    });
    const { rows } = parseCsv(csv);
    expect(rows[0]?.[0]).toBe("team");
    expect(rows[1]?.[0]).toBe("country");
  });

  it("preserves place ordering within each bucket", () => {
    const csv = exportMedalCountCsv({
      byTeam: [
        row("A", 1, 3, 0, 0),
        row("B", 2, 2, 0, 0),
        row("C", 3, 1, 0, 0),
      ],
      byCountry: [],
    });
    const { rows } = parseCsv(csv);
    expect(rows.map((r) => r[1])).toEqual(["1", "2", "3"]);
  });

  it("includes UTF-8 BOM", () => {
    const csv = exportMedalCountCsv({
      byTeam: [row("Альфа", 1, 1, 0, 0)],
      byCountry: [],
    });
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Альфа");
  });

  it("includes total column equal to gold+silver+bronze", () => {
    const csv = exportMedalCountCsv({
      byTeam: [row("A", 1, 2, 3, 1)],
      byCountry: [],
    });
    const { rows } = parseCsv(csv);
    expect(rows[0]?.[6]).toBe("6");
  });
});
