/**
 * Migration tests — v1→v2 transformation per blueprint v2 §10.2 + D15/D24/D25/D2A.
 *
 * Covers:
 *   - status → judgeVotes for each AttemptStatus value
 *   - missing fields filled (country, reweighKg, disciplineCode, etc.)
 *   - Plate.recordOnly default added
 *   - MeetState.enabledDisciplineCodes / lowerBodyweightFirstTiebreak added
 *   - error on unknown source version
 */

import { describe, it, expect } from "vitest";
import {
  runMigrations,
  MigrationError,
  CURRENT_STATE_VERSION,
} from "@/persistence";
import { buildSyntheticV1SaveFile } from "./fixtures/save-file";

describe("runMigrations — v1 → v2", () => {
  it("upgrades stateVersion to current", () => {
    const v1 = buildSyntheticV1SaveFile();
    const { migrated, appliedMigrations } = runMigrations(v1);
    expect(appliedMigrations.length).toBe(1);
    expect(appliedMigrations[0]).toMatch(/v1→v2/);

    const m = migrated as { versions: { stateVersion: string } };
    expect(m.versions.stateVersion).toBe(CURRENT_STATE_VERSION);
  });

  it("converts attempt.status='success' to all-true judgeVotes", () => {
    const v1 = buildSyntheticV1SaveFile() as {
      registration: {
        entries: Array<{
          exercises: { PU: { attempts: unknown[] } };
        }>;
      };
    };
    const { migrated } = runMigrations(v1);
    const m = migrated as typeof v1;
    const att1 = m.registration.entries[0]!.exercises.PU.attempts[0] as {
      judgeVotes: { left: boolean | null; center: boolean | null; right: boolean | null };
      status?: unknown;
    };
    expect(att1.judgeVotes).toEqual({ left: true, center: true, right: true });
    expect("status" in att1).toBe(false);
  });

  it("converts attempt.status='fail' to all-false judgeVotes", () => {
    const v1 = buildSyntheticV1SaveFile() as {
      registration: { entries: Array<{ exercises: { PU: { attempts: unknown[] } } }> };
    };
    const { migrated } = runMigrations(v1);
    const m = migrated as typeof v1;
    const att2 = m.registration.entries[0]!.exercises.PU.attempts[1] as {
      judgeVotes: { left: boolean | null; center: boolean | null; right: boolean | null };
    };
    expect(att2.judgeVotes).toEqual({
      left: false,
      center: false,
      right: false,
    });
  });

  it("converts attempt.status='pending' to all-null judgeVotes", () => {
    const v1 = buildSyntheticV1SaveFile() as {
      registration: { entries: Array<{ exercises: { PU: { attempts: unknown[] } } }> };
    };
    const { migrated } = runMigrations(v1);
    const m = migrated as typeof v1;
    const att3 = m.registration.entries[0]!.exercises.PU.attempts[2] as {
      judgeVotes: { left: boolean | null; center: boolean | null; right: boolean | null };
    };
    expect(att3.judgeVotes).toEqual({
      left: null,
      center: null,
      right: null,
    });
  });

  it("adds lastDeclarationAt: null and changesUsedInRound: 0 to attempts", () => {
    const v1 = buildSyntheticV1SaveFile() as {
      registration: { entries: Array<{ exercises: { PU: { attempts: unknown[] } } }> };
    };
    const { migrated } = runMigrations(v1);
    const m = migrated as typeof v1;
    const att1 = m.registration.entries[0]!.exercises.PU.attempts[0] as {
      lastDeclarationAt: string | null;
      changesUsedInRound: number;
    };
    expect(att1.lastDeclarationAt).toBeNull();
    expect(att1.changesUsedInRound).toBe(0);
  });

  it("adds country: null and reweighKg: null to entries", () => {
    const v1 = buildSyntheticV1SaveFile();
    const { migrated } = runMigrations(v1);
    const m = migrated as {
      registration: {
        entries: Array<{ country: string | null; reweighKg: number | null }>;
      };
    };
    expect(m.registration.entries[0]!.country).toBeNull();
    expect(m.registration.entries[0]!.reweighKg).toBeNull();
  });

  it("infers disciplineCode for legacy entries (classic + PUDI → classic_2lift)", () => {
    const v1 = buildSyntheticV1SaveFile();
    const { migrated } = runMigrations(v1);
    const m = migrated as {
      registration: { entries: Array<{ disciplineCode: string }> };
    };
    expect(m.registration.entries[0]!.disciplineCode).toBe("classic_2lift");
  });

  it("adds Plate.recordOnly: false where missing", () => {
    const v1 = buildSyntheticV1SaveFile();
    const { migrated } = runMigrations(v1);
    const m = migrated as {
      meet: {
        classicLoadConfig: {
          plates: Array<{ recordOnly?: boolean }>;
        };
      };
    };
    for (const plate of m.meet.classicLoadConfig.plates) {
      expect(plate.recordOnly).toBe(false);
    }
  });

  it("adds enabledDisciplineCodes: [] and lowerBodyweightFirstTiebreak: false to meet", () => {
    const v1 = buildSyntheticV1SaveFile();
    const { migrated } = runMigrations(v1);
    const m = migrated as {
      meet: {
        enabledDisciplineCodes: string[];
        lowerBodyweightFirstTiebreak: boolean;
      };
    };
    expect(m.meet.enabledDisciplineCodes).toEqual([]);
    expect(m.meet.lowerBodyweightFirstTiebreak).toBe(false);
  });

  it("adds defaultAttemptDurationSec to classicLoadConfig", () => {
    const v1 = buildSyntheticV1SaveFile();
    const { migrated } = runMigrations(v1);
    const m = migrated as {
      meet: { classicLoadConfig: { defaultAttemptDurationSec: number } };
    };
    expect(m.meet.classicLoadConfig.defaultAttemptDurationSec).toBe(60);
  });
});

describe("runMigrations — already current version", () => {
  it("returns input unchanged when stateVersion === current", () => {
    const v2Input = {
      versions: { stateVersion: "2", releaseVersion: "x" },
      meet: {},
    };
    const { migrated, appliedMigrations } = runMigrations(v2Input);
    expect(migrated).toEqual(v2Input);
    expect(appliedMigrations).toEqual([]);
  });
});

describe("runMigrations — error cases", () => {
  it("throws MigrationError on missing versions field", () => {
    expect(() => runMigrations({})).toThrow(MigrationError);
  });

  it("throws MigrationError on unknown future version", () => {
    expect(() =>
      runMigrations({
        versions: { stateVersion: "42", releaseVersion: "future" },
      }),
    ).toThrow(/No migration from version "42"/);
  });

  it("throws MigrationError when input is not an object", () => {
    expect(() => runMigrations("hello")).toThrow(MigrationError);
    expect(() => runMigrations(null)).toThrow(MigrationError);
    expect(() => runMigrations(42)).toThrow(MigrationError);
  });
});
