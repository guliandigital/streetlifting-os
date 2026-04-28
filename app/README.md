# Streetlifting OS — Client

Offline-first ISF Streetlifting & Calisthenics meet client. Browser-first PWA, wrapped in Tauri 2 for desktop distribution.

For per-release notes and current version, see [`../CHANGELOG.md`](../CHANGELOG.md). For the public-facing landing and downloads, see <https://streetlifting.app>.

## Installation (end users)

Pre-built installers for Windows / macOS / Linux are attached to each GitHub Release:

→ **<https://github.com/GulianDigital/streetlifting-os/releases/latest>**

Step-by-step instructions for every OS (including the SmartScreen / Gatekeeper bypass for unsigned binaries) live in [`../docs/installation-v1.md`](../docs/installation-v1.md).

If you can't install software, run the PWA in your browser instead: <https://guliandigital.github.io/streetlifting-os/>. It still works fully offline once loaded.

## What's in this directory

```
app/
├── src/
│   ├── app/                       App shell, theme, root component
│   ├── pages/                     Route components (Home, About, MeetSetup,
│   │                              Registration, WeighIns, FlightOrder,
│   │                              Judging, Results, Records, Scoreboard,
│   │                              Print)
│   ├── components/                Reusable UI components (judge-vote-card,
│   │                              timer-display, …)
│   ├── store/                     Redux Toolkit store (meet-slice, judging-slice)
│   ├── domain/
│   │   ├── models/                TypeScript types — Entry, MeetState,
│   │   │                          JudgeVotes, MultirepAttempt, …
│   │   └── presets/               ISF v5.1 hardcoded constants
│   │                              (V2 → RulesPack abstraction)
│   ├── logic/isf/                 Pure functions — judge-votes, age, masters,
│   │                              scoring, attempt-queue, classic-placing,
│   │                              multirep-placing, multirep-queue,
│   │                              isf-coefficient, forecast (Classic),
│   │                              records, team-scoring
│   ├── persistence/               Save/load + migrations
│   └── translations/              ru-RU + en-US i18next bundles
├── src-tauri/                     Rust backend (window, fs/dialog plugins;
│                                  V2 + license + crypto)
├── tests/                         Vitest unit tests
├── public/                        Static assets, PWA manifest
├── package.json                   Dependencies (Vite, React, Mantine,
│                                  Redux Toolkit, Tauri, …)
├── vite.config.ts                 Vite + PWA plugin
├── vitest.config.ts               Test runner config (happy-dom)
├── tsconfig.json                  TypeScript strict mode + path aliases
└── README.md                      This file
```

## Routes

Most routes are guarded by `RequireMeet` — a meet must be opened or created before they're reachable. Exceptions: `/`, `/about`, and `/scoreboard` (designed to be projected on a public display, may pull state from a separate window).

| Route | Description | Guard |
|---|---|---|
| `/` | Home — dashboard with meet stats, quick-start guide, save / load / new | none |
| `/about` | About — version, correctness facts, keyboard shortcuts, legal notice | none |
| `/meet-setup` | 5-tab meet configuration (Basic / Disciplines / Weight cats / Age cats / Plates) | RequireMeet |
| `/registration` | Athlete CRUD, CSV import / export, lot draw | RequireMeet |
| `/weigh-ins` | Bodyweight + reweigh, auto-resolved categories, bulk confirm | RequireMeet |
| `/flight-order` | Printable starting list grouped by flight | RequireMeet |
| `/judging` | Classic 60 s + Multirep 120 s judging with keyboard shortcuts | RequireMeet |
| `/results` | By-category + ISF-points + Multirep tabs + team scoring + Download CSV | RequireMeet |
| `/records` | Per-competition records by discipline × age × weight (PU / DI / total, multirep reps) | RequireMeet |
| `/scoreboard` | Public-display board for projector / TV: current athlete, attempts, timer | none |
| `/print` | Printable forms — protocol, registration cards, certificates | RequireMeet |

## Keyboard shortcuts (judging screen)

| Key | Action |
|---|---|
| `Q` / `A` | Left judge: Good / No Lift |
| `W` / `S` | Center judge: Good / No Lift |
| `E` / `D` | Right judge: Good / No Lift |
| `Space` | Confirm attempt (when all three votes cast) |
| `Esc` | Clear all pending votes |

Shortcuts are inactive when focus is inside a form element.

## CSV format (registration import / export)

Header row required. Required columns: `name`, `sex`, `division`, `disciplineCode`. Optional:

```
birthDate (YYYY-MM-DD), country, day, platform, flight, team, memberId,
guest, instagram, notes, bodyweightKg, reweighKg
```

Header aliases tolerated: case-insensitive, snake_case (e.g. `Bodyweight_Kg` → `bodyweightKg`). Booleans accept `1/0/true/false/yes/no`. Numeric fields accept `.` decimal separator only. Export adds two read-only columns: `assignedWeightCategoryCode`, `assignedAgeCategoryCode`. Files are UTF-8 with BOM so Excel opens cyrillic correctly.

## Building from source

### Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 20.x | LTS recommended |
| npm | 10.x (ships with Node 20) | |
| Rust | stable (≥ 1.77) | only for desktop builds — install via <https://rustup.rs> |
| Microsoft C++ Build Tools | "Desktop development with C++" workload | Windows only — install via Visual Studio Installer |
| Linux system deps | `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev libssl-dev patchelf` | apt names; see distro equivalents in `../docs/release-process-v1.md` |

### Commands

```bash
cd app
npm install
npm run icons:generate   # placeholder PNG/ICO/ICNS from docs/brand/logo-placeholder.svg

# Web / PWA mode
npm run dev              # Vite dev server (browser at http://127.0.0.1:1420)
npm run test             # Vitest unit tests
npm run typecheck        # tsc --noEmit (strict)
npm run lint             # ESLint (flat config)
npm run build            # Production PWA build to dist/

# Desktop / Tauri mode (requires Rust toolchain)
npm run tauri:dev        # Live-reload desktop dev window
npm run tauri:build      # Per-OS installer in src-tauri/target/release/bundle/
```

The Tauri CLI also produces a real macOS `.icns` (sharp's stub is a renamed PNG):

```bash
cd app
npx @tauri-apps/cli icon ../docs/brand/logo-placeholder.svg
```

Run that on a macOS host before `tauri:build` if you're cutting a Mac release locally. The Release CI workflow does it automatically.

### Release process

See [`../docs/release-process-v1.md`](../docs/release-process-v1.md) for the full pre-release checklist, tagging procedure, code-signing roadmap, and CI troubleshooting.

## Critical correctness fact (test fixture mandatory)

**Masters M5 (60–69) and M6 (70+ → 1.150) per ISF v5.1 §10.9.4.**

Both PowerGage and PowerTable encode the pre-v5.1 single 60+ → 1.125 band. Streetlifting OS is the only product that scores 70+ correctly with the M6 1.150 multiplier.

`tests/age.test.ts` includes mandatory boundary tests at ages 60, 69, 70, 80. **Do not remove or weaken these tests** — they are the primary marketing differentiator.

## Source-of-truth documents

- [`../docs/openlifter-isf-implementation-blueprint-v2.md`](../docs/openlifter-isf-implementation-blueprint-v2.md) — V1 spec
- [`../docs/architecture-v1.md`](../docs/architecture-v1.md) — six-layer system architecture
- [`../docs/decisions-v1.md`](../docs/decisions-v1.md), [`v2`](../docs/decisions-v2.md), [`v3`](../docs/decisions-v3.md), [`v4`](../docs/decisions-v4.md) — D1–D45 decision history
- [`../docs/rules-pack-spec-v1.md`](../docs/rules-pack-spec-v1.md) — V2 RulesPack format
- [`../docs/release-process-v1.md`](../docs/release-process-v1.md) — release procedure + code-signing
- [`../docs/installation-v1.md`](../docs/installation-v1.md) — end-user install guide
- [`../docs/user-manual/operator-manual-ru.md`](../docs/user-manual/operator-manual-ru.md) — operator manual (RU)

## Architecture invariants (do not violate)

1. **Offline-first.** No blocking server calls during a meet. Tournament-day workflow must complete with the network unplugged.
2. **Domain logic is pure.** Files under `src/logic/isf/` and `src/domain/` are deterministic, side-effect-free, fully unit-tested.
3. **No code copied from OpenLifter / PowerGage / PowerTable.** Reference reads only; clean-room implementations.
4. **Save-files versioned.** `stateVersion: "2"` is the V1 baseline; every breaking change increments it and ships a migration.
5. **RU + EN parity from day 1.** Every user-visible string has both locales.
6. **3-judge majority** for every attempt. `status` is computed from `judgeVotes`, never stored.
7. **`AttemptStatus` is derived, never persisted.** Always recomputed from `judgeVotes` via `attemptStatusFromVotes()`.

## Roadmap (high-level)

- **V1 GA (1.0.0)** ✅ shipped — Records module + real Classic forecast.
- **V1.1** ✅ shipped — Team scoring, public scoreboard (`/scoreboard`), print forms (`/print`), routing pass.
- **V1.x remaining** — Code-signing (Windows EV + Apple Developer ID), auto-updater pubkey activation, real-tournament UAT, cross-competition records archive.
- **V2** — Backend (online registration, billing + reconciliation), RulesPack abstraction, audio system, awards ceremony, OpenPowerlifting export.
- **V3** — Multi-federation onboarding (WSF, НАП, FinalRep), athlete passport, sanctioning + crypto signing, broadcast publisher.
- **V4** — WC sport, audit & enforcement, judge certification system.
- **V5** — Federated records, mobile companion app.

For per-version detail see [`../CHANGELOG.md`](../CHANGELOG.md).
