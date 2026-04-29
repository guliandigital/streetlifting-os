/**
 * Duplicate-resolution planning for registration imports.
 *
 * This module is intentionally pure. UI can present `review` decisions and let
 * an operator choose create/update/skip later; the parser/import modal behavior
 * remains unchanged until that UX is wired.
 */

import type { Entry } from "@domain/models";
import type { ImportedEntryDraft } from "./csv-import";

export type ImportDuplicateReason =
  | "member_id"
  | "name_birth_date"
  | "name_sex_country"
  | "same_import_batch";

export type ImportDuplicateMatch = {
  reason: ImportDuplicateReason;
  confidence: "high" | "medium";
  existingEntryId?: string;
  duplicateDraftIndex?: number;
};

export type ImportDuplicateDecision = {
  draftIndex: number;
  draft: ImportedEntryDraft;
  action: "create" | "review";
  matches: ImportDuplicateMatch[];
};

export type ImportDuplicatePlan = {
  decisions: ImportDuplicateDecision[];
  autoCreateDrafts: ImportedEntryDraft[];
  reviewDrafts: ImportedEntryDraft[];
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeMemberId(value: string | null | undefined): string {
  return normalizeText(value).replace(/\s+/g, "");
}

function hasValue(value: string): boolean {
  return value.length > 0;
}

function matchExistingEntry(
  draft: ImportedEntryDraft,
  existing: Entry,
): ImportDuplicateMatch[] {
  const matches: ImportDuplicateMatch[] = [];

  const draftMemberId = normalizeMemberId(draft.memberId);
  const existingMemberId = normalizeMemberId(existing.memberId);
  if (hasValue(draftMemberId) && draftMemberId === existingMemberId) {
    matches.push({
      reason: "member_id",
      confidence: "high",
      existingEntryId: existing.id,
    });
  }

  const draftName = normalizeText(draft.name);
  const existingName = normalizeText(existing.name);
  if (
    hasValue(draftName) &&
    draftName === existingName &&
    draft.birthDate !== null &&
    draft.birthDate === existing.birthDate
  ) {
    matches.push({
      reason: "name_birth_date",
      confidence: "high",
      existingEntryId: existing.id,
    });
  }

  const draftCountry = normalizeText(draft.country);
  const existingCountry = normalizeText(existing.country);
  if (
    hasValue(draftName) &&
    draftName === existingName &&
    draft.sex === existing.sex &&
    hasValue(draftCountry) &&
    draftCountry === existingCountry
  ) {
    matches.push({
      reason: "name_sex_country",
      confidence: "medium",
      existingEntryId: existing.id,
    });
  }

  return matches;
}

function matchEarlierDraft(
  draft: ImportedEntryDraft,
  earlierDraft: ImportedEntryDraft,
  earlierDraftIndex: number,
): ImportDuplicateMatch[] {
  const draftMemberId = normalizeMemberId(draft.memberId);
  const earlierMemberId = normalizeMemberId(earlierDraft.memberId);
  if (hasValue(draftMemberId) && draftMemberId === earlierMemberId) {
    return [
      {
        reason: "same_import_batch",
        confidence: "high",
        duplicateDraftIndex: earlierDraftIndex,
      },
    ];
  }

  const draftName = normalizeText(draft.name);
  const earlierName = normalizeText(earlierDraft.name);
  if (
    hasValue(draftName) &&
    draftName === earlierName &&
    draft.birthDate !== null &&
    draft.birthDate === earlierDraft.birthDate
  ) {
    return [
      {
        reason: "same_import_batch",
        confidence: "high",
        duplicateDraftIndex: earlierDraftIndex,
      },
    ];
  }

  return [];
}

export function buildImportDuplicatePlan(
  existingEntries: ReadonlyArray<Entry>,
  drafts: ReadonlyArray<ImportedEntryDraft>,
): ImportDuplicatePlan {
  const decisions = drafts.map((draft, draftIndex): ImportDuplicateDecision => {
    const existingMatches = existingEntries.flatMap((entry) =>
      matchExistingEntry(draft, entry),
    );
    const batchMatches = drafts
      .slice(0, draftIndex)
      .flatMap((earlierDraft, earlierDraftIndex) =>
        matchEarlierDraft(draft, earlierDraft, earlierDraftIndex),
      );
    const matches = [...existingMatches, ...batchMatches];
    return {
      draftIndex,
      draft,
      action: matches.length > 0 ? "review" : "create",
      matches,
    };
  });

  return {
    decisions,
    autoCreateDrafts: decisions
      .filter((decision) => decision.action === "create")
      .map((decision) => decision.draft),
    reviewDrafts: decisions
      .filter((decision) => decision.action === "review")
      .map((decision) => decision.draft),
  };
}
