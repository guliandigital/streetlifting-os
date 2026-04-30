/**
 * Awards preferences localStorage roundtrip tests.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { loadAwardsPrefs, saveAwardsPrefs } from "@pages/awards/awards-prefs";

const KEY = "streetlifting-os.awards-prefs.v1";

describe("awards-prefs persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns defaults when nothing is stored", () => {
    expect(loadAwardsPrefs({ autoAdvanceSec: 6 })).toEqual({
      autoAdvanceSec: 6,
    });
  });

  it("round-trips a saved value", () => {
    saveAwardsPrefs({ autoAdvanceSec: 12 });
    expect(loadAwardsPrefs({ autoAdvanceSec: 6 })).toEqual({
      autoAdvanceSec: 12,
    });
  });

  it("falls back to defaults when stored JSON is malformed", () => {
    window.localStorage.setItem(KEY, "{not json");
    expect(loadAwardsPrefs({ autoAdvanceSec: 6 })).toEqual({
      autoAdvanceSec: 6,
    });
  });

  it("falls back to defaults when stored value has wrong type", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ autoAdvanceSec: "fast" }));
    expect(loadAwardsPrefs({ autoAdvanceSec: 6 }).autoAdvanceSec).toBe(6);
  });

  it("falls back to defaults when stored value is non-finite", () => {
    window.localStorage.setItem(KEY, JSON.stringify({ autoAdvanceSec: NaN }));
    // JSON.stringify(NaN) is "null" — gets caught by the type check and defaulted.
    expect(loadAwardsPrefs({ autoAdvanceSec: 6 }).autoAdvanceSec).toBe(6);
  });

  it("ignores extra keys in stored payload", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ autoAdvanceSec: 8, extra: "foo" }),
    );
    expect(loadAwardsPrefs({ autoAdvanceSec: 6 })).toEqual({
      autoAdvanceSec: 8,
    });
  });
});
