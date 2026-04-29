/**
 * Medal-count summary tests.
 */

import { describe, it, expect } from "vitest";
import { buildMedalCountReport } from "@logic/reports/medal-count";
import type { ClassicResultGroup, ClassicResultRow } from "@logic/isf/classic-placing";
import { buildClassicEntry } from "./fixtures/builders";

function row(
  name: string,
  place: number | null,
  team: string | null,
  country: string | null,
  guest = false,
): ClassicResultRow {
  return {
    entry: buildClassicEntry(name, {
      team: team ?? undefined,
      country,
      guest,
    }),
    entryIndex: 0,
    puBest: 0,
    diBest: 0,
    total: 0,
    isfCoefficient: 1,
    isfBasePoints: 0,
    isfAdditionalPoints: 0,
    isfFinalPoints: 0,
    puAttempts: [null, null, null],
    diAttempts: [null, null, null],
    resolvedAgeCategoryCode: null,
    resolvedWeightCategoryCode: null,
    place,
    tiedWithPrev: false,
    vacantNextPlace: false,
  };
}

function group(rows: ClassicResultRow[]): ClassicResultGroup {
  return {
    sex: "M",
    ageCategoryCode: "open",
    weightCategoryCode: "m_80",
    label: "M · Open · 80",
    rows,
  };
}

describe("buildMedalCountReport", () => {
  it("returns empty buckets for empty groups", () => {
    const r = buildMedalCountReport([], []);
    expect(r.byTeam).toEqual([]);
    expect(r.byCountry).toEqual([]);
  });

  it("counts gold/silver/bronze per team", () => {
    const g = group([
      row("A", 1, "Alpha", "RU"),
      row("B", 2, "Alpha", "RU"),
      row("C", 3, "Beta", "RU"),
    ]);
    const r = buildMedalCountReport([g], []);
    expect(r.byTeam).toHaveLength(2);
    const alpha = r.byTeam.find((x) => x.label === "Alpha")!;
    expect(alpha.gold).toBe(1);
    expect(alpha.silver).toBe(1);
    expect(alpha.bronze).toBe(0);
    expect(alpha.total).toBe(2);
  });

  it("excludes guests", () => {
    const g = group([
      row("A", 1, "Alpha", "RU", true),
      row("B", 2, "Alpha", "RU"),
    ]);
    const r = buildMedalCountReport([g], []);
    const alpha = r.byTeam.find((x) => x.label === "Alpha")!;
    expect(alpha.gold).toBe(0);
    expect(alpha.silver).toBe(1);
  });

  it("excludes absolute group (sex=null && ageCategoryCode=null)", () => {
    const absolute: ClassicResultGroup = {
      sex: null,
      ageCategoryCode: null,
      weightCategoryCode: null,
      label: "Absolute",
      rows: [row("A", 1, "Alpha", "RU")],
    };
    const r = buildMedalCountReport([absolute], []);
    expect(r.byTeam).toHaveLength(0);
  });

  it("ranks by gold DESC then silver DESC then bronze DESC", () => {
    const g = group([
      row("A", 1, "Alpha", "RU"),
      row("B", 1, "Beta", "RU"),
      row("C", 2, "Beta", "RU"),
      row("D", 3, "Beta", "RU"),
    ]);
    const r = buildMedalCountReport([g], []);
    // Alpha: 1G 0S 0B; Beta: 1G 1S 1B → Beta should rank above Alpha (more silver)
    expect(r.byTeam[0]!.label).toBe("Beta");
    expect(r.byTeam[0]!.place).toBe(1);
    expect(r.byTeam[1]!.label).toBe("Alpha");
    expect(r.byTeam[1]!.place).toBe(2);
  });

  it("places tied teams at same place with vacancy", () => {
    const g = group([
      row("A", 1, "Alpha", "RU"),
      row("B", 1, "Beta", "RU"),
      row("C", 2, "Gamma", "RU"),
    ]);
    const r = buildMedalCountReport([g], []);
    // Alpha and Beta both 1G 0S 0B → tied at 1; Gamma 0G 1S 0B → 3rd
    const places = r.byTeam.map((x) => ({ label: x.label, place: x.place }));
    const alpha = places.find((p) => p.label === "Alpha")!;
    const beta = places.find((p) => p.label === "Beta")!;
    const gamma = places.find((p) => p.label === "Gamma")!;
    expect(alpha.place).toBe(beta.place);
    expect(gamma.place).toBe(alpha.place + 2);
  });

  it("groups athletes without a team under the unaffiliated marker", () => {
    const g = group([
      row("A", 1, null, "RU"),
      row("B", 2, "", "RU"),
    ]);
    const r = buildMedalCountReport([g], []);
    expect(r.byTeam.length).toBe(1);
    expect(r.byTeam[0]!.label).toBe("—");
    expect(r.byTeam[0]!.gold + r.byTeam[0]!.silver).toBe(2);
  });

  it("counts countries independently from teams", () => {
    const g = group([
      row("A", 1, "Alpha", "RU"),
      row("B", 2, "Beta", "BY"),
    ]);
    const r = buildMedalCountReport([g], []);
    expect(r.byCountry.find((x) => x.label === "RU")!.gold).toBe(1);
    expect(r.byCountry.find((x) => x.label === "BY")!.silver).toBe(1);
  });
});
