import { describe, expect, it } from "vitest";

import { buildImportDuplicatePlan } from "@logic/isf/import-duplicates";
import type { ImportedEntryDraft } from "@logic/isf/csv-import";
import { buildClassicEntry } from "./fixtures/builders";

function draft(
  overrides: Partial<ImportedEntryDraft> = {},
): ImportedEntryDraft {
  return {
    __pendingCompetitionFormat: true,
    disciplineCode: "classic_2lift",
    day: 1,
    platform: 1,
    flight: "A",
    name: "Alice Smith",
    sex: "F",
    birthDate: "1995-04-12",
    division: "amateur",
    guest: false,
    country: "US",
    bodyweightKg: null,
    reweighKg: null,
    ...overrides,
  };
}

describe("buildImportDuplicatePlan", () => {
  it("auto-creates drafts with no matches", () => {
    const plan = buildImportDuplicatePlan([], [draft()]);
    expect(plan.decisions[0]?.action).toBe("create");
    expect(plan.autoCreateDrafts).toHaveLength(1);
    expect(plan.reviewDrafts).toHaveLength(0);
  });

  it("marks memberId matches as high-confidence review items", () => {
    const existing = buildClassicEntry("Different Name", {
      memberId: "ISF-42",
    });
    const plan = buildImportDuplicatePlan(
      [existing],
      [draft({ memberId: " isf-42 " })],
    );
    expect(plan.decisions[0]).toMatchObject({
      action: "review",
      matches: [
        {
          reason: "member_id",
          confidence: "high",
          existingEntryId: existing.id,
        },
      ],
    });
  });

  it("marks name + birthDate matches as high-confidence review items", () => {
    const existing = buildClassicEntry(" Alice   Smith ", {
      birthDate: "1995-04-12",
    });
    const plan = buildImportDuplicatePlan([existing], [draft()]);
    expect(plan.decisions[0]?.matches).toContainEqual({
      reason: "name_birth_date",
      confidence: "high",
      existingEntryId: existing.id,
    });
  });

  it("marks name + sex + country matches as medium-confidence review items", () => {
    const existing = buildClassicEntry("Alice Smith", {
      sex: "F",
      birthDate: null,
      country: "US",
    });
    const plan = buildImportDuplicatePlan(
      [existing],
      [draft({ birthDate: null })],
    );
    expect(plan.decisions[0]?.matches).toContainEqual({
      reason: "name_sex_country",
      confidence: "medium",
      existingEntryId: existing.id,
    });
  });

  it("marks duplicate rows inside the same CSV batch", () => {
    const plan = buildImportDuplicatePlan([], [
      draft({ memberId: "A-1" }),
      draft({ name: "Other", birthDate: null, memberId: "A-1" }),
    ]);
    expect(plan.decisions[0]?.action).toBe("create");
    expect(plan.decisions[1]).toMatchObject({
      action: "review",
      matches: [
        {
          reason: "same_import_batch",
          confidence: "high",
          duplicateDraftIndex: 0,
        },
      ],
    });
  });
});
