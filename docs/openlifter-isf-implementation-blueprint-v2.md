# OpenLifter -> ISF Streetlifting — Implementation Blueprint v2

Date: 2026-04-25
Supersedes: [openlifter-isf-implementation-blueprint-v1.md](openlifter-isf-implementation-blueprint-v1.md). Read v1 for unchanged narrative sections; this document contains all amendments and is the **single source of truth for Sprint 1 implementation**.

Source-of-truth references:
- ISF Rules v5.1 (effective 2025-08-01) — `ISF_Rules_ver.5.1_(RU).docx`, `ISF_Rules_ver.5.1_(en-US).docx`
- `https://streetlifting.ru/points/` — ISF coefficient lookup tables (binding)
- `https://streetlifting.ru/docs/standards` — sport-rank classification norms (V2)

Decision anchors:
- [decisions-v1.md](decisions-v1.md) — D1–D12 (closed before v1 implementation)
- [decisions-v2.md](decisions-v2.md) — D13–D29 (closed by PowerTable installed-client analysis)

Findings anchors:
- [powergage-findings-v1.md](powergage-findings-v1.md) — schema, masters bug, .proc evidence
- [powertable-findings-v2.md](powertable-findings-v2.md) — web-crawl, change log, public protocol shape
- [powertable-findings-v3.md](powertable-findings-v3.md) — 1С technical baseline
- [powertable-findings-v4.md](powertable-findings-v4.md) — installed-client deep dive (entity model, judging UI, audio, broadcast catalog)
- [reference-comparison-v1.md](reference-comparison-v1.md) — three-product feature matrix

## 0. What changed from v1

| § | Change | Driven by |
|---|---|---|
| §3 (scope) | Sprint 1 scope expanded: judgeVotes, forecast interface stub, presets, extended plates | D15, D16, D24, D25, D27, D28 |
| §6.1 | `Exercise` enum reserved for V3 extension (`MU`, `SQ`); `FormulaCode` added | D24 |
| §6.2 | Concrete preset list for `AgeCategory[]` ships | D27 |
| §6.3 | Concrete preset list for `WeightCategory[]` ships, with M_52 youth-only restriction | D28 |
| §6.4 | `ClassicAttempt.status` → `judgeVotes: JudgeVotes`; sequence 1..4 (slot 4 record-only); `lastDeclarationAt`, `changesUsedInRound` added | D2B, D9, D11, D15 |
| §6.5 | `MultirepAttempt.judgeVotes` added; `durationSec` default 120 | D10, D15 |
| §6.7 | `Entry.disciplineCode`, `country`, `reweighKg` added | D2A, D24, athlete catalog finding |
| §6.8 | `MeetState.enabledDisciplineCodes`, `lowerBodyweightFirstTiebreak`, `formula` enum extended; `Plate.recordOnly` added; per-format default attempt durations | D10, D24, D25, powergage finding |
| §7 | `ResultCalculator.forecast()` interface added (V1 stub, V2 impl) | D16 |
| §8 | ISF points service confirmed shape; masters M5/M6 split per D26 | D6, D26 |
| §9 | Tiebreak rules made fully explicit (placing + draw); 3-level draw tiebreak | D2A, D2B |
| §10 | `stateVersion` bumped to v2; explicit migration v1→v2 specified | D15 |
| §11.6 | Judging UI concrete layout: 60s timer, big buttons, Record toggle, 3-judge votes | D15, finding §7.2 |
| §11.7 | Forecast columns + OpenPowerlifting export reserved | D16, D24 |
| §11.8 (NEW) | Awards ceremony view (V2) | D19 |
| §13 | Code structure: + `domain/presets/`, + `judge-votes.ts`, + `forecast.ts` | D24, D15, D16 |
| §14 | Sprint 1 backlog: 2 new items (judge votes, forecast stub) | D29 |
| §15 | Test groups: + masters M5/M6 boundary, + judge vote aggregation | D26, D15 |
| §20 (NEW) | Sources of constants table | D24 |
| §21 (NEW) | Out-of-scope V1 explicit deferrals | D13–D23 |

## 1. Goal (unchanged from v1 §1)

Build an offline-first competition client for ISF streetlifting based on OpenLifter ideas, with a native ISF domain model.

Primary target: Classic Streetlifting meet-day workflow (V1).
Secondary: Multirep Streetlifting (V2 — Sprint 3 of V1 cycle).
Out of V1: athlete personal accounts, online applications, public ranking portal, federation CRM/ERP, live cloud sync.

## 2. Constraints (unchanged from v1 §2)

OpenLifter is tightly coupled to powerlifting `S/B/D`; AGPL v3 — read-only reference, no code reuse. ISF Classic and Multirep use different attempt models (no unified shape).

## 3. Scope summary (REVISED)

### V1 (Sprints 1–3 of this cycle)
- Classic + Multirep meet-day workflow
- 3-judge vote model with split-decision detection (D15)
- Forecast service interface (D16, stub impl)
- Built-in ISF discipline / age / weight category presets (D24, D27, D28)
- Extended plate set with `recordOnly` flag (D25)
- Browser-first PWA + Tauri wrapper (D5)
- JSON save-files with `stateVersion: "2"` (D5)
- ru-RU + en-US locales

### V2 (post-V1)
- Athlete↔Nomination split (D13)
- Stream / Group entities with auto-duration scheduling (D14)
- Forecast UI columns (D16 part 2)
- Sport rank computation (D17)
- Audio system: beeps + RU/EN voice (D18)
- Awards ceremony view (D19)
- OpenPowerlifting CSV export (D24)
- Multi-stage meets (Этапы соревнований)

### V3
- Local broadcast publisher (D20)
- OBS chromakey HTML modes (D21)
- Multi-platform broadcast layouts (D22)
- Public share-link sk-token model (D23)
- Weighted Calisthenics discipline (D4)

### Out of product (not roadmap)
- Cloud sync, federation CRM, billing, athlete personal pages, mobile apps, Telegram bot

## 4. Product boundary (unchanged from v1 §4)

V1 = Meet Client only. Admin Platform is V2+ if scoped at all.

## 5. Implementation strategy (unchanged from v1 §5)

Clean-room. No code copied from OpenLifter, PowerGage, or PowerTable. AGPL contamination check on every file in `src/`.

## 6. Domain model v2

### 6.1 Core enums (REVISED — extended per D39, decisions-v3)

```ts
// Per D35 (sport scope = streetlifting + WC) and D39 (V1 type-system reservations):
// V1 implementations support only "classic" and "multirep"; "weighted_calisthenics" is a reserved
// enum value to avoid breaking save-file schema migration when V2 launches WC.
export type CompetitionFormat = "classic" | "multirep" | "weighted_calisthenics";

// V1 disciplines use only "PU" and "DI" (per D24 catalog). MU_BAR / MU_RING / SQ are
// reserved for V2 WC sport. ISF v5.1 Glossary: female default = MU_RING (Ring Muscle-Up).
export type Exercise = "PU" | "DI" | "MU_BAR" | "MU_RING" | "SQ";

// V1 events: PU / DI / PUDI (streetlifting). V2 events add MU / SQ (single WC events) and
// MUPDISQ (full WC tetrathlon = Muscle-Up + Pull-Ups + Dips + Squat per ISF v5.1 §2.3).
export type Event = "PU" | "DI" | "PUDI" | "MU" | "SQ" | "MUPDISQ";

export type Division = "amateur" | "pro" | "adaptive";

export type Sex = "M" | "F" | "OPEN";

export type ResultUnit = "kg" | "reps";

export type FormulaCode = "isf_points" | "result_x_coefficient";

export type AttemptStatus = "pending" | "success" | "fail";  // computed from JudgeVotes
```

### 6.2 Age categories

Shape (unchanged from v1 §6.2):

```ts
export type AgeCategoryCode =
  | "youth" | "junior" | "open"
  | "masters_m1" | "masters_m2" | "masters_m3"
  | "masters_m4" | "masters_m5" | "masters_m6";

export type AgeCategory = {
  code: AgeCategoryCode;
  label: string;        // EN
  labelRu: string;
  minAge: number | null;
  maxAge: number | null;
  ratingEligible: boolean;
};
```

V1 preset (per D27) ships in `src/domain/presets/age-categories.ts`:

```ts
export const ISF_V51_AGE_CATEGORIES: AgeCategory[] = [
  { code: "open",        label: "Open",        labelRu: "Open",        minAge: 13, maxAge: null, ratingEligible: true },
  { code: "youth",       label: "Sub-Juniors", labelRu: "Юноши",       minAge: 13, maxAge: 17,   ratingEligible: true },
  { code: "junior",      label: "Juniors",     labelRu: "Юниоры",      minAge: 18, maxAge: 22,   ratingEligible: true },
  { code: "masters_m1",  label: "Masters M1",  labelRu: "Masters M1",  minAge: 40, maxAge: 44,   ratingEligible: true },
  { code: "masters_m2",  label: "Masters M2",  labelRu: "Masters M2",  minAge: 45, maxAge: 49,   ratingEligible: true },
  { code: "masters_m3",  label: "Masters M3",  labelRu: "Masters M3",  minAge: 50, maxAge: 54,   ratingEligible: true },
  { code: "masters_m4",  label: "Masters M4",  labelRu: "Masters M4",  minAge: 55, maxAge: 59,   ratingEligible: true },
  { code: "masters_m5",  label: "Masters M5",  labelRu: "Masters M5",  minAge: 60, maxAge: 69,   ratingEligible: true },  // CORRECT vs PowerTable + PowerGage
  { code: "masters_m6",  label: "Masters M6",  labelRu: "Masters M6",  minAge: 70, maxAge: null, ratingEligible: true },  // CORRECT vs PowerTable + PowerGage
];
```

### 6.3 Weight categories

Shape (unchanged from v1 §6.3):

```ts
export type WeightCategory = {
  code: string;
  sex: Sex;
  minKg: number | null;
  maxKg: number | null;
  ageCategoryCodes?: AgeCategoryCode[];  // restrict to specific age cats
};
```

V1 preset (per D28):

```ts
export const ISF_V51_WEIGHT_CATEGORIES: WeightCategory[] = [
  // Women — 7 categories
  { code: "F_44",        sex: "F", minKg: null, maxKg: 44 },
  { code: "F_48",        sex: "F", minKg: 44,   maxKg: 48 },
  { code: "F_52",        sex: "F", minKg: 48,   maxKg: 52 },
  { code: "F_56",        sex: "F", minKg: 52,   maxKg: 56 },
  { code: "F_60",        sex: "F", minKg: 56,   maxKg: 60 },
  { code: "F_67_5",      sex: "F", minKg: 60,   maxKg: 67.5 },
  { code: "F_67_5_PLUS", sex: "F", minKg: 67.5, maxKg: null },
  // Men — 12 categories; M_52 youth/junior only
  { code: "M_52",        sex: "M", minKg: null, maxKg: 52,
    ageCategoryCodes: ["youth", "junior"] },
  { code: "M_56",        sex: "M", minKg: 52,   maxKg: 56 },
  { code: "M_60",        sex: "M", minKg: 56,   maxKg: 60 },
  { code: "M_67_5",      sex: "M", minKg: 60,   maxKg: 67.5 },
  { code: "M_75",        sex: "M", minKg: 67.5, maxKg: 75 },
  { code: "M_82_5",      sex: "M", minKg: 75,   maxKg: 82.5 },
  { code: "M_90",        sex: "M", minKg: 82.5, maxKg: 90 },
  { code: "M_100",       sex: "M", minKg: 90,   maxKg: 100 },
  { code: "M_110",       sex: "M", minKg: 100,  maxKg: 110 },
  { code: "M_125",       sex: "M", minKg: 110,  maxKg: 125 },
  { code: "M_140",       sex: "M", minKg: 125,  maxKg: 140 },
  { code: "M_140_PLUS",  sex: "M", minKg: 140,  maxKg: null },
];
```

### 6.4 Discipline catalog (NEW — D24)

```ts
export type DisciplineCode =
  // Classic — formula = isf_points
  | "classic_2lift" | "classic_pu" | "classic_di"
  // Multirep two-lift — formula = result_x_coefficient
  | "multirep_2lift_8_12" | "multirep_2lift_8_16" | "multirep_2lift_12_16"
  | "multirep_2lift_16_24" | "multirep_2lift_24_32" | "multirep_2lift_32_48"
  // Multirep single-lift PU
  | "multirep_pu_8" | "multirep_pu_12" | "multirep_pu_16" | "multirep_pu_24" | "multirep_pu_32"
  // Multirep single-lift DI
  | "multirep_di_12" | "multirep_di_16" | "multirep_di_24" | "multirep_di_32" | "multirep_di_48";

export type Discipline = {
  code: DisciplineCode;
  labelRu: string;
  labelEn: string;
  competitionFormat: CompetitionFormat;
  event: Event;
  presetLoadKg?: { PU?: number; DI?: number };
  formula: FormulaCode;
};
```

Preset list ships in `src/domain/presets/disciplines.ts`. Reserved V3 codes (`wc_multiathlon`, `wc_muscleup`, `wc_squat`) are NOT included in V1 catalog.

### 6.5 Judge votes (NEW — D15)

```ts
export type JudgeVote = boolean | null;  // null = pending

export type JudgeVotes = {
  left: JudgeVote;
  center: JudgeVote;
  right: JudgeVote;
};

export const PENDING_VOTES: JudgeVotes = { left: null, center: null, right: null };

export function attemptStatusFromVotes(v: JudgeVotes): AttemptStatus {
  const decided = [v.left, v.center, v.right].filter(x => x !== null) as boolean[];
  if (decided.length < 2) return "pending";  // need at least 2 of 3 to decide
  const trues  = decided.filter(x => x === true).length;
  const falses = decided.filter(x => x === false).length;
  if (trues  >= 2) return "success";
  if (falses >= 2) return "fail";
  return "pending";
}

export function isSplitDecision(v: JudgeVotes): boolean {
  if ([v.left, v.center, v.right].some(x => x === null)) return false;
  const trues = [v.left, v.center, v.right].filter(x => x === true).length;
  return trues === 1 || trues === 2;  // 2-1 either direction
}
```

### 6.6 Classic attempts (REVISED — replaces v1 §6.4)

```ts
export type ClassicAttempt = {
  sequence: 1 | 2 | 3 | 4;            // slot 4 reserved (record-only) per D11
  declaredLoadKg: number | null;
  judgeVotes: JudgeVotes;             // D15 — replaces `status: AttemptStatus`
  lastDeclarationAt: string | null;   // ISO timestamp; D2B tiebreak
  changesUsedInRound: number;          // D9 weight-change protocol
  isRecordAttempt?: boolean;           // true only for sequence === 4 (D11)
};
```

`status` is **never stored** — always derived via `attemptStatusFromVotes(att.judgeVotes)`.

### 6.7 Multirep attempts (REVISED — replaces v1 §6.5)

```ts
export type MultirepAttempt = {
  sequence: 1;
  presetLoadKg: number | null;
  reps: number | null;
  judgeVotes: JudgeVotes;   // D15
  durationSec: number;       // 120 default per D10 — ISF Multirep timer
  noRepCount?: number;
};
```

### 6.8 Exercise result (UNCHANGED from v1 §6.6)

```ts
export type ExerciseResult =
  | { format: "classic";  exercise: Exercise; attempts: ClassicAttempt[] }
  | { format: "multirep"; exercise: Exercise; attempts: MultirepAttempt[] };
```

### 6.9 Entry (REVISED — extends v1 §6.7)

```ts
export type Entry = {
  id: string;
  competitionFormat: CompetitionFormat;
  disciplineCode: DisciplineCode;       // NEW: FK to discipline catalog (D24)
  event: Event;

  day: number;
  platform: number;
  flight: string;                        // V1 only; V2 introduces Stream/Group entities (D14)

  name: string;
  sex: Sex;
  birthDate: string | null;
  ageOverride: number | null;

  division: Division;
  team?: string;
  memberId?: string;
  guest: boolean;
  instagram?: string;
  notes?: string;

  country: string | null;                // NEW (D29 — from PowerTable Athlete schema)

  bodyweightKg: number | null;
  reweighKg: number | null;              // NEW (D2A.2)
  assignedAgeCategoryCode?: AgeCategoryCode;
  assignedWeightCategoryCode?: string;

  exercises: {
    PU?: ExerciseResult;
    DI?: ExerciseResult;
  };
};
```

V2 design preview: split into `Athlete` (persistent) + `Nomination` (per-meet, per-discipline, FK to athlete) — see D13. V1 keeps flat `Entry`.

### 6.10 Meet config (REVISED — extends v1 §6.8)

```ts
export type Plate = {
  weightKg: number;
  pairCount: number;
  color: string;
  recordOnly?: boolean;                  // NEW (D25): record-only plates ignored in standard validation
};

export type ClassicLoadConfig = {
  useBeltLoading: boolean;
  plates: Plate[];                       // default = ISF_V51_DEFAULT_PLATES_V2
  defaultAttemptDurationSec: number;     // 60 per D10
};

export type MultirepPreset = {
  sex: Sex;
  exercise: Exercise;
  division: Division;                    // NEW (D3)
  ageCategoryCodes: AgeCategoryCode[];   // NEW (D3)
  loadKg: number;
};

export type MultirepConfig = {
  defaultAttemptDurationSec: number;     // 120 per D10
  presetLoads: MultirepPreset[];         // default = ISF_V51_MULTIREP_PRESETS per D3
};

export type MeetState = {
  name: string;
  federation: string;
  country: string;
  state: string;
  city: string;
  date: string;

  competitionFormat: CompetitionFormat;
  enabledDisciplineCodes: DisciplineCode[];  // NEW (D24)
  divisions: Division[];
  ageCategories: AgeCategory[];          // default = ISF_V51_AGE_CATEGORIES (D27)
  weightCategories: WeightCategory[];    // default = ISF_V51_WEIGHT_CATEGORIES (D28)

  formula: "ISF_POINTS" | "RESULT" | "RESULT_X_COEFFICIENT";  // D24 — three modes
  useMastersAdjustment: boolean;
  lowerBodyweightFirstTiebreak: boolean; // NEW (D2A toggle, powergage finding §6)

  inKg: true;
  showAlternateUnits: boolean;

  classicLoadConfig?: ClassicLoadConfig;
  multirepConfig?: MultirepConfig;
};
```

Default plates (per D25):

```ts
export const ISF_V51_DEFAULT_PLATES_V2: Plate[] = [
  { weightKg: 50,    pairCount: 0, color: "green",  recordOnly: true },
  { weightKg: 25,    pairCount: 4, color: "red" },
  { weightKg: 20,    pairCount: 2, color: "blue" },
  { weightKg: 15,    pairCount: 2, color: "yellow" },
  { weightKg: 10,    pairCount: 2, color: "green" },   // ISF v5.1 §6.6 — green is 10kg
  { weightKg: 5,     pairCount: 2, color: "white" },
  { weightKg: 2.5,   pairCount: 2, color: "black" },
  { weightKg: 2,     pairCount: 1, color: "gray",   recordOnly: true },
  { weightKg: 1.5,   pairCount: 1, color: "gray",   recordOnly: true },
  { weightKg: 1.25,  pairCount: 2, color: "gray" },
  { weightKg: 1,     pairCount: 1, color: "gray",   recordOnly: true },
  { weightKg: 0.75,  pairCount: 1, color: "gray",   recordOnly: true },
  { weightKg: 0.5,   pairCount: 1, color: "gray",   recordOnly: true },
  { weightKg: 0.25,  pairCount: 1, color: "gray",   recordOnly: true },
];
```

## 7. Result calculation v2

### 7.1 Classic (UNCHANGED from v1 §7.1)
- per exercise result = best successful declared load
- total result = `bestPU + bestDI`
- result unit = `kg`

### 7.2 Multirep (UNCHANGED from v1 §7.2)
- per exercise result = counted reps
- total result = `repsPU + repsDI`
- result unit = `reps`

### 7.3 Calculator interface (REVISED — D16)

```ts
export type CalculatedResult = {
  unit: ResultUnit;
  pu: number;
  di: number;
  total: number;
};

export type ForecastResult = {
  predictedPlace: number | null;
  kgToFirstPlace: number | null;
  predictedAbsolutePlace: number | null;
  predictedCoefficient: number | null;
};

export interface ResultCalculator {
  getExerciseResult(entry: Entry, exercise: Exercise): number;
  getTotal(entry: Entry): CalculatedResult;
  forecast(entry: Entry, allEntries: Entry[]): ForecastResult;
}
```

V1 ships a stub `forecast()` that returns the current real values for `predictedPlace` and `predictedCoefficient` (no projection over remaining attempts) and `null` for kg-to-first / predicted-absolute-place. V2 implements full projection.

## 8. ISF points service

### 8.1 Inputs (UNCHANGED from v1)
- sex, exercise/event, bodyweight, format, result, age category

### 8.2 Constants

| Constant | Value | Source |
|---|---|---|
| Coefficient table `isf_abs_coef(bw, exer, sex)` | per `streetlifting.ru/points/` | D1 |
| Masters multipliers M1–M6 | 1.025 / 1.050 / 1.075 / 1.100 / **1.125 (60–69)** / **1.150 (70+)** | D6, D26 |
| Additional points (Classic only) | `(bodyweight − limit) × 0.5` if bw > limit, else 0 | D7 |
| BW limits for additional points | M: PU 90 / DI 100 / PUDI 95; F: PU 55 / DI 65 / PUDI 60 | D7 |

### 8.3 Service shape (UNCHANGED from v1 §8.3)

```ts
export type IsfPointBreakdown = {
  coefficient: number;
  basePoints: number;
  additionalPoints: number;
  finalPoints: number;
};

export interface IsfPointsService {
  calculate(entry: Entry, event: Event): IsfPointBreakdown;
}
```

## 9. Order and placing (REVISED)

### 9.1 Classic order (D2B)

```ts
ClassicOrderService.compare(a, b):
  // 1. declared weight ASC
  if (a.declaredLoadKg !== b.declaredLoadKg) return a.declaredLoadKg - b.declaredLoadKg;
  // 2. bodyweight ASC (or ID surrogate per lowerBodyweightFirstTiebreak toggle, see §6.10)
  if (a.bodyweightKg !== b.bodyweightKg) return a.bodyweightKg - b.bodyweightKg;
  // 3. lastDeclarationAt ASC
  return Date.parse(a.lastDeclarationAt) - Date.parse(b.lastDeclarationAt);
```

### 9.2 Multirep order (UNCHANGED — manual fixed order V1)

### 9.3 Placing tiebreak (D2A)

```ts
PlacingService.tiebreak(a, b):
  // 1. lighter wins
  if (a.bodyweightKg !== b.bodyweightKg) return a.bodyweightKg - b.bodyweightKg;
  // 2. lighter at re-weigh wins (Entry.reweighKg, D2A.2)
  const aR = a.reweighKg ?? a.bodyweightKg;
  const bR = b.reweighKg ?? b.bodyweightKg;
  if (aR !== bR) return aR - bR;
  // 3. shared place, next vacant
  return 0;
```

Place assignment must emit a flag when ties occur and skip the next place number.

## 10. Persistence model

### 10.1 Save file (REVISED)

```ts
export type SaveFile = {
  versions: {
    stateVersion: "2";        // bumped from "1" — see §10.2
    releaseVersion: string;
  };
  meet: MeetState;
  registration: RegistrationState;
  judging: JudgingState;
  ui: UIState;
  // V2 additions: + athletes: AthleteCatalogState; + streams: StreamPlanningState;
};
```

### 10.2 Versioning

- v1 = blueprint v1 baseline (used by no shipped product yet)
- v2 = blueprint v2 baseline (this doc) — adds judgeVotes, forecast stub, presets, new fields

Migration `v1 → v2`:
- For each `ClassicAttempt` / `MultirepAttempt` with legacy `status: AttemptStatus`:
  - `success` → `judgeVotes = { left: true, center: true, right: true }`
  - `fail`    → `judgeVotes = { left: false, center: false, right: false }`
  - `pending` → `judgeVotes = { left: null, center: null, right: null }`
- For each `ClassicAttempt`: add `lastDeclarationAt: null`, `changesUsedInRound: 0`
- For each `Entry`: add `country: null`, `reweighKg: null`, `disciplineCode` (inferred from `competitionFormat` + `event` via lookup in discipline catalog)
- For each `Plate`: add `recordOnly: false` if absent
- For `MeetState`: add `enabledDisciplineCodes` (default = all classic), `lowerBodyweightFirstTiebreak: false`

Migration is one-way (v1 → v2). v1 save-files are read-only after migration; never write back.

## 11. UI map v2

### 11.1 Home (UNCHANGED from v1 §11.1)

### 11.2 Meet Setup (REVISED — mirrors PowerTable installed-client tab structure)

Tabs (matches `Соревнование` form):
- **Основные настройки** — meet identity, dates, competition format, locale
- **Дисциплины** — discipline catalog with on/off toggle per code (D24)
- **Весовые категории** — F + M lists with on/off toggle (D28 preset)
- **Возрастные категории** — D27 preset
- **Диски** — plate set editor (D25)
- *Грифы* — V3 only (irrelevant for streetlifting belt-loading)
- *Этапы соревнований* — V2 only (multi-stage meets)

### 11.3 Registration (REVISED)

Add fields: `country`, `disciplineCode` (selector among enabled disciplines).

Bulk:
- CSV import (preserves new fields)
- CSV export
- Assign lot numbers

### 11.4 Weigh-ins (REVISED)

Add: `reweighKg` (optional second weigh-in for tied placing per D2A.2).

### 11.5 Flight Order (UNCHANGED V1; Stream/Group view is V2)

### 11.6 Judging (REVISED — concrete, mirrors PowerTable «Помост / Оператор»)

Visual layout:

```
┌──────────────────────────────────────────────────────────────┐
│  Top bar:                                                     │
│  [time-input] [coffee] [60s reset] [60s START 0 sec]  --:--   │
│                                  [pause] [☐ Record]           │
│                                                                │
│  Vote inputs (3 cards or chord shortcut, e.g. Q/W/E for L/C/R)│
│  ┌────────┐ ┌────────┐ ┌────────┐                              │
│  │ LEFT   │ │ CENTER │ │ RIGHT  │                              │
│  │ ✓ ✗ ?  │ │ ✓ ✗ ?  │ │ ✓ ✗ ?  │                              │
│  └────────┘ └────────┘ └────────┘                              │
│                                                                │
│  [GOOD LIFT — aggregate]      [NO LIFT — aggregate]           │
│  (large green)                  (large orange)                 │
├──────────────────────────────────────────────────────────────┤
│  Active-attempt rolling table:                                 │
│  Athlete | Disc | WC | BW | Rank | Year | Att# | Result |     │
│  M | ABS | Result(F) | Status | Warn                           │
└──────────────────────────────────────────────────────────────┘
```

Behavior per ISF v5.1 + D15 + D16:
- Timer: 60 s (Classic) / 120 s (Multirep) per D10. Audio cue at 30 s mark, terminal beep at 0 (V2 audio per D18; V1 ships placeholder beep).
- 3-judge vote inputs accept independent left/center/right boolean. UI aggregates display via `attemptStatusFromVotes`. Split-decision flag rendered as «2-1» badge.
- "Aggregate good lift" / "no lift" big buttons set all 3 votes to the same value (operator override mode for solo officiating).
- Record toggle marks attempt as record-attempt (sequence 4 candidate per D11).
- Sort modes (per D16): name / weight cat + name / age cat + weight cat + name / **forecast total + weight cat + name** (V2).
- Column visibility: 4 forecast columns (D16) hidden in V1, exposed in V2.

### 11.7 Results (REVISED)

Views:
- by division
- by age category
- by weight category
- by ISF points
- **by FORECAST** (V2 only — D16)

Exports:
- Official protocol CSV (UTF-8)
- Printable protocol HTML (browser print to PDF)
- Federation export adapter (planned — WRPF / IPF / etc.)
- **OpenPowerlifting CSV export** (V2 — D24, parity with PowerTable §10.5)

Reports (extended per powergage findings §6 + powertable findings v4 §10–11):
- Short final report (`1SHORTFINALREPORT` shape)
- Athlete attempt cards (`1CARDREPORT` shape)
- Team standings
- Absolute classification
- Diploma / certificate
- All bilingual RU/EN

### 11.8 Awards ceremony (V2 — NEW — D19)

Full-screen `/awards` route. Modes: Весовые / Абсолютка / Команды. Space-key advance between medalists. Optional ceremony music player.

## 12. User flow

### 12.1 Classic meet-day flow (UNCHANGED from v1 §12.1)

1. Create meet
2. Select Classic format
3. Select default ISF preset (auto-populates D27, D28, D24 catalogs)
4. Import registrations or enter manually (with country, disciplineCode)
5. Assign day/platform/flight
6. Weigh athletes in (with optional reweighKg)
7. Confirm openers
8. Run judging for PU (60s timer, 3-judge votes)
9. Run judging for DI (60s timer, 3-judge votes)
10. Review results
11. Export protocols
12. Save final meet file

### 12.2 Multirep meet-day flow (UNCHANGED from v1 §12.2)

(Sprint 3 backlog)

## 13. Suggested code structure (REVISED)

```text
src/
  app/
  pages/
    home/
    meet-setup/
      basic-settings/
      disciplines/         # NEW — D24 selector
      weight-categories/    # NEW — D28 selector
      age-categories/       # NEW — D27 selector
      plates/                # NEW — D25 editor
    registration/
    weigh-ins/
    flight-order/
    judging/
    results/
    awards/                  # V2 only — D19
  components/
    judge-vote-card/         # NEW — D15 UI
    timer-display/           # NEW — 60s/120s timer
    bar-load-visualization/  # belt loading, blueprint v1 §11.6
  store/
  domain/
    models/
    presets/                 # NEW — ISF_V51_*_PRESETS
      disciplines.ts
      age-categories.ts
      weight-categories.ts
      plates.ts
      multirep-loads.ts
  logic/
    isf/
      age.ts
      categories.ts
      result.ts
      forecast.ts            # NEW — D16
      classic-order.ts
      multirep-order.ts
      classic-placing.ts
      multirep-placing.ts
      points.ts
      judge-votes.ts         # NEW — D15
      export.ts
      export-openlifter.ts   # V2 — D24
  persistence/
    save-file.ts
    migrations/
      v1-to-v2.ts            # NEW — see §10.2
  translations/
    ru-RU.ts
    en-US.ts
```

## 14. Sprint 1 backlog v2 (REVISED — replaces v1 §14 Sprint 1)

Goal: foundation + Classic domain with v2 amendments.

Backlog (10 items, all V1 blockers per D29):
1. Bootstrap new client app (Vite + React + TypeScript + Redux Toolkit)
2. Implement domain types — incl. `JudgeVotes`, `Discipline`, `ForecastResult`, `Plate.recordOnly`, `Entry.country`, `Entry.reweighKg`, `Entry.disciplineCode`
3. Implement preset catalogs — disciplines (D24), age categories (D27), weight categories (D28), default plates (D25), multirep loads (D3)
4. Implement save/load with `stateVersion: "2"` and v1→v2 migration
5. Implement registration CRUD (with new fields)
6. Implement weigh-in for Classic (with reweighKg)
7. Implement result calculation for Classic — best, total, ISF points (with masters M5/M6 split per D26, additional points formula per D7)
8. Implement Classic order logic — D2B 3-level tiebreak, lowerBodyweightFirstTiebreak toggle
9. **Implement judge-votes domain (D15)** — `JudgeVotes` type, `attemptStatusFromVotes`, `isSplitDecision`
10. **Implement forecast service stub (D16)** — `ResultCalculator.forecast()` returns trivial result; full implementation deferred to V2

DoD:
- Can create a Classic meet from preset, save and load it
- Can enter athletes (incl. country, reweighKg) and weigh-ins
- Can compute best results, totals, ISF points
- Domain unit tests cover:
  - Tiebreaks (D2A placing, D2B order)
  - Masters multipliers — explicit boundary tests at ages 60, 69, 70, 80 (D26 differentiator)
  - Additional points formula at every BW threshold from D7
  - Judge-vote aggregation: 3-0, 2-1, 1-2, 0-3, all-pending, partial-pending
  - ISF preset disciplines / age cats / weight cats render in Meet Setup

## 15. Sprint 2 backlog (UNCHANGED from v1 §14 Sprint 2 + minor extensions)

Goal: Classic judging UI, results, ISF points UI.

Backlog (extended):
- Implement Classic judging screen per §11.6 layout
- Implement 60-second timer with placeholder beep
- Implement Record toggle (sets `isRecordAttempt` on slot 4)
- Implement belt-load visualization
- Implement results by category, by ISF points
- Implement Classic export CSV (UTF-8)
- Add regression tests for Classic
- **NEW:** judge vote UI (3 cards or chord shortcuts) — domain layer ready from Sprint 1
- **NEW:** forecast columns hidden by default; toggle in operator settings (data is stub)

DoD: full Classic tournament can be simulated locally end-to-end.

## 16. Sprint 3 backlog (UNCHANGED from v1 §14 Sprint 3)

Goal: Multirep module.

Backlog: Multirep preset config, one-attempt timed workflow, 120-second timer, reps/no-rep entry, Multirep results and placing, Multirep ISF points, Multirep export, regression tests.

DoD: full Multirep tournament can be simulated locally end-to-end.

## 17. Testing strategy v2 (REVISED — replaces v1 §15)

Required test groups:
- Category assignment (incl. M_52 youth-only restriction per D28)
- Age category assignment
- Classic result calculation
- **Masters multiplier — explicit M5/M6 boundary tests at age 60, 69, 70, 80** (D26 differentiator)
- Multirep result calculation
- Classic order calculation (declared weight ASC, BW ASC, declaration time ASC)
- Multirep order calculation
- Category placing (lighter-first, reweigh, vacant-place)
- ISF points (coefficient × result, additional points formula at all BW thresholds)
- **Judge votes** (3-0, 2-1, 1-2, 0-3, all-pending → status; isSplitDecision detection)
- Save file migrations v1 → v2 (every entity type)
- CSV import/export

Recommended fixtures (`tests/fixtures/`):
- `classic-small-meet.json`
- `classic-tie-break.json` (BW + reweigh)
- `classic-masters-m5-m6.json` (60-year-old vs 70-year-old)
- `classic-judge-split-decision.json` (2-1 lift, 1-2 fail)
- `multirep-basic.json`
- `multirep-preset-loads.json` (all 6 combinations from D3)

## 18. Decisions reference

See:
- [decisions-v1.md](decisions-v1.md) — D1–D12 (pre-v1 closure)
- [decisions-v2.md](decisions-v2.md) — D13–D29 (PowerTable installed-client closure)

## 19. Open questions

All v1 §18 open questions are closed (see decisions-v1.md).
All v2 questions are closed (see decisions-v2.md).
**There are no open questions blocking Sprint 1.**

## 20. Sources of constants (NEW)

| Constant | Source | Decision |
|---|---|---|
| Masters multipliers M1–M6 (incl. correct M5: 60–69, M6: 70+ → 1.150) | ISF v5.1 §10.9.4 | D6, D26 |
| Additional points formula `(bw − limit) × 0.5` | ISF v5.1 §10.9.5 | D7 |
| Multirep preset loads (12 combinations: 6 two-lift + single-lift sets) | ISF v5.1 §2.2 | D3 |
| Plate increment (1.25 kg multiple) + plate set + colors | ISF v5.1 §6.6, §7 | D8, D25 |
| Weight categories (F: 7 cats; M: 12 cats; M_52 youth-only) | ISF v5.1 + cross-validated with PowerTable | D28 |
| Age categories (Open / Sub-Jr / Jr / M1–M6 with v5.1 splits) | ISF v5.1 §10.9.4 | D27 |
| Attempt time limits (60 s Classic, 120 s Multirep) | ISF v5.1 §7.5.1 | D10 |
| Tiebreak rules (final placing, draw order, record holder) | ISF v5.1 §7.10, §7.4.3, §7.7.6 | D2 |
| Weight-change protocol (per round) | ISF v5.1 §7.4.6 | D9 |
| 4th attempt (record-only Classic) | ISF v5.1 §7.4.7, §7.7.4, §10.6 | D11 |
| Bodyweight precision (0.1 kg) | ISF v5.1 weigh-in spec | D12 |
| ISF coefficient table `isf_abs_coef(bw, exer, sex)` | streetlifting.ru/points/ | D1 |
| Sport rank standards (V2) | streetlifting.ru/docs/standards | D17 |
| Discipline catalog (22 entries) | PowerTable + ISF v5.1 §2 | D24 |
| 3-judge vote model + split decision | ISF v5.1 §7.6 + PowerTable judge-remote URLs + audio spec | D15 |

## 21. Out of scope V1 — explicit deferrals

| Feature | Earliest | Decision |
|---|---|---|
| Athlete↔Nomination split | V2 | D13 |
| Stream / Group entities + auto-scheduling | V2 | D14 |
| Forecast UI (4 columns) | V2 | D16 part 2 |
| Sport rank computation | V2 | D17 |
| Audio system (beeps + RU/EN voice) | V2 | D18 |
| Awards ceremony view | V2 | D19 |
| OpenPowerlifting CSV export | V2 | D24 |
| Multi-stage meets (Этапы соревнований) | V2 | finding §17.1 |
| Local broadcast publisher | V3 | D20 |
| OBS chromakey HTML modes | V3 | D21 |
| Multi-platform broadcast layouts | V3 | D22 |
| Public share-link sk-token model | V3 | D23 |
| Weighted Calisthenics discipline | V3 | D4 |
| Records archive across meets | V2 (depends on D13) | finding §3.8 |
| Coach standings (тренерское первенство) | V2+ | finding §17.1 |
| Live online cloud sync | (not in product) | — |
| Telegram bot integration | (not in product) | — |
| OBS / video-recording integration | V3 | D21–D22 |
| Athlete personal pages / online registration | (not in product) | — |
| Federation CRM / billing | (not in product) | — |

## 22. Final go/no-go for Sprint 1

**Status: GO.**

All blocking decisions are closed. Sprint 1 backlog above is concrete and implementation-ready. The 10 backlog items are independent enough to be parallelizable across multiple developers if needed.

The single most important domain-correctness fact for the codebase: **Masters M5 covers 60–69 and Masters M6 covers 70+ → 1.150 multiplier**, per ISF v5.1 §10.9.4. Both PowerGage and PowerTable encode the pre-v5.1 single-band 60+ → 1.125; **our product is correct against the current rulebook, theirs is not**. Ship with explicit boundary tests proving M5/M6 behavior, and surface this correctness story in marketing.

## 23. PowerGage / PowerTable references (UNCHANGED from v1 §19)

PowerGage = workflow + domain breadth reference (closed-source, do not copy code or .proc).
PowerTable = competitive UX benchmark + correctness counter-example for masters (do not assume their rules engine is current).

See:
- [powergage-findings-v1.md](powergage-findings-v1.md)
- [powertable-findings-v2.md](powertable-findings-v2.md)
- [powertable-findings-v3.md](powertable-findings-v3.md)
- [powertable-findings-v4.md](powertable-findings-v4.md)
- [reference-comparison-v1.md](reference-comparison-v1.md)
