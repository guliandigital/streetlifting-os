/**
 * Forecast service — V1 stub per D16 (decisions-v2).
 *
 * The interface is locked from V1 so that V2's full projection implementation
 * is a drop-in replacement (no schema migration). V1 always returns nulls for
 * all four columns; UI hides forecast columns by default (per blueprint v2 §11.6).
 *
 * V2 plan:
 *   - predictedPlace: project all entries' "expected best" (from declared next
 *     attempts) and rank.
 *   - kgToFirstPlace: difference between current leader's projected total and
 *     this athlete's projected total.
 *   - predictedAbsolutePlace: project across all weight categories.
 *   - predictedCoefficient: ISF points based on projected total.
 */

import type { Entry, ForecastResult } from "@domain/models";

export interface ForecastService {
  forecast(entry: Entry, allEntries: ReadonlyArray<Entry>): ForecastResult;
}

export class StubForecastService implements ForecastService {
  forecast(_entry: Entry, _allEntries: ReadonlyArray<Entry>): ForecastResult {
    return {
      predictedPlace: null,
      kgToFirstPlace: null,
      predictedAbsolutePlace: null,
      predictedCoefficient: null,
    };
  }
}
