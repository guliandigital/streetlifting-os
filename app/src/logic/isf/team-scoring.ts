/**
 * Team scoring — pure service, no Redux, no UI.
 *
 * Aggregates Classic result rows by team, applying the standard federation
 * top-N scoring algorithm (ISF team scoring).
 *
 * Algorithm:
 *   - Each non-guest athlete with a non-empty entry.team contributes their
 *     isfFinalPoints to their team total.
 *   - Only the top N athletes per team count (default N = 3).
 *   - Teams ranked by totalPoints DESC.
 *   - Ties: same place, next place vacant.
 *   - Minimum 1 athlete to appear in standings.
 *   - Athletes without a team (null | undefined | "") are excluded.
 */

import type { Entry } from "@domain/models";
import type { ClassicResultRow } from "./classic-placing";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TeamScore = {
  teamName: string;
  totalPoints: number;
  athleteCount: number;
  /** Individual contributing rows (sorted by points DESC, capped at TOP_N_PER_TEAM). */
  contributors: Array<{
    entry: Entry;
    points: number;
    place: number | null;
  }>;
  place: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasTeam(teamName: string | null | undefined): teamName is string {
  return typeof teamName === "string" && teamName.trim().length > 0;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute team standings from Classic result rows.
 *
 * @param rows       Classic result rows (from computeClassicRows / groupByCategory)
 * @param topNPerTeam  How many athletes per team contribute to the total (default 3)
 */
export function computeTeamScores(
  rows: readonly ClassicResultRow[],
  topNPerTeam: number = 3,
): TeamScore[] {
  // 1. Collect per-team contributors (non-guest, non-empty team)
  const teamMap = new Map<string, Array<{ entry: Entry; points: number; place: number | null }>>();

  for (const row of rows) {
    if (row.entry.guest) continue;
    if (!hasTeam(row.entry.team)) continue;

    const team = row.entry.team.trim();
    if (!teamMap.has(team)) teamMap.set(team, []);
    teamMap.get(team)!.push({
      entry: row.entry,
      points: row.isfFinalPoints,
      place: row.place,
    });
  }

  if (teamMap.size === 0) return [];

  // 2. For each team: sort contributors by points DESC, cap at topNPerTeam
  const teamScores: Omit<TeamScore, "place">[] = [];

  for (const [teamName, contributors] of teamMap.entries()) {
    contributors.sort((a, b) => b.points - a.points);
    const capped = contributors.slice(0, topNPerTeam);
    const totalPoints = capped.reduce((sum, c) => sum + c.points, 0);

    teamScores.push({
      teamName,
      totalPoints,
      athleteCount: contributors.length,
      contributors: capped,
    });
  }

  // 3. Sort by totalPoints DESC, then teamName ASC as stable tie-break
  teamScores.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return a.teamName.localeCompare(b.teamName);
  });

  // 4. Assign places with tie + vacancy logic.
  // Use a separate places array to avoid counting uninitialized entries.
  const places: number[] = Array.from({ length: teamScores.length }, () => 0);

  for (let i = 0; i < teamScores.length; i++) {
    if (i === 0) {
      places[i] = 1;
    } else {
      const prevPts = teamScores[i - 1]!.totalPoints;
      const curPts = teamScores[i]!.totalPoints;
      if (curPts === prevPts) {
        places[i] = places[i - 1]!;
      } else {
        // Count how many entries share the previous place (all assigned so far)
        const prevPlace = places[i - 1]!;
        let countAtPrevPlace = 0;
        for (let j = 0; j < i; j++) {
          if (places[j] === prevPlace) countAtPrevPlace++;
        }
        places[i] = prevPlace + countAtPrevPlace;
      }
    }
  }

  const result: TeamScore[] = teamScores.map((ts, i) => ({ ...ts, place: places[i]! }));

  return result;
}
