import { describe, expect, it } from "vitest";

import {
  computeSportRankAchievement,
  computeSportRankAchievements,
} from "@logic/isf/sport-rank";
import type {
  SportRankEvaluationInput,
  SportRankStandard,
} from "@domain/models";
import { ISF_V51_RULES_PACK } from "@domain/presets";

const standards: SportRankStandard[] = [
  {
    code: "rank_1",
    label: "Rank 1",
    labelRu: "1 разряд",
    priority: 10,
    metric: "classic_total_kg",
    minValue: 100,
    disciplineCodes: ["classic_2lift"],
    sex: "F",
    divisions: ["amateur"],
    ageCategoryCodes: ["open"],
    weightCategoryCodes: ["F_60"],
  },
  {
    code: "kms",
    label: "Candidate Master of Sport",
    labelRu: "КМС",
    priority: 20,
    metric: "classic_total_kg",
    minValue: 130,
    disciplineCodes: ["classic_2lift"],
    sex: "F",
    divisions: ["amateur"],
    ageCategoryCodes: ["open"],
    weightCategoryCodes: ["F_60"],
  },
  {
    code: "ms_by_points",
    label: "Master of Sport",
    labelRu: "МС",
    priority: 30,
    metric: "classic_isf_points",
    minValue: 95,
    disciplineCodes: ["classic_2lift"],
    sex: "F",
  },
  {
    code: "multirep_rank",
    label: "Multirep Rank",
    labelRu: "Многоповторный разряд",
    priority: 10,
    metric: "multirep_total_reps",
    minValue: 40,
    disciplineCodes: ["multirep_2lift_16_24"],
  },
];

const baseInput: SportRankEvaluationInput = {
  disciplineCode: "classic_2lift",
  sex: "F",
  division: "amateur",
  ageCategoryCode: "open",
  weightCategoryCode: "F_60",
  metricValues: {
    classic_total_kg: 135,
    classic_isf_points: 90,
  },
};

describe("computeSportRankAchievement", () => {
  it("returns the highest-priority achieved standard", () => {
    const result = computeSportRankAchievement(baseInput, standards);
    expect(result?.standard.code).toBe("kms");
    expect(result?.achievedValue).toBe(135);
  });

  it("can evaluate points-based standards independently from total kg", () => {
    const result = computeSportRankAchievement(
      {
        ...baseInput,
        metricValues: {
          classic_total_kg: 135,
          classic_isf_points: 96,
        },
      },
      standards,
    );
    expect(result?.standard.code).toBe("ms_by_points");
  });

  it("returns null when no standard threshold is achieved", () => {
    const result = computeSportRankAchievement(
      {
        ...baseInput,
        metricValues: { classic_total_kg: 99 },
      },
      standards,
    );
    expect(result).toBeNull();
  });

  it("does not match standards for another weight category", () => {
    const result = computeSportRankAchievement(
      {
        ...baseInput,
        weightCategoryCode: "F_67_5",
        metricValues: { classic_total_kg: 135 },
      },
      standards,
    );
    expect(result).toBeNull();
  });

  it("supports batch evaluation", () => {
    const results = computeSportRankAchievements(
      [
        baseInput,
        {
          ...baseInput,
          disciplineCode: "multirep_2lift_16_24",
          metricValues: { multirep_total_reps: 45 },
        },
      ],
      standards,
    );
    expect(results.map((result) => result?.standard.code)).toEqual([
      "kms",
      "multirep_rank",
    ]);
  });

  it("does not ship fabricated ISF standards in the built-in pack", () => {
    expect(ISF_V51_RULES_PACK.sportRankStandards).toEqual([]);
  });
});
