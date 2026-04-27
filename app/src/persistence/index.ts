/** Public persistence API. */

export { saveToFile, loadFromFile } from "./storage";
export {
  encode,
  decode,
  suggestedFilename,
  SaveFileDecodeError,
} from "./save-file-codec";
export {
  CURRENT_STATE_VERSION,
  APP_RELEASE_VERSION,
} from "./version";
export {
  runMigrations,
  ALL_MIGRATIONS,
  MigrationError,
  type Migration,
} from "./migrations";
export {
  saveFileSchema,
  versionEnvelopeSchema,
  type ValidatedSaveFile,
} from "./schema";
