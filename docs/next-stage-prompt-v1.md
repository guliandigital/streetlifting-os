# Next-Stage Working Prompt — ISF Meet Client

Date: 2026-04-25
Prompt version: 1
Anchors:
- [openlifter-isf-implementation-blueprint-v1.md](openlifter-isf-implementation-blueprint-v1.md)
- [powergage-analysis-playbook.md](powergage-analysis-playbook.md)

## 0. How to use this document

This is a single self-contained briefing for the next-stage agent or contributor. It consolidates every reference we have, classifies the role of each, and lists exactly which local artifacts are available. The next-stage worker should read this top-to-bottom before touching code.

## 1. Mission

Build the ISF Streetlifting Meet Client (offline-first, local-day operation, Classic first, Multirep second). Architectural shape, domain types, sprint backlog, and decisions are already fixed in [the blueprint](openlifter-isf-implementation-blueprint-v1.md). The next stage continues from there — it does not redesign.

The clean-room recommendation in the blueprint stands: no AGPL inheritance, no `S/B/D` assumptions, no shared attempt schema for Classic/Multirep.

## 2. Reference matrix

Four reference sources are in play. They do not have equal status. Confusing their roles is the single biggest risk to the next stage.

| # | Reference | Role | Source-reusable? | Authority |
|---|---|---|---|---|
| 1 | ISF Rules v5.1 + streetlifting.ru | **Rules of truth** | n/a | Binding — every ambiguity is resolved by these documents |
| 2 | OpenLifter | **Architecture / engineering reference** | No (AGPL v3) | Read for shape, copy zero lines of code |
| 3 | PowerGage (installed tree) | **Workflow / domain-coverage reference** | No (closed-source product, no license to reuse) | Read for UX and domain breadth, never as architectural model |
| 4 | PowerTable (powertable.ru) | **Competitive UX benchmark** | No (SaaS, no source) | Read for current Russian-market expectations |

### 2.1 Rules of truth — ISF v5.1

Local files:
- `ISF_Rules_ver.5.1_(RU).docx`
- `ISF_Rules_ver.5.1_(en-US).docx`

Online (effective 2025-08-01):
- `https://streetlifting.ru/docs/isf-rules`
- `https://streetlifting.ru/docs/isf-rules/faq`
- `https://streetlifting.ru/docs/standards`
- `https://streetlifting.ru/points/`

Usage:
- Any conflict between this prompt, the blueprint, OpenLifter, PowerGage, or PowerTable is resolved in favor of these documents.
- Open question §18.1 of the blueprint must be answered before Sprint 1 closes: which subset is canonical for production rules.

### 2.2 OpenLifter — architecture reference (read-only)

Local snapshot: [_research/openlifter-main](../_research/openlifter-main)
Stack: React + Redux + TypeScript, Tauri desktop wrapper present (`src-tauri/`).

Real artifacts to study (not invent):
- `src/types/{actionTypes,dataTypes,stateTypes}.ts` — full Redux state shape
- `src/logic/{barLoad,liftingOrder,lotNumbers,divisionPlace,pointsPlace,entry,units,parsers}.ts` — pure domain logic, ideal shape blueprint
- `src/logic/coefficients/` — IPF/IPF-GL/Wilks/Glossbrenner/etc. coefficient tables — shows how to package per-formula constants
- `src/logic/{import,export}/` — CSV import/export pattern
- `src/containers/{Home,MeetSetup,Registration,Weighins,FlightOrder,Lifting,Results,About,Debug,Root}Container.tsx` — page model that maps 1:1 to the blueprint UI map
- `src/translations/` — i18n model (RU is required for our product)
- `src/versions.ts` — state version constant referenced by save-file migrations

Hard rules:
- Do not copy code. Read, summarize, then write fresh implementations.
- Do not import OpenLifter modules.
- AGPL contamination check: any file in our `src/` that pattern-matches OpenLifter line-for-line is a defect.
- Page set, save-file shape, Redux slicing, and bar-load visualization are the parts most worth mirroring conceptually.
- `S/B/D`, attempt-array assumptions, and powerlifting-specific weight classes are the parts most worth ignoring.

### 2.3 PowerGage — installed tree (workflow reference)

Local install (already extracted, no sandbox required for static review):
- [Power Gage/](../Power Gage)

This is a **black-box proprietary product** with no source license. We use it only as a workflow / domain-coverage reference. Filenames reveal a great deal; binaries reveal nothing reusable. Concrete artifacts:

**Install layout:**
- `App/` — main client. Bundles `fbclient.dll`, `firebird.msg` → uses Firebird as embedded RDBMS.
- `App/MainShell.ini`, `App/SecrShell.ini` — two distinct UI shells (Main + Secretary).
- `App/Plugins/` — pluggable importers: `CSVImportPluginObj.dll`, `TextImportPluginObj.dll`, `MYSQLIimportPluginObj.dll` (+ `plink.exe`, `tunnel.bat` → SSH-tunneled MySQL ingest), `WPCAWPCImportPluginObj.dll` (federation-specific export).
- `App/Update/*.proc` — Firebird stored-procedure source. Names expose the domain model:
  - per-lift bests: `BESTSQUATBYLOC`, `BESTBENCHBYLOC`, `BESTDLBYLOC`, `BESTDLBYLOC1`, `BESTMRPTBYLOC` (multirep)
  - per-lift attempt outputs: `SELECT_SQUATOUT`, `SELECT_BENCHOUT`, `SELECT_DLOUT`, `SELECT_MRPTOUT`
  - two ordering systems: `SELECT_ORDEROUT_ROUNDSYSTEM`, `SELECT_ORDEROUT_OLYMPICSYSTEM`
  - placing: `CATEGORYWINNERS`, `ABSOLUTE`, `ABSOLUTE_GRAM`, `ABSOLUTEBYAGE`, `LIFTERFROMPLACE`, `FINALREPORT`, `FINALREPORT2`
  - team scoring: `TEAMSCOREBYTEAM321`, `TEAMSCOREBYTEAMNAME`, `TEAMWINNERSREPORT`
  - editing primitives: `EDIT_LIFTER`, `EDIT_LE`, `EDIT_LOC`, `EDIT_RH`, `ADD_LOC`, `DELETE_LIFTER`, `COPY_LIFTER_COMPET`, `FORBIDDENCOMPET`
  - points/recalculation: `CALC_PTS`, `RE_CALCULATE`, `CURRENTTOTALL`, `VONLINESCORE`
  - format-specific: `ISFOLKBP` (народный жим), `ISARML` (armlifting), `ISFZD`
- `App/Update/*.rep` — bilingual report templates (RU/ENG): `1SHORTFINALREPORT`, `2SHORTFINALREPORT`, `STREAMREPORT`, `TEAMWINNERSREPORT`, `1CARDREPORT`/`2CARDREPORT`, `1GRAM`/`2GRAM`, `ABSGRAM`, `ABSOLUTE`, `ARMCARDREPORT`, `DIPLOM`.
- `App/Update/*.data` — seed data, including `SPR_WRPF_NORMAT*.data` (WRPF norms reference) and `REPORTS.data`.
- `Inst/Firebird-2.5.8.27089_0_Win32.exe` — Firebird 2.5 server bundled with the installer.
- `Tools/` — `Configurator.exe`, `RecordsKeeper.exe`, `RecordsConverter.exe`, `OnlineScoreTable.exe`, `fbkeeper.exe/dll` — DB maintenance + records archive + live-stream score table.
- `ExtScr/` — extension scripts: `armLift.sql`, `folk.sql`, `LightTableV2.sql`, `fzhd.sql`, `stream.sql`, `OnlineScore.exe`, `OnlineScore.xml`, `card.xsl`, `data.xsl`, `main.xsl`, `st.css`, `11.wav`, `22.wav` (judging audio cues).
- `firewall_addrule.cmd`, `backUp.cmd`, `check.cmd`, `fontsAdd.vbs` — install-side scripts.
- `Docs/` — Russian-language manuals (the most useful artifacts here):
  - `Инструкция по предварительной регистрации и взвешиванию.pdf`
  - `Модуль Секретаря.pdf`
  - `Инструкция по документам и отчетам.pdf`
  - `Инструкция по настройке оборудования PG.pdf`
  - `обслуживание субд.pdf`
  - `CSV Import plugin.docx`
  - `Примерная расстановка оборудования.doc`
  - `PowerGage 2.1 что нового.docx` … `PowerGage 2.8 что нового.docx`

**Architectural inferences (from filenames only — verify before quoting):**
- Storage: embedded Firebird 2.5 RDBMS. Business logic lives in stored procedures, not in the client. Our product will not copy this — JSON save-file plus pure TS rule services per the blueprint.
- Two-shell UX (Main + Secretary) suggests separate ergonomics for judge-table and secretary-desk. Worth evaluating against our single-screen Meet Client model.
- Importer plugin SDK with explicit federation adapters (WPC-AWPC) shows demand for federation-specific export formats — supports the blueprint's `federation export adapter`.
- Two ordering systems coexist (round + olympic) — confirms the blueprint's recommendation to keep `ClassicOrderService` and `MultirepOrderService` separate, and hints we should plan for tournament-format variants long-term.
- Multiple disciplines coexist in one product (powerlifting, bench, deadlift-only, multirep, народный жим, armlifting). Our product is ISF-only by intent, so this breadth is a warning, not a target.
- Bilingual reports `_RU.rep`/`_ENG.rep` validate that RU/EN parity is the realistic minimum.
- Live-stream score table is a separate process. Out of scope for V1.
- Backup is a manual `.cmd` script. Lesson: our save-file approach is already simpler.

**Usage rules:**
- Read PDFs and `что нового` docx files for workflow ideas, judge-table layout, secretary ergonomics, and report structure.
- Do not infer ISF-specific rules from PowerGage — it is a multi-federation product and does not encode our rules canonically.
- Do not copy report layouts pixel-for-pixel; reproduce the *information set* of `1SHORTFINALREPORT` / `2SHORTFINALREPORT` / `STREAMREPORT` / `TEAMWINNERSREPORT` / card-style / `DIPLOM`.
- Do not copy the Firebird-stored-procedure architecture. Our V1 is local JSON + pure TS.
- The sandbox playbook in `docs/powergage-analysis-playbook.md` was written when only `PG_Free.zip` was visible. Now that the install tree is extracted, the *static* part of that playbook can be done on the host directly. Only the *runtime* parts (live screens, save format, listening ports) still require Sandbox/VM.

### 2.4 PowerTable — competitive UX benchmark

Site: `https://powertable.ru/`
Local artifacts: none.

Why it matters:
- Currently the most-used streetlifting / strength-sports meet system in the RU market.
- ISF events use it in practice. Our product will be evaluated against it by the same operators.

Usage:
- Treat as a UX benchmark only. We do not have its source, its data format, or a license to its assets.
- Use public pages, public demo videos, and any operator-side documentation we can legitimately access to capture screen flows.
- Capture findings in a parallel `docs/powertable-findings-v1.md` (to be created in next stage). Keep the same structure as the future PowerGage findings doc, so they can be diffed.

## 3. What the next stage should produce

Pick exactly one of these three tracks. Do not interleave — each is a self-contained piece of work.

### Track A — Reference closure

Goal: convert the four references into a single decision-grade document set, then unblock Sprint 1.

Deliverables:
1. `docs/powergage-findings-v1.md` — static-only pass over the extracted `Power Gage/` tree. Sections: install footprint, inferred storage model, workflow per Russian PDF manual, report inventory, domain breadth, what to copy, what to avoid. Include screenshots only if a sandbox/VM session is run; otherwise mark §runtime as deferred.
2. `docs/powertable-findings-v1.md` — public-information pass over `https://powertable.ru/`. Same section shape as item 1, marked clearly as outside-in observation.
3. `docs/reference-comparison-v1.md` — three-column table: OpenLifter / PowerGage / PowerTable, rows = features from the blueprint UI map (§11) and user flow (§12). For each cell: present / absent / different and a one-line note.
4. Answers to the five open questions in blueprint §18, recorded as `docs/decisions-v1.md` (one decision per section).

Definition of done:
- All five §18 questions have a recorded answer or an explicit "deferred to Sprint N" with reason.
- Reference comparison table has no empty cells.
- A go/no-go for Sprint 1 is recorded at the end of `decisions-v1.md`.

### Track B — Sprint 1 implementation

Goal: execute the blueprint's Sprint 1 backlog (§14) without further reference work.

Preconditions:
- Track A is complete, OR the team has explicitly accepted that Track A artifacts will be produced after Sprint 1 ships.
- The five §18 questions have at least preliminary answers — minimum: tie-break rule and Multirep preset loads, since Sprint 1 needs both.

Deliverables match the blueprint's Sprint 1 backlog and DoD verbatim. Do not extend scope.

### Track C — Sandbox runtime analysis of PowerGage

Goal: complete the runtime half of [powergage-analysis-playbook.md](powergage-analysis-playbook.md) §6 inside Windows Sandbox or a disposable VM.

Use only when Track A's static pass is not enough to answer a specific architectural question. Capture per the playbook §4 artifact list.

Do not start this track unless Track A surfaced a concrete blocker that needs runtime evidence.

## 4. Hard constraints carried forward

From the blueprint, restated for visibility:

- Clean-room only. No code copied from OpenLifter.
- Two attempt schemas: `ClassicAttempt` and `MultirepAttempt`. No unified shape.
- Two placing services: `ClassicPlacingService`, `MultirepPlacingService`. No shared code path beyond `guests do not place` and `result === 0 means no official placing`.
- Two order services. Multirep V1 = manual fixed order.
- Save-file is JSON with explicit `stateVersion`. Migration layer required before first production release.
- RU/EN parity from day one. Any new string needs both locales.
- No live cloud sync, no athlete accounts, no public ranking, no federation CRM — all out of scope for V1.
- ISF rules trump every reference. PowerGage is multi-federation; do not import its assumptions.

## 5. Working order for whoever picks this up

1. Read the blueprint end-to-end.
2. Read this document end-to-end.
3. Pick a track from §3 and stop.
4. For Track A: walk `Power Gage/Docs/*` first (Russian PDFs are the highest-density source), then OpenLifter `src/`, then powertable.ru.
5. For Track B: open the blueprint §6 (domain types) and §13 (code structure) and bootstrap the project. Do not deviate from the type signatures already declared.
6. For Track C: follow `powergage-analysis-playbook.md` §6 inside Sandbox.

## 6. Things to explicitly not do

- Do not redesign the domain model.
- Do not unify Classic and Multirep attempts.
- Do not introduce a backend service in V1.
- Do not import OpenLifter modules or copy lines.
- Do not assume PowerGage's Firebird-procedure architecture is a target.
- Do not infer ISF rules from PowerGage or PowerTable behavior.
- Do not start any track other than the one chosen.
