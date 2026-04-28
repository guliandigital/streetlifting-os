# PowerGage — Findings v1 (static + manuals pass)

Date: 2026-04-25
Updated: 2026-04-29
Method: static analysis of the already-extracted install tree at `C:\PROJECTS\streetlifting-os\Power Gage\`, plus text extraction from bundled PDF/DOCX manuals and release notes. No runtime execution of PowerGage binaries.
Reference role: PowerGage is a **black-box proprietary product**. We use it as a workflow / domain-coverage reference. Source code is unavailable. Some of its database-procedure source (`*.proc`) ships with the installer as plain text and gives unusually strong evidence of the runtime data model.

## 1. What was inspected

- Install tree: 12 top-level folders/files under `Power Gage\` (`App/`, `App/Plugins/`, `App/Update/`, `Docs/`, `ExtScr/`, `Inst/`, `Tools/`, plus install scripts).
- `App/Update/*.proc` — 70+ Firebird stored-procedure source files (plain text, `CREATE OR ALTER procedure …`).
- `App/Update/*.rep` — 23 bilingual report templates (`_RU.rep` / `_ENG.rep` pairs plus a few unilingual).
- `App/Update/*.data` — seed data, including WRPF norms reference (`SPR_WRPF_NORMAT*.data`).
- `App/Plugins/*` — import plugin SDK including a federation-specific WPC-AWPC importer.
- `Docs/*.pdf` and `Docs/*.docx` — Russian-language operator manuals and release notes, extracted and summarized in §5.1.
- `App/*.ini`, `App/Plugins/*.ini`, and `ExtScr/OnlineScore.xml` — shell/plugin configuration and online-score sample data.
- Installed desktop launcher folder at `C:\Users\arara\OneDrive\Рабочий стол\Power Gage` — role-oriented shortcuts created by the installer.

Not inspected in this pass:
- runtime behavior (any GUI screen)
- live save/export files
- DLL internals
- the legacy `.doc` equipment-layout file (`Примерная расстановка оборудования.doc`) because it is not a DOCX container

## 2. Architecture (as evidenced)

### 2.1 Storage

- Firebird 2.5.8 RDBMS, server bundled at `Inst/Firebird-2.5.8.27089_0_Win32.exe`.
- `App/`, `Tools/`, and `ExtScr/` each carry their own copy of `fbclient.dll` and `firebird.msg` — components reach Firebird directly, not through a shared service.
- `Tools/fbkeeper.exe` + `Tools/fbkeeper.dll` — DB maintenance/keeper utility.
- `firewall_addrule.cmd` and `App/Plugins/tunnel.bat` + `plink.exe` indicate networked Firebird use across machines and SSH-tunneled MySQL ingest from external sources.

### 2.2 Logic placement

- Business logic lives in **Firebird stored procedures**, not in the client. Examples: `CALC_PTS`, `CURRENTTOTALL`, `BESTBENCHBYLOC`, `BESTMRPTBYLOC`, `BESTDLBYLOC`, `BESTSQUATBYLOC`, `SELECT_BENCHOUT`, `SELECT_SQUATOUT`, `SELECT_DLOUT`, `SELECT_MRPTOUT`, `SELECT_ORDEROUT_ROUNDSYSTEM`, `SELECT_ORDEROUT_OLYMPICSYSTEM`, `CATEGORYWINNERS`, `ABSOLUTE`, `ABSOLUTE_GRAM`, `ABSOLUTEBYAGE`, `LIFTERFROMPLACE`, `FINALREPORT`, `FINALREPORT2`, `TEAMSCOREBYTEAM321`, `TEAMSCOREBYTEAMNAME`, `CALC_PTS`, `RE_CALCULATE`, `EDIT_LIFTER`, `EDIT_LE`, `EDIT_LOC`, `EDIT_RH`, `ADD_LOC`, `DELETE_LIFTER`, `COPY_LIFTER_COMPET`, `FORBIDDENCOMPET`, `ISFOLKBP`, `ISFZD`, `ISARML`, `VONLINESCORE`.
- Each procedure that ships dual `*.proc` and `dummy*.proc` versions implements an upgrade pattern: install the dummy, then replace with the real body. This is upgrade migration, not feature-flagging.

### 2.3 UI shells

Two distinct `.ini`-defined shells:
- `App/MainShell.ini` — main client (judge table, secretary, etc.)
- `App/SecrShell.ini` — Secretary module (registration, weigh-in, paperwork)

Implication: PowerGage operationally separates the *secretary desk* from the *judge table* into two launch entry points, even though they share the same database. The Secretary Module has its own dedicated PDF manual.

### 2.4 Auxiliary components

- `Tools/RecordsKeeper.exe`, `Tools/RecordsConverter.exe` — records archive maintenance.
- `Tools/OnlineScoreTable.exe` — separate process that publishes the live online score table.
- `ExtScr/OnlineScore.exe` + `ExtScr/OnlineScore.xml` + `ExtScr/main.xsl` / `card.xsl` / `data.xsl` + `st.css` — XML→XSLT→HTML rendering pipeline for the public score table.
- `ExtScr/11.wav`, `ExtScr/22.wav` — judging audio cues (likely "good lift" / "no lift" or attempt-start signals).
- `ExtScr/armLift.sql`, `folk.sql`, `LightTableV2.sql`, `fzhd.sql`, `stream.sql` — SQL extension scripts for additional disciplines.
- `App/Plugins/{CSVImportPluginObj.dll, TextImportPluginObj.dll, MYSQLIimportPluginObj.dll, WPCAWPCImportPluginObj.dll}` — pluggable importer DLL pattern. MySQL importer is paired with `plink.exe` + `tunnel.bat` for SSH tunneling.
- `backUp.cmd` — manual backup batch script. No automated backup or save-version system observed.
- `fontsAdd.vbs`, `firewall_addrule.cmd` — install-time hooks.
- `App/MainShell.ini` maps external functions to local TCP endpoints (`ExternalTimer`, `ExternalScoreboard`, `ExternalOut`, `ExternalTechMon`) and a `PlatformNumber`. This confirms a LAN-first multi-device architecture: secretary/judge table, timer, scoreboard, tech monitor, and external output are separate roles coordinated around the same local installation.
- `ExtScr/OnlineScore.xml` + XSLT templates show a file-based public scoreboard pipeline. The sample data includes ISF divisions, categories, attempt fields, points, places, team/town metadata, and update timestamps.

### 2.5 Installed desktop launch surface

The installer also creates a desktop folder:

`C:\Users\arara\OneDrive\Рабочий стол\Power Gage`

This folder is not another application copy. It is a **launcher console** over the same install tree. The link metadata was read without launching targets. `WScript.Shell` returned empty `TargetPath` for these links, but raw shell-link strings expose the targets and command-line flags.

Top-level shortcuts:

| Shortcut | Target / role | Status |
|---|---|---|
| `Документация` | `Power Gage\Docs` | existing docs folder |
| `Документы и отчёты` | `App\Reports.exe` | existing |
| `Настройки` | `C:\Users\arara\AppData\Roaming\Power Gage` | target folder absent until first-run / config creation |
| `Предварительная регистрация и взвешивание` | `App\MainShell.exe` | existing |
| `Рабочее место секретаря` | `App\SecrShell.exe` | existing |
| `Проверка обновлений` | `PGUpdater.exe` | target referenced by link strings but not found in the extracted install tree |

`Табло/` shortcuts:

| Shortcut family | Target | Flags observed | Interpretation |
|---|---|---|---|
| `Блины ассистентам` | `ExtScr\TechMonitor.exe` | optional `/eng` | plate-loading / assistant technical monitor |
| `Очередность выхода на помост` | `ExtScr\OrderOut.exe` | optional `/eng` | platform order display |
| `Таймер выхода на помост` | `ExtScr\TimerOnly.exe` | optional `/eng` | standalone attempt timer |
| `Экран для видеотрансляции` | `ExtScr\VideoTranslationScr.exe` | optional `/eng` | broadcast-facing screen |
| `Электронное табло без таймера` | `ExtScr\LightTableV2.exe` | `/notimer`, optional `/eng` | scoreboard without timer |
| `Электронное табло с таймером` | `ExtScr\LightTableV2.exe` | optional `/eng` | scoreboard with timer |

`Утилиты/` shortcuts:

| Shortcut | Target | Role |
|---|---|---|
| `Настройка соединения с БД` | `Tools\Configurator.exe` | database connection setup |
| `Проверка БД на целостность` | `check.cmd` | database integrity check |
| `Протокол On-Line` | `Tools\OnlineScoreTable.exe` | online protocol publisher |
| `Резервная копия БД` | `backUp.cmd` | manual backup |
| `Рекорды и нормативы` | `Tools\RecordsKeeper.exe` | records and norms maintenance |

Implications:

- PowerGage makes external displays first-class launch targets, not hidden settings. This supports the V3 `broadcast publisher` and `OBS/chromakey modes` roadmap items.
- RU/ENG is implemented as runtime flags on display binaries, not as separate builds. For Streetlifting OS, this maps to URL/query or route-level language selection for public display pages.
- The "settings" target being an AppData folder suggests local machine config is created outside the install tree. Streetlifting OS should keep this explicit: project save-file vs machine settings vs secrets are separate stores.
- The missing `PGUpdater.exe` target is either omitted from this extracted installer payload or removed post-install. Treat PowerGage updater evidence as inconclusive beyond "installer exposes update checking in the launch surface".

## 3. Domain model (reconstructed from .proc text)

The schema, column names, and ID semantics below are extracted directly from `CALC_PTS.proc`, `CURRENTTOTALL.proc`, `BESTBENCHBYLOC.proc`, `BESTMRPTBYLOC.proc`, `SELECT_BENCHOUT.proc`, and `SELECT_ORDEROUT_ROUNDSYSTEM.proc`. They are facts about PowerGage, not inferences.

### 3.1 Core tables (inferred names, evidence-based)

- `lifter` — athletes. Columns include `id_lifter`, `name`, `dat_bith`, `sex`.
- `lifter_on_competition` (alias `loc`) — athlete-in-meet join row. Columns: `id_lifter_compet`, `id_lifter`, `id_compet`, `id_wilks`, `id_category`, `id_stream` (flight/group), `zr` (lot number).
- `lifter_exersis` (alias `le`) — per-athlete attempt sheet. **One row per athlete-meet**. Columns:
  - `bench1`, `bench2`, `bench3`, `bench4` — bench attempts (slot 4 = optional record / 4th attempt).
  - `oc4`, `oc5`, `oc6`, `oc11` — bench attempt status flags. `oc_ = 1` means good lift.
  - Symmetric: squat uses `oc1, oc2, oc3, oc10`; DL uses `oc7, oc8, oc9, oc12`.
  - `mrpt1`, `mrpt2` — multirep result columns 1 and 2.
  - `mrpt1_oc`, `mrpt2_oc` — multirep coefficients/multipliers (federation-specific: raw reps for some federations, body-weight ratio for others).
  - `summaall` — pre-computed total.
  - `edittime` — used as the meet date for age calculation.
- `competit` — meet/event row. Columns: `id_compet`, `id_range`.
- `range` — discipline / federation classifier. Columns: `id_range`, `id_federation`, `kind`.
- `range2exercisenames` (alias `r2e`) — maps range → exercise slot → exercise number/amount.
- `exercise2range` + `exercise` — exercise master tables with `engname`.
- `weigth_category` (sic) — weight categories per federation.
- `wilks` — per-athlete weigh-in row keyed by `id_wilks`. Columns: `self_weight`, `coef`, `sex`. Wilks is precomputed and stored, not recomputed per query.
- `objproperties` (alias `op`) — key-value config per range (`PARAM_*_<id_range>`).
- `params` (alias `p`) — global parameter defaults (`LowerBWFirstOrderBy`, `cutfio`, …).
- `tmp` — scratch table used in some procedures.

### 3.2 Federation / discipline encoding

`id_range` is a federation+discipline numeric code. Observed bands (from `BESTMRPTBYLOC.proc`, `ISFOLKBP.proc`, `BESTBENCHBYLOC.proc`):

| Band | Federation / mode |
|---|---|
| 0–99 | WPC-AWPC |
| 100–199 | GPC (4th attempt counts toward total) |
| 400–499 | WPA-AWPA |
| 500–599 | SPR |
| 600–699 | IPF |
| 800–899 | WPU |
| 1100–1104 | WRPF (4th attempt counts toward total) |
| 1500–1599 | NAP folk BP |
| 1500–1699 | NAP general |
| 1803, 1806, 1812, 1815, 1816, 1817, 1820, 1822, 1827, 1843, 1846, 1852, 1855, 1858 | ZHD (народный жим) |
| 4000–4099 | GPA-IPO |
| 5050–5099 | SPR + WRPF folk BP |
| 8050–8099 | WPU folk BP |
| 820221000–820221099 | IPC-IPCA |
| 1002201920–1002201985 | WSF |
| **20041904–20041919** | **ISF folk classic** |
| **20041923–20041999** | **ISF folk multirep** |

Implications for our product:
- ISF events live entirely under the `2004190x` / `2004192x` ranges in PowerGage.
- ISF in PowerGage stores both classic and multirep through the `mrpt*` columns (see §3.4).
- 4th-attempt-into-total is a **federation-specific rule**. ISF is not in the list — for ISF, the 4th attempt is not part of the total. Confirms blueprint §6.4 "3 attempts in classic".

### 3.3 Range "kind" → competition mode

From `CURRENTTOTALL.proc`:

| `range.kind` | Mode | Total formula |
|---|---|---|
| 1 | full PL | `bestSquat + bestBench + bestDL` (requires success in all three) |
| 2 | bench-only | `bestBench` |
| 3 | DL-only | `bestDL` |
| 4 | squat-only | `bestSquat` |
| 5 | **streetlifting** | `bestBench + bestDL` (PU stored in bench column, DI stored in DL column) |

Plus overlay rules:
- ARMLFT (`isarml` filter) — total = max(squat, bench, dl).
- FZHD / народный жим (`isfzd`) — `bestBench + bestMrpt`, with NAP rounding `ceil(totall/2.5)*2.5`.
- Folk BP (`isfolkbp`) — `bestMrpt`.
- ISF (`idr between 20041904 and 20041919` or `20041923..20041999`) — `bestMrpt`, with `fzhd` fallback when isfolkbp filter fails.

### 3.4 ISF schema overload (important caveat)

Verified from `CURRENTTOTALL.proc` lines 39–106:

PowerGage **does not have a native streetlifting attempt model**. It encodes ISF events by:
- For ISF Classic (PU+DI), reusing the bench-column slots (`bench1..bench4`) for PU and the DL-column slots for DI.
- For ISF Multirep, using `mrpt1, mrpt2` with a per-federation interpretation of `mrpt1_oc`/`mrpt2_oc`.

This is a **schema overload**, not a domain decision worth copying. It is the cost PowerGage pays for being a multi-federation product on a powerlifting-shaped schema. Our clean-room ISF Meet Client must keep the blueprint's two distinct attempt schemas (`ClassicAttempt` and `MultirepAttempt`) and not collapse them onto a powerlifting layout.

### 3.5 Plate rounding

`BESTBENCHBYLOC.proc` and `BESTMRPTBYLOC.proc` apply per-federation rounding before recording the best:
- WPC-AWPC, WPA-AWPA, SPR, IPF, WPU, GPA-IPO, IPC-IPCA → `trunc(val/2.5)*2.5` (round down to 2.5 kg).
- All other federations (including ISF) → no rounding.

Implication: ISF in PowerGage **does not round bests**. For our product, the blueprint already implies result is the declared load (kg) — keep it that way; do not introduce post-hoc rounding.

### 3.6 ISF points (verified in `CALC_PTS.proc`, branch `ABS_ISF`)

Procedure shape:
1. Read `summaall` (total), `self_weight`, `sex`, `exernum`, `range.kind`, athlete age.
2. If total > 0: look up `isf_abs_coef(bw, exer, sex)` and multiply total by it.
3. Else (Multirep / hybrid case): compute total from `mrpt1_oc` and `mrpt2_oc`, each multiplied by their own `isf_abs_coef`.
4. Apply masters age coefficient on `tot`:
   - `40–44 → 1.025`
   - `45–49 → 1.050`
   - `50–54 → 1.075`
   - `55–59 → 1.100`
   - `60–99 → 1.125`
5. Pass `tot` through a final scoring formula:
   - `kind = 5 (streetlifting), sex = 1` → `500 + 100 * (tot − (310.6700 * ln(bw) − 857.7850)) / (53.2160 * ln(bw) − 147.0835)` (raw PL male curve).
   - `kind = 5, sex = 0` → raw PL female curve.
   - `kind in (1,2,3)` → raw BP curves.

Two important consequences for our blueprint §8:

1. PowerGage proves that ISF points = `ISF_abs_coef × result`, then a **masters multiplier on the total** (not on the points), then a final fitting formula reused from raw powerlifting curves. The blueprint's `IsfPointBreakdown { coefficient, basePoints, additionalPoints, finalPoints }` shape covers this; just confirm `additionalPoints` corresponds to the "above threshold in Classic" rule from streetlifting.ru rather than to anything PowerGage encodes here (PowerGage does not show an additionalPoints branch).
2. The `useMastersAdjustment` flag in `MeetState` should gate exactly the multiplication shown above. The multiplier table is canonical.

These constants should still be cross-checked against streetlifting.ru/points/ before being committed to our codebase. Treat PowerGage as evidence, not as the source of truth.

### 3.7 Lifting order

Two procedures show two distinct ordering systems:

- `SELECT_ORDEROUT_ROUNDSYSTEM(IDC, IDS, IDEXER)` — round-by-round system. Per exercise, sort by declared load ASC, lot number tiebreak. Maps directly to our blueprint §9.1 "Classic order".
- `SELECT_ORDEROUT_OLYMPICSYSTEM(IDC, IDS, IDEXER)` — Olympic / flight system. Concatenates squat → bench → DL for the same athlete in one block, then the next athlete. The shipped procedure body is partial (always emits `'Deadlift'` as the exercise label and ignores `IDEXER`), suggesting it is either deprecated, half-finished, or used only for printing. Treat as informational, not authoritative.

For ISF V1 we keep blueprint §9.1 (round system) and do not implement Olympic ordering.

Lot-number tiebreak in PowerGage is conditional: when global `LowerBWFirstOrderBy = 0`, sort by `zr` (lot number); otherwise sort by `right(id_wilks, 6)` (i.e., a deterministic surrogate keyed on the weigh-in row). This is a useful operational detail — PowerGage operators can flip a global flag to choose between "lot-number first" and "lower-bodyweight first" tiebreak.

### 3.8 Status flags (`OC*`) numbering

Mapping recovered from `CURRENTTOTALL.proc` lines 23–25:

| Exercise | Attempt 1 | Attempt 2 | Attempt 3 | Attempt 4 |
|---|---|---|---|---|
| Squat | OC1 | OC2 | OC3 | OC10 |
| Bench (= ISF PU) | OC4 | OC5 | OC6 | OC11 |
| DL (= ISF DI) | OC7 | OC8 | OC9 | OC12 |

All flags are nullable. `null` = pending, `0` = no-lift, `1` = good lift. The 4th attempt slot is reserved across all three exercises but only counts toward total for federations explicitly in the allow-list (GPC, WRPF, ARMLFT). Not for ISF.

## 4. Reports

23 `.rep` templates (paired RU/ENG where applicable):

| Template | Purpose |
|---|---|
| `1SHORTFINALREPORT_*` | short final protocol, layout 1 |
| `2SHORTFINALREPORT_*` | short final protocol, layout 2 |
| `STREAMREPORT_*` | live-stream / online score sheet |
| `TEAMWINNERSREPORT_*` | team standings |
| `1CARDREPORT_*`, `2CARDREPORT_*` | athlete attempt cards |
| `ARMCARDREPORT_*` | armlift attempt cards |
| `1GRAM_*`, `2GRAM_*`, `ABSGRAM_*` | diplomas / certificates |
| `ABSOLUTE_*` | absolute classification |
| `DIPLOM` | generic diploma |

Implications for our product:
- The minimum required report set is: short final protocol, attempt card, team standings, absolute classification, diploma. The blueprint §11.7 currently lists "official protocol CSV" + "printable protocol data" + "federation export adapter" — this set is consistent and slightly broader than ours; extend our blueprint accordingly when planning Sprint 2.
- Bilingual RU/ENG parity for every report is the realistic minimum.

## 5. Workflow evidence (filenames + manuals)

The Russian-language operator manuals in `Power Gage/Docs/` describe the operator workflow:

- `Инструкция по предварительной регистрации и взвешиванию.pdf` (1.6 MB) — pre-registration + weigh-in workflow.
- `Модуль Секретаря.pdf` (2.6 MB) — Secretary module: in-meet edits, attempt entry, card printing.
- `Инструкция по документам и отчетам.pdf` (2.5 MB) — documents and reports.
- `Инструкция по настройке оборудования PG.pdf` (0.7 MB) — physical equipment setup.
- `обслуживание субд.pdf` (8.3 MB) — DBMS maintenance and backup.
- `CSV Import plugin.docx` (0.5 MB) — CSV import column spec.
- `Примерная расстановка оборудования.doc` (23 KB) — example platform layout.
- `PowerGage 2.{1..8} что нового.docx` — release notes 2.1 through 2.8.

Second pass read the extractable PDF/DOCX manuals and release notes. Digest below.

### 5.1 Manuals digest (2026-04-29)

#### 5.1.1 Product modules and operator roles

The manuals confirm a three-module product model:

- **Pre-registration and weigh-in** — create meet, pick federation/rules, manage athlete dictionary, create nominations, weigh athletes, set teams, openers, streams, and admission status.
- **Secretary module** — run the meet: assign streams/groups, update external boards, enter attempts, cancel decisions, handle refusals/no-shows, print cards, and keep live output synchronized.
- **Reports / documents / diplomas** — generate protocols, cards, diplomas, certificates, team reports, absolute reports, Excel exports, and external-site exports.

Streetlifting OS should keep the same role split as route/layout separation, not as separate binaries: `Registration/Weigh-ins`, `Run meet/Judging`, `Results/Reports`, `Broadcast`.

#### 5.1.2 Pre-registration and weigh-in workflow

PowerGage creates the meet first; the selected federation drives age categories, weight categories, disciplines, coefficient/formula behavior, and record-level settings. Athlete registration is dictionary-based: the operator can reuse an existing athlete, create a new athlete card, copy an athlete between divisions, and adjust age-category participation when the athlete is eligible for more than one group (for example, Open plus age group).

Important fields observed in manuals:

- Athlete identity: full name parts, alternate English name, birthdate, sex.
- Geography and contacts: country, region, city, phone, email, postal address.
- Sport data: team/club, coach/trainer, sport rank, restrictions/disqualifications.
- Nomination data: division, age category, weight category, bodyweight, first attempts, admission status.

Admission can be constrained by sport rank or by sum of first attempts. If a nomination fails the rule, the operator can reject the nomination or change the attempts. PowerGage also supports per-division restrictions/exclusions. For Streetlifting OS this maps to explicit validation warnings with override/audit, not silent blocking.

#### 5.1.3 Secretary module and live meet execution

The secretary manual confirms several operational features not obvious from procedure names:

- Streams can be assigned in bulk.
- A "virtual stream" can combine nominations from different divisions when the platform flow is shared.
- `Поток2` opens streams with the same name across a competition group, useful for multi-division events.
- External information boards are expected to be refreshed before running a stream.
- The attempt timer starts when the athlete is called and also updates assistant/plate-loading information.
- Attempt actions include good lift, no lift, cancel decision, delete attempt, athlete refusal from remaining attempts, and zero-total handling.

PowerGage sometimes models edge cases through workarounds, e.g. folk/multirep data can be represented as extra attempt cards for export compatibility. Streetlifting OS should model these states explicitly: `pass`, `withdrawn`, `noShow`, `refusedFurtherAttempts`, and `manualCorrection`, rather than encoding them as fake failed attempts.

#### 5.1.4 Reports, documents, and exports

The reports manual is broader than the `.rep` filename list. It includes:

- Operational documents: manual flow sheet, weigh-in card, attempt cards, athlete records.
- Result documents: short and extended final protocols, final protocol with sport ranks, absolute classification, team standings, stream list.
- Awards documents: diplomas, absolute diplomas/certificates, master-tournament diplomas.
- Exports: final protocol to Excel, preliminary nominations to HTML, records by division to Excel, athletes in competition to Excel, athlete catalog to Excel, Allpowerlifting protocol export.

Actionable requirement: Streetlifting OS should implement a **report registry** rather than scattered buttons. Each report should declare scope, language, output format, required filters, and whether it is official/export-only/print-only.

#### 5.1.5 CSV import contract

`CSV Import plugin.docx` defines an OEM-encoded text import, delimiter `~`, header row required, and fields such as:

`npp`, `_RANGE_`, `fullname`, `birthday`, `phone`, `email`, `weight_category`, `age_category`, `sex`, `country`, `region`, `city`, `coach`, `additional_information`, `team`.

The importer scans `_RANGE_` values, lets the operator choose imported divisions, and performs fuzzy athlete matching. If the match is uncertain, the operator chooses an existing athlete or creates a new one.

Streetlifting OS should not copy OEM/tilde CSV as the main contract. The useful behavior is:

- flexible column aliases;
- per-row validation errors;
- duplicate-resolution UI;
- import preview before commit;
- stable UTF-8 CSV/XLSX import/export;
- normalized country/region/city/team/coach fields.

#### 5.1.6 Equipment and LAN assumptions

The equipment setup manual describes one-platform and multi-platform modes. A single machine can act as server plus chief secretary/speaker workstation for small meets; larger meets use a dedicated local server and multiple LAN clients. Wi-Fi setup guidance emphasizes protected local networks, signal/channel checks, and setup order: server first, then weigh-in, secretary, and scoreboards.

Actionable requirement for V3 broadcast/judge remotes: add a **network readiness screen** that exposes LAN URL/QR, local IPs, connectivity checks, and role status (`server`, `secretary`, `platform`, `scoreboard`, `judge remote`). Do not require operators to manually edit firewall rules or TCP endpoints.

#### 5.1.7 Release notes 2.1-2.8

Release notes show PowerGage evolved toward broad federation coverage and operational tooling:

- Federations/rules automated by 2.8 include WEPF soft equipment, ISF, WSF, and WUAP.
- Weigh-in module gained password protection.
- Movement storage changed in the database.
- Diploma/report templates were simplified into separate one-movement and multi-movement variants.
- `Поток2` was optimized for events with more than 10 divisions.
- Secretary module can filter divisions by type.
- Timer module supports multiple visual styles: barbell, armlifting, kettlebell.
- The operator can close arbitrary divisions/tournaments without generating reports.
- Licensing is tournament-oriented: a license can be requested before the meet and then reused by computers connected to the same local server.

Actionable requirement for V2 billing/reconciliation: prefer a **tournament license / entitlement token** that is cached before the event and can operate offline during the meet, rather than per-machine online checks during judging.

#### 5.1.8 Security and operations

`MYSQLIimportPluginObj.ini` contains plaintext database connection settings. Values are intentionally not copied here. This is an anti-pattern for Streetlifting OS: no plaintext production credentials in distributable config files, no bundled external DB passwords, and no hidden SSH tunnel scripts for normal import paths.

The manuals also describe delete/reject flows that appear operationally destructive. Streetlifting OS should use soft-delete, undo where practical, explicit confirmations, and an audit trail for nomination/attempt/result corrections.

## 6. What is worth borrowing

| Idea | Why it survives | Where it lands in our product |
|---|---|---|
| Secretary vs Judge UI separation | Different ergonomics under different time pressure | Possibly two route groups inside Meet Client (or two layouts), not two apps |
| Round-system order, lot-number tiebreak, optional "lower BW first" toggle | Already matches blueprint §9.1; toggle is a pragmatic improvement | Add the toggle to `MeetState` as `lowerBodyweightFirstTiebreak: boolean` |
| Status flags as nullable tri-state per attempt | Cleaner than a 2-state success boolean for a live judging UI | Keep `AttemptStatus` as `"pending" | "success" | "fail"` in blueprint §6.1 — already aligned |
| Report set: short final, attempt card, team standings, absolute, diploma | Minimum that operators actually need | Extend blueprint §11.7 |
| Bilingual report templates from day one | Real federations require it | Already in blueprint §11; reinforce |
| Per-meet scoring-formula override (`ABS_ISF` / `ABS_DOTS` / `ABS_IPF` / `ABS_ATLETIC`) | We will need at least `ISF_POINTS` and possibly `RAW_RESULT` | Already covered by `formula` enum in blueprint §6.8 |
| Live online score table as a separate process | Decouples high-stakes judging app from spectator output | Out of scope V1; keep as a future "publisher" component |
| Audio cues at attempt start / good-lift | Real-world judging benefits | Defer beyond V1 unless trivial |
| Manual `backUp.cmd` script | Simple; maps onto our save-file model | We already have JSON save-files — just document the equivalent flow |
| Report/document center | PowerGage's report surface is operationally broad and mature | V2 report registry with protocols, cards, diplomas, certificates, Excel/CSV exports |
| Duplicate-resolution import | Real nomination files contain repeated athletes and inconsistent spelling | Add import preview + fuzzy duplicate resolution after V1 basics |
| Virtual streams / stream groups | Operators need to combine compatible nominations on one platform | V2 `Stream` / `Group` entities and auto-scheduling |
| Tournament license cached before the meet | Avoids online dependency during judging | V2 billing/reconciliation entitlement model |
| LAN readiness checklist | Multi-device meets fail on network setup, not only on app logic | V3 broadcast/judge-remotes setup screen |
| Role-oriented launcher surface | Operators need "what workstation am I on?" clarity before the meet starts | Streetlifting OS should expose a clear role dashboard / launch mode selector |
| Display variants as explicit launch modes | Scoreboard, timer-only, order board, plate monitor, and broadcast screen are different surfaces | Implement as web routes: `/display/scoreboard`, `/display/timer`, `/display/order`, `/display/plates`, `/display/broadcast` |

## 7. What is **not** worth borrowing

| PowerGage choice | Why we avoid it |
|---|---|
| Storing classic PU/DI in bench/DL columns | Schema overload from a powerlifting-shaped DB; pollutes the model. Our product has explicit ISF schemas. |
| Stored-procedure-driven business logic | Couples logic to one DBMS, makes testing painful, blocks browser/Tauri offline use. Pure TS rule services are the right shape. |
| Firebird 2.5.x as the storage layer | EOL, Windows-only operationally, requires services/firewall rules. JSON save-file with `stateVersion` is simpler and matches the blueprint. |
| WIN1251 character set assumption | UTF-8 only in our product. |
| 70+ overlapping discipline codes (folk BP, FZHD, armlift, WSF, …) | Out of scope; ISF only. The breadth here is what forces the schema overload above. |
| Manual `.cmd` backup as the only safety net | We have `stateVersion`-aware save files. Migrations + autosave > batch script. |
| `SELECT_ORDEROUT_OLYMPICSYSTEM` as shipped | Body is partial / deprecated. Not a reference. |
| OEM-encoded `~`-delimited CSV as primary import | Fragile for modern users and non-Russian data. Use UTF-8 CSV/XLSX with preview and aliases. |
| Plaintext DB credentials in plugin config | Security risk. Use OS credential storage, encrypted app secrets, or backend-issued short-lived tokens. |
| Manual firewall/TCP endpoint setup for normal operation | Too error-prone for meet staff. Provide automatic discovery and readiness checks. |
| Encoding pass/refusal/no-show as fake failed attempts | Pollutes results and exports. Model these statuses explicitly. |
| Irreversible destructive flows | Meet operations need auditability and recovery. Use soft-delete/undo/confirmed corrections. |
| Many desktop `.lnk` files as the primary UX | Works for Windows-only operations, but does not map to browser/Tauri/mobile. Use in-app role selection and shareable display URLs. |
| Machine config hidden behind AppData folder shortcuts | Makes it hard to audit what is meet data vs local config. Keep local settings visible and exportable, and keep secrets out of plain files. |
| Dangling updater shortcut | Update flows must fail visibly and be testable. Tauri updater should expose status, signature verification, and actionable errors. |

## 8. Cross-references to our blueprint

- Blueprint §6.1 `AttemptStatus` — confirmed by PowerGage's nullable `OC*` flag pattern.
- Blueprint §6.4 `ClassicAttempt` with 3 sequences — confirmed for ISF (4th attempt is not in any ISF allow-list).
- Blueprint §6.7 `Entry` — PowerGage's flat `lifter_on_competition` + `lifter_exersis` rows are a denormalized 1:1 equivalent of our `Entry`. Our model is cleaner because exercises are nested objects.
- Blueprint §8 `IsfPointsService` — the ABS_ISF branch in `CALC_PTS.proc` is consistent with the `coefficient × result + masters multiplier + final formula` shape; do not derive constants from PowerGage, only from streetlifting.ru.
- Blueprint §8.2 "additional points above threshold in Classic" — **not** observed in `CALC_PTS.proc`. PowerGage does not implement this. This must come from streetlifting.ru/points/.
- Blueprint §9.1 Classic order — matches `SELECT_ORDEROUT_ROUNDSYSTEM`. Add `lowerBodyweightFirstTiebreak` toggle.
- Blueprint §9.2 Multirep order — PowerGage shows "manual fixed order" is operationally fine; no auto-sort by reps observed.
- Blueprint §11.7 Results / exports — extend to cover the 5-template minimum (short final, attempt card, team, absolute, diploma).
- Blueprint §17 "do not model ISF on top of S/B/D" — PowerGage is the cautionary tale; §3.4 above is the evidence.
- Roadmap V2 `RulesPack abstraction` — release notes show why this belongs after V1: PowerGage's broad federation support creates schema and UX complexity. Keep V1 ISF hardcoded, then introduce rules packs deliberately.
- Roadmap V2 `Audio system` — PowerGage confirms timer/signal/voice cues are operationally useful, but they should be a replaceable audio layer, not hardwired WAV files.
- Roadmap V2 `Awards ceremony view` — PowerGage's diploma/awards surface confirms this as a real operator workflow, not a cosmetic feature.
- Roadmap V2 `OpenPowerlifting export` — PowerGage already exports to external powerlifting sites; our export layer should be adapter-based.
- Roadmap V3 `broadcast publisher` — PowerGage's LAN scoreboard and XML/XSLT online table validate a decoupled publisher, but we should use web-native local channels, not DB views plus XSLT.
- Roadmap V3 `OBS chromakey HTML modes` — the desktop `Экран для видеотрансляции` shortcut confirms broadcast output should be a dedicated surface, not just a resized scoreboard.
- Roadmap V3 `multi-platform broadcast layouts` — the desktop `Табло` folder confirms separate order, timer, plate, and scoreboard surfaces are operationally distinct.

## 9. Risk and caveats

- **Source-of-truth risk**: every constant copied from `CALC_PTS.proc` (curves, masters multipliers, federation bands) must be re-verified against ISF v5.1 + streetlifting.ru/points/ before landing in our codebase.
- **Version drift**: PowerGage 2.8 is the latest folder evidence. Procedures may have evolved across 2.1–2.8; the release notes confirm storage and module behavior changed across versions.
- **Static-only blind spots**: this pass cannot evidence (a) save/export file formats, (b) actual UI ergonomics, (c) which menu items are wired vs dead, (d) exact reports output. These need a sandbox session.
- **Manual extraction gap**: the legacy `.doc` equipment-layout file was not parsed; only the PDF equipment manual was summarized.
- **Security gap in reference product**: plaintext DB connection settings were observed in an importer config. Do not copy this pattern or its values.
- **Shortcut metadata caveat**: normal COM shortcut metadata returned empty targets, so targets/arguments were recovered from raw link strings and verified with `Test-Path` where possible.
- **License**: PowerGage is closed-source proprietary software. Filenames, schema names, formula structure recovered here are observations of its installer payload, not redistributable assets. Do not paste `.proc` source into our repository.

## 10. Open follow-ups

1. Open the `.rep` templates with a text/hex editor to identify the report engine (FastReport, Stimulsoft, or proprietary).
2. Scan all remaining `.proc` files for any procedure encoding the **"additional points above threshold in Classic"** rule from streetlifting.ru. Current evidence: not present in `CALC_PTS`. If absent globally, our product implements this rule independently.
3. Parse or visually inspect `Примерная расстановка оборудования.doc` if equipment placement detail becomes relevant.
4. If updater behavior matters, locate the original installer payload that contains `PGUpdater.exe` or confirm the shortcut is stale.
5. Run the sandbox playbook (`docs/powergage-analysis-playbook.md` §6) only if a specific question still needs runtime evidence — e.g., the actual structure of the save/export file.
6. Compare against `docs/powertable-findings-v4.md` when deciding V2/V3 scope.

## 11. One-line summary

PowerGage is a Firebird+stored-procedure multi-federation Windows product with mature secretary, reports, LAN scoreboard, import, and licensing workflows. Its `.proc` source proves the ISF scoring math, masters age multipliers, attempt status pattern, and round-system order — while the manuals show useful operational requirements we should implement with a modern offline-first web/desktop model instead of copying its Firebird/ODBC/Windows-LAN architecture or its ISF-on-powerlifting schema overload.
