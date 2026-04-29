/**
 * Migration v2 → v3.
 *
 * Adds the V2 Athlete/Nomination split while keeping `registration.entries`
 * as the UI-compatible projection. Legacy entries are not deduplicated here:
 * every historical entry receives its own athlete identity so migration is
 * deterministic and cannot accidentally merge distinct people.
 */

import type { Migration } from "./types";
import { MigrationError } from "./types";

type AnyRecord = Record<string, unknown>;

function isRecord(x: unknown): x is AnyRecord {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function athleteIdForEntry(entryId: string): string {
  return `ath_${entryId}`;
}

function nominationIdForEntry(entryId: string): string {
  return `nom_${entryId}`;
}

function entryId(entry: AnyRecord): string {
  return typeof entry["id"] === "string" ? entry["id"] : "";
}

function migrateEntryToAthlete(entry: AnyRecord): AnyRecord {
  const id = entryId(entry);
  const out: AnyRecord = {
    id: athleteIdForEntry(id),
    name: entry["name"],
    sex: entry["sex"],
    birthDate: entry["birthDate"] ?? null,
    ageOverride: entry["ageOverride"] ?? null,
    country: entry["country"] ?? null,
  };
  if (entry["memberId"] !== undefined) out["memberId"] = entry["memberId"];
  if (entry["instagram"] !== undefined) out["instagram"] = entry["instagram"];
  return out;
}

function migrateEntryToNomination(entry: AnyRecord): AnyRecord {
  const id = entryId(entry);
  const out: AnyRecord = {
    id: nominationIdForEntry(id),
    athleteId: athleteIdForEntry(id),
    competitionFormat: entry["competitionFormat"],
    disciplineCode: entry["disciplineCode"],
    event: entry["event"],
    day: entry["day"],
    platform: entry["platform"],
    flight: entry["flight"],
    division: entry["division"],
    guest: entry["guest"],
    bodyweightKg: entry["bodyweightKg"] ?? null,
    reweighKg: entry["reweighKg"] ?? null,
    exercises: entry["exercises"] ?? {},
  };
  if (entry["team"] !== undefined) out["team"] = entry["team"];
  if (entry["notes"] !== undefined) out["notes"] = entry["notes"];
  if (entry["assignedAgeCategoryCode"] !== undefined) {
    out["assignedAgeCategoryCode"] = entry["assignedAgeCategoryCode"];
  }
  if (entry["assignedWeightCategoryCode"] !== undefined) {
    out["assignedWeightCategoryCode"] = entry["assignedWeightCategoryCode"];
  }
  return out;
}

export const v2ToV3Migration: Migration = {
  fromVersion: "2",
  toVersion: "3",
  description:
    "v2→v3: add registration.athletes and registration.nominations from legacy entries",
  up(input: unknown): unknown {
    if (!isRecord(input)) {
      throw new MigrationError("v2→v3: input is not an object");
    }
    const versions = input["versions"];
    if (!isRecord(versions) || versions["stateVersion"] !== "2") {
      throw new MigrationError(
        `v2→v3: expected versions.stateVersion === "2", got ${JSON.stringify(versions)}`,
      );
    }

    const out: AnyRecord = { ...input };
    out["versions"] = {
      ...versions,
      stateVersion: "3",
    };

    if (isRecord(out["registration"])) {
      const reg = out["registration"];
      const entries = Array.isArray(reg["entries"])
        ? (reg["entries"] as AnyRecord[])
        : [];
      out["registration"] = {
        ...reg,
        athletes: Array.isArray(reg["athletes"])
          ? reg["athletes"]
          : entries.map(migrateEntryToAthlete),
        nominations: Array.isArray(reg["nominations"])
          ? reg["nominations"]
          : entries.map(migrateEntryToNomination),
      };
    }

    return out;
  },
};
