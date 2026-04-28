/**
 * team-scoring.ts tests — M1.1.
 *
 * Coverage:
 * - Empty rows → empty standings
 * - One team, one athlete
 * - Two teams, different totals → correct ranking
 * - Top-N cap: team with 5 athletes only counts top 3
 * - Guests excluded
 * - Athletes without team (null, undefined, empty string) excluded
 * - Tie between teams → same place, next place vacant
 * - Team with 0 ISF points → included at bottom
 * - topNPerTeam configurable
 * - Single team with exactly N athletes (no cap needed)
 * - Contributors sorted by points DESC
 * - place assignment sequential after vacancy
 * - athleteCount reflects all team members, not just contributors
 * - Mixed guest + non-guest: guests excluded correctly
 */

import { describe, it, expect } from "vitest";
import { computeTeamScores } from "@logic/isf/team-scoring";
import type { ClassicResultRow } from "@logic/isf/classic-placing";
import { buildClassicEntry } from "./fixtures/builders";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRow(
  name: string,
  team: string | null | undefined,
  isfFinalPoints: number,
  overrides: Partial<ClassicResultRow> = {},
): ClassicResultRow {
  const entry = buildClassicEntry(name, { team: team ?? undefined, guest: overrides.entry?.guest ?? false });
  return {
    entry,
    entryIndex: 0,
    puBest: 0,
    diBest: 0,
    total: 0,
    isfCoefficient: 1,
    isfBasePoints: isfFinalPoints,
    isfAdditionalPoints: 0,
    isfFinalPoints,
    puAttempts: [null, null, null],
    diAttempts: [null, null, null],
    resolvedAgeCategoryCode: null,
    resolvedWeightCategoryCode: null,
    place: 1,
    tiedWithPrev: false,
    vacantNextPlace: false,
    ...overrides,
  };
}

function makeGuestRow(name: string, team: string, isfFinalPoints: number): ClassicResultRow {
  const entry = buildClassicEntry(name, { team, guest: true });
  return {
    entry,
    entryIndex: 0,
    puBest: 0,
    diBest: 0,
    total: 0,
    isfCoefficient: 1,
    isfBasePoints: isfFinalPoints,
    isfAdditionalPoints: 0,
    isfFinalPoints,
    puAttempts: [null, null, null],
    diAttempts: [null, null, null],
    resolvedAgeCategoryCode: null,
    resolvedWeightCategoryCode: null,
    place: null,
    tiedWithPrev: false,
    vacantNextPlace: false,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("computeTeamScores", () => {
  it("returns empty array for empty rows", () => {
    expect(computeTeamScores([])).toEqual([]);
  });

  it("returns empty array when all rows have no team", () => {
    const rows = [
      makeRow("Ivan", null, 10),
      makeRow("Petr", undefined, 8),
      makeRow("Alex", "", 6),
    ];
    expect(computeTeamScores(rows)).toEqual([]);
  });

  it("one team, one athlete → team appears with that athlete's points", () => {
    const rows = [makeRow("Ivan", "СШОР Атлант", 9.5)];
    const result = computeTeamScores(rows);
    expect(result).toHaveLength(1);
    expect(result[0]!.teamName).toBe("СШОР Атлант");
    expect(result[0]!.totalPoints).toBeCloseTo(9.5);
    expect(result[0]!.place).toBe(1);
    expect(result[0]!.contributors).toHaveLength(1);
    expect(result[0]!.contributors[0]!.points).toBeCloseTo(9.5);
  });

  it("two teams, different totals → higher-total team ranked 1st", () => {
    const rows = [
      makeRow("Ivan", "TeamA", 9.0),
      makeRow("Petr", "TeamB", 7.0),
      makeRow("Alex", "TeamA", 8.0),
    ];
    const result = computeTeamScores(rows);
    expect(result).toHaveLength(2);
    expect(result[0]!.teamName).toBe("TeamA");
    expect(result[0]!.place).toBe(1);
    expect(result[1]!.teamName).toBe("TeamB");
    expect(result[1]!.place).toBe(2);
    expect(result[0]!.totalPoints).toBeCloseTo(17.0);
  });

  it("top-N cap: team with 5 athletes only counts top 3 (default N=3)", () => {
    const rows = [
      makeRow("A1", "TeamA", 10),
      makeRow("A2", "TeamA", 9),
      makeRow("A3", "TeamA", 8),
      makeRow("A4", "TeamA", 7),
      makeRow("A5", "TeamA", 6),
    ];
    const result = computeTeamScores(rows);
    expect(result).toHaveLength(1);
    // Top 3: 10 + 9 + 8 = 27
    expect(result[0]!.totalPoints).toBeCloseTo(27);
    expect(result[0]!.contributors).toHaveLength(3);
    expect(result[0]!.athleteCount).toBe(5);
  });

  it("contributors are sorted by points DESC", () => {
    const rows = [
      makeRow("A3", "Team", 5),
      makeRow("A1", "Team", 15),
      makeRow("A2", "Team", 10),
    ];
    const result = computeTeamScores(rows);
    const pts = result[0]!.contributors.map((c) => c.points);
    expect(pts[0]).toBeGreaterThanOrEqual(pts[1]!);
    expect(pts[1]!).toBeGreaterThanOrEqual(pts[2]!);
  });

  it("guests are excluded from team scoring", () => {
    const rows = [
      makeRow("Ivan", "TeamA", 20),
      makeGuestRow("Guest", "TeamA", 100),
    ];
    const result = computeTeamScores(rows);
    expect(result).toHaveLength(1);
    expect(result[0]!.totalPoints).toBeCloseTo(20);
    expect(result[0]!.contributors).toHaveLength(1);
  });

  it("athletes without team (null) are excluded", () => {
    const rows = [
      makeRow("Ivan", "TeamA", 10),
      makeRow("Petr", null, 20),
    ];
    const result = computeTeamScores(rows);
    expect(result).toHaveLength(1);
    expect(result[0]!.teamName).toBe("TeamA");
  });

  it("athletes without team (empty string) are excluded", () => {
    const rows = [
      makeRow("Ivan", "TeamA", 10),
      makeRow("Petr", "", 20),
    ];
    const result = computeTeamScores(rows);
    expect(result).toHaveLength(1);
    expect(result[0]!.teamName).toBe("TeamA");
  });

  it("tie between teams → same place, next place is vacant", () => {
    const rows = [
      makeRow("I", "TeamA", 10),
      makeRow("P", "TeamB", 10),
      makeRow("S", "TeamC", 5),
    ];
    const result = computeTeamScores(rows);
    expect(result).toHaveLength(3);
    const placeA = result.find((r) => r.teamName === "TeamA")!.place;
    const placeB = result.find((r) => r.teamName === "TeamB")!.place;
    const placeC = result.find((r) => r.teamName === "TeamC")!.place;
    expect(placeA).toBe(placeB);  // tied
    expect(placeC).toBe(3);       // vacancy: place 2 is skipped
  });

  it("team with 0 ISF points is included but ranked last", () => {
    const rows = [
      makeRow("I", "TeamA", 10),
      makeRow("P", "TeamB", 0),
    ];
    const result = computeTeamScores(rows);
    expect(result).toHaveLength(2);
    expect(result[0]!.teamName).toBe("TeamA");
    expect(result[1]!.teamName).toBe("TeamB");
    expect(result[1]!.place).toBe(2);
    expect(result[1]!.totalPoints).toBe(0);
  });

  it("topNPerTeam=1 only counts best athlete per team", () => {
    const rows = [
      makeRow("A1", "TeamA", 10),
      makeRow("A2", "TeamA", 9),
      makeRow("B1", "TeamB", 9.5),
    ];
    const result = computeTeamScores(rows, 1);
    const teamA = result.find((r) => r.teamName === "TeamA")!;
    const teamB = result.find((r) => r.teamName === "TeamB")!;
    // TeamA best = 10, TeamB best = 9.5
    expect(teamA.totalPoints).toBeCloseTo(10);
    expect(teamB.totalPoints).toBeCloseTo(9.5);
    expect(teamA.contributors).toHaveLength(1);
    expect(teamA.place).toBe(1);
    expect(teamB.place).toBe(2);
  });

  it("topNPerTeam configurable to 5", () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      makeRow(`A${i}`, "Team", (6 - i) * 2),
    );
    const result = computeTeamScores(rows, 5);
    // Top 5: 12+10+8+6+4 = 40
    expect(result[0]!.contributors).toHaveLength(5);
    expect(result[0]!.totalPoints).toBeCloseTo(40);
  });

  it("single team with exactly N athletes (no cap needed)", () => {
    const rows = [
      makeRow("A", "Team", 8),
      makeRow("B", "Team", 7),
      makeRow("C", "Team", 6),
    ];
    const result = computeTeamScores(rows, 3);
    expect(result[0]!.contributors).toHaveLength(3);
    expect(result[0]!.totalPoints).toBeCloseTo(21);
    expect(result[0]!.athleteCount).toBe(3);
  });

  it("mixed guest and non-guest in same team: only non-guests counted", () => {
    const rows = [
      makeRow("Ivan", "TeamA", 5),
      makeGuestRow("GuestHigh", "TeamA", 99),
    ];
    const result = computeTeamScores(rows);
    expect(result[0]!.athleteCount).toBe(1);
    expect(result[0]!.totalPoints).toBeCloseTo(5);
  });

  it("three teams tied → all at place 1, 4th team at place 4", () => {
    const rows = [
      makeRow("I", "T1", 10),
      makeRow("P", "T2", 10),
      makeRow("S", "T3", 10),
      makeRow("K", "T4", 5),
    ];
    const result = computeTeamScores(rows);
    const tied = result.filter((r) => r.place === 1);
    const last = result.find((r) => r.teamName === "T4")!;
    expect(tied).toHaveLength(3);
    expect(last.place).toBe(4);
  });
});
