# Streetlifting OS

Open-source, offline-first software for running streetlifting & calisthenics meets to ISF v5.1 rules.

→ **<https://streetlifting.app>** — landing, downloads, project page

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-blue)](#downloads) [![Tests](https://img.shields.io/badge/tests-428%20passing-brightgreen)](#status) [![Version](https://img.shields.io/badge/version-1.1.1-blue)](CHANGELOG.md)

---

## What it does

Streetlifting OS replaces the spreadsheets and homemade scripts that secretariats use to run streetlifting competitions. It runs entirely on the organizer's laptop — no internet required during the meet.

| Phase | What the software does |
|---|---|
| **Meet setup** | Configure disciplines, weight & age categories, available plates |
| **Registration** | Add athletes (manual / CSV import), draw lots |
| **Weigh-in** | Record bodyweight, auto-resolve weight & age categories, allow re-weigh |
| **Flight order** | Generate printable starting list grouped by flight |
| **Judging** | Run the meet — Classic 60 s timer, Multirep 120 s timer, 3-judge voting with keyboard shortcuts |
| **Results** | Placings by category + ISF-coefficient absolute ranking + team scoring + CSV export |
| **Records** | Per-meet records by discipline × age × weight category |
| **Scoreboard** | Public-display board for projector / TV — current athlete, attempts, timer |
| **Print forms** | Protocol, registration cards, certificates |

## Why a dedicated tool

Existing free tools (OpenLifter, OpenPowerlifting, …) are powerlifting-first. They don't handle:

- ISF Multirep (max-reps with fixed load) — separate timer, separate placing logic
- ISF absolute coefficient (`100 / (A − B·e^(−C·bw))`) with the six M/F × PU/DI/PUDI constants
- Masters M5 (60–69) ×1.125 / **M6 (70+) ×1.150** split per ISF v5.1 §10.9.4 — Streetlifting OS is the only product that scores 70+ correctly
- Weight-category boundary `minKg < bw ≤ maxKg` per ISF §7.2 (open-interval lower)
- Russian-language UX as a first-class citizen (RU + EN parity from day 1)

Existing commercial tools (PowerTable, PowerGage) are Russian-market 1С products: closed-source, Windows-only, powerlifting-shaped.

## Status

**v1.1.1** — current stable release. V1 GA shipped in **1.0.0** (2026-04-28); follow-up **1.1.x** releases hardened distribution and operations. **428 unit tests** pass across 24 test files. TypeScript strict, ESLint clean. The full meet workflow works end-to-end on Windows / macOS / Linux.

Recent milestones:
- **1.0.0** — full Classic + Multirep meet workflow, records screen, real Classic forecast
- **1.1.0** — team scoring, public scoreboard, print forms
- **1.1.1** — auto-updater signing chain activated (`tauri.conf.json` pubkey + updater artifacts)

Remaining V1.x gates before declaring the product fully production-hardened:
- Code-signing (Windows EV cert + Apple Developer ID) — eliminates SmartScreen / Gatekeeper warnings on install
- Real-tournament UAT + bug-bash on a live ISF event
- Post-signing installer / update smoke tests on Windows, macOS, Linux

For per-release detail see [CHANGELOG.md](CHANGELOG.md).

## Roadmap

- **V1.x hardening** — finish code-signing, run live-tournament UAT, polish packaging and update flows
- **V2** — backend for billing + reconciliation, RulesPack abstraction, audio system, awards ceremony, OpenPowerlifting export, athlete↔nomination split, stream/group scheduling, sport-rank computation, cross-competition records archive
- **V3** — multi-federation onboarding (WSF, НАП, FinalRep), athlete passport, sanctioning + crypto signing, local broadcast publisher, OBS/share-link broadcast surfaces
- **V4** — Weighted Calisthenics sport support, audit & enforcement workflows, judge certification system
- **V5** — federated records and a focused mobile companion app

## Downloads

Each release builds installers for all three platforms — see the [latest release](https://github.com/GulianDigital/streetlifting-os/releases/latest):

- **Windows** — MSI / NSIS (per-user install, no admin)
- **macOS** — universal DMG (Intel + Apple Silicon)
- **Linux** — AppImage / DEB

Browser PWA publication is currently blocked while the repository is private on
a GitHub Free plan. The historical Pages URL was
<https://guliandigital.github.io/streetlifting-os/> and will work offline once
restored and loaded. Until Pages is restored, use the desktop release bundles.

Per-OS install instructions, including SmartScreen / Gatekeeper bypass for the (currently unsigned) binaries: [docs/installation-v1.md](docs/installation-v1.md).

## Documentation

**For organizers / federation secretaries (Russian):**
- [docs/user-manual/quick-start-ru.md](docs/user-manual/quick-start-ru.md) — 5-minute first-time setup
- [docs/user-manual/operator-manual-ru.md](docs/user-manual/operator-manual-ru.md) — full operator guide

**For developers / contributors:**
- [app/README.md](app/README.md) — code layout, build commands, architecture invariants
- [docs/current-implementation-plan.md](docs/current-implementation-plan.md) — current V1.x–V5 implementation roadmap
- [docs/architecture-v1.md](docs/architecture-v1.md) — six-layer V1–V5 architecture
- [docs/openlifter-isf-implementation-blueprint-v2.md](docs/openlifter-isf-implementation-blueprint-v2.md) — historical V1 implementation spec
- [docs/decisions-v1.md](docs/decisions-v1.md) … [v4](docs/decisions-v4.md) — D1–D45 decision log
- [docs/release-process-v1.md](docs/release-process-v1.md) — release procedure + code-signing
- [docs/rules-pack-spec-v1.md](docs/rules-pack-spec-v1.md) — V2 RulesPack format

**Reference / research:**
- [docs/competitor-federation-research-v1.md](docs/competitor-federation-research-v1.md) — IPF / IWF / WADA / ITA models
- [docs/powertable-findings-v4.md](docs/powertable-findings-v4.md) — closed-source competitor capture
- [docs/reference-comparison-v1.md](docs/reference-comparison-v1.md) — feature matrix vs OpenLifter / PowerGage / PowerTable
- [docs/brand/brand-guidelines-v1.md](docs/brand/brand-guidelines-v1.md) — colour, typography, voice
- [docs/legal/](docs/legal/) — draft legal templates (DPA, SaaS license, revenue share, brand license)

## Architecture invariants

These are non-negotiable across all releases:

1. **Offline-first.** No blocking server calls during a meet. Tournament-day workflow must complete with the network unplugged.
2. **Domain logic is pure.** Files under `app/src/logic/isf/` and `app/src/domain/` are deterministic, side-effect-free, and fully unit-tested.
3. **Clean-room implementation.** No code copied from OpenLifter / PowerGage / PowerTable. Reference reads only.
4. **Save-files versioned.** `stateVersion: "2"` is the V1 baseline; every breaking change increments it and ships a migration. Old files keep loading forever via the migration pipeline.
5. **RU + EN parity from day 1.** Every user-visible string has both locales.
6. **3-judge majority.** `AttemptStatus` is derived from `judgeVotes` via `attemptStatusFromVotes()`, never stored.
7. **Mandatory boundary tests.** `tests/age.test.ts` includes age 60 / 69 / 70 / 80 boundary tests for the M5/M6 split — do not weaken.

## Building from source

See [app/README.md § Building from source](app/README.md#building-from-source) for prerequisites and commands. TL;DR: `cd app && npm install && npm run dev`.

## License

MIT — see [LICENSE](LICENSE). Trademark and brand restrictions documented in [NOTICE](NOTICE).

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## Author

Streetlifting OS is built by **Gulian Digital** under a dual-jurisdiction structure:

- **🇷🇺 ИП Гулян А. Г.** (Russia) — operator for the RU/CIS market, 152-FZ-compliant. *Active track for V1.*
- **🌍 ООО «Гулян Диджитал»** (Armenia) — operator for the international market, GDPR-compliant. *V2+ track.*

GitHub: <https://github.com/GulianDigital/streetlifting-os> · Site: <https://streetlifting.app>
