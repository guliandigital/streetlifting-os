/**
 * Forecast service stub tests — Sprint 1 item 10 (D16).
 *
 * V1 stub returns nulls for all forecast fields. Tests lock in the interface
 * shape so V2's full implementation is a drop-in replacement.
 */

import { describe, it, expect } from "vitest";
import { StubForecastService } from "@logic/isf/forecast";
import { buildClassicEntry } from "./fixtures/builders";

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
