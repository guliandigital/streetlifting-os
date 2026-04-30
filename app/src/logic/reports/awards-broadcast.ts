/**
 * Awards ceremony cross-tab broadcast — pure envelope + freshness rules.
 *
 * The `/awards` page (operator) sends `AwardsBroadcastMessage` envelopes
 * on every navigation change; `/display/awards` (projector) listens and
 * renders the latest received envelope. The transport layer
 * (BroadcastChannel wrapper) is a thin separate service so this module
 * stays pure and testable.
 *
 * Tauri note: BroadcastChannel does not bridge between separate Tauri
 * windows. Cross-window sync inside the desktop bundle is V3 work
 * (Local Broadcast Publisher per architecture-v1.md §4.6). This module
 * is the PWA / single-browser-context first step.
 */

import type { CeremonyAward } from "./awards-ceremony";

/** Channel name used by BOTH publisher and subscriber. Keep stable. */
export const AWARDS_BROADCAST_CHANNEL = "streetlifting-os:awards" as const;

/** Schema version of the envelope. Bump on breaking shape changes. */
export const AWARDS_BROADCAST_SCHEMA_VERSION = 1 as const;

export type AwardsBroadcastMessage = {
  schemaVersion: typeof AWARDS_BROADCAST_SCHEMA_VERSION;
  /** Sender's monotonic timestamp (ms since epoch). Used to drop stale frames. */
  sentAt: number;
  /** Display-only meet identification, for the header on the projector. */
  meetName: string;
  meetDate: string;
  /** Total awards in the ceremony — for the "x / N" counter on display. */
  totalAwards: number;
  /** Zero-based index in the ordered awards list. */
  currentIndex: number;
  /**
   * The currently active award, fully serialized. Display tab does not
   * need access to the redux meet state — it only renders what arrives.
   * Null iff `totalAwards === 0` (empty ceremony).
   */
  award: CeremonyAward | null;
};

/**
 * True iff the candidate envelope should replace the currently rendered
 * one. Newer-`sentAt` always wins; same-`sentAt` keeps the existing.
 */
export function shouldApply(
  current: AwardsBroadcastMessage | null,
  candidate: AwardsBroadcastMessage,
): boolean {
  if (current === null) return true;
  if (candidate.schemaVersion !== AWARDS_BROADCAST_SCHEMA_VERSION) return false;
  return candidate.sentAt > current.sentAt;
}

/**
 * Validate an unknown payload (e.g. coming from a foreign tab). Returns
 * the typed envelope iff the shape passes; returns null otherwise. Keeps
 * the subscriber resilient against schema drift across versions.
 */
export function parseEnvelope(value: unknown): AwardsBroadcastMessage | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v["schemaVersion"] !== AWARDS_BROADCAST_SCHEMA_VERSION) return null;
  if (typeof v["sentAt"] !== "number") return null;
  if (typeof v["meetName"] !== "string") return null;
  if (typeof v["meetDate"] !== "string") return null;
  if (typeof v["totalAwards"] !== "number") return null;
  if (typeof v["currentIndex"] !== "number") return null;
  // Award is optional but if present must be an object with an id.
  const a = v["award"];
  if (a !== null && (typeof a !== "object" || a === null)) return null;
  if (a !== null) {
    const ao = a as Record<string, unknown>;
    if (typeof ao["id"] !== "string") return null;
    if (typeof ao["athleteName"] !== "string") return null;
    if (ao["place"] !== 1 && ao["place"] !== 2 && ao["place"] !== 3) return null;
  }
  return v as unknown as AwardsBroadcastMessage;
}

/**
 * Construct an envelope. `sentAt` defaults to `Date.now()`; tests pass
 * a fixed value for deterministic ordering checks.
 */
export function makeEnvelope(input: {
  meetName: string;
  meetDate: string;
  totalAwards: number;
  currentIndex: number;
  award: CeremonyAward | null;
  sentAt?: number;
}): AwardsBroadcastMessage {
  return {
    schemaVersion: AWARDS_BROADCAST_SCHEMA_VERSION,
    sentAt: input.sentAt ?? Date.now(),
    meetName: input.meetName,
    meetDate: input.meetDate,
    totalAwards: input.totalAwards,
    currentIndex: input.currentIndex,
    award: input.award,
  };
}
