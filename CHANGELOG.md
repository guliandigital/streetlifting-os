# Changelog

All notable changes to **Streetlifting OS** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Minor versions track Sprint completions during the V1 phase
(Sprint 1 = 0.1.0, Sprint 2 = 0.2.0, …); the first General Availability
release will be 1.0.0 once V1 reaches production-ready quality.

## [Unreleased]

### Planned for 0.2.0 (Sprint 2)
- Judging UI (3-judge panel, attempt timer, vote capture) — blueprint v2 §11.6
- Auto-updater wired with real Ed25519 keypair (deferred from 0.1.0)
- Final logo replacing the placeholder

---

## [0.1.0] — 2026-04-27

First public release. Sprint 1 of the V1 client (registration + weigh-in).

### Added
- **Domain layer (ISF v5.1, hardcoded for V1).**
  - Types: `Entry`, `MeetState`, `JudgeVotes`, `Discipline`, `ForecastResult`,
    `Exercise` (PU / DI / MU_BAR / MU_RING / SQ), `CompetitionFormat`
    (classic / multirep / weighted_calisthenics) — schema reserves room for
    Sprint 2+ without migration.
  - Presets: ISF v5.1 disciplines, age categories, weight categories
    (M_52 youth/junior-only per D28), plate sets, multirep loads, bodyweight
    minima.
- **Logic (pure, fully unit-tested).**
  - `judge-votes` — 3-judge majority (status computed, never stored).
  - `age` — Masters M5 (60–69) vs M6 (70+ → 1.150) split per ISF v5.1
    §10.9.4. Boundary tests at 60, 69, 70, 80 (primary marketing
    differentiator vs PowerGage / PowerTable, both of which encode the
    pre-v5.1 single 60+ → 1.125 band).
  - `points` — ISF additional-points formula (Masters multipliers, bodyweight
    coefficients).
  - `result` — Classic best-of-3 + total + ISF points.
  - `bodyweight-limits` — minimum bodyweight per discipline / category.
  - `classic-order` — 3-level tiebreak D2B
    (`lowerBodyweightFirstTiebreak` toggle).
  - `forecast` — service stub (D16).
  - `weight-category-resolver` — pure, ISF §7.2 boundary
    (`minKg < bw ≤ maxKg`). Honors M_52 youth/junior restriction;
    sex-restricted.
  - `lot-assignment` — Fisher-Yates shuffle + mulberry32 seeded PRNG
    for deterministic draws.
  - `csv-import` — papaparse-based, forgiving (collects errors per row),
    tolerates header aliases (case-insensitive, snake_case).
  - `csv-export` — UTF-8 BOM + papaparse unparse (Cyrillic opens cleanly
    in Excel).
- **Persistence.**
  - `stateVersion: "2"` save-files; v1 → v2 migration pipeline.
  - zod-validated decode; signed-save scaffolding reserved for V2.
  - `storage.ts` runtime-detects Tauri vs browser:
    Tauri → native dialog + `@tauri-apps/plugin-fs`;
    browser → anchor download + `<input type="file">`.
- **UI (Mantine 7 + Redux Toolkit + react-router 7 + i18next).**
  - `AppShell` with routes `/`, `/registration`, `/weigh-ins` (the latter two
    guarded by `RequireMeet`).
  - `/` Home — new / load / save meet.
  - `/registration` — DataTable CRUD, react-hook-form + zod modal,
    CSV import preview + per-row errors, CSV export, lot draw with seed,
    counters by sex / age / weight.
  - `/weigh-ins` — inline NumberInput (0.1 kg step), reweigh, auto-resolved
    weight + age categories, per-row + bulk confirm.
- **i18n.** ru-RU + en-US parity from day 1 across every user-visible string.
- **Theming.** ISF Red `#C8102E` (Mantine 10-shade gamma in `theme.ts`).
- **PWA.** Browser fallback for users without admin rights to install the
  desktop app. Manifest + service worker registered automatically
  (disabled in Tauri builds).
- **Tauri 2 desktop bundle.**
  - Targets: Windows MSI + NSIS (per-user install — no admin), macOS
    universal DMG (x86_64 + ARM64), Linux AppImage + DEB.
  - Window: 1400×900 default, 1024×700 minimum.
  - Save-files via native dialog → user-selected path
    (default suggestion in `appDataDir`).
- **CI/CD.**
  - `ci.yml` — typecheck + unit tests + lint + Vite build on every push / PR.
  - `release.yml` — `tauri-action` matrix (Windows / macOS-universal / Linux)
    triggered on `v*.*.*` tags; produces draft GitHub Release with bundled
    artifacts.
  - `pages.yml` — deploys the PWA to GitHub Pages on every push to `main`.
- **Documentation.**
  - `docs/openlifter-isf-implementation-blueprint-v2.md` — Sprint 1 spec.
  - `docs/architecture-v1.md` — six-layer V1–V5 architecture.
  - `docs/decisions-v1.md` … `decisions-v4.md` — D1–D45 decision log.
  - `docs/competitor-federation-research-v1.md` — IPF / IWF / WADA / ITA
    reference for V3+ work.
  - `docs/release-process-v1.md` — release procedure + code-signing setup.
  - `docs/installation-v1.md` — end-user install guide for each OS.
  - `docs/brand/brand-guidelines-v1.md` — colour, typography, voice.
  - `docs/brand/icon-generation.md` — icon pipeline (single-source SVG).
  - `docs/user-manual/operator-manual-v0.1.0-ru.md` — for federation
    secretaries.
  - `docs/user-manual/quick-start-v0.1.0-ru.md` — one-page tournament-day
    cheat-sheet.

### Tests
- 167 unit tests passing across `src/domain`, `src/logic/isf`,
  `src/persistence`, `src/store`, `src/pages/registration`,
  `src/pages/weigh-ins`. Mandatory boundary tests in `tests/age.test.ts`
  and `tests/points.test.ts` — **do not weaken** (correctness differentiator).

### Known limitations
- **No judging UI.** Sprint 2 — coming in 0.2.0.
- **No backend.** All state is local; no billing / sanctioning / publishing
  yet. V2 work.
- **No code-signing.** Windows binaries trigger SmartScreen; macOS DMG
  triggers Gatekeeper. See `docs/installation-v1.md` for the per-OS
  "open anyway" steps. Code-signing pipeline is wired in `release.yml`
  (commented), waiting on the EV cert / Apple Developer ID purchases —
  see `docs/release-process-v1.md` §Code-signing.
- **No auto-updater.** Endpoint stub deferred to 0.2.0 — needs Ed25519
  keypair generation (`tauri signer generate`).
- **Linux .icns is a PNG stub** when generated by `npm run icons:generate`.
  CI replaces it with a real `.icns` via the Tauri CLI on macOS runners.
  For local Linux dev, the placeholder is harmless.
- **`npm run lint` is currently no-op.** ESLint 9 requires a flat config
  (`eslint.config.js`) which isn't in place yet — typecheck + tests are the
  quality gates for v0.1.x. Lint setup is on the v0.2.0 backlog.

### Compatibility
- Node 20+, Rust stable (only required for desktop builds).
- Save-file format: `stateVersion: "2"` (V1 baseline). Future breaking
  changes ship a migration; old files keep loading via the migration
  pipeline forever.

---

## Versioning policy

- **0.X.Y** — V1 sprints. Each Sprint completion = minor bump.
- **1.0.0** — V1 General Availability (ISF v5.1 hardcoded, client-only,
  judging + result calculation + audit trail polished).
- **2.0.0** — V2 launch (backend, RulesPack abstraction, multi-federation).
- Save-file format is versioned independently via `stateVersion`; a major
  app-version bump does not necessarily change `stateVersion`.

[Unreleased]: https://github.com/GulianDigital/streetlifting-os/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/GulianDigital/streetlifting-os/releases/tag/v0.1.0
