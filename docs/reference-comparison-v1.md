# Reference Comparison v1 — OpenLifter vs PowerGage vs PowerTable

Date: 2026-04-25
Anchors:
- [openlifter-isf-implementation-blueprint-v1.md](openlifter-isf-implementation-blueprint-v1.md)
- [powergage-findings-v1.md](powergage-findings-v1.md)
- [powertable-findings-v1.md](powertable-findings-v1.md)

Purpose: a flat side-by-side of all three references against the feature surface defined in the blueprint. Each cell is one of:
- ✓ — feature is present and matches the blueprint's intent.
- ≈ — feature is present in a different shape (note explains the gap).
- ✗ — feature is absent.
- ? — could not be verified within current evidence.

No empty cells. Notes are kept short.

## 1. Deployment and stack

| Aspect | OpenLifter | PowerGage | PowerTable | Target ISF Meet Client |
|---|---|---|---|---|
| Runtime | Browser SPA + Tauri desktop | Native Win32 + Firebird DB | 1С:Enterprise thin-client + cloud server | Browser-first, Tauri/Electron desktop wrapper later |
| OS | Cross-platform | Windows-only | Win/macOS/Linux | Cross-platform |
| Storage | LocalStorage + JSON save-files | Firebird 2.5 RDBMS + stored procs | Cloud (1С) | JSON save-files with `stateVersion` |
| Offline | ✓ | ≈ (local DB but networked Firebird possible) | ✗ | ✓ (mandatory) |
| License | AGPL v3 | Closed-source proprietary | Closed-source SaaS | TBD (clean-room, our IP) |
| Source available | ✓ (read-only, no copy) | ≈ (only `.proc` text ships in installer) | ✗ | n/a (we own it) |
| Auto-update | ≈ (web reload) | Manual `App/Update/*.proc` swap | ✓ (1С Starter) | ✓ planned (post-V1) |
| Multi-platform competition (помост) | Single platform | Multi-platform | Multi-platform, 1 op/platform | Single platform V1, multi V2 |

## 2. Domain coverage

| Feature | OpenLifter | PowerGage | PowerTable | Target |
|---|---|---|---|---|
| Powerlifting S/B/D | ✓ | ✓ | ✓ | ✗ (out of scope) |
| Bench-only / DL-only / Squat-only | ≈ (subset of S/B/D) | ✓ | ✓ | ✗ |
| ISF Classic (PU+DI) | ✗ | ≈ (overloaded onto bench/DL columns) | ✓ (dedicated PU/DI columns visible in protocol) | ✓ (dedicated schema, blueprint §6.4) |
| ISF Multirep (PU+DI single-attempt timed) | ✗ | ≈ (`mrpt1/mrpt2` columns, federation-coded) | ? (separate protocol view; not captured) | ✓ (blueprint §6.5) |
| Weighted Calisthenics | ✗ | ✗ | ✗ | ✗ V1, ? roadmap |
| 4th attempt for record only | ✗ | ✓ (`bench4` + `oc11`, federation-gated) | ✓ (`P(R)1`/`D(R)1` columns) | ✗ V1, ✓ V2 candidate |
| Folk BP / armlift / FZHD / WSF | ✗ | ✓ (70+ id_range bands) | ✓ (13 federations) | ✗ |
| Federation-customizable categories editor | ✗ | ≈ (data-driven via `objproperties`) | ✓ (built-in editor) | ✗ (ISF only — preset + override) |

## 3. Domain model shape

| Aspect | OpenLifter | PowerGage | PowerTable | Target |
|---|---|---|---|---|
| Attempt count for classic | 4 (S/B/D × 4) | 4 (`bench1..bench4`) | 3 + record slot | 3 (blueprint §6.4) |
| Attempt status tri-state | ✓ (`-1/0/1`) | ✓ (nullable `oc*`) | ✓ (implied) | ✓ (`pending/success/fail`) |
| Unified Classic/Multirep schema | ✗ (no Multirep) | ≈ (overloaded, single `lifter_exersis` row) | ? | ✗ (deliberate split, blueprint §6.6) |
| Weight categories per federation | ✓ (S/B/D divisions) | ✓ (`weigth_category` × `id_federation`) | ✓ (editable) | ✓ ISF preset |
| Age categories | ≈ (no first-class field; via division string) | ✓ (`age()` SP, masters bands) | ✓ (Open 13–99, Juniors 18–22, M1/M2/M3 visible) | ✓ (full set blueprint §6.2) |
| Lot number | ✓ | ✓ (`zr` column) | ✓ (`json_start` sort) | ✓ |
| Bodyweight | ✓ | ✓ (`wilks.self_weight`) | ✓ | ✓ |
| Guest / not-placing flag | ✓ | ? | ? | ✓ (blueprint §6.7 `guest`) |

## 4. Result calculation and scoring

| Feature | OpenLifter | PowerGage | PowerTable | Target |
|---|---|---|---|---|
| Best-of-attempts per exercise | ✓ | ✓ (`BESTBENCHBYLOC` etc.) | ✓ | ✓ |
| Total = sum of bests | ✓ (S+B+DL) | ✓ (range-conditional) | ✓ (`SUM = bestPU + bestDI`) | ✓ |
| Plate rounding to federation step | ✗ (no rounding) | ✓ (`trunc(val/2.5)*2.5` for IPF/SPR/WPC/etc.) | ? | ✗ (ISF doesn't round) |
| Multirep result = reps | ✗ | ≈ (raw reps for ISF range, `load × ratio` for others) | ? | ✓ (`reps` unit) |
| Wilks / IPF-GL / Glossbrenner / DOTS | ✓ (full tables in `coefficients/`) | ✓ (`ABS_ATLETIC`, `ABS_DOTS`, `ABS_IPF`, `ABS_NAPZHD`, `ABS_ZALU`) | ✓ (Wilks visible in `json_wilks` sort) | ✗ (out of scope; ISF formula only) |
| ISF coefficient table | ✗ | ✓ (`isf_abs_coef(bw, exer, sex)` SP, **table values in DB only**) | ✓ (`COEF` column) | ✓ (sourced from streetlifting.ru) |
| Masters age multiplier | ✗ | ✓ (40-44=1.025, …, 60+=1.125 in `CALC_PTS` and `CURRENTTOTALL`) | ? (likely applied in `ABS`/`COEF`) | ✓ (blueprint §8.2) |
| Final fitting curve (raw PL formula reused) | ≈ (per-formula) | ✓ (in `CALC_PTS`) | ? | ✓ (per ISF source) |
| Additional points above threshold (Classic) | ✗ | ✗ (verified absent in all `.proc`) | ? | ✓ (must implement from streetlifting.ru/points/) |
| Forecast / projected total | ✗ | ✗ | ✓ (`FORECAST` column) | ✓ (worth borrowing) |

## 5. Order and placing

| Feature | OpenLifter | PowerGage | PowerTable | Target |
|---|---|---|---|---|
| Round-system order (by declared load asc) | ✓ | ✓ (`SELECT_ORDEROUT_ROUNDSYSTEM`) | ✓ (`json_start` sort) | ✓ Classic |
| Olympic-system order | ✗ | ≈ (`SELECT_ORDEROUT_OLYMPICSYSTEM` exists but body partial/deprecated) | ? | ✗ V1 |
| Lot-number tiebreak | ✓ | ✓ (`zr`) | ✓ | ✓ |
| "Lower bodyweight first" toggle | ✗ | ✓ (`LowerBWFirstOrderBy` global param) | ? | ✓ (worth borrowing as `MeetState.lowerBodyweightFirstTiebreak`) |
| Manual fixed order for Multirep | n/a | ≈ (depends on group/stream config) | ? | ✓ V1 (blueprint §9.2) |
| Per-category placing | ✓ (`divisionPlace.ts`) | ✓ (`CATEGORYWINNERS`) | ✓ (`PL` column) | ✓ |
| Absolute placing (cross-category) | ✓ (`pointsPlace.ts`) | ✓ (`ABSOLUTE`, `ABSOLUTE_GRAM`, `ABSOLUTEBYAGE`) | ✓ (`ABS` column) | ✓ |
| Team scoring | ✗ | ✓ (`TEAMSCOREBYTEAM321`, `TEAMSCOREBYTEAMNAME`) | ? | ✗ V1, ? roadmap |
| Guest exclusion from placing | ✓ | ? | ? | ✓ |

## 6. UI / page map (vs blueprint §11)

| Page | OpenLifter | PowerGage | PowerTable | Target |
|---|---|---|---|---|
| Home / new-meet / load | `HomeContainer` ✓ | ≈ (Main shell + Secretary shell) | ≈ (event browser, no local file model) | ✓ |
| Meet setup | `MeetSetupContainer` ✓ | ≈ (Configurator.exe + per-meet wizard) | ✓ (federation-driven editor) | ✓ |
| Registration | `RegistrationContainer` ✓ | ✓ (Secretary module + CSV plugin) | ✓ (online registration + 1С client) | ✓ |
| Weigh-ins | `WeighinsContainer` ✓ | ✓ (Secretary module) | ✓ (mobile + 1С) | ✓ |
| Flight order | `FlightOrderContainer` ✓ | ✓ (`SELECT_ORDEROUT_*`) | ✓ (printable order) | ✓ |
| Judging | `LiftingContainer` ✓ | ✓ (Main shell judge table) | ✓ (mobile judge controls + 1С) | ✓ |
| Results | `ResultsContainer` ✓ | ✓ (live + final reports) | ✓ (working protocol + final) | ✓ |
| About / debug | ✓ | ✗ | ≈ (history page) | ✓ minimal |

## 7. Data input/output

| Feature | OpenLifter | PowerGage | PowerTable | Target |
|---|---|---|---|---|
| JSON save-file with versioning | ✓ (`versions.ts`) | ✗ (Firebird DB only) | ✗ (cloud only) | ✓ (blueprint §10) |
| CSV import | ✓ (`logic/import/`) | ✓ (CSV plugin DLL + `.docx` spec) | ✓ (`/api/hs/p/nomination?csv=true`) | ✓ |
| CSV export | ✓ (`logic/export/`) | ≈ (via reports + `.csv`-like outputs) | ✓ (with encoding choice ANSI/OEM/UTF8/UTF16) | ✓ UTF-8 only |
| Federation-specific export adapter | ✗ | ✓ (`WPCAWPCImportPluginObj.dll`) | ? | ✓ (planned, blueprint §11.7) |
| Printable protocol | ≈ (browser print) | ✓ (`.rep` templates × 23, RU/EN) | ✓ (final + working protocols, public URL) | ✓ |
| Athlete attempt cards | ✗ | ✓ (`1CARDREPORT`, `2CARDREPORT`, `ARMCARDREPORT`) | ✓ ("Printing a command request") | ✓ |
| Diplomas / certificates | ✗ | ✓ (`DIPLOM.rep`, `1GRAM`, `2GRAM`, `ABSGRAM`) | ✓ ("certificate and diploma printing") | ✓ |
| Live online scoreboard | ✗ | ✓ (`OnlineScoreTable.exe` + XML→XSLT→HTML) | ✓ (public `/api/hs/p/wt?nom=…` URL) | ✗ V1 |
| Manual backup | ≈ (Save File button) | ✓ (`backUp.cmd`) | ≈ (cloud-side) | ✓ (save-file + autosave) |

## 8. Operator workflow

| Capability | OpenLifter | PowerGage | PowerTable | Target |
|---|---|---|---|---|
| Single-operator judging | ✓ | ≈ (Main + Secretary shells split) | ✓ ("one operator per platform") | ✓ |
| Secretary ↔ judge separation | ✗ | ✓ (two `.ini` shells) | ✓ (two persona-targeted UIs) | ✓ (two layouts within one app) |
| Keyboard-driven workflow | ✓ | ? | ? | ✓ goal |
| Audio cues at attempt start / good-lift | ✗ | ✓ (`11.wav`, `22.wav`) | ? | ✗ V1, candidate post-V1 |
| Live error prevention | ≈ (validation) | ? | ✓ (advertised: "error protection system") | ✓ (form validation, save-versioning) |
| Equipment / platform layout planner | ✗ | ✓ (`Примерная расстановка оборудования.doc`) | ? | ✗ |
| Time-sync utility | ✗ | ✗ | ✓ (NetTime 3.14 recommended) | ✗ V1 |

## 9. Live broadcast / spectator

| Capability | OpenLifter | PowerGage | PowerTable | Target |
|---|---|---|---|---|
| OBS integration | ✗ | ✗ | ✓ (`obs-command` 1.6.3 plugin) | ✗ |
| Auto camera switching | ✗ | ✗ | ✓ | ✗ |
| Per-attempt video recording | ✗ | ✗ | ✓ | ✗ |
| Public live protocol URL | ✗ | ✓ (HTML output of `OnlineScoreTable.exe`) | ✓ (`/api/hs/p/wt?nom=…`) | ✗ V1 |
| Set-top-box scoreboard client | ✗ | ✗ | ✓ (Opera APK for Android TV) | ✗ |
| Music playback for ceremonies | ✗ | ? | ✓ ("award ceremonies with music playback") | ✗ |

## 10. Communications and athlete-facing

| Capability | OpenLifter | PowerGage | PowerTable | Target |
|---|---|---|---|---|
| Telegram bot integration | ✗ | ✗ | ✓ (`@PowerTable_bot`: alerts, music upload, weight requests, photos) | ✗ V1 |
| Athlete personal page | ✗ | ✗ | ✓ | ✗ V1 |
| Online registration form | ✗ | ✗ | ✓ | ✗ V1 |
| Athlete-side weight request submission | ✗ | ✗ | ✓ (via Telegram) | ✗ V1 |
| Records archive across meets | ✗ | ✓ (`RecordsKeeper.exe`, `RecordsConverter.exe`) | ✓ ("records management") | ✗ V1 |

## 11. Internationalization

| Aspect | OpenLifter | PowerGage | PowerTable | Target |
|---|---|---|---|---|
| RU support | ≈ (community translation) | ✓ (primary) | ✓ (primary) | ✓ |
| EN support | ✓ (primary) | ✓ (parallel `_ENG.rep`, `_RU.rep`) | ✓ (`/en/` site, `lg=en` URL param) | ✓ |
| Other locales | ✓ (multiple in `translations/`) | ✗ | ? | ✗ V1 |
| Charset | UTF-8 | WIN1251 | UTF-8 + ANSI/OEM/UTF-16 export | UTF-8 only |

## 12. Pricing / business model

| Aspect | OpenLifter | PowerGage | PowerTable | Target |
|---|---|---|---|---|
| Licensing model | AGPL v3 free | "PG_Free" tier exists; full tier paid (terms not in our possession) | Pay-per-nomination subscription | TBD |
| Cost per athlete-event | 0 | ? | 17.50–55 RUB CIS / 0.35–1.86 USD international | TBD |
| Operator certification expected | ✗ | ≈ (PDF manuals, no formal cert) | ✓ (training led by certified WPC int. judge) | ✗ goal: volunteer-friendly |

## 13. Decision-grade summary

What only PowerTable does (and is worth taking from):
- `FORECAST` column for projected total under remaining attempts.
- Three sort modes for the live work-table (start weights / current result / Wilks-equivalent).
- Reserved 4th-attempt record slot as a separate visible column, not as a federation-gated overload.
- Operator-targeted training as a first-class part of the product.

What only PowerGage does (and is worth taking from):
- Audio cues at attempt boundaries.
- Records archive utility as a separate product (`RecordsKeeper.exe`).
- "Lower bodyweight first" tiebreak global toggle.
- Schema-level confirmation of the masters multiplier shape (40-44 → 1.025, …, 60+ → 1.125).
- Bilingual report templates (`_RU.rep` / `_ENG.rep`) as a deliberate first-class pattern.

What only OpenLifter does (and is worth taking from):
- Pure-TS rule services testable in isolation.
- JSON save-file with `stateVersion`.
- Per-page Redux containers mapping 1:1 to the workflow.
- Coefficient tables packaged as data, not stored procedures.
- Tauri desktop wrapper as a no-cloud distribution path.

What none of them does (and we should still build):
- ISF "additional points above threshold in Classic" — verified absent in PowerGage `.proc`, not visible from PowerTable's surface, irrelevant for OpenLifter. Source of truth is streetlifting.ru/points/.
- Offline-first, single-binary, ISF-only client targeting volunteer secretaries on tournament day.
