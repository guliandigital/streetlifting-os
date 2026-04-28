/**
 * Save-file and release version constants.
 *
 * stateVersion bumps when the save-file schema breaks (require migration).
 * releaseVersion is purely informational (which build wrote this file).
 *
 * Per blueprint v2 §10.2 + D31 stub fields: V1 ships stateVersion === "2"
 * because v1 was never released — v2 is the baseline that includes judgeVotes
 * (D15), forecast stub (D16), discipline catalog (D24), etc.
 */

import type { CurrentStateVersion } from "@domain/models";

export const CURRENT_STATE_VERSION: CurrentStateVersion = "2";

export const APP_RELEASE_VERSION = "1.1.0";
