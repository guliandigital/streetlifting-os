/**
 * Duration formatter tests.
 */

import { describe, it, expect } from "vitest";
import { formatDurationCompact } from "@logic/isf/duration-format";

describe("formatDurationCompact (en-US)", () => {
  it("renders zero and negative as 0m", () => {
    expect(formatDurationCompact(0, "en-US")).toBe("0m");
    expect(formatDurationCompact(-100, "en-US")).toBe("0m");
    expect(formatDurationCompact(NaN, "en-US")).toBe("0m");
  });

  it("renders sub-minute as seconds", () => {
    expect(formatDurationCompact(45, "en-US")).toBe("45s");
  });

  it("renders sub-hour as minutes (with seconds when partial)", () => {
    expect(formatDurationCompact(60, "en-US")).toBe("1m");
    expect(formatDurationCompact(125, "en-US")).toBe("2m 05s");
    expect(formatDurationCompact(3540, "en-US")).toBe("59m");
  });

  it("renders hour-scale with zero-padded minutes", () => {
    expect(formatDurationCompact(3600, "en-US")).toBe("1h 00m");
    expect(formatDurationCompact(3600 + 5 * 60, "en-US")).toBe("1h 05m");
    expect(formatDurationCompact(7200 + 30 * 60, "en-US")).toBe("2h 30m");
  });

  it("renders multi-day", () => {
    expect(formatDurationCompact(86400, "en-US")).toBe("1d 00h 00m");
    expect(
      formatDurationCompact(86400 + 3 * 3600 + 15 * 60, "en-US"),
    ).toBe("1d 03h 15m");
  });

  it("rounds fractional seconds", () => {
    expect(formatDurationCompact(59.9, "en-US")).toBe("1m");
    expect(formatDurationCompact(60.4, "en-US")).toBe("1m");
  });
});

describe("formatDurationCompact (ru-RU)", () => {
  it("uses Russian unit suffixes with spaces", () => {
    expect(formatDurationCompact(45, "ru-RU")).toBe("45 с");
    expect(formatDurationCompact(125, "ru-RU")).toBe("2 мин 05 с");
    expect(formatDurationCompact(7290, "ru-RU")).toBe("2 ч 01 мин");
    expect(formatDurationCompact(86400 + 3600, "ru-RU")).toBe("1 д 01 ч 00 мин");
  });

  it("renders zero as 0 мин", () => {
    expect(formatDurationCompact(0, "ru-RU")).toBe("0 мин");
  });
});
