/**
 * Team protocol CSV export tests.
 */

import { describe, it, expect } from "vitest";
import {
  exportTeamProtocolCsv,
  TEAM_CSV_HEADERS,
} from "@logic/reports/csv-export-team";
import type { TeamScore } from "@logic/isf/team-scoring";
import { buildClassicEntry } from "./fixtures/builders";

function team(
  name: string,
  place: number,
  totalPoints: number,
  contributors: Array<{ name: string; points: number; place: number | null }>,
  athleteCount?: number,
): TeamScore {
  return {
    teamName: name,
    place,
    totalPoints,
    athleteCount: athleteCount ?? contributors.length,
    contributors: contributors.map((c) => ({
      entry: buildClassicEntry(c.name, { team: name }),
      points: c.points,
      place: c.place,
    })),
  };
}

function parseCsv(csv: string): { headers: string[]; rows: string[][] } {
  // Strip UTF-8 BOM
  const stripped = csv.startsWith("﻿") ? csv.slice(1) : csv;
  const lines = stripped.split(/\r?\n/).filter((l) => l.length > 0);
  const headers = lines[0]!.split(",");
  const rows = lines.slice(1).map((l) => l.split(","));
  return { headers, rows };
}

describe("exportTeamProtocolCsv", () => {
  it("returns header-only CSV for empty input", () => {
    const csv = exportTeamProtocolCsv([]);
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual([...TEAM_CSV_HEADERS]);
    expect(rows).toEqual([]);
  });

  it("emits one team row plus one row per contributor", () => {
    const csv = exportTeamProtocolCsv([
      team("Alpha", 1, 200, [
        { name: "Ivanov", points: 100, place: 1 },
        { name: "Petrov", points: 100, place: 2 },
      ]),
    ]);
    const { rows } = parseCsv(csv);
    expect(rows).toHaveLength(3);
    // Team summary row
    expect(rows[0]?.[4]).toBe("team");
    expect(rows[0]?.[1]).toBe("Alpha");
    expect(rows[0]?.[2]).toBe("200.00");
    // Contributors
    expect(rows[1]?.[4]).toBe("contributor");
    expect(rows[1]?.[5]).toBe("1");
    expect(rows[1]?.[6]).toBe("Ivanov");
    expect(rows[2]?.[5]).toBe("2");
    expect(rows[2]?.[6]).toBe("Petrov");
  });

  it("preserves team standings order", () => {
    const csv = exportTeamProtocolCsv([
      team("Alpha", 1, 200, [{ name: "I", points: 200, place: 1 }]),
      team("Beta", 2, 150, [{ name: "P", points: 150, place: 2 }]),
    ]);
    const { rows } = parseCsv(csv);
    const teamRows = rows.filter((r) => r[4] === "team");
    expect(teamRows.map((r) => r[1])).toEqual(["Alpha", "Beta"]);
  });

  it("includes UTF-8 BOM", () => {
    const csv = exportTeamProtocolCsv([
      team("Альфа", 1, 100, [{ name: "Иванов", points: 100, place: 1 }]),
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Альфа");
    expect(csv).toContain("Иванов");
  });

  it("formats points to 2 decimals", () => {
    const csv = exportTeamProtocolCsv([
      team("Alpha", 1, 123.456, [{ name: "I", points: 50.5, place: 1 }]),
    ]);
    expect(csv).toContain("123.46");
    expect(csv).toContain("50.50");
  });

  it("athleteCount reflects total team members not just contributors", () => {
    const csv = exportTeamProtocolCsv([
      team("Alpha", 1, 100, [{ name: "Top", points: 100, place: 1 }], 5),
    ]);
    const { rows } = parseCsv(csv);
    expect(rows[0]?.[3]).toBe("5");
  });
});
