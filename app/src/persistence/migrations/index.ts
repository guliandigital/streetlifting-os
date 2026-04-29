/**
 * Migration runner — chains migrations to bring a save-file up to current version.
 *
 * Algorithm (blueprint v2 §10.2):
 *   1. Read versions.stateVersion from raw input.
 *   2. While stateVersion < CURRENT_STATE_VERSION:
 *        find migration with fromVersion === current stateVersion
 *        if not found → error
 *        apply migration → stateVersion = migration.toVersion
 *   3. Return migrated raw JSON (still untyped — let zod validate after).
 */

import type { Migration } from "./types";
import { MigrationError } from "./types";
import { v1ToV2Migration } from "./v1-to-v2";
import { v2ToV3Migration } from "./v2-to-v3";
import { v3ToV4Migration } from "./v3-to-v4";
import { CURRENT_STATE_VERSION } from "../version";
import { versionEnvelopeSchema } from "../schema";

export const ALL_MIGRATIONS: Migration[] = [
  v1ToV2Migration,
  v2ToV3Migration,
  v3ToV4Migration,
];

export function runMigrations(rawJson: unknown): {
  migrated: unknown;
  appliedMigrations: string[];
} {
  const envelope = versionEnvelopeSchema.safeParse(rawJson);
  if (!envelope.success) {
    throw new MigrationError(
      `Save-file is missing or has malformed 'versions' envelope: ${envelope.error.message}`,
    );
  }

  let current = rawJson;
  let currentVersion = envelope.data.versions.stateVersion;
  const applied: string[] = [];

  // Safety: bound the chain to 100 iterations to catch infinite-loop bugs.
  for (let i = 0; i < 100; i++) {
    if (currentVersion === CURRENT_STATE_VERSION) {
      return { migrated: current, appliedMigrations: applied };
    }
    const next = ALL_MIGRATIONS.find((m) => m.fromVersion === currentVersion);
    if (!next) {
      throw new MigrationError(
        `No migration from version "${currentVersion}" to "${CURRENT_STATE_VERSION}". ` +
          `Save-file is from a future version, or the migration is missing.`,
      );
    }
    current = next.up(current);
    currentVersion = next.toVersion;
    applied.push(next.description);
  }

  throw new MigrationError(
    `Migration chain ran for 100 iterations without reaching ${CURRENT_STATE_VERSION} — bug?`,
  );
}

export type { Migration };
export { MigrationError };
