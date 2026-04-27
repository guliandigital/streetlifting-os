/**
 * Migration v1 → v2 (blueprint v2 §10.2).
 *
 * NOTE: v1 was never publicly released. This migration exists for two reasons:
 *  1. Internal pre-release files might be in v1 shape.
 *  2. It serves as a template/reference for future migrations (vN → vN+1).
 *
 * Changes v1 → v2:
 *  - ClassicAttempt.status: AttemptStatus  →  judgeVotes: JudgeVotes  (D15)
 *    success → all-true; fail → all-false; pending → all-null
 *  - ClassicAttempt: add lastDeclarationAt: null, changesUsedInRound: 0  (D2B, D9)
 *  - MultirepAttempt: same status → judgeVotes treatment  (D15)
 *  - Entry: add country: null, reweighKg: null, disciplineCode (inferred from
 *    competitionFormat + event)  (D24, D2A.2, athlete catalog finding)
 *  - Plate: add recordOnly: false where absent  (D25)
 *  - MeetState: add enabledDisciplineCodes: [], lowerBodyweightFirstTiebreak: false
 *  - License + signature envelopes: add as null/undefined (D31, D38)
 *  - versions.stateVersion: "1" → "2"
 */

import type { Migration } from "./types";
import { MigrationError } from "./types";

type AnyRecord = Record<string, unknown>;

function isRecord(x: unknown): x is AnyRecord {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/** Convert legacy AttemptStatus to JudgeVotes. */
function statusToJudgeVotes(
  status: unknown,
): { left: boolean | null; center: boolean | null; right: boolean | null } {
  if (status === "success") return { left: true, center: true, right: true };
  if (status === "fail") return { left: false, center: false, right: false };
  return { left: null, center: null, right: null };
}

/** Migrate a single classic attempt in place (returns new object). */
function migrateClassicAttempt(att: AnyRecord): AnyRecord {
  const out: AnyRecord = { ...att };
  if ("status" in att && !("judgeVotes" in att)) {
    out["judgeVotes"] = statusToJudgeVotes(att["status"]);
    delete out["status"];
  }
  if (out["lastDeclarationAt"] === undefined) out["lastDeclarationAt"] = null;
  if (out["changesUsedInRound"] === undefined) out["changesUsedInRound"] = 0;
  return out;
}

/** Migrate a single multirep attempt in place (returns new object). */
function migrateMultirepAttempt(att: AnyRecord): AnyRecord {
  const out: AnyRecord = { ...att };
  if ("status" in att && !("judgeVotes" in att)) {
    out["judgeVotes"] = statusToJudgeVotes(att["status"]);
    delete out["status"];
  }
  if (out["durationSec"] === undefined) out["durationSec"] = 120; // ISF default
  return out;
}

/** Migrate ExerciseResult.attempts array. */
function migrateExerciseResult(ex: AnyRecord): AnyRecord {
  if (!Array.isArray(ex["attempts"])) return ex;
  const fmt = ex["format"];
  const newAttempts =
    fmt === "classic"
      ? (ex["attempts"] as AnyRecord[]).map(migrateClassicAttempt)
      : fmt === "multirep"
        ? (ex["attempts"] as AnyRecord[]).map(migrateMultirepAttempt)
        : ex["attempts"];
  return { ...ex, attempts: newAttempts };
}

/** Infer disciplineCode for legacy entry from competitionFormat + event. */
function inferDisciplineCode(entry: AnyRecord): string {
  const fmt = entry["competitionFormat"];
  const ev = entry["event"];
  if (fmt === "classic") {
    if (ev === "PUDI") return "classic_2lift";
    if (ev === "PU") return "classic_pu";
    if (ev === "DI") return "classic_di";
  }
  if (fmt === "multirep") {
    if (ev === "PUDI") return "multirep_2lift_24_32"; // best-guess default
    if (ev === "PU") return "multirep_pu_16";
    if (ev === "DI") return "multirep_di_24";
  }
  return "classic_2lift"; // defensive fallback
}

function migrateEntry(entry: AnyRecord): AnyRecord {
  const out: AnyRecord = { ...entry };
  if (out["country"] === undefined) out["country"] = null;
  if (out["reweighKg"] === undefined) out["reweighKg"] = null;
  if (out["disciplineCode"] === undefined) {
    out["disciplineCode"] = inferDisciplineCode(entry);
  }
  if (isRecord(out["exercises"])) {
    const exs = out["exercises"];
    const newExs: AnyRecord = {};
    for (const k of ["PU", "DI"] as const) {
      const ex = exs[k];
      if (isRecord(ex)) newExs[k] = migrateExerciseResult(ex);
    }
    out["exercises"] = newExs;
  }
  return out;
}

function migratePlate(p: AnyRecord): AnyRecord {
  if (p["recordOnly"] === undefined) return { ...p, recordOnly: false };
  return p;
}

function migrateMeetState(meet: AnyRecord): AnyRecord {
  const out: AnyRecord = { ...meet };
  if (out["enabledDisciplineCodes"] === undefined) {
    out["enabledDisciplineCodes"] = [];
  }
  if (out["lowerBodyweightFirstTiebreak"] === undefined) {
    out["lowerBodyweightFirstTiebreak"] = false;
  }
  if (isRecord(out["classicLoadConfig"])) {
    const cfg = out["classicLoadConfig"];
    const plates = Array.isArray(cfg["plates"])
      ? (cfg["plates"] as AnyRecord[]).map(migratePlate)
      : cfg["plates"];
    out["classicLoadConfig"] = {
      ...cfg,
      plates,
      defaultAttemptDurationSec: cfg["defaultAttemptDurationSec"] ?? 60,
    };
  }
  return out;
}

export const v1ToV2Migration: Migration = {
  fromVersion: "1",
  toVersion: "2",
  description:
    "v1→v2: status→judgeVotes (D15), add country/reweighKg/disciplineCode to Entry (D2A/D24), add Plate.recordOnly (D25), add enabledDisciplineCodes + lowerBodyweightFirstTiebreak to MeetState",
  up(input: unknown): unknown {
    if (!isRecord(input)) {
      throw new MigrationError("v1→v2: input is not an object");
    }
    const versions = input["versions"];
    if (!isRecord(versions) || versions["stateVersion"] !== "1") {
      throw new MigrationError(
        `v1→v2: expected versions.stateVersion === "1", got ${JSON.stringify(versions)}`,
      );
    }

    const out: AnyRecord = { ...input };
    out["versions"] = {
      ...versions,
      stateVersion: "2",
    };

    if (isRecord(out["meet"])) out["meet"] = migrateMeetState(out["meet"]);
    if (isRecord(out["registration"])) {
      const reg = out["registration"];
      const entries = Array.isArray(reg["entries"])
        ? (reg["entries"] as AnyRecord[]).map(migrateEntry)
        : reg["entries"];
      out["registration"] = { ...reg, entries };
    }

    return out;
  },
};
