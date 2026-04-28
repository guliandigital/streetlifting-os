/**
 * Forecast service tests — Sprint 1 stub + Sprint 6 ClassicForecastService.
 *
 * StubForecastService: V1 stub returns nulls for all forecast fields.
 * ClassicForecastService: real implementation using current totals.
 */

import { describe, it, expect } from "vitest";
import { StubForecastService, ClassicForecastService } from "@logic/isf/forecast";
import {
  buildClassicEntry,
  buildMultirepEntry,
  classicAttempt,
  classicExercise,
  VOTES_GOOD,
} from "./fixtures/builders";

// ─── StubForecastService ─────────────────────────────────────────────────────

describe("StubForecastService", () => {
  const svc = new StubForecastService();

  it("returns all-null ForecastResult for any entry", () => {
    const e = buildClassicEntry("Anyone");
    const f = svc.forecast(e, []);
    expect(f).toEqual({
      predictedPlace: null,
      kgToFirstPlace: null,
      predictedAbsolutePlace: null,
      predictedCoefficient: null,
    });
  });

  it("ignores allEntries argument in V1 stub", () => {
    const e1 = buildClassicEntry("E1");
    const e2 = buildClassicEntry("E2");
    const e3 = buildClassicEntry("E3");
    const f = svc.forecast(e1, [e1, e2, e3]);
    expect(f.predictedPlace).toBeNull();
  });
});

// ─── ClassicForecastService ───────────────────────────────────────────────────

const MEET_DATE = "2026-04-27";

function withPuDi(name: string, puKg: number, diKg: number, overrides = {}) {
  return buildClassicEntry(name, {
    ...overrides,
    exercises: {
      PU: classicExercise("PU", [
        classicAttempt(1, puKg, VOTES_GOOD),
      ]),
      DI: classicExercise("DI", [
        classicAttempt(1, diKg, VOTES_GOOD),
      ]),
    },
  });
}

describe("ClassicForecastService", () => {
  const svc = new ClassicForecastService(MEET_DATE);

  // 1. Single entry, no attempts → place=1, all else null/0
  it("single entry with no attempts: place=1, coefficient=null, kgToFirstPlace=0", () => {
    const e = buildClassicEntry("Solo");
    const f = svc.forecast(e, [e]);
    expect(f.predictedPlace).toBe(1);
    expect(f.kgToFirstPlace).toBe(0);
    expect(f.predictedCoefficient).toBeNull();
  });

  // 2. Two entries: entry with higher total gets place=1
  it("leader (higher total) gets place=1", () => {
    const leader = withPuDi("Leader", 100, 80);
    const trailer = withPuDi("Trailer", 70, 60);
    const all = [leader, trailer];
    const f = svc.forecast(leader, all);
    expect(f.predictedPlace).toBe(1);
  });

  it("trailer (lower total) gets place=2", () => {
    const leader = withPuDi("Leader", 100, 80);
    const trailer = withPuDi("Trailer", 70, 60);
    const all = [leader, trailer];
    const f = svc.forecast(trailer, all);
    expect(f.predictedPlace).toBe(2);
  });

  // 3. Tiebreak: same total, lighter BW gets better place
  it("tiebreak: lighter BW athlete ranks ahead", () => {
    const lighter = withPuDi("Lighter", 80, 80, { bodyweightKg: 70 });
    const heavier = withPuDi("Heavier", 80, 80, { bodyweightKg: 85 });
    const all = [lighter, heavier];
    const fLighter = svc.forecast(lighter, all);
    const fHeavier = svc.forecast(heavier, all);
    expect(fLighter.predictedPlace).toBe(1);
    expect(fHeavier.predictedPlace).toBe(2);
  });

  // 4. kgToFirstPlace: leader gets 0, trailer gets delta
  it("leader kgToFirstPlace=0", () => {
    const leader = withPuDi("Leader", 100, 80);
    const trailer = withPuDi("Trailer", 70, 60);
    const f = svc.forecast(leader, [leader, trailer]);
    expect(f.kgToFirstPlace).toBe(0);
  });

  it("trailer kgToFirstPlace = leaderTotal - trailerTotal + 1.25", () => {
    const leader = withPuDi("Leader", 100, 80); // total=180
    const trailer = withPuDi("Trailer", 70, 60); // total=130
    const f = svc.forecast(trailer, [leader, trailer]);
    // leader total=180, trailer total=130 → 180-130+1.25=51.25
    expect(f.kgToFirstPlace).toBeCloseTo(51.25);
  });

  // 5. Guest entry → predictedPlace null
  it("guest entry → predictedPlace=null, kgToFirstPlace=null", () => {
    const guest = withPuDi("Guest", 100, 80, { guest: true });
    const normal = withPuDi("Normal", 80, 60);
    const f = svc.forecast(guest, [guest, normal]);
    expect(f.predictedPlace).toBeNull();
    expect(f.kgToFirstPlace).toBeNull();
  });

  // 6. predictedCoefficient: non-null when total > 0
  it("predictedCoefficient is non-null when total > 0", () => {
    const e = withPuDi("Athlete", 80, 70);
    const f = svc.forecast(e, [e]);
    expect(f.predictedCoefficient).not.toBeNull();
    expect(f.predictedCoefficient).toBeGreaterThan(0);
  });

  // 7. Multirep entry → returns null forecast
  it("multirep entry → returns all-null forecast", () => {
    const mr = buildMultirepEntry("MultirepAthlete");
    const f = svc.forecast(mr, [mr]);
    expect(f).toEqual({
      predictedPlace: null,
      kgToFirstPlace: null,
      predictedAbsolutePlace: null,
      predictedCoefficient: null,
    });
  });

  // 8. Three entries: middle entry place=2
  it("three entries: middle-total entry gets place=2", () => {
    const first = withPuDi("First", 100, 80);  // total=180
    const second = withPuDi("Second", 90, 70); // total=160
    const third = withPuDi("Third", 70, 60);   // total=130
    const all = [first, second, third];
    const f = svc.forecast(second, all);
    expect(f.predictedPlace).toBe(2);
  });

  // 9. Entry with total=0 → place is last
  it("entry with total=0 → placed last", () => {
    const withResult = withPuDi("HasResult", 80, 70);
    const noResult = buildClassicEntry("NoResult");
    const all = [withResult, noResult];
    const f = svc.forecast(noResult, all);
    expect(f.predictedPlace).toBe(2);
  });

  // 10. predictedAbsolutePlace: single entry → place=1
  it("predictedAbsolutePlace: single entry with total > 0 → place=1", () => {
    const e = withPuDi("Solo", 80, 70);
    const f = svc.forecast(e, [e]);
    expect(f.predictedAbsolutePlace).toBe(1);
  });

  // 11. predictedAbsolutePlace: two entries with different ISF points
  it("predictedAbsolutePlace: higher ISF points → absPlace=1", () => {
    // Female lighter athletes tend to get higher ISF coefficient
    const strong = withPuDi("Strong", 100, 90, { sex: "M", bodyweightKg: 80 }); // total=190
    const weak = withPuDi("Weak", 60, 50, { sex: "M", bodyweightKg: 80 });     // total=110
    const all = [strong, weak];
    const fStrong = svc.forecast(strong, all);
    const fWeak = svc.forecast(weak, all);
    expect(fStrong.predictedAbsolutePlace).toBe(1);
    expect(fWeak.predictedAbsolutePlace).toBe(2);
  });
});
