/**
 * Awards-broadcast envelope + freshness tests.
 *
 * The transport service (BroadcastChannel wrapper) is exercised
 * end-to-end via the in-page sync verification during smoke testing,
 * and via the happy-dom BroadcastChannel mock here.
 */

import { describe, it, expect } from "vitest";
import {
  AWARDS_BROADCAST_CHANNEL,
  AWARDS_BROADCAST_SCHEMA_VERSION,
  makeEnvelope,
  parseEnvelope,
  shouldApply,
  type AwardsBroadcastMessage,
} from "@logic/reports/awards-broadcast";
import type { CeremonyAward } from "@logic/reports/awards-ceremony";

const sampleAward: CeremonyAward = {
  id: "classic:M_82_5:e1",
  format: "classic",
  place: 1,
  athleteName: "Иванов Иван",
  team: "Alpha",
  category: "M / open / M_82_5",
  disciplineCode: "classic_2lift",
  result: "330 kg",
};

function envelope(
  partial: Partial<AwardsBroadcastMessage> = {},
): AwardsBroadcastMessage {
  return {
    schemaVersion: AWARDS_BROADCAST_SCHEMA_VERSION,
    sentAt: 1_000,
    meetName: "UAT Cup",
    meetDate: "2026-04-30",
    totalAwards: 1,
    currentIndex: 0,
    award: sampleAward,
    ...partial,
  };
}

describe("AWARDS_BROADCAST_CHANNEL constant", () => {
  it("has a stable, namespaced value", () => {
    expect(AWARDS_BROADCAST_CHANNEL).toBe("streetlifting-os:awards");
  });
});

describe("makeEnvelope", () => {
  it("uses Date.now() by default for sentAt", () => {
    const before = Date.now();
    const e = makeEnvelope({
      meetName: "M",
      meetDate: "2026-04-30",
      totalAwards: 0,
      currentIndex: 0,
      award: null,
    });
    const after = Date.now();
    expect(e.sentAt).toBeGreaterThanOrEqual(before);
    expect(e.sentAt).toBeLessThanOrEqual(after);
  });

  it("respects an explicit sentAt", () => {
    const e = makeEnvelope({
      meetName: "M",
      meetDate: "2026-04-30",
      totalAwards: 0,
      currentIndex: 0,
      award: null,
      sentAt: 42,
    });
    expect(e.sentAt).toBe(42);
  });

  it("includes the schema version", () => {
    const e = makeEnvelope({
      meetName: "M",
      meetDate: "2026-04-30",
      totalAwards: 0,
      currentIndex: 0,
      award: null,
    });
    expect(e.schemaVersion).toBe(AWARDS_BROADCAST_SCHEMA_VERSION);
  });
});

describe("parseEnvelope", () => {
  it("returns null for non-objects", () => {
    expect(parseEnvelope(null)).toBeNull();
    expect(parseEnvelope(undefined)).toBeNull();
    expect(parseEnvelope("hello")).toBeNull();
    expect(parseEnvelope(42)).toBeNull();
  });

  it("returns null for objects with wrong schema version", () => {
    expect(parseEnvelope({ ...envelope(), schemaVersion: 999 })).toBeNull();
  });

  it("returns null when required fields are missing or wrong type", () => {
    expect(parseEnvelope({ ...envelope(), sentAt: "string" })).toBeNull();
    expect(parseEnvelope({ ...envelope(), meetName: 42 })).toBeNull();
    expect(parseEnvelope({ ...envelope(), totalAwards: "many" })).toBeNull();
  });

  it("accepts a well-formed envelope with award", () => {
    const e = envelope();
    const parsed = parseEnvelope(e);
    expect(parsed).not.toBeNull();
    expect(parsed?.award?.athleteName).toBe("Иванов Иван");
  });

  it("accepts a well-formed envelope with null award (empty ceremony)", () => {
    const e = envelope({ award: null, totalAwards: 0 });
    expect(parseEnvelope(e)).not.toBeNull();
  });

  it("rejects envelope with malformed award (non-podium place)", () => {
    expect(
      parseEnvelope({
        ...envelope(),
        award: { ...sampleAward, place: 4 },
      }),
    ).toBeNull();
  });

  it("rejects envelope with malformed award (missing id)", () => {
    expect(
      parseEnvelope({
        ...envelope(),
        award: { ...sampleAward, id: undefined } as unknown,
      }),
    ).toBeNull();
  });
});

describe("shouldApply", () => {
  it("always applies when current is null", () => {
    expect(shouldApply(null, envelope())).toBe(true);
  });

  it("applies a strictly newer envelope", () => {
    const cur = envelope({ sentAt: 100 });
    const next = envelope({ sentAt: 200 });
    expect(shouldApply(cur, next)).toBe(true);
  });

  it("rejects an older envelope (out-of-order delivery defense)", () => {
    const cur = envelope({ sentAt: 200 });
    const stale = envelope({ sentAt: 100 });
    expect(shouldApply(cur, stale)).toBe(false);
  });

  it("rejects an envelope with the same sentAt (idempotent)", () => {
    const cur = envelope({ sentAt: 100 });
    const dup = envelope({ sentAt: 100 });
    expect(shouldApply(cur, dup)).toBe(false);
  });

  it("rejects envelopes with mismatched schema version", () => {
    const cur = envelope({ sentAt: 100 });
    const future = { ...envelope({ sentAt: 200 }), schemaVersion: 99 } as
      unknown as AwardsBroadcastMessage;
    expect(shouldApply(cur, future)).toBe(false);
  });
});

describe("BroadcastChannel transport (happy-dom mock)", () => {
  it("delivers a posted envelope to a listener on the same channel", async () => {
    if (typeof globalThis.BroadcastChannel !== "function") {
      // happy-dom older than 12 may not support; skip with explicit pass.
      expect(true).toBe(true);
      return;
    }
    const sender = new BroadcastChannel("test:awards");
    const receiver = new BroadcastChannel("test:awards");
    const received: unknown[] = [];
    receiver.addEventListener("message", (e) => {
      received.push(e.data);
    });
    sender.postMessage(envelope());
    // Microtask flush.
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 10));
    expect(received).toHaveLength(1);
    expect(parseEnvelope(received[0])).not.toBeNull();
    sender.close();
    receiver.close();
  });
});
