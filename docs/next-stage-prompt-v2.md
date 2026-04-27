# Next-Stage Working Prompt — ISF Meet Client v2

Date: 2026-04-25
Prompt version: 2 — supersedes [next-stage-prompt-v1.md](next-stage-prompt-v1.md)

**STATUS: Track A (reference closure) = DONE. Next action = Track B (Sprint 1 implementation).**

---

## 0. How to use this document

Read this file first and exclusively. It is self-contained. It replaces v1 and consolidates all findings from all reference sources into the decisions that matter for code. Do not open the other docs unless you need to trace a specific evidence chain.

---

## 1. Mission

Build the **ISF Streetlifting Meet Client** — offline-first, local-day operation, Classic first, Multirep second. Architecture, domain types, sprint backlog, and decisions are fixed. This document is the handoff to whoever writes the code.

Clean-room requirement stands: **no AGPL inheritance, no code copied from OpenLifter, no PowerGage procedure logic.**

Project root: `C:\PROJECTS\streetlifting-os\`

---

## 2. Reference sources — roles only

| # | Reference | Role | Files |
|---|---|---|---|
| 1 | ISF Rules v5.1 (EN + RU) | **Binding rules** | `ISF_Rules_ver.5.1_(en-US).docx`, `(RU).docx` |
| 2 | ISF absolute-coefficient tables | **Binding constants** | `https://streetlifting.ru/points/` |
| 3 | OpenLifter | **Architecture shape only** | `_research/openlifter-main/src/` |
| 4 | PowerGage | **Workflow reference only** | `Power Gage/` install tree |
| 5 | PowerTable | **Competitive UX benchmark** | `powertable-findings-v2.md`, `v3.md` |

Every conflict is resolved in favor of ISF Rules v5.1. PowerGage's constants are wrong on masters (see §6 below).

---

## 3. Sprint 1 — GO

Status: **unblocked**. All five blueprint §18 open questions are answered. Begin implementation.

Sprint 1 backlog (from [openlifter-isf-implementation-blueprint-v1.md](openlifter-isf-implementation-blueprint-v1.md) §14):

1. Bootstrap new client app (browser SPA, no backend, `npx serve` for dev)
2. Implement domain types (`src/types/`)
3. Implement meet-setup preset system (plates, Multirep loads, masters table)
4. Implement save / load (JSON file, `stateVersion`)
5. Implement athlete registration CRUD
6. Implement weigh-in for Classic
7. Implement result calculation for Classic (ISF coefficient × total + masters multiplier + additional points)
8. Implement Classic attempt-order logic (round system + declaration timer)

Deferred to Sprint 2:
- 4th-attempt UI (model the slot in Sprint 1, do not enable editing)
- Records module
- Re-weigh logic for tied placing (`reweighKg` field exists in Sprint 1 but is null)

Out of scope for V1 and V2:
- Weighted Calisthenics, live scoreboard, Telegram bot, OBS, multi-platform operation, athlete accounts, records archive

---

## 4. Domain model amendments (sprint 1 schema)

Apply these changes to blueprint §6 before writing any type:

```ts
// § 6.1 — MultirepPreset extended
interface MultirepPreset {
  sex: "M" | "F";
  exercise: "PU" | "DI";
  division: "amateur" | "pro";
  ageCategoryCodes: AgeCategoryCode[];
  loadKg: number;
}

// § 6.2 — all six masters bands (DO NOT collapse 60+ → single band)
type AgeCategoryCode =
  | "youth"          // Sub-Juniors, 13–17
  | "junior"         // 18–22
  | "open"           // unrestricted
  | "masters_m1"     // 40–44 → × 1.025
  | "masters_m2"     // 45–49 → × 1.050
  | "masters_m3"     // 50–54 → × 1.075
  | "masters_m4"     // 55–59 → × 1.100
  | "masters_m5"     // 60–69 → × 1.125  ← PowerGage stops here (WRONG)
  | "masters_m6";    // 70+   → × 1.150  ← ISF v5.1 §10.9.4, PowerGage MISSING this

// § 6.4 — ClassicAttempt extended
interface ClassicAttempt {
  sequence: 1 | 2 | 3 | 4;    // slot 4 = record only (Sprint 1: reserved, not editable)
  declaredWeightKg: number;
  status: "pending" | "success" | "fail";
  lastDeclarationAt: string;   // ISO timestamp, for order tiebreak §7.4.3
  changesUsedInRound: number;  // for weight-change protocol enforcement
}

// § 6.7 — Entry extended
interface Entry {
  // … existing fields …
  reweighKg: number | null;    // for tie-break §7.10.2; null in V1
  coaches: string[];           // multi-coach, confirmed by PowerTable protocol
}

// § 6.8 — timing
interface ClassicConfig {
  defaultAttemptDurationSec: 60;   // §7.5.1
}
interface MultirepConfig {
  defaultAttemptDurationSec: 120;  // §7.5.1
}

// Exercise enum — reserve WC values (commented out)
type Exercise = "PU" | "DI"; // | "MU" | "SQ" reserved for V3
type CompetitionFormat = "classic" | "multirep"; // | "weighted_calisthenics" reserved
```

---

## 5. ISF rule constants (hardcode these verbatim)

### 5.1 Masters multipliers (ISF v5.1 §10.9.4)

```ts
const ISF_MASTERS_MULTIPLIERS: Record<AgeCategoryCode, number> = {
  youth: 1.0, junior: 1.0, open: 1.0,
  masters_m1: 1.025,
  masters_m2: 1.050,
  masters_m3: 1.075,
  masters_m4: 1.100,
  masters_m5: 1.125,
  masters_m6: 1.150,  // ← PowerGage is missing this band
};
```

### 5.2 Additional-points formula (ISF v5.1 §10.9.5 — Classic only)

```ts
type BwLimits = { PU: number; DI: number; PUDI: number };
const ISF_BW_LIMITS: { M: BwLimits; F: BwLimits } = {
  M: { PU: 90, DI: 100, PUDI: 95 },
  F: { PU: 55, DI: 65,  PUDI: 60 },
};
function additionalPoints(sex: "M" | "F", event: "PU" | "DI" | "PUDI", bw: number): number {
  return Math.max(0, (bw - ISF_BW_LIMITS[sex][event]) * 0.5);
}
```

### 5.3 Multirep fixed loads (ISF v5.1 §2.2)

Men: PU = 8/16/24/32 kg, DI = 16/24/32/48 kg (Sub-Jr / Jr+M40+ / Open Amateur / Pro).
Women: PU = 8/12 kg, DI = 12/16 kg (Jr+M40+ / Open).

Full `ISF_V51_MULTIREP_PRESETS[]` array is in [decisions-v1.md §3C](decisions-v1.md).

### 5.4 Plate increment (ISF v5.1 §7)

Belt total must be a **multiple of 1.25 kg**. Smallest required plate: 1.25 kg.

Validate on attempt declaration: `declaredWeightKg % 1.25 === 0`.

### 5.5 Weight-change protocol (ISF v5.1 §7.4.6)

| Round | Changes allowed |
|---|---:|
| R1 | 1 |
| R2 | 0 |
| R3 | 2 |

60-second declaration timer. On expiry:
- After success → auto-advance +2.5 kg
- After fail → repeat same weight

### 5.6 Tie-break rules

**Placing (§7.10):** lighter bodyweight wins → lighter re-weigh wins → shared place, next place vacant.

**Attempt order (§7.4.3):** declared weight ASC → bodyweight ASC → declaration timestamp ASC.

---

## 6. What NOT to copy from references

| Source | Do not copy |
|---|---|
| PowerGage `CALC_PTS.proc` | Masters multipliers (missing M6), additional-points (absent entirely) |
| PowerGage architecture | Firebird stored-procedure model, two-shell client |
| PowerTable | `Справочник`/`Документ` object model (irrelevant — we use JSON) |
| OpenLifter | Any `S/B/D` attempt logic, IPF/Wilks/Glossbrenner coefficient tables |
| OpenLifter | `src/` code (AGPL — read for shape, copy zero lines) |

---

## 7. Key UX patterns worth borrowing

From PowerTable (production evidence):
- `FORECAST` column — projected total if next declared attempt succeeds. Add as `IsfPointBreakdown.forecastTotal`.
- 4th-attempt record slot as a **separate visible column** (`П4(R)`, `О4(R)`), not a federation-gated overload.
- Sport-rank annotation (`Разряд` column) derived at render time, not stored in `Entry`.
- `Личник, <city>` as the individual-entry team display (no club affiliation).

From PowerGage:
- `lowerBodyweightFirstTiebreak: boolean` toggle on `MeetState` (controls whether lighter BW lifts first within declared-weight ties — §7.4.3 mandates it, but some non-ISF meets disable it).
- Bilingual reports: every report needs RU + EN variants.
- Attempt cards (`1CARDREPORT`) and diplomas (`DIPLOM`) as required output.

From OpenLifter:
- `stateVersion: number` on the save-file — migration layer runs on load.
- Per-page container pattern mapping 1:1 to workflow steps.
- Coefficient tables as plain TypeScript `const` objects, not stored procedures.

---

## 8. Protocol output required (verified from PowerTable production data)

Final protocol columns for **Classic**:

```
№ | Age cat | Team | Birth date | Weight class | Bodyweight |
P1 | P2 | P3 | P4(R) | Best PU |
D1 | D2 | D3 | D4(R) | Best DI |
Total | Rank achieved | ISF Coef | ISF Abs pts | Points | Coach(es)
```

Final protocol columns for **Multirep** (2-lift):

```
№ | Age cat | Team | Birth date | Weight class | Bodyweight |
PU reps | Best PU |
DI reps | Best DI |
Total reps | Rank achieved | ISF Coef | ISF Abs pts | Points | Coach(es)
```

Required output formats (from reference survey):
- XLSX (primary — Russian market standard, confirmed PowerTable and PowerGage)
- Protocol footer must include: head referee full name + city, head secretary full name + city
- Bilingual (RU / EN)

`MeetState` must include:
```ts
headReferee: { fullName: string; city: string };
headSecretary: { fullName: string; city: string };
```

---

## 9. Form factor (confirmed — Decision 5)

1. Sprint 1–3: browser SPA served from `localhost`
2. After Sprint 3: Tauri desktop wrapper (Win/macOS/Linux)
3. PWA fallback (web manifest + service worker) for no-admin machines

OpenLifter's `src-tauri/` is the shape reference for the wrapper.

---

## 10. PowerTable live-session status

Installed 1С thin client, authenticated as "ISF Краснодарский край". Partial capture:

- Connection: `http://powertable.ru/competition` (plain HTTP, no TLS)
- 1С platform: 8.3.27.1989
- Config version: `52021719a02bce46b1d5c19890c13c09`
- Confirmed object types: `Справочник.Соревнования`, `Обработка.РабочийСтол`
- Full 14-item menu documented (see [powertable-findings-v3.md](powertable-findings-v3.md))
- Dashboard: 41 RUB/nom, 0 balance, latency widget (< 300 ms = отличное, 300–500 = нормальное)

**Remaining (can be done in parallel with Sprint 1, non-blocking):**
- Navigate "Оператор табло" → capture judging-day UI
- Navigate "Номинации спортсменов" → capture all athlete-entry fields
- Navigate "Распределение по потокам и группам" → capture stream/group model
- Navigate "Отчёты/печатные формы" → capture export menu

These are observational enhancements. Sprint 1 is unblocked without them.

---

## 11. Hard constraints (unchanged from v1)

- Clean-room only. No code copied from OpenLifter.
- Two attempt schemas: `ClassicAttempt` and `MultirepAttempt`. No unified shape.
- Two placing services: `ClassicPlacingService`, `MultirepPlacingService`.
- Two order services. Multirep V1 = manual fixed order.
- Save-file is JSON with explicit `stateVersion`. Migration layer required before first production release.
- RU/EN parity from day one.
- No live cloud sync, no athlete accounts, no public ranking, no federation CRM in V1.
- ISF rules trump every reference. PowerGage is multi-federation — do not import its assumptions.
- **PowerGage's 60+ = 1.125 single band is WRONG. Use M5 (60–69) = 1.125 AND M6 (70+) = 1.150 per ISF v5.1.**

---

## 12. Document index

| File | What it contains | Status |
|---|---|---|
| `openlifter-isf-implementation-blueprint-v1.md` | Full blueprint: domain types, sprint backlog, architecture | Use as primary spec |
| `decisions-v1.md` | 12 decisions closing blueprint §18 + additional rules; includes full code snippets | **Read before writing any rule service** |
| `reference-comparison-v1.md` | 13-section side-by-side OpenLifter/PowerGage/PowerTable | Background reference |
| `powergage-findings-v1.md` | Static analysis of PowerGage install tree | Background reference |
| `powertable-findings-v2.md` | Deep web crawl of powertable.ru | Background reference |
| `powertable-findings-v3.md` | Live installed-client session (this session's output) | Background reference |
| `next-stage-prompt-v1.md` | Superseded by this file | Ignore |

---

## 13. One-line summary

Track A is complete. All 12 decisions are recorded. Sprint 1 is GO. The most important rule-level finding: ISF v5.1 defines M6 (70+) → 1.150 as a distinct masters band that PowerGage omits — our product must implement it correctly from day one.
