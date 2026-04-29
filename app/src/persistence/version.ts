/**
 * Save-file and release version constants.
 *
 * stateVersion bumps when the save-file schema breaks (require migration).
 * releaseVersion is purely informational (which build wrote this file).
 *
 * V2 development bumps this to "3" for the Athlete/Nomination split while
 * keeping `registration.entries` as a compatibility projection.
 */

import type { CurrentStateVersion } from "@domain/models";

export const CURRENT_STATE_VERSION: CurrentStateVersion = "3";

export const APP_RELEASE_VERSION = "1.1.0";
