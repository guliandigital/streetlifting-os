/**
 * Built-in RulesPacks.
 *
 * ISF v5.1 is the V1 baseline pack. It wraps the existing hardcoded presets in
 * a versioned artifact so V2 can pin a meet to exact federation rules.
 */

import type { RulesPack, RulesPackRef } from "../models";
import {
  ISF_V51_AGE_CATEGORIES,
  ISF_V51_MASTERS_MULTIPLIERS,
} from "./age-categories";
import { ISF_V51_DISCIPLINES } from "./disciplines";
import { ISF_V51_MULTIREP_PRESETS } from "./multirep-loads";
import { ISF_V51_DEFAULT_PLATES } from "./plates";
import { ISF_V51_WEIGHT_CATEGORIES } from "./weight-categories";

export const ISF_V51_RULES_PACK_REF: RulesPackRef = {
  id: "isf:5.1",
  federation: "ISF",
  version: "5.1",
  source: "builtin",
  sha256: null,
  signature: null,
};

export const ISF_V51_RULES_PACK: RulesPack = {
  ...ISF_V51_RULES_PACK_REF,
  title: "International Streetlifting Federation Rules v5.1",
  compatibility: {
    minStateVersion: "4",
    maxStateVersion: "4",
  },
  defaults: {
    competitionFormat: "classic",
    enabledDisciplineCodes: ["classic_2lift", "classic_pu", "classic_di"],
    divisions: ["amateur", "pro"],
    formula: "ISF_POINTS",
    useMastersAdjustment: true,
    lowerBodyweightFirstTiebreak: true,
    inKg: true,
    showAlternateUnits: false,
  },
  disciplines: ISF_V51_DISCIPLINES,
  ageCategories: ISF_V51_AGE_CATEGORIES,
  weightCategories: ISF_V51_WEIGHT_CATEGORIES,
  classicLoadConfig: {
    useBeltLoading: true,
    plates: [...ISF_V51_DEFAULT_PLATES],
    defaultAttemptDurationSec: 60,
  },
  multirepConfig: {
    defaultAttemptDurationSec: 120,
    presetLoads: [...ISF_V51_MULTIREP_PRESETS],
  },
  scoring: {
    mastersMultipliers: Object.fromEntries(ISF_V51_MASTERS_MULTIPLIERS),
  },
};

export const BUILTIN_RULES_PACKS: ReadonlyArray<RulesPack> = [
  ISF_V51_RULES_PACK,
];

export function resolveBuiltinRulesPack(id: string): RulesPack | null {
  return BUILTIN_RULES_PACKS.find((pack) => pack.id === id) ?? null;
}
