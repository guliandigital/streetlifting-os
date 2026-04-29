# Streetlifting OS — Current Implementation Plan

Date: 2026-04-29
Status: canonical implementation roadmap after V1 GA and the PowerTable / PowerGage review.

This document supersedes roadmap sections in historical V1 planning docs when they conflict:

- `docs/tz-v1.md` — historical V1 terms of reference.
- `docs/openlifter-isf-implementation-blueprint-v2.md` — historical V1 implementation blueprint.
- `docs/reference-comparison-v1.md` — historical comparison from the V1 planning phase.

Those documents remain useful as requirements and research archives. The active product plan below is the source of truth for what we build next.

For the strategic framing behind these phases — why we are replacing PowerTable / PowerGage rather than cloning them, and why the architecture is role-driven rather than time-axis driven — see `docs/strategy/positioning-vs-powertable.md`.

For parallel V1.x implementation work, use `docs/integration-contracts-v1.md` as the shared source of truth for domain models, save-file persistence, result calculation, and migration boundaries.

Deployment documentation source of truth:

- `.github/workflows/pages.yml` is the active production PWA deploy workflow for GitHub Pages.
- `docs/release-process-v1.md` documents release publishing, updater signing, and Pages recovery/troubleshooting.

## 1. Product direction

Streetlifting OS is an offline-first competition operating system for streetlifting and weighted-calisthenics federations.

The practical goal is not to clone PowerTable or PowerGage. We keep their operational coverage and avoid their technical debt:

- no 1C runtime dependency;
- no Firebird / ODBC / stored-procedure rule engine;
- no powerlifting-shaped schema overload for ISF;
- no plaintext production credentials in distributable configs;
- no manual firewall/TCP setup as the normal path;
- no Windows desktop-shortcut maze as the primary UX.

Streetlifting OS should instead provide the same meet-day completeness with:

- a clean ISF domain model;
- local save-files and offline operation;
- pure, tested TypeScript rule services;
- Tauri/PWA distribution;
- web-native display/report surfaces;
- backend only for billing, reconciliation, sanctioning, records, and federation services.

## 2. What is already implemented

Current app version: `1.1.1`.

V1 is shipped and production-hardened enough for UAT:

- meet setup with discipline, category, and plate editors;
- registration with CSV import/export and lot draw;
- weigh-ins with reweigh support and category resolution;
- Classic judging with 60 s timer and 3-judge votes;
- Multirep judging with 120 s timer and reps entry;
- results by category, absolute ISF points, Multirep results;
- real Classic forecast;
- team scoring;
- records screen;
- public scoreboard;
- print forms;
- Tauri/PWA distribution;
- updater signing chain activated in `1.1.1`.

Remaining V1.x hardening:

- Windows EV code-signing certificate;
- Apple Developer ID signing/notarization;
- tournament readiness checklist screen — pre-flight gate before judging starts: discipline + rules pack confirmed, categories defined, plates and bar configured, judges and platforms assigned, streams/groups planned, registration closed, weigh-ins complete, baseline records imported, save-file persisted and backed up. Without this screen, real-meet UAT will fail on human-process gaps rather than software defects;
- minimum report set for real-meet UAT — the existing report registry covers official protocol, athlete cards, blank sheet, diplomas, awards ceremony (planned), Classic CSV, Multirep CSV, and OpenPowerlifting export; for ISF UAT we additionally need the **team protocol** (team scoring is computed but has no print form), **record certificates** for newly set records, **weigh-in order printout**, and a **medal-count summary**. These are added as registry entries in V1.x without restructuring the registry into the full V2 report center;
- real-tournament UAT and bug bash;
- post-signing installer and updater smoke tests on Windows, macOS, Linux.

The full V2 report center (filters, federation templates, multi-language outputs, scoped re-runs) remains a V2 deliverable. V1.x only adds the four reports above as concrete entries in the existing registry.

Current publication state:

- GitHub Releases remain the production desktop distribution channel.
- Tauri updater artifacts are signed and published through GitHub Releases.
- GitHub Pages PWA deployment is restored for the now-public repository and runs from `.github/workflows/pages.yml` on every push to `main`.
- CI and Pages deploy both validate the generated PWA artifact before publication (`npm run pwa:validate`).
- Browser PWA URL: `https://guliandigital.github.io/streetlifting-os/`.

## 3. Lessons from PowerTable and PowerGage

### 3.1 Keep

| Reference capability | Streetlifting OS implementation direction |
|---|---|
| Role split: secretary, platform operator, display operator | in-app role dashboard and route/layout modes |
| Meet setup editors | keep as first-class V1 surface; evolve into RulesPack-backed setup in V2 |
| Report center | V2 report registry: report type, scope, language, output format, filters |
| Awards ceremony | V2 full-screen awards mode with keyboard advance |
| Audio cues and voice | V2 replaceable audio layer, not hardwired WAV files |
| Streams, groups, virtual streams | V2 `Stream` / `Group` entities and scheduling |
| Duplicate-resolution import | V2 import preview with fuzzy athlete matching |
| Sport rank / norms | V2 computed candidates plus manual confirmation/audit |
| Records archive | V2 cross-competition records backend |
| Display variants | V3 local display routes for scoreboard, timer, order, plates, broadcast |
| Tournament license cached before meet | V2 entitlement token that works offline during judging |
| LAN setup checklist | V3 network readiness screen for local publisher/judge remotes |

### 3.2 Do not copy

| Reference choice | Why we avoid it |
|---|---|
| 1C / Firebird as runtime dependency | too heavy, Windows/server dependent, hard to support at venues |
| Stored-procedure business logic | hard to test, hard to version, DB-coupled |
| ISF stored in bench/DL columns | schema overload; corrupts domain clarity |
| OEM/tilde CSV as primary import | fragile; UTF-8 CSV/XLSX with aliases is safer |
| Plaintext DB credentials | security risk |
| Irreversible delete/correction flows | tournament operations need audit and recovery |
| Separate Windows `.lnk` UX | replace with role dashboard and shareable local URLs |
| Fake failed attempts for pass/refusal/no-show | model `pass`, `withdrawn`, `noShow`, and manual corrections explicitly |

## 4. Roadmap

### V1.x — production hardening

Outcome: V1 client is safe to install and use in real ISF meets.

Deliverables:

- code-signing and notarization;
- installer/update smoke tests;
- UAT on a real tournament;
- bug fixes from UAT only, no major scope expansion.

### V2 — operations and commercial foundation

Outcome: Streetlifting OS becomes a paid, reconcilable federation product while preserving offline meet-day operation.

Deliverables:

- backend billing + reconciliation;
- pre-meet quota / entitlement token cached locally;
- RulesPack abstraction extracted from the hardcoded ISF preset;
- athlete / nomination split;
- import preview with duplicate resolution;
- stream/group/virtual stream planning and duration estimation;
- report registry;
- awards ceremony mode;
- audio system with RU/EN cues;
- OpenPowerlifting export;
- sport-rank computation with confirmation/audit;
- cross-competition records archive.

V2 rule: no backend call may block an active meet.

### V3 — federation onboarding and local broadcast

Outcome: multiple federations can run their own rule packs and sanctioned meets; local displays and broadcast become first-class.

Deliverables:

- WSF, НАП, FinalRep onboarding;
- multi-pack support;
- sanctioning workflow;
- save-file signing and verification;
- athlete passport foundation;
- local broadcast publisher inside Tauri;
- display routes:
  - `/display/scoreboard`;
  - `/display/timer`;
  - `/display/order`;
  - `/display/plates`;
  - `/display/broadcast`;
- OBS/chromakey modes;
- share-link tokens for local judge/display devices;
- network readiness screen.

### V4 — Weighted Calisthenics and governance

Outcome: Streetlifting OS expands beyond ISF streetlifting into WC and federation governance.

Deliverables:

- Weighted Calisthenics sport domain;
- WC records;
- audit and enforcement workflows;
- judge certification;
- anti-doping coordination hooks where federation agreements require them.

### V5 — network effects

Outcome: records, public surfaces, and companion tools become federation-scale network features.

Deliverables:

- federated records;
- mature public publishing surfaces;
- focused mobile companion app if demand is proven.

## 5. Architecture invariants

- The meet client remains offline-first.
- Domain logic remains pure and unit-tested.
- Save-files remain versioned and migratable.
- RulesPack changes must not break existing saved meets.
- The backend may support licensing, reconciliation, sanctioning, and records, but it must not be a single point of failure during judging.
- RU and EN remain first-class; more locales are federation-pack work.
- Sensitive config and secrets are never stored as plaintext distributable files.

## 6. Immediate next implementation order

1. Ship the V1.x pre-UAT additions: tournament readiness checklist screen and the four missing report-registry entries (team protocol, record certificates, weigh-in order, medal-count summary).
2. Finish V1.x distribution hardening: signing, notarization, smoke tests on Win/macOS/Linux.
3. Run real-tournament UAT and bug bash; freeze scope to fixes only until UAT passes.
4. Design V2 data split: `Athlete`, `Nomination`, `Stream`, `Group`, `ReportDefinition`.
5. Extract the current ISF preset into an internal RulesPack-compatible shape.
6. Implement the full V2 report center (filters, federation templates, multi-language) and awards ceremony before broad federation onboarding.
7. Implement import duplicate resolution before athlete passport.
8. Implement entitlement token and reconciliation before paid rollout.
9. Implement local publisher/display routes before remote judge URLs — this is the architectural unlock for role-split clients (judge remotes, presenter screen, hall scoreboard, OBS overlay) per `docs/strategy/positioning-vs-powertable.md` §3.

## 7. One-line summary

Streetlifting OS keeps the operational completeness of PowerTable and PowerGage, but implements it as an offline-first, typed, testable, web-native meet client with backend services added only where they create commercial or federation value.
