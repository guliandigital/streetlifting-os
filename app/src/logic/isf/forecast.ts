/**
 * Forecast service — V2 ClassicForecastService (real implementation) + V1 StubForecastService.
 *
 * ClassicForecastService: projects current totals to compute predicted place,
 * kg-to-first-place, predicted absolute place (by ISF points), and predicted
 * ISF coefficient.
 *
 * StubForecastService: used for non-classic formats (Multirep) — returns all-null.
 */

import type { Entry, ForecastResult } from "@domain/models";
import { getClassicBest } from "./result";
import { IsfPointsService } from "./points";

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

export class ClassicForecastService implements ForecastService {
  constructor(private meetDate: string) {}

  forecast(entry: Entry, allEntries: ReadonlyArray<Entry>): ForecastResult {
    // Only works for classic format
    if (entry.competitionFormat !== "classic") return nullForecast();

    // Current result
    const pu = getClassicBest(entry, "PU");
    const di = getClassicBest(entry, "DI");
    const total = pu + di;

    // ISF coefficient on current total
    const svc = new IsfPointsService();
    const pts = total > 0 ? svc.calculate(entry, entry.event, this.meetDate) : null;
    const predictedCoefficient = pts?.finalPoints ?? null;

    // Find same-group entries (same sex, same assignedWeightCategoryCode, classic format, non-guest)
    const sameGroup = allEntries.filter(
      (e) =>
        e !== entry &&
        e.competitionFormat === "classic" &&
        !e.guest &&
        e.sex === entry.sex &&
        (e.assignedWeightCategoryCode ?? null) ===
          (entry.assignedWeightCategoryCode ?? null),
    );

    // Predicted place: rank by total DESC (tiebreak BW ASC)
    const entryTotal = total;
    const entryBW = entry.bodyweightKg ?? 0;
    let predictedPlace: number | null = null;
    if (!entry.guest) {
      let place = 1;
      for (const other of sameGroup) {
        const otherPu = getClassicBest(other, "PU");
        const otherDi = getClassicBest(other, "DI");
        const otherTotal = otherPu + otherDi;
        const otherBW = other.bodyweightKg ?? 0;
        if (
          otherTotal > entryTotal ||
          (otherTotal === entryTotal && otherBW < entryBW)
        ) {
          place++;
        }
      }
      predictedPlace = place;
    }

    // kg to first place: how much more total this entry needs to beat the leader
    const groupTotals = sameGroup
      .filter((e) => !e.guest)
      .map((e) => getClassicBest(e, "PU") + getClassicBest(e, "DI"));
    const leaderTotal =
      groupTotals.length > 0 ? Math.max(...groupTotals) : 0;
    const kgToFirstPlace =
      total >= leaderTotal ? 0 : leaderTotal - total + 1.25; // +1.25 = minimum needed to beat

    // Predicted absolute place (by ISF finalPoints across all non-guest classic entries)
    const allClassicNonGuest = allEntries.filter(
      (e) => e.competitionFormat === "classic" && !e.guest,
    );
    let predictedAbsolutePlace: number | null = null;
    if (!entry.guest && predictedCoefficient !== null) {
      let absPlace = 1;
      for (const other of allClassicNonGuest) {
        if (other === entry) continue;
        const otherPts =
          getClassicBest(other, "PU") + getClassicBest(other, "DI") > 0
            ? svc.calculate(other, other.event, this.meetDate).finalPoints
            : 0;
        if (otherPts > predictedCoefficient) absPlace++;
      }
      predictedAbsolutePlace = absPlace;
    }

    return {
      predictedPlace,
      kgToFirstPlace: entry.guest ? null : kgToFirstPlace,
      predictedAbsolutePlace,
      predictedCoefficient,
    };
  }
}

function nullForecast(): ForecastResult {
  return {
    predictedPlace: null,
    kgToFirstPlace: null,
    predictedAbsolutePlace: null,
    predictedCoefficient: null,
  };
}
