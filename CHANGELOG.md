# Changelog

All notable changes to **Streetlifting OS** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Minor versions track Sprint completions during the V1 phase
(Sprint 1 = 0.1.0, Sprint 2 = 0.2.0, …); the first General Availability
release will be 1.0.0 once V1 reaches production-ready quality.

## [Unreleased]

### Added since 0.2.0
- Results screen (`/results`) — by-category grouped tables + absolute ISF-points ranking
- Classic protocol CSV export (PowerTable-compatible column order, UTF-8 BOM)
- **Multirep module (Sprint 3 — blueprint v2 §16)** — full second competition format:
  - `multirep-resolver.ts` — pure preset-load lookup over the (sex × exercise × division × age category) matrix per ISF v5.1 §2.2 (D3); returns null when no preset matches so the operator can override.
  - `multirep-queue.ts` — manual fixed-order queue (entryIndex ASC) per blueprint v2 §9.2; one attempt per athlete per exercise per ISF v5.1 §7.5.
  - `multirep-placing.ts` — full placing pipeline mirror of `classic-placing.ts`. Per D7 + ISF v5.1 §10.9.5: NO additional-points formula for Multirep (Classic only); masters multipliers still apply.
  - `csv-export-multirep.ts` — UTF-8 BOM CSV protocol with PU/DI load + reps columns and group section headers.
  - `commitMultirepAttempt` action on `meet-slice` and `setPendingReps` action on `judging-slice` (resets via `clearPendingVotes`).
  - JudgingPage: top-level Classic / Multirep format selector (auto-routes to whichever format has entries; SegmentedControl when both present). Multirep panel shows auto-resolved preset load badge with manual-override Alert when no preset matches, 120s timer (ISF v5.1 §7.5.1, D10), reps NumberInput (0..200, integer), 3 judge cards, status + split-decision badges, All Good / All No aggregate buttons, Confirm + Skip.
  - ResultsPage: top-level Classic / Multirep format tabs (only shown when both formats present); Multirep tab has byCategory + byPoints sub-tabs and a CSV download button (`multirep-results-${date}.csv`).
- Translations (ru-RU + en-US parity): `judging.format.*`, `judging.multirep.*`, `results.formatTab.*`, `results.multirep.*`.
- **+74 new tests** (multirep-resolver: 15, multirep-queue: 14, multirep-placing: 32, csv-export-multirep: 7, judging-slice +6 for setPendingReps + clearPendingVotes pendingReps reset). Total suite: 353 passing.

### Planned for 0.3.x
- Meet Setup screen — discipline/category/plate editors — blueprint v2 §11.2
- Auto-updater (Ed25519 keypair, Tauri updater endpoint)

---

## [0.2.0] — 2026-04-27

Sprint 2 of the V1 client — Classic judging screen.

### Added
- **`/judging` route** (guarded by `RequireMeet`). Full Classic judging
  screen per blueprint v2 §11.6:
  - PU / DI exercise tabs. Only disciplines enabled in the meet config
    are shown; tab defaults to the first available exercise.
  - **Queue panel** (left) — next 5 athletes in round-system order.
  - **Active-attempt panel** (right) — athlete name, category, bodyweight,
    current round badge, declared load.
  - **60-second countdown timer** — Mantine `RingProgress` circular display
    + large digit readout. Colour states: green (>20 s), orange (10–20 s),
    red (<10 s). Web Audio API beep at 0 s. Start / Stop buttons.
  - **3 judge vote cards** — Left / Center / Right. Green ✓ (Good Lift) and
    red ✗ (No Lift) buttons per card; Reset link to clear an erroneous vote.
  - **Aggregate override buttons** — «Зачёт всем / All Good» and
    «Не зачёт всем / All No» for solo officiating.
  - **Live status badge** — PENDING / GOOD LIFT / NO LIFT, derived
    client-side via `attemptStatusFromVotes()`. Split-decision «2-1» badge
    when all three votes are in and the result is contested.
  - **Confirm attempt** — commits pending votes to `entry.exercises[exercise]
    .attempts[seq]` and advances the queue pointer.
  - **Skip / No-show** — advances without writing votes (athlete absent).
- **`attempt-queue` logic** (`src/logic/isf/attempt-queue.ts`) — pure,
  zero-dependency module. Exports `getCurrentRound`, `buildAttemptQueue`,
  `getActiveItem`. Implements the ISF §7.4.3 round-system sort:
  declared load ASC → bodyweight ASC (`lowerBodyweightFirstTiebreak`) →
  entry-index ASC (lot-order surrogate).
- **`judging-slice`** (`src/store/judging-slice.ts`) — transient Redux slice.
  Timer state and pending votes are held here and are intentionally **not**
  persisted to the save-file (timer state dies on reload by design).
- **`JudgeVoteCard`** component — two-button vote card with highlight state
  and inline reset.
- **`TimerDisplay`** component — reusable circular countdown with prop-driven
  colour theming.
- **`commitAttemptVotes`** action on `meet-slice` — writes judgeVotes (and
  optionally `declaredLoadKg` + `lastDeclarationAt`) to the correct attempt
  slot; creates the attempt record if not yet declared. Sets `dirty = true`.
- **`updateJudgingState`** action on `meet-slice` — persists the active
  entry/sequence pointer so the judging position survives save/load.
- Nav link `Судейство / Judging` added to `AppShell` header.
- Full `judging.*` + `nav.judging` i18n keys in **both** `ru-RU` and `en-US`.
- **ESLint flat config** — migrated from `.eslintrc.cjs` to `eslint.config.js`
  (ESLint 9 flat config). Type-aware rules scoped to `src/**` and `tests/**`
  via `FlatCompat.config().map()`. 10 pre-existing lint errors fixed:
  unnecessary type assertions, useless `try/catch`, `async` event handlers
  (`no-misused-promises`), `useMemo` exhaustive-deps.

### Tests
- **243 unit tests** (up from 167 in 0.1.0 → +55 in hotfixes → +64 Sprint 2).
- `tests/attempt-queue.test.ts` (34) — queue logic: round detection,
  round-system sort, lowerBodyweightFirst toggle, per-entry state machine,
  queue exhaustion.
- `tests/judging-slice.test.ts` (30) — timer state machine (start/stop/tick/
  auto-stop at 0) and vote management (cast/reset/clear).
- `tests/entry-form-schema.test.ts` (+12 from hotfix sprint).

### Changed
- App version badge updated to `v0.2.0-dev` in the `AppShell` header.
- `ci.yml`: lint step enabled (previously commented out).
- All CI workflows: Node 20 → Node 24 (deprecation pre-empted).

### Fixed
- `0.1 kg` precision bug in weigh-in (hotfix after 0.1.0 — landed in `8d80e24`).
- i18n polish pass (hotfix — `8d80e24`).
- Pages workflow: disabled auto-trigger while repo is private; re-enable in
  Settings → Pages when repo is made public.

### Known limitations (carried forward from 0.1.0, updated)
- **No Results screen.** Sprint 3 — coming in 0.3.0.
- **No Classic export.** Sprint 3 — CSV protocol export in 0.3.0.
- **No Multirep.** Sprint 3 — full Multirep workflow in 0.3.0.
- **No code-signing.** Same as 0.1.0 — SmartScreen / Gatekeeper dialogs expected.
- **No auto-updater.** Same as 0.1.0.

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

[Unreleased]: https://github.com/GulianDigital/streetlifting-os/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/GulianDigital/streetlifting-os/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/GulianDigital/streetlifting-os/releases/tag/v0.1.0
