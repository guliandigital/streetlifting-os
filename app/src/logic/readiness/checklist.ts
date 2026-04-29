/**
 * Tournament readiness checklist — pure pre-flight gate.
 *
 * Inspects the current SaveFile and emits an array of structured checks
 * covering the operator-side prerequisites that must be in place before
 * judging starts. The page UI renders these as a checklist.
 *
 * Checks fall into two severities:
 *   - "blocker" — judging cannot honestly start; the operator must fix.
 *   - "warning" — judging can start but real-meet UAT is degraded.
 *
 * This module is used by ReadinessPage. Keep pure — no Redux, no I18n.
 * Labels are translation keys resolved by the page.
 */

import type { Entry, MeetState, SaveFile } from "@domain/models";

export type ReadinessSeverity = "blocker" | "warning";
export type ReadinessStatus = "ok" | "warn" | "fail";

export type ReadinessCheckId =
  | "meet-name"
  | "meet-date"
  | "discipline"
  | "rules-pack"
  | "weight-categories"
  | "age-categories"
  | "plates"
  | "entries"
  | "weigh-ins"
  | "lots-assigned"
  | "category-assignment"
  | "save-file";

export type ReadinessCheck = {
  id: ReadinessCheckId;
  /** i18n key under "readiness.checks". */
  labelKey: string;
  /** i18n key under "readiness.hints" — short fix hint shown when not ok. */
  hintKey: string;
  /** Where the operator should go to fix. Path under app router. */
  fixPath: string | null;
  severity: ReadinessSeverity;
  status: ReadinessStatus;
  /** Optional supporting metric, e.g. "12 / 15 weighed in". */
  detail: string | null;
};

export type ReadinessSummary = {
  blockerFails: number;
  warningFails: number;
  totalChecks: number;
  okChecks: number;
  /** True iff there are no blocker fails — judging can be entered. */
  canStartJudging: boolean;
};

export type ReadinessReport = {
  checks: ReadinessCheck[];
  summary: ReadinessSummary;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function countWeighedIn(entries: ReadonlyArray<Entry>): number {
  return entries.filter((e) => e.bodyweightKg !== null && e.bodyweightKg > 0)
    .length;
}

function countCategoryAssigned(entries: ReadonlyArray<Entry>): number {
  return entries.filter(
    (e) => typeof e.assignedWeightCategoryCode === "string",
  ).length;
}

function summarize(checks: ReadinessCheck[]): ReadinessSummary {
  let blockerFails = 0;
  let warningFails = 0;
  let okChecks = 0;
  for (const c of checks) {
    if (c.status === "ok") {
      okChecks++;
    } else if (c.severity === "blocker") {
      blockerFails++;
    } else {
      warningFails++;
    }
  }
  return {
    blockerFails,
    warningFails,
    totalChecks: checks.length,
    okChecks,
    canStartJudging: blockerFails === 0,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type ReadinessInput = {
  saveFile: SaveFile | null;
  /** True iff the meet has unsaved changes. */
  dirty: boolean;
  /** Path on disk if loaded from file (Tauri); null otherwise. */
  filePath: string | null;
};

export function buildReadinessReport(input: ReadinessInput): ReadinessReport {
  const { saveFile, dirty, filePath } = input;

  if (!saveFile) {
    // No meet open — emit a single blocker so the page renders something useful.
    const checks: ReadinessCheck[] = [
      {
        id: "meet-name",
        labelKey: "readiness.checks.noMeet",
        hintKey: "readiness.hints.noMeet",
        fixPath: "/",
        severity: "blocker",
        status: "fail",
        detail: null,
      },
    ];
    return { checks, summary: summarize(checks) };
  }

  const meet: MeetState = saveFile.meet;
  const entries = saveFile.registration.entries;
  const totalEntries = entries.length;
  const weighedIn = countWeighedIn(entries);
  const categoryAssigned = countCategoryAssigned(entries);

  const checks: ReadinessCheck[] = [];

  checks.push({
    id: "meet-name",
    labelKey: "readiness.checks.meetName",
    hintKey: "readiness.hints.meetName",
    fixPath: "/meet-setup",
    severity: "blocker",
    status: nonEmpty(meet.name) ? "ok" : "fail",
    detail: nonEmpty(meet.name) ? meet.name : null,
  });

  checks.push({
    id: "meet-date",
    labelKey: "readiness.checks.meetDate",
    hintKey: "readiness.hints.meetDate",
    fixPath: "/meet-setup",
    severity: "blocker",
    status: nonEmpty(meet.date) ? "ok" : "fail",
    detail: nonEmpty(meet.date) ? meet.date : null,
  });

  checks.push({
    id: "discipline",
    labelKey: "readiness.checks.discipline",
    hintKey: "readiness.hints.discipline",
    fixPath: "/meet-setup",
    severity: "blocker",
    status: meet.enabledDisciplineCodes.length > 0 ? "ok" : "fail",
    detail:
      meet.enabledDisciplineCodes.length > 0
        ? meet.enabledDisciplineCodes.join(", ")
        : null,
  });

  checks.push({
    id: "rules-pack",
    labelKey: "readiness.checks.rulesPack",
    hintKey: "readiness.hints.rulesPack",
    fixPath: "/meet-setup",
    severity: "blocker",
    status: meet.rulesPackRef?.id ? "ok" : "fail",
    detail: meet.rulesPackRef?.id ?? null,
  });

  checks.push({
    id: "weight-categories",
    labelKey: "readiness.checks.weightCategories",
    hintKey: "readiness.hints.weightCategories",
    fixPath: "/meet-setup",
    severity: "blocker",
    status: meet.weightCategories.length > 0 ? "ok" : "fail",
    detail: `${meet.weightCategories.length}`,
  });

  checks.push({
    id: "age-categories",
    labelKey: "readiness.checks.ageCategories",
    hintKey: "readiness.hints.ageCategories",
    fixPath: "/meet-setup",
    severity: "warning",
    status: meet.ageCategories.length > 0 ? "ok" : "warn",
    detail: `${meet.ageCategories.length}`,
  });

  const plateCount = meet.classicLoadConfig?.plates.length ?? 0;
  checks.push({
    id: "plates",
    labelKey: "readiness.checks.plates",
    hintKey: "readiness.hints.plates",
    fixPath: "/meet-setup",
    severity: "blocker",
    status: plateCount > 0 ? "ok" : "fail",
    detail: `${plateCount}`,
  });

  checks.push({
    id: "entries",
    labelKey: "readiness.checks.entries",
    hintKey: "readiness.hints.entries",
    fixPath: "/registration",
    severity: "blocker",
    status: totalEntries > 0 ? "ok" : "fail",
    detail: `${totalEntries}`,
  });

  // Weigh-ins blocker if at least one entry is missing bodyweight.
  checks.push({
    id: "weigh-ins",
    labelKey: "readiness.checks.weighIns",
    hintKey: "readiness.hints.weighIns",
    fixPath: "/weigh-ins",
    severity: "blocker",
    status:
      totalEntries === 0
        ? "fail"
        : weighedIn === totalEntries
          ? "ok"
          : "fail",
    detail: `${weighedIn} / ${totalEntries}`,
  });

  // Category assignment is a warning — entries with bodyweight but no resolved
  // category will still place via auto-resolution at result time, but it's
  // operator hygiene to confirm.
  checks.push({
    id: "category-assignment",
    labelKey: "readiness.checks.categoryAssignment",
    hintKey: "readiness.hints.categoryAssignment",
    fixPath: "/weigh-ins",
    severity: "warning",
    status:
      totalEntries === 0
        ? "warn"
        : categoryAssigned === totalEntries
          ? "ok"
          : "warn",
    detail: `${categoryAssigned} / ${totalEntries}`,
  });

  // Lots assigned: at least one entry exists and lastLotNumber > 0.
  const lastLot = saveFile.registration.lastLotNumber;
  checks.push({
    id: "lots-assigned",
    labelKey: "readiness.checks.lotsAssigned",
    hintKey: "readiness.hints.lotsAssigned",
    fixPath: "/registration",
    severity: "warning",
    status: totalEntries === 0 ? "warn" : lastLot > 0 ? "ok" : "warn",
    detail: `${lastLot}`,
  });

  // Save-file: warning if dirty (not saved) or has no on-disk path (browser-only).
  const persisted = filePath !== null && !dirty;
  checks.push({
    id: "save-file",
    labelKey: "readiness.checks.saveFile",
    hintKey: "readiness.hints.saveFile",
    fixPath: "/",
    severity: "warning",
    status: persisted ? "ok" : "warn",
    detail: filePath
      ? dirty
        ? "dirty"
        : "saved"
      : "unsaved",
  });

  return { checks, summary: summarize(checks) };
}
