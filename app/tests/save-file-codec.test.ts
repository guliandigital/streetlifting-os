/**
 * SaveFile codec tests — Sprint 1 item 4.
 *
 * Covers:
 *   - encode/decode round-trip preserves data
 *   - decode validates schema (throws on malformed)
 *   - decode throws SaveFileDecodeError on bad JSON
 *   - encode stamps current versions
 *   - suggestedFilename uses safe characters
 */

import { describe, it, expect } from "vitest";
import {
  encode,
  decode,
  suggestedFilename,
  SaveFileDecodeError,
  CURRENT_STATE_VERSION,
} from "@/persistence";
import { buildEmptyV2SaveFile } from "./fixtures/save-file";

describe("encode + decode round-trip", () => {
  it("round-trips an empty meet", () => {
    const original = buildEmptyV2SaveFile();
    const json = encode(original);
    const decoded = decode(json);
    expect(decoded).toEqual(original);
  });

  it("encode produces pretty JSON by default", () => {
    const json = encode(buildEmptyV2SaveFile());
    expect(json).toContain("\n  "); // 2-space indent
  });

  it("encode produces compact JSON when pretty=false", () => {
    const json = encode(buildEmptyV2SaveFile(), false);
    expect(json).not.toContain("\n");
  });

  it("encode stamps current versions, overriding stale ones", () => {
    const original = buildEmptyV2SaveFile();
    original.versions.releaseVersion = "0.0.0-stale";
    const json = encode(original);
    const decoded = decode(json);
    expect(decoded.versions.stateVersion).toBe(CURRENT_STATE_VERSION);
    expect(decoded.versions.releaseVersion).not.toBe("0.0.0-stale");
  });
});

describe("decode error handling", () => {
  it("throws SaveFileDecodeError on malformed JSON", () => {
    expect(() => decode("not-json")).toThrow(SaveFileDecodeError);
    expect(() => decode("not-json")).toThrow(/Malformed JSON/);
  });

  it("throws SaveFileDecodeError when versions envelope is missing", () => {
    expect(() => decode(JSON.stringify({}))).toThrow(SaveFileDecodeError);
    expect(() => decode(JSON.stringify({}))).toThrow(/Migration failed/);
  });

  it("throws SaveFileDecodeError when stateVersion is unknown", () => {
    const future = JSON.stringify({
      versions: { stateVersion: "999", releaseVersion: "x" },
    });
    expect(() => decode(future)).toThrow(SaveFileDecodeError);
    expect(() => decode(future)).toThrow(/No migration from version/);
  });

  it("throws SaveFileDecodeError when schema validation fails", () => {
    // Valid envelope, valid version, but missing required `meet` field
    const bad = JSON.stringify({
      versions: { stateVersion: "3", releaseVersion: "x" },
    });
    expect(() => decode(bad)).toThrow(SaveFileDecodeError);
    expect(() => decode(bad)).toThrow(/validation failed/);
  });

  it("throws on negative bodyweight (zod constraint)", () => {
    const sf = buildEmptyV2SaveFile();
    // Force-invalid via cast
    sf.registration.entries.push({
      ...{
        id: "e1",
        competitionFormat: "classic",
        disciplineCode: "classic_2lift",
        event: "PUDI",
        day: 1,
        platform: 1,
        flight: "A",
        name: "Bad",
        sex: "M",
        birthDate: null,
        ageOverride: null,
        division: "amateur",
        guest: false,
        country: null,
        bodyweightKg: -5, // negative — should fail
        reweighKg: null,
        exercises: {},
      },
    });
    const json = JSON.stringify(sf);
    expect(() => decode(json)).toThrow(SaveFileDecodeError);
  });
});

describe("suggestedFilename", () => {
  it("uses meet date and name, replacing unsafe characters", () => {
    const sf = buildEmptyV2SaveFile();
    sf.meet.name = "Открытый Кубок Краснодарского края 2026";
    sf.meet.date = "2026-04-26";
    const fn = suggestedFilename(sf);
    expect(fn).toMatch(/^2026-04-26_/);
    expect(fn).toMatch(/streetlifting-os\.json$/);
    expect(fn).not.toContain(" ");
  });

  it("truncates very long meet names", () => {
    const sf = buildEmptyV2SaveFile();
    sf.meet.name = "X".repeat(200);
    const fn = suggestedFilename(sf);
    expect(fn.length).toBeLessThan(150); // sanity: not absurdly long
  });
});
