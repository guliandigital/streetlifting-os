/**
 * Human-readable duration formatting for the schedule planner.
 *
 * Renders e.g. 7325s → "2h 02m" (Western) / "2 ч 02 мин" (Russian).
 * Days kick in at 24h+ for multi-day meet projections. Output is
 * deterministic, so tests don't need a clock.
 */

export type DurationLocale = "ru-RU" | "en-US";

const UNITS = {
  "ru-RU": { d: "д", h: "ч", m: "мин", s: "с" },
  "en-US": { d: "d", h: "h", m: "m", s: "s" },
};

export function formatDurationCompact(
  totalSeconds: number,
  locale: DurationLocale = "en-US",
): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    const u = UNITS[locale];
    return locale === "ru-RU" ? `0 ${u.m}` : `0${u.m}`;
  }

  const u = UNITS[locale];
  const sec = Math.round(totalSeconds);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  const parts: string[] = [];
  const pad = (n: number): string => String(n).padStart(2, "0");

  if (days > 0) {
    parts.push(locale === "ru-RU" ? `${days} ${u.d}` : `${days}${u.d}`);
    parts.push(locale === "ru-RU" ? `${pad(hours)} ${u.h}` : `${pad(hours)}${u.h}`);
    parts.push(locale === "ru-RU" ? `${pad(minutes)} ${u.m}` : `${pad(minutes)}${u.m}`);
    return parts.join(" ");
  }

  if (hours > 0) {
    parts.push(locale === "ru-RU" ? `${hours} ${u.h}` : `${hours}${u.h}`);
    parts.push(locale === "ru-RU" ? `${pad(minutes)} ${u.m}` : `${pad(minutes)}${u.m}`);
    return parts.join(" ");
  }

  if (minutes > 0) {
    parts.push(locale === "ru-RU" ? `${minutes} ${u.m}` : `${minutes}${u.m}`);
    if (seconds > 0) {
      parts.push(locale === "ru-RU" ? `${pad(seconds)} ${u.s}` : `${pad(seconds)}${u.s}`);
    }
    return parts.join(" ");
  }

  return locale === "ru-RU" ? `${seconds} ${u.s}` : `${seconds}${u.s}`;
}
