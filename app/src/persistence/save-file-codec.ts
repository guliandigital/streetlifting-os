/**
 * SaveFile encoder/decoder — convert between in-memory `SaveFile` object and
 * JSON string suitable for disk / browser download / IDB storage.
 *
 * Pipeline:
 *   encode(SaveFile) → stamp current versions → JSON.stringify
 *   decode(string)   → JSON.parse → runMigrations → zod validate → typed SaveFile
 */

import type { SaveFile } from "@domain/models";
import { saveFileSchema } from "./schema";
import { runMigrations, MigrationError } from "./migrations";
import { CURRENT_STATE_VERSION, APP_RELEASE_VERSION } from "./version";

export class SaveFileDecodeError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SaveFileDecodeError";
  }
}

/**
 * Serialize a SaveFile to a JSON string.
 * Re-stamps `versions` to current values; pre-existing release tags are overridden.
 */
export function encode(saveFile: SaveFile, pretty: boolean = true): string {
  const stamped: SaveFile = {
    ...saveFile,
    versions: {
      stateVersion: CURRENT_STATE_VERSION,
      releaseVersion: APP_RELEASE_VERSION,
    },
  };
  return pretty
    ? JSON.stringify(stamped, null, 2)
    : JSON.stringify(stamped);
}

/**
 * Parse + migrate + validate a JSON save-file. Throws SaveFileDecodeError on any
 * failure (malformed JSON, unknown version, validation mismatch).
 */
export function decode(rawJson: string): SaveFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    throw new SaveFileDecodeError(
      `Malformed JSON: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }

  let migrated: unknown;
  try {
    const result = runMigrations(parsed);
    migrated = result.migrated;
  } catch (err) {
    if (err instanceof MigrationError) {
      throw new SaveFileDecodeError(`Migration failed: ${err.message}`, err);
    }
    throw new SaveFileDecodeError(
      `Migration failed unexpectedly: ${err instanceof Error ? err.message : String(err)}`,
      err,
    );
  }

  const validated = saveFileSchema.safeParse(migrated);
  if (!validated.success) {
    throw new SaveFileDecodeError(
      `Save-file validation failed: ${validated.error.message}`,
      validated.error,
    );
  }
  return validated.data as SaveFile;
}

/**
 * Suggest a filename for save dialogs based on meet metadata.
 * Format: `{date}_{name}_streetlifting-os.json` with safe characters only.
 */
export function suggestedFilename(saveFile: SaveFile): string {
  const safe = saveFile.meet.name
    .replace(/[^A-Za-zА-Яа-я0-9_-]+/g, "_")
    .slice(0, 60);
  return `${saveFile.meet.date}_${safe}_streetlifting-os.json`;
}
