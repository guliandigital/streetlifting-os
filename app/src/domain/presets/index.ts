/**
 * ISF v5.1 presets — V1 hardcoded.
 *
 * Per D32 (decisions-v3): in V2 these constants are extracted into a `RulesPack`
 * and shipped versioned. V1 ships them as TS constants but typed against the
 * domain shape so the V2 refactor is mechanical.
 */

export {
  ISF_V51_AGE_CATEGORIES,
  ISF_V51_MASTERS_MULTIPLIERS,
} from "./age-categories";
export { ISF_V51_WEIGHT_CATEGORIES } from "./weight-categories";
export { ISF_V51_DISCIPLINES } from "./disciplines";
export {
  ISF_V51_DEFAULT_PLATES,
  ISF_V51_PLATE_INCREMENT_KG,
} from "./plates";
export { ISF_V51_MULTIREP_PRESETS } from "./multirep-loads";
export {
  ISF_V51_BW_LIMITS,
  additionalPoints,
  type BodyweightLimits,
} from "./bodyweight-limits";
export { ISF_V51_TIMER_DEFAULTS } from "./timer-defaults";
export {
  BUILTIN_RULES_PACKS,
  ISF_V51_RULES_PACK,
  ISF_V51_RULES_PACK_REF,
  resolveBuiltinRulesPack,
} from "./rules-packs";
