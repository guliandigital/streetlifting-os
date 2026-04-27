/**
 * Migration framework — blueprint v2 §10.2.
 *
 * Each migration upgrades a save-file from one stateVersion to the next.
 * Migrations chain: e.g. v1→v2→v3 runs both migrations sequentially when
 * loading a v1 file into a v3 client.
 *
 * Migrations work on raw `unknown` JSON shapes (NOT typed SaveFile), because
 * we don't have validated types at intermediate versions.
 */

export interface Migration {
  /** Source version this migration accepts as input. */
  fromVersion: string;
  /** Output version this migration produces. */
  toVersion: string;
  /**
   * Transform raw JSON. Caller guarantees `input.versions.stateVersion === fromVersion`.
   * Implementation must produce JSON with `versions.stateVersion === toVersion`.
   */
  up(input: unknown): unknown;
  /** Human-readable summary for migration log. */
  description: string;
}

export class MigrationError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MigrationError";
  }
}
