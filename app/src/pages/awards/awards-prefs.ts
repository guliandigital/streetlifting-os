/**
 * Awards-page operator preferences persisted in localStorage.
 *
 * Currently just the auto-advance interval. Order toggle and Voice
 * setting persist via Redux + localStorage already (audio-slice for
 * voice; order is per-session because operators flip it mid-ceremony).
 *
 * Out of redux on purpose — the awards page is the only consumer and
 * the value is a single primitive; no need for a slice.
 */

const KEY = "streetlifting-os.awards-prefs.v1";

export type AwardsPrefs = {
  autoAdvanceSec: number;
};

export function loadAwardsPrefs(defaults: AwardsPrefs): AwardsPrefs {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<AwardsPrefs>;
    return {
      autoAdvanceSec:
        typeof parsed.autoAdvanceSec === "number" &&
        Number.isFinite(parsed.autoAdvanceSec)
          ? parsed.autoAdvanceSec
          : defaults.autoAdvanceSec,
    };
  } catch {
    return defaults;
  }
}

export function saveAwardsPrefs(prefs: AwardsPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Best-effort; the ceremony continues with in-memory state.
  }
}
