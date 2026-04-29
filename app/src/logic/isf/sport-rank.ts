/**
 * Sport-rank computation.
 *
 * This service evaluates already-computed result metrics against a standards
 * table. It does not embed federation norms; those belong in RulesPack data.
 */

import type {
  SportRankAchievement,
  SportRankEvaluationInput,
  SportRankStandard,
} from "@domain/models";

function includesOrAll<T>(allowed: ReadonlyArray<T> | undefined, value: T): boolean {
  return allowed === undefined || allowed.includes(value);
}

function nullableIncludesOrAll<T>(
  allowed: ReadonlyArray<T> | undefined,
  value: T | null,
): boolean {
  return allowed === undefined || (value !== null && allowed.includes(value));
}

function standardApplies(
  standard: SportRankStandard,
  input: SportRankEvaluationInput,
): boolean {
  return (
    includesOrAll(standard.disciplineCodes, input.disciplineCode) &&
    (standard.sex === undefined || standard.sex === input.sex) &&
    includesOrAll(standard.divisions, input.division) &&
    nullableIncludesOrAll(standard.ageCategoryCodes, input.ageCategoryCode) &&
    nullableIncludesOrAll(standard.weightCategoryCodes, input.weightCategoryCode)
  );
}

export function computeSportRankAchievement(
  input: SportRankEvaluationInput,
  standards: ReadonlyArray<SportRankStandard>,
): SportRankAchievement | null {
  const matches: SportRankAchievement[] = [];

  for (const standard of standards) {
    if (!standardApplies(standard, input)) continue;
    const achievedValue = input.metricValues[standard.metric];
    if (achievedValue === undefined || achievedValue < standard.minValue) {
      continue;
    }
    matches.push({ standard, achievedValue });
  }

  matches.sort((a, b) => {
    if (b.standard.priority !== a.standard.priority) {
      return b.standard.priority - a.standard.priority;
    }
    return b.standard.minValue - a.standard.minValue;
  });

  return matches[0] ?? null;
}

export function computeSportRankAchievements(
  inputs: ReadonlyArray<SportRankEvaluationInput>,
  standards: ReadonlyArray<SportRankStandard>,
): Array<SportRankAchievement | null> {
  return inputs.map((input) => computeSportRankAchievement(input, standards));
}
