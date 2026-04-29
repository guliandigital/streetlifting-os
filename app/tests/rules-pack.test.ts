import { describe, expect, it } from "vitest";

import {
  BUILTIN_RULES_PACKS,
  ISF_V51_DISCIPLINES,
  ISF_V51_RULES_PACK,
  ISF_V51_RULES_PACK_REF,
  resolveBuiltinRulesPack,
} from "@domain/presets";

describe("built-in RulesPacks", () => {
  it("ships ISF v5.1 as a built-in pack", () => {
    expect(BUILTIN_RULES_PACKS).toContain(ISF_V51_RULES_PACK);
    expect(ISF_V51_RULES_PACK).toMatchObject({
      id: "isf:5.1",
      federation: "ISF",
      version: "5.1",
      source: "builtin",
      signature: null,
    });
  });

  it("pins meet refs without copying the full pack", () => {
    expect(ISF_V51_RULES_PACK_REF).toEqual({
      id: ISF_V51_RULES_PACK.id,
      federation: ISF_V51_RULES_PACK.federation,
      version: ISF_V51_RULES_PACK.version,
      source: "builtin",
      sha256: null,
      signature: null,
    });
  });

  it("wraps the existing ISF discipline catalog", () => {
    expect(ISF_V51_RULES_PACK.disciplines).toHaveLength(
      ISF_V51_DISCIPLINES.length,
    );
    expect(ISF_V51_RULES_PACK.defaults.enabledDisciplineCodes).toEqual([
      "classic_2lift",
      "classic_pu",
      "classic_di",
    ]);
  });

  it("resolves built-in packs by id", () => {
    expect(resolveBuiltinRulesPack("isf:5.1")).toBe(ISF_V51_RULES_PACK);
    expect(resolveBuiltinRulesPack("unknown:1")).toBeNull();
  });
});
