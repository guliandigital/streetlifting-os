/**
 * RulesPack — versioned federation rules/runtime artifact.
 *
 * V2 starts with built-in packs only. Signature fields are part of the shape so
 * backend/external pack loading can be added without another domain rewrite.
 */

import type { AgeCategoryCode, AgeCategory } from "./age-category";
import type { Discipline } from "./discipline";
import type { Division } from "./enums";
import type { ClassicLoadConfig, MultirepConfig, ScoringFormula } from "./meet-state";
import type { WeightCategory } from "./weight-category";

export type RulesPackId = `${string}:${string}`;

export type RulesPackCompatibility = {
  minStateVersion: string;
  maxStateVersion: string;
};

export type RulesPackSignature = {
  algorithm: "ed25519";
  keyId: string;
  signature: string;
} | null;

export type RulesPackRef = {
  id: RulesPackId;
  federation: string;
  version: string;
  source: "builtin" | "external";
  sha256: string | null;
  signature: RulesPackSignature;
};

export type RulesPack = RulesPackRef & {
  title: string;
  compatibility: RulesPackCompatibility;
  defaults: {
    competitionFormat: "classic" | "multirep" | "weighted_calisthenics";
    enabledDisciplineCodes: string[];
    divisions: Division[];
    formula: ScoringFormula;
    useMastersAdjustment: boolean;
    lowerBodyweightFirstTiebreak: boolean;
    inKg: true;
    showAlternateUnits: boolean;
  };
  disciplines: ReadonlyArray<Discipline>;
  ageCategories: ReadonlyArray<AgeCategory>;
  weightCategories: ReadonlyArray<WeightCategory>;
  classicLoadConfig: ClassicLoadConfig;
  multirepConfig: MultirepConfig;
  scoring: {
    mastersMultipliers: Partial<Record<AgeCategoryCode, number>>;
  };
};
