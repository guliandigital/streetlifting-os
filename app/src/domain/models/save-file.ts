/**
 * SaveFile envelope per blueprint v2 §10.
 *
 * stateVersion === "2" — bumped from v1 for D15 (judgeVotes) and other v2 fields.
 *
 * V2-prep stub fields per D31 (decisions-v3): licenseTokenId / quotaAllocationId /
 * billedNominationIds[] / signature. Nullable in V1; backend-populated when V2 backend ships.
 */

import type { Entry } from "./entry";
import type { MeetState } from "./meet-state";

export type CurrentStateVersion = "2";

export type RegistrationState = {
  entries: Entry[];
  /** Last lot-number assigned (for monotonic increment when adding new entries). */
  lastLotNumber: number;
};

export type JudgingState = {
  /** Index of the discipline being judged right now (V1 = single-discipline meets). */
  activeDisciplineIndex: number;
  /** Index of the entry whose attempt is currently active. */
  activeEntryIndex: number | null;
  /** Sequence number (1..3) of the active attempt. */
  activeAttemptSequence: 1 | 2 | 3 | 4 | null;
  /** Wall-clock when active attempt timer started, ISO 8601; null if not started. */
  attemptStartedAt: string | null;
};

export type UIState = {
  /** Current locale, e.g. "ru-RU" or "en-US". */
  locale: string;
  /** UI sort mode for the judging work table (per D16). */
  workTableSortMode:
    | "by_name"
    | "by_weight_cat_then_name"
    | "by_age_then_weight_then_name"
    | "by_forecast_then_weight_then_name";
  /** Forecast columns visible? (D16 — V1 ships them hidden by default.) */
  showForecastColumns: boolean;
};

/** D31 stub: backend-issued license + quota envelope. Nullable in V1. */
export type LicenseEnvelope = {
  licenseTokenId: string | null;
  quotaAllocationId: string | null;
  billedNominationIds: string[];
};

/** D38 stub: cryptographic signature envelope. Nullable in V1. */
export type SaveFileSignature = {
  federationKeyId: string;
  sanctioningCertId: string;
  ed25519Sig: string;
} | null;

export type SaveFile = {
  versions: {
    stateVersion: CurrentStateVersion;
    releaseVersion: string;
  };
  meet: MeetState;
  registration: RegistrationState;
  judging: JudgingState;
  ui: UIState;
  /** V2 backend integration; in V1 these are null. */
  license?: LicenseEnvelope;
  /** V2 sanctioning crypto-signature; in V1 this is null. */
  signature?: SaveFileSignature;
};
