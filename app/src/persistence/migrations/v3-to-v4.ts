/**
 * Migration v3 → v4.
 *
 * Adds MeetState.rulesPackRef and pins legacy V2-development save-files to the
 * built-in ISF v5.1 RulesPack. External pack loading/signature verification is
 * intentionally not part of this migration.
 */

import { ISF_V51_RULES_PACK_REF } from "@domain/presets";
import type { Migration } from "./types";
import { MigrationError } from "./types";

type AnyRecord = Record<string, unknown>;

function isRecord(x: unknown): x is AnyRecord {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

export const v3ToV4Migration: Migration = {
  fromVersion: "3",
  toVersion: "4",
  description: "v3→v4: add MeetState.rulesPackRef pinned to built-in ISF v5.1",
  up(input: unknown): unknown {
    if (!isRecord(input)) {
      throw new MigrationError("v3→v4: input is not an object");
    }
    const versions = input["versions"];
    if (!isRecord(versions) || versions["stateVersion"] !== "3") {
      throw new MigrationError(
        `v3→v4: expected versions.stateVersion === "3", got ${JSON.stringify(versions)}`,
      );
    }

    const out: AnyRecord = { ...input };
    out["versions"] = {
      ...versions,
      stateVersion: "4",
    };

    if (isRecord(out["meet"])) {
      out["meet"] = {
        ...out["meet"],
        rulesPackRef: isRecord(out["meet"]["rulesPackRef"])
          ? out["meet"]["rulesPackRef"]
          : { ...ISF_V51_RULES_PACK_REF },
      };
    }

    return out;
  },
};
