/**
 * Save-file and release version constants.
 *
 * stateVersion bumps when the save-file schema breaks (require migration).
 * releaseVersion is purely informational (which build wrote this file).
 *
 * V2 development bumps this to "4" for pinned RulesPack references after the
 * Athlete/Nomination split.
 */

import type { CurrentStateVersion } from "@domain/models";

export const CURRENT_STATE_VERSION: CurrentStateVersion = "4";

export const APP_RELEASE_VERSION = "1.4.0";
