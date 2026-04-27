# Streetlifting OS — Client (v0.1.0)

Offline-first ISF Streetlifting & Calisthenics meet client. Browser-first PWA, wrapped in Tauri 2 for desktop distribution.

**Status as of 2026-04-27**: Sprint 1 complete (10/10). 167 unit tests passing across domain, logic, persistence, registration & weigh-in.

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
│   ├── pages/                     Route components (Home, MeetSetup, Registration, …)
│   ├── components/                Reusable UI components (judge-vote-card, timer-display, …)
│   ├── store/                     Redux Toolkit store (slices wired in Sprint 1 items 4 + 5)
│   ├── domain/
│   │   ├── models/                TypeScript types — Entry, MeetState, JudgeVotes, …
│   │   └── presets/               ISF v5.1 hardcoded constants (V2 → RulesPack abstraction)
│   ├── logic/isf/                 Pure functions — judge-votes, age, masters, scoring
│   ├── persistence/               Save/load + migrations
│   └── translations/              ru-RU + en-US i18next bundles
├── src-tauri/                     Rust backend (window, fs/dialog plugins; V2 + license + crypto)
├── tests/                         Vitest unit tests (judge-votes, age, additional points)
├── public/                        Static assets, PWA manifest
├── package.json                   Dependencies (Vite, React, Mantine, Redux Toolkit, Tauri, …)
├── vite.config.ts                 Vite + PWA plugin
├── vitest.config.ts               Test runner config (happy-dom, 80% coverage thresholds)
├── tsconfig.json                  TypeScript strict mode + path aliases
└── README.md                      This file
```

## Sprint 1 status — 10/10

| Item | Status |
|---|---|
| 1. Bootstrap client app (Vite + React + TS + Redux Toolkit + Tauri) | ✓ |
| 2. Domain types (JudgeVotes, Discipline, ForecastResult, Entry, MeetState, …) | ✓ |
| 3. ISF v5.1 presets (disciplines, age, weight, plates, multirep loads, BW limits) | ✓ |
| 4. Save/load with `stateVersion: "2"` + v1→v2 migration | ✓ |
| 5. Registration CRUD (CSV import/export, lot draw, modal form, counters) | ✓ |
| 6. Weigh-in for Classic (inline editing, auto-resolved categories, reweighKg) | ✓ |
| 7. Result calculation for Classic (best, total, ISF points) | ✓ — `result.ts`, `points.ts`, `age.ts`, `bodyweight-limits.ts` |
| 8. Classic order logic (D2B 3-level tiebreak, lowerBodyweightFirstTiebreak toggle) | ✓ |
| 9. Judge-votes domain (D15) | ✓ |
| 10. Forecast service stub (D16) | ✓ |

## Routes

- `/` — Home (new / load / save meet)
- `/registration` — athlete CRUD, CSV import/export, lot draw (guarded — needs an open meet)
- `/weigh-ins` — bodyweight + reweigh inline editing, auto-resolved categories, confirm (guarded)

## CSV format (registration import/export)

Header row required. Required columns: `name`, `sex`, `division`, `disciplineCode`. Optional:

```
birthDate (YYYY-MM-DD), country, day, platform, flight, team, memberId,
guest, instagram, notes, bodyweightKg, reweighKg
```

Header aliases tolerated: case-insensitive, snake_case (e.g. `Bodyweight_Kg` → `bodyweightKg`).
Booleans accept `1/0/true/false/yes/no`. Numeric fields accept `.` decimal separator only.
Export adds two read-only columns: `assignedWeightCategoryCode`, `assignedAgeCategoryCode`.
Files are UTF-8 with BOM so Excel opens cyrillic correctly.

## Building from source

### Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 20.x | LTS recommended |
| npm | 10.x (ships with Node 20) | |
| Rust | stable (≥ 1.77) | only for desktop builds — install via <https://rustup.rs> |
| Microsoft C++ Build Tools | "Desktop development with C++" workload | Windows only — install via Visual Studio Installer |
| Linux system deps | `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev libssl-dev patchelf` | apt names; see distro equivalents in `docs/release-process-v1.md` |

### Commands

```bash
cd app
npm install
npm run icons:generate   # placeholder PNG/ICO/ICNS from docs/brand/logo-placeholder.svg

# Web / PWA mode
npm run dev              # Vite dev server (browser at http://127.0.0.1:1420)
npm run test             # Vitest unit tests
npm run typecheck        # tsc --noEmit (strict)
npm run lint             # ESLint
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

- [`../docs/openlifter-isf-implementation-blueprint-v2.md`](../docs/openlifter-isf-implementation-blueprint-v2.md) — Sprint 1 spec
- [`../docs/architecture-v1.md`](../docs/architecture-v1.md) — six-layer system architecture
- [`../docs/decisions-v1.md`](../docs/decisions-v1.md), [`v2`](../docs/decisions-v2.md), [`v3`](../docs/decisions-v3.md) — D1–D40 decision history
- [`../docs/rules-pack-spec-v1.md`](../docs/rules-pack-spec-v1.md) — V2 RulesPack format

## Architecture invariants (do not violate)

1. **Offline-first.** No blocking server calls during a meet. Tournament-day workflow must complete with the network unplugged.
2. **Domain logic is pure.** Files under `src/logic/isf/` and `src/domain/` are deterministic, side-effect-free, fully unit-tested.
3. **No code copied from OpenLifter / PowerGage / PowerTable.** Reference reads only; clean-room implementations.
4. **Save-files versioned.** `stateVersion: "2"` is the V1 baseline; every breaking change increments it and ships a migration.
5. **RU + EN parity from day 1.** Every user-visible string has both locales.
6. **3-judge majority** for every attempt. `status` is computed from `judgeVotes`, never stored.

## Roadmap (high-level)

- **V1** (Sprint 1–3) — ISF v5.1 hardcoded, client-only, no backend, save-files local
- **V2** — Backend (billing + reconciliation), RulesPack abstraction, audio system, awards ceremony, OpenPowerlifting export
- **V3** — Multi-federation onboarding (WSF, НАП, FinalRep), athlete passport, sanctioning + crypto signing, broadcast publisher
- **V4** — WC sport, audit & enforcement, judge certification system
- **V5** — Federated records, mobile companion app
