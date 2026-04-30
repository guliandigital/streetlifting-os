/**
 * Team protocol CSV export.
 *
 * Emits one row per team in standings order, plus expanded contributor
 * rows (one per scoring athlete) so federations can re-build the
 * scoring chain in their own systems without re-implementing the
 * top-N algorithm.
 *
 * UTF-8 with BOM so Excel on Windows reads Cyrillic correctly.
 */

import Papa from "papaparse";
import type { TeamScore } from "@logic/isf/team-scoring";

const UTF8_BOM = "﻿";

export const TEAM_CSV_HEADERS = [
  "place",
  "team",
  "totalPoints",
  "athleteCount",
  "rowType",
  "contributorRank",
  "contributorName",
  "contributorPlace",
  "contributorPoints",
] as const;

type TeamCsvRow = Record<(typeof TEAM_CSV_HEADERS)[number], string>;

function summaryRow(ts: TeamScore): TeamCsvRow {
  return {
    place: String(ts.place),
    team: ts.teamName,
    totalPoints: ts.totalPoints.toFixed(2),
    athleteCount: String(ts.athleteCount),
    rowType: "team",
    contributorRank: "",
    contributorName: "",
    contributorPlace: "",
    contributorPoints: "",
  };
}

function contributorRow(
  ts: TeamScore,
  contributor: TeamScore["contributors"][number],
  rank: number,
): TeamCsvRow {
  return {
    place: String(ts.place),
    team: ts.teamName,
    totalPoints: ts.totalPoints.toFixed(2),
    athleteCount: String(ts.athleteCount),
    rowType: "contributor",
    contributorRank: String(rank),
    contributorName: contributor.entry.name,
    contributorPlace: contributor.place !== null ? String(contributor.place) : "",
    contributorPoints: contributor.points.toFixed(2),
  };
}

export function exportTeamProtocolCsv(
  teamScores: ReadonlyArray<TeamScore>,
): string {
  if (teamScores.length === 0) {
    return UTF8_BOM + Papa.unparse({ fields: [...TEAM_CSV_HEADERS], data: [] });
  }

  const rows: TeamCsvRow[] = [];
  for (const ts of teamScores) {
    rows.push(summaryRow(ts));
    ts.contributors.forEach((c, idx) => {
      rows.push(contributorRow(ts, c, idx + 1));
    });
  }

  const csv = Papa.unparse({ fields: [...TEAM_CSV_HEADERS], data: rows });
  return UTF8_BOM + csv;
}
