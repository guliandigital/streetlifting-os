# Changelog

All notable changes to **Streetlifting OS** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Minor versions track Sprint completions during the V1 phase
(Sprint 1 = 0.1.0, Sprint 2 = 0.2.0, …); the first General Availability
release will be 1.0.0 once V1 reaches production-ready quality.

## [Unreleased]

### Added
- **Meet schedule page at `/schedule`.** Wall-clock projection of how
  long the meet will run, computed by the existing pure
  `buildSchedulePlan` service over current entries. Total estimate at
  the top, then a day → platform → stream breakdown with per-group
  rows (discipline, exercise, athlete count, duration). Editable
  estimation config (classic attempts per exercise, classic /
  multirep attempt buffer, group setup, stream break) recomputes the
  plan live; values are local-only, persisting them as a MeetState
  extension is V2 work. Pure-logic duration formatter
  (`formatDurationCompact`) handles RU + EN unit suffixes and scales
  from seconds through multi-day; 8 new vitest cases. Sidebar entry
  `📅 Schedule` between `Flight Order` and `Readiness`.
- **Awards ceremony voice announcer (Web Speech API).** When the
  operator is in the fullscreen ceremony view, each new active award
  is read aloud — "First place, Иванов Иван, team Alpha, 330 kg."
  Templates exist for both RU and EN; the locale follows the current
  i18n setting. Stub `playVoicePhrase` in the audio service is now a
  real implementation built on `SpeechSynthesisUtterance`, with a
  `speak(text, locale, settings)` entry point and a `cancelVoice()`
  helper that interrupts the in-flight utterance on every advance and
  on toggle-off (so rapid Next presses don't queue overlapping
  voices). New `voiceEnabled` flag in `audio-slice` (persisted to
  localStorage alongside the existing beep + volume settings) drives a
  Switch on the Awards page header. Cross-browser fallback: if
  `speechSynthesis` is unavailable, the call is a silent no-op so the
  ceremony continues. 15 new vitest cases (announcer wording per
  locale, audio-service speak/cancel/voice-disabled paths via
  happy-dom mock).
- **Duplicate detection in the CSV import modal.** The pure-logic
  `buildImportDuplicatePlan` (in place since the V2 foundation
  groundwork) is now wired into the operator-facing flow on the
  Registration page. After parsing the CSV, the modal shows a yellow
  alert listing rows that match an already-registered athlete (by
  member-id, name+birth-date, or name+sex+country) or repeat within
  the imported file. Each suspected duplicate carries its match-reason
  badge with high/medium confidence colour. Operator picks an import
  mode: `Import all (N)` (current behaviour, creates duplicates) or
  `Skip duplicates (M)` (only auto-create rows that have no matches).
  Per-row "merge into existing" UX is V2.5+ work — for now skip-or-take
  covers the common UAT case (federation imports a roster that
  partially overlaps with already-registered athletes).
- **Awards ceremony cross-tab sync via BroadcastChannel.** Operator
  drives the ceremony from `/awards`; a second tab opened to
  `/display/awards` (new route, mounted outside AppShell so it
  occupies the full viewport) follows in lockstep through the
  `streetlifting-os:awards` BroadcastChannel. Works inside one
  browser context (PWA, two monitors of the same laptop). Tauri
  cross-window sync and remote-judge-style cross-device broadcast
  remain V3 Local Broadcast Publisher work per `architecture-v1.md`
  §4.6. The `/awards` page gains an `Open projector window` button
  next to `Fullscreen` — opens the display route in a new tab. The
  display route shows a `Waiting for the operator tab…` placeholder
  until the first envelope arrives.
- **Awards ceremony fullscreen mode.** The `/awards` page now has an
  in-page fullscreen overlay (toggled via the `Fullscreen` button or
  the `F` key) for projector / hall-screen display during the
  ceremony. Background gradient uses traditional medal accent colours
  (gold #b8860b for place 1, silver #7d7d7d for place 2, bronze
  #8a4a25 for place 3); fonts scale up to 200 px for the place number
  and 96 px for the athlete name. Auto-advance switch (6 s interval)
  for hands-free presentations. Keyboard: `←` / `→` / `Space` / `F` /
  `Esc`. Awards-collection logic was extracted to a pure service
  (`@logic/reports/awards-ceremony`) covered by 15 vitest cases.
- **CSV export for team protocol and medal count.** Federations can now
  download the team standings (one row per team plus one row per scoring
  contributor) and medal-count summary (team and country buckets in one
  file) as UTF-8-with-BOM CSV from the Reports tab on the Print page.
  The print-only versions remain available for paper protocols.

### Fixed
- **`registration/bulkImport` defensive defaults.** Programmatic dispatch
  paths that omitted `day` / `platform` / `flight` previously left those
  fields `undefined` on the resulting Entry, which broke the weigh-in
  order group label ("Day  · Platform  · Flight ") and any downstream
  code that assumed a valid placement triple. `EntryDraft` now marks the
  three fields optional and `buildEntry` defaults missing or
  whitespace-only values to `day=1`, `platform=1`, `flight="A"`. CSV
  import already had its own integer defaults; form-based add/edit paths
  always supply values; this is purely a defensive default at the
  programmatic boundary. 3 new unit tests for `buildEntry` defaults +
  12 tests for the new CSV exporters; full suite **503 / 503**.

---

## [1.3.0] — 2026-04-30

V1.x pre-UAT additions, anchored to the role-driven, full-replacement-for-PowerTable
positioning framing in [`docs/strategy/positioning-vs-powertable.md`](docs/strategy/positioning-vs-powertable.md).
Goal: a meet client honest enough to survive a real ISF tournament before the V2
backend phase begins.

### Added
- **Tournament readiness checklist at `/readiness`** — pre-flight gate before
  judging starts. Twelve structured checks (meet metadata, rules pack,
  categories, plates, entries, weigh-ins, lots, save-file). Severity split
  into blockers vs warnings; `Start judging` is disabled until every blocker
  clears. Each check carries a one-line hint and a direct `Fix` button into
  the page that resolves it.
- **Team protocol print form** — leverages existing `computeTeamScores`,
  prints place / team / total points / scoring contributors / total in team.
- **Record certificates print form** — A5 certificate per `CompetitionRecord`
  set during the meet, with athlete name, discipline, exercise, category, and
  formatted result.
- **Weigh-in order printout** — secretariat queue grouped by
  (day × platform × flight), with lot, name, sex, discipline, weight category,
  bodyweight, and a signature column.
- **Medal-count summary** — by team and by country, with podium tally
  (gold / silver / bronze / total) and stable tie + vacancy place assignment.

### Changed
- `report-registry` now exposes the four new reports alongside the existing
  registry entries, with item counts derived from team scores, new records,
  registered entries, and medal-count rows respectively. The full V2 report
  center (filters, federation templates, multi-language outputs) remains a
  V2 deliverable.
- Sidebar navigation gains a `✅ Readiness` entry positioned between
  `Flight Order` and `Judging`.

### Documentation
- Added [`docs/strategy/positioning-vs-powertable.md`](docs/strategy/positioning-vs-powertable.md)
  capturing the role-driven framing, what we deliberately do not copy from
  PowerTable / PowerGage, and the V1.x backlog that flows from it.
- Updated [`docs/current-implementation-plan.md`](docs/current-implementation-plan.md)
  V1.x backlog with the readiness checklist and the four new reports as
  UAT-blockers, and reordered the immediate-next steps.

### Tests
- Added 28 vitest cases across four new test files
  (`readiness-checklist`, `medal-count`, `weigh-in-order`,
  `record-certificates`). Full suite: 488 passing across 33 files.

### Security
- **Auto-updater signing keypair rotated.** The previous keypair generated
  2026-04-28 (pubkey ID `3EB66068DA9A6A3B`, baked into v1.1.1+ desktop bundle
  configurations) was orphaned during release-CI debugging — its private half
  could no longer be recovered in usable form. A fresh keypair was generated
  2026-04-30 (pubkey ID `AE2CE39D47158968`) and replaces the previous pubkey
  in `app/src-tauri/tauri.conf.json`. Note: v1.1.1 never produced public
  desktop installers (release CI failed on every attempt for that version),
  and v1.1.0 shipped with the placeholder pubkey `dW5zZXQ=`. Therefore no
  installed v1.x desktop user has a working auto-update path — all existing
  desktop users must download v1.3.0 manually. PWA users at
  `https://streetlifting.app/` are unaffected; PWA updates do not depend on
  the desktop signing keypair.

---

## [1.2.0] — 2026-04-30

### Added
- Added the Streetlifting OS brand/logo asset pack across the browser PWA,
  generated public icons, and Tauri desktop bundle icons.
- Added the Athlete/Nomination split foundation so athlete identity can stay
  separate from per-meet entry data before backend onboarding.
- Added RulesPack loading and per-meet pinning foundations with compatibility
  checks for future federation-specific rules.
- Added duplicate-resolution import planning for safer registration imports.
- Added sport-rank computation foundations.
- Added stream/group scheduling and duration estimation foundations.
- Added `npm run pwa:validate` to verify the generated browser PWA artifact
  before CI or GitHub Pages publish it.

### CI
- GitHub Pages deployment now fails before upload if the built PWA is missing
  `index.html`, manifest, service worker files, app assets, manifest icons, or
  the expected `/streetlifting-os/` base-path asset references.

### Documentation
- Updated public production PWA references to `https://streetlifting.app/`,
  with GitHub Pages retained as the public fallback channel.
- Restored GitHub Pages production PWA deployment after making the repository
  public again; `.github/workflows/pages.yml` now deploys on every push to
  `main`.
- Clarified that `docs/current-implementation-plan.md` is the active roadmap,
  historical planning docs remain archives, and GitHub Pages/PWA publication is
  active for the public repository.
- Updated `docs/release-process-v1.md` with the active Pages state and the
  fallback path if the repository must become private again.

### Planned for next minor
- Code-signing (Windows EV cert + Apple Developer ID — both deferred
  pending D40.4 legal entity decision)
- Real-tournament UAT + bug-bash
- Release hardening after live-event validation (installer / updater smoke
  tests, packaging polish as needed)

---

## [1.1.1] — 2026-04-28

Patch release. Activates the auto-updater signing chain so v1.1.1 and
later get over-the-air updates; existing v1.1.0 installs need a manual
re-download once.

### Added
- **Auto-updater signing keypair activated.** The placeholder pubkey
  (`dW5zZXQ=`) in `app/src-tauri/tauri.conf.json` is replaced with the
  real Ed25519 / minisign public key generated 2026-04-28. The matching
  private key lives at `~/.tauri/streetlifting-os.key` on the maintainer
  host (gitignored via `*.key`) and is mirrored to the
  `TAURI_SIGNING_PRIVATE_KEY` GitHub Actions secret. `release.yml` passes
  it (and the optional `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`) to
  `tauri-action`. `bundle.createUpdaterArtifacts` is now `true`, so each
  per-OS bundle gets a sibling `.sig` file plus a `latest.json` is
  uploaded to the release — exactly what the updater endpoint
  (`https://github.com/GulianDigital/streetlifting-os/releases/latest/download/latest.json`)
  expects.

### Migration note (v1.1.0 → v1.1.1)
Existing v1.1.0 installs cannot auto-update to v1.1.1 — their bundle
has the placeholder pubkey baked in and rejects every signed payload.
**Users on v1.1.0 must manually download v1.1.1 once** from
[GitHub Releases](https://github.com/GulianDigital/streetlifting-os/releases/tag/v1.1.1)
and re-run the installer. From v1.1.1 onwards the updater chain works
transparently.

### Known limitations (carried over from 1.1.0)
- Binaries unsigned (no Windows EV cert, no Apple Developer ID).
  SmartScreen / Gatekeeper "open anyway" steps documented in
  `docs/installation-v1.md`.
- ISF cross-competition records archive deferred to V2.

---

## [1.0.0] — 2026-04-28

**V1 General Availability.** Full Classic + Multirep meet management workflow.

### Added
- **Records screen** (`/records`). Per-competition records grouped by
  (discipline → sex → age-category → weight-category × exercise).
  Classic records: best PU kg, best DI kg, best total. Multirep records:
  most reps PU, most reps DI, most reps total. Print button. Empty state.
  "🏅 Records" nav item in sidebar.
- **Real forecast** (`src/logic/isf/forecast.ts`). `ClassicForecastService`
  replaces stub for Classic entries:
  - `predictedPlace` — current intra-group rank by total DESC / BW ASC.
  - `kgToFirstPlace` — delta to leader's total + 1.25 kg minimum increment.
  - `predictedCoefficient` — ISF points on current total.
  - `predictedAbsolutePlace` — cross-category rank by ISF finalPoints.
  `StubForecastService` retained for Multirep.
- **Forecast columns in Results** — absolute-ranking tab now shows
  Pred. Place and To-1st-place columns (computed live, not stored).

### Tests
- **412 unit tests** (up from 363 → 380 → 391 → 412).
- `tests/records.test.ts` (19) — record computation, holder selection,
  multi-exercise/discipline, total=0 exclusion, guest inclusion.
- `tests/forecast.test.ts` (+13) — `ClassicForecastService` place, tiebreak,
  kg-to-first, leader detection, absolute place, guest pass-through.

### Fixed
- Test runner OOM on Windows with 23+ test files: bumped `npm test` to use
  `node --max-old-space-size=4096` and set `NODE_OPTIONS` in CI.

### Known limitations
- Auto-updater pubkey is a placeholder (`dW5zZXQ=`). To activate:
  run `npx @tauri-apps/cli signer generate`, store private key as
  `TAURI_SIGNING_PRIVATE_KEY` GitHub secret, replace pubkey in
  `app/src-tauri/tauri.conf.json`.
- Binaries unsigned (no code-signing certs). Windows SmartScreen /
  macOS Gatekeeper dialogs expected — see `docs/installation-v1.md`.
- ISF cross-competition records archive is V2 work.

---

---

## [0.5.0] — 2026-04-28

Sprint 5 — UI overhaul, keyboard shortcuts, auto-updater infrastructure.

### Added
- **Home dashboard** — complete rewrite. When a meet is open: meet title,
  federation, city, date; 4 stat cards (athletes count, weighed-in count,
  attempts-done / attempts-total, enabled disciplines); progress bar; quick-
  jump buttons to Judging, Results, Registration, Weigh-ins; file path or
  "Не сохранено / Unsaved" indicator. When no meet: welcome screen with
  5-step quick-start guide.
- **Sidebar navigation** — replaced the cramped 7-item header nav with a
  `AppShell.Navbar` (200 px). Header is now clean: app name, ISF badge,
  version badge, language toggle, hamburger for mobile. Sidebar items:
  Home / Setup / Registration / Weigh-ins / Flight Order / Judging /
  Results / About. Disabled items visible but non-interactive when no
  meet is open. Active item highlighted in ISF Red.
- **`/about` page** — version info, ISF Rules version, correctness facts
  table (M6 ×1.150 differentiator, weight-category boundary, additional-
  points formula, ISF coefficient formula), full keyboard shortcuts
  reference, GitHub link, legal notice.
- **Judging keyboard shortcuts** — live on the `/judging` page:
  `Q/A` = Left good/no-lift, `W/S` = Center, `E/D` = Right,
  `Space` = confirm attempt (when all 3 votes cast), `Esc` = clear all.
  Inactive when focus is inside a form element.
- **Auto-updater infrastructure** — `tauri-plugin-updater` registered in
  `lib.rs`; endpoint configured in `tauri.conf.json` pointing at GitHub
  Releases `latest.json`; `@tauri-apps/plugin-updater` added to deps;
  "Check for updates" button in Home page (Tauri only, degrades gracefully
  while pubkey is placeholder). To activate: run
  `npx @tauri-apps/cli signer generate`, store private key as
  `TAURI_SIGNING_PRIVATE_KEY` GitHub secret, replace `pubkey` placeholder
  in `tauri.conf.json` with the generated public key.
- `LICENSE` (MIT), `NOTICE`, `SECURITY.md` added (PR #8).
- New i18n keys: `home.quickStart.*`, `home.stats.*`,
  `home.checkUpdates/updateAvailable/upToDate`, full `about.*` section,
  `nav.about`.

### Tests
- **380 unit tests** (up from 320 → 363 → 380).
- `tests/home-stats.test.ts` (17) — `countWeighedIn`, `countAttemptsDone`,
  `countAttemptsTotal` with edge cases (empty, mixed, record-attempt
  exclusion, multirep entries).

---

### Planned for 0.5.0
- Auto-updater (Ed25519 keypair, Tauri updater endpoint)
- Records module (V2 feature — deferred)
- Beat-to-first-place forecast (V2 — full D16 implementation)

---

## [0.4.0] — 2026-04-28

Sprint 4 — ISF coefficient formula, Meet Setup screen, Flight Order screen.

### Added
- **Real ISF absolute-coefficient formula** (`src/logic/isf/points.ts`).
  Replaces the `1.0` stub with the formula sourced from
  `streetlifting.ru/points/`:
  ```
  Coefficient = 100 / (A − B × e^(−C × bodyweight_kg))
  ```
  with six sets of constants: M/F × PU/DI/PUDI. Points calculations
  now produce correct ISF absolute values (e.g. 80 kg male PU ≈ 0.512,
  70 kg male total ≈ 0.280). OPEN sex and V3 events (MU, SQ) still
  return 1.0 as a safe fallback.
- **`/meet-setup` screen** (guarded by `RequireMeet`). Five tabs:
  - *Основные / Basic* — meet name, federation, country, region, city,
    date, competition format (SegmentedControl), scoring formula (Select),
    masters-adjustment and lower-BW-first toggles (Switch).
  - *Дисциплины / Disciplines* — checkboxes for all 19 ISF disciplines,
    grouped into Classic and Multirep. "Select all Classic / Multirep"
    convenience buttons.
  - *Весовые кат. / Weight Cats* — two-column M/F checklist. Toggle
    adds/removes the full `WeightCategory` object. "Reset to ISF defaults".
  - *Возрастные кат. / Age Cats* — checklist. "Reset to ISF defaults".
  - *Диски / Plates* — inline-editable table (weight, pairs, color,
    record-only flag). Add plate / Remove plate / Reset to ISF defaults.
- **`/flight-order` screen** (guarded by `RequireMeet`). Printable starting
  list grouped by flight. Exercise filter (PU / DI / All). Entries sorted
  by opener load ASC for Classic, lot order for Multirep.
  `window.print()` with `@media print` CSS to suppress navigation.
- **8 new actions on `meet-slice`**: `updateMeetBasics`, `toggleDisciplineCode`,
  `setEnabledDisciplineCodes`, `updatePlate`, `addPlate`, `removePlate`,
  `setWeightCategories`, `setAgeCategories`. All no-op when no meet is open.
- Full `meetSetup.*`, `flightOrder.*`, `nav.meetSetup`, `nav.flightOrder`
  i18n keys in both **ru-RU** and **en-US**.

### Tests
- **363 unit tests** (up from 279 → 320 → 363).
- `tests/isf-coefficient.test.ts` (11) — formula correctness for all
  6 sex×event combinations, edge cases (bw=1, bw=200), fallbacks.
- `tests/meet-slice-setup.test.ts` (24) — all 8 new reducers, including
  no-op-when-null cases.
- `tests/points.test.ts` updated — replaced stub-tolerance assertions with
  formula-verified ranges.
- `tests/classic-placing.test.ts` updated — ISF point checks now use real
  coefficient values.

---

### Planned for 0.4.0
- Meet Setup screen — discipline / category / plate editors — blueprint v2 §11.2
- Auto-updater (Ed25519 keypair, Tauri updater endpoint)
- ISF absolute-coefficient table from streetlifting.ru/points/ (replace stub returning 1.0)

---

## [0.3.0] — 2026-04-28

Sprint 3 of the V1 client — full Multirep module + Results screen.

### Added
- **Results screen** (`/results`, guarded by `RequireMeet`). Three tabs:
  - **По категориям / By Category** — Classic results grouped by
    (sex × age-category × weight-category), tables with attempt columns
    (green = success, red strikethrough = fail), gold/silver/bronze place
    cells, guest rows in italic.
  - **По ISF-очкам / By ISF Points** — flat absolute ranking across all
    Classic non-guest entries sorted by `isfFinalPoints DESC`.
  - **Многоповторный / Multirep** — Multirep results grouped by
    (disciplineCode × sex × age-category × weight-category); shows PU reps,
    DI reps, total reps, preset load, ISF points.
  - Download CSV button — exports Classic + Multirep sections in one file
    (UTF-8 BOM, PowerTable-compatible column order per findings v2 §4.3).
- **`classic-placing.ts`** — pure placing service: `computeClassicRows`,
  `assignPlaces` (tiebreak per ISF §7.10), `groupByCategory`, absolute group.
- **`multirep-placing.ts`** — placing service for Multirep: `computeMultirepRows`,
  `groupMultirepByCategory`, `computeMultirepResults`. Sorts by
  `totalReps DESC → BW ASC → entryIndex ASC`.
- **`multirep-queue.ts`** — pure queue for the Multirep judging panel.
  Entries ordered by lot (entryIndex ASC); done attempts removed.
  PUDI disciplines produce two queue items per entry (one per exercise).
- **Multirep judging** in `/judging` — new tabs for each enabled Multirep
  discipline code. 120 s timer. `NumberInput` for rep count. Confirm
  dispatches `commitMultirepAttempt`. Queue panel shows reps badge.
- **`commitMultirepAttempt`** action on `meet-slice` — creates or updates
  the sequence=1 `MultirepAttempt`; looks up `presetLoadKg` from the ISF
  catalog; sets `dirty = true`.
- **`setPendingReps`** action on `judging-slice`; `clearPendingVotes` now
  also clears `pendingReps`.
- `csv-export-classic.ts`: added `exportMultirepProtocolCsv` for the Multirep
  protocol section.
- Full `multirep.*` + `results.multirepTab` + `judging.presetLoad` i18n keys
  in both **ru-RU** and **en-US**.

### Tests
- **320 unit tests** (up from 167 → 279 → 320).
- `tests/classic-placing.test.ts` (36) — Classic placing service.
- `tests/multirep-placing.test.ts` (19) — Multirep placing service.
- `tests/multirep-queue.test.ts` (17) — Multirep queue logic.
- `tests/judging-slice.test.ts` (+5) — `setPendingReps`, `clearPendingVotes` clears reps.

### Known limitations (updated)
- **ISF coefficient stub.** `isfAbsCoef()` in `points.ts` returns `1.0` for
  all inputs — structural pipeline is correct but absolute-point values are
  placeholders until the coefficient table is scraped from
  `streetlifting.ru/points/`. Sprint 4 work.
- **No Meet Setup UI.** Discipline/category/plate editors are V2 (blueprint
  v2 §11.2). Operators use the ISF v5.1 preset as-is.
- **No code-signing / auto-updater.** Same as 0.2.0.

---

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
  - `docs/user-manual/operator-manual-ru.md` — for federation
    secretaries.
  - `docs/user-manual/quick-start-ru.md` — one-page tournament-day
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
- **2.0.0** — V2 launch (backend billing + reconciliation, RulesPack abstraction,
  audio/reporting expansion).
- **3.0.0** — V3 launch (multi-federation onboarding, athlete passport,
  sanctioning + crypto signing, broadcast surfaces).
- Save-file format is versioned independently via `stateVersion`; a major
  app-version bump does not necessarily change `stateVersion`.

[Unreleased]: https://github.com/GulianDigital/streetlifting-os/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/GulianDigital/streetlifting-os/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/GulianDigital/streetlifting-os/compare/v1.0.0...v1.1.1
[1.0.0]: https://github.com/GulianDigital/streetlifting-os/compare/v0.5.0...v1.0.0
[0.5.0]: https://github.com/GulianDigital/streetlifting-os/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/GulianDigital/streetlifting-os/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/GulianDigital/streetlifting-os/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/GulianDigital/streetlifting-os/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/GulianDigital/streetlifting-os/releases/tag/v0.1.0
