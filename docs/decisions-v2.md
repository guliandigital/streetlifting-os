# Decisions v2 — installed PowerTable client + broadcast catalog analysis

Date: 2026-04-25
Source: 7-round screenshot review of running PowerTable 1С client (federation: "ISF Краснодарский край") + textual review of public broadcast endpoint catalog at `https://powertable.ru/api/hs/p/`.
Anchors:
- [decisions-v1.md](decisions-v1.md) (D1–D12) — pre-implementation closure
- [powertable-findings-v3.md](powertable-findings-v3.md) — evidence base for this iteration
- [openlifter-isf-implementation-blueprint-v2.md](openlifter-isf-implementation-blueprint-v2.md) — blueprint that absorbs these decisions

This document records 17 additional decisions (D13–D29) surfaced by the deep PowerTable analysis. It supplements (does not supersede) decisions-v1.md.

## Reading order

| Group | Decisions | Effect |
|---|---|---|
| **V1 blockers** | D15, D16 (interface), D24, D25, D27, D28, D29 | Schema/preset changes that must land in Sprint 1 before code starts |
| **V2 carry-overs** | D13, D14, D16 (UI), D17, D18, D19 | Architectural debt with deferred implementation |
| **V3 carry-overs** | D20, D21, D22, D23 | Broadcast surface, deferred entirely |
| **Affirmations** | D26 | Re-confirms earlier decision against new evidence |

## D13 — Athlete vs Nomination split (V2 deferred; V1 retains flat Entry)

Source: PowerTable's `Спортсмены` is a persistent cross-meet catalog with per-athlete fields like sport rank, profession, multi-city affiliation, coaches, anti-doping samples, walk-in music. `Номинации спортсменов` is per-meet and per-discipline; one athlete can hold N nominations at one meet (verified examples: same athlete in two different age categories or two different disciplines).

Decision: V1 retains blueprint v1 §6.7 flat `Entry`. Trade-off accepted: no cross-meet history, no per-athlete records archive, no shared roster. Adequate for one-meet-one-JSON V1.

V2 introduces:
- `Athlete` collection (persistent identity, full PowerTable field set scoped down to V2 needs)
- `Nomination` (per-meet, per-discipline; FK to Athlete)
- Migration v2→v3 adds Athlete catalog as separate top-level save-file collection

Implementation impact (V1): none. Implementation impact (V2): replaces §6.7.

## D14 — Stream and Group as first-class entities (V2 deferred; V1 retains string flight)

Source: PowerTable `Распределение по потокам и группам` decomposes a meet into time-bounded streams (each = one discipline-cluster, one platform, one day, with start/end auto-computed from per-attempt duration statistics + 5-minute inter-exercise gap). Each stream has up to 3 groups. Sample: 7 streams across one day for the 28.03.2026 Кубок Краснодара.

Decision: V1 retains `Entry.flight: string` ad-hoc label. V2 introduces:

```ts
export type Stream = {
  id: string;
  day: number;
  platform: number;
  name: string;                   // operator-friendly: "Двоеборье мультилифт"
  disciplineCodes: DisciplineCode[];
  startTime: string;              // ISO time
  endTime: string;                // ISO time, auto-computed
};

export type Group = {
  id: string;
  streamId: string;
  name: string;
  nominationIds: string[];
};
```

V2 adds an auto-duration service: per-discipline calibration table + 5min gap rule = projected schedule. PowerTable defaults to 65s/attempt without statistics.

## D15 — Three-judge vote model (V1 BLOCKER, replaces simple AttemptStatus)

Source: PowerTable broadcast catalog exposes three independent judge-remote URLs:
- `Судейский пульт судьи СЛЕВА`
- `Судейский пульт ЦЕНТРАЛЬНОГО судьи`
- `Судейский пульт судьи СПРАВА`

PowerTable audio system announces explicit split-decision callouts: «Вес взят два к одному», «Попытка неудачная два к одному». This implies a 3-judge independent vote model with majority decision.

Decision: replace `ClassicAttempt.status: AttemptStatus` (blueprint v1 §6.4) with `judgeVotes: JudgeVotes`. Status becomes a computed projection.

```ts
export type JudgeVote = boolean | null;  // null = pending, true = good lift, false = no lift

export type JudgeVotes = {
  left: JudgeVote;
  center: JudgeVote;
  right: JudgeVote;
};

export type AttemptStatus = "pending" | "success" | "fail";

export function attemptStatusFromVotes(v: JudgeVotes): AttemptStatus {
  const decided = [v.left, v.center, v.right].filter(x => x !== null) as boolean[];
  if (decided.length < 2) return "pending";
  const trues = decided.filter(x => x === true).length;
  const falses = decided.filter(x => x === false).length;
  if (trues >= 2) return "success";
  if (falses >= 2) return "fail";
  return "pending";
}

export function isSplitDecision(v: JudgeVotes): boolean {
  if ([v.left, v.center, v.right].some(x => x === null)) return false;
  const trues = [v.left, v.center, v.right].filter(x => x === true).length;
  return trues === 1 || trues === 2;  // 2-1 either direction
}
```

Implementation impact (V1):
- `ClassicAttempt.judgeVotes: JudgeVotes` replaces `status: AttemptStatus`
- `MultirepAttempt.judgeVotes: JudgeVotes` likewise
- All result calculation reads `attemptStatusFromVotes(att.judgeVotes)` instead of `att.status`
- Save-file migration v1→v2 fills `judgeVotes` from legacy `status`: a `success` becomes `{left:true, center:true, right:true}`, a `fail` becomes all `false`, `pending` becomes all `null`

Why V1 not V2: any later schema change to attempt structure breaks save-file forward compatibility. Better to ship the correct shape from day 1, even if the UI initially aggregates 3 votes from a single button.

## D16 — Forecast service interface (V1 stub; V2 UI)

Source: PowerTable `Помост / Параметры` exposes 4 forecast columns:
- Место (ПРОГНОЗ)
- Сколько кг не хватает до 1 места (ПРОГНОЗ)
- Место в абсолютном первенстве (ПРОГНОЗ)
- Коэффициент (ПРОГНОЗ)

Plus a sort mode: «по сумме прогноза, ВК, ФИО». Forecast is first-class to operator UX.

Decision: `ResultCalculator` interface gains `forecast()` method in V1. V1 ships a trivial implementation (returns current state). V2 implements true projection over remaining attempts.

```ts
export type ForecastResult = {
  predictedPlace: number | null;
  kgToFirstPlace: number | null;
  predictedAbsolutePlace: number | null;
  predictedCoefficient: number | null;
};

export interface ResultCalculator {
  getExerciseResult(entry: Entry, exercise: Exercise): number;
  getTotal(entry: Entry): CalculatedResult;
  forecast(entry: Entry, allEntries: Entry[]): ForecastResult;  // NEW
}
```

V1 stub semantics: `forecast()` returns the current real values (place, coefficient) and `null` for kg-to-first / abs-place projections. The interface is locked; later versions only fill in real values. UI (Sprint 2+) hides forecast columns by default.

## D17 — Sport rank computation (V2 deferred)

Source: PowerTable `Помост / Параметры` column «Выполненный разряд» — auto-computes which sport classification (МС, КМС, разряды) the athlete's result satisfies. Reference table at `https://streetlifting.ru/docs/standards`.

Decision: V2 introduces `SportRankService` with table loaded from streetlifting.ru/docs/standards. Each result is checked against the standards table; output is the highest rank achieved.

V1 impact: none.

## D18 — Audio system (V2 deferred; spec frozen now)

Source: PowerTable `Помост / Звук и Музыка` tab.

Spec verbatim:
- Beep at 30s mark (timer warning)
- Two clicks 3s before timer end
- Siren on failed attempt
- Voice announcements (RU/EN locale toggle):
  - «Вес взят» / "Lift accepted"
  - «Вес взят два к одному» / "Lift accepted, 2 to 1"
  - «Попытка неудачная» / "No lift"
  - «Попытка неудачная два к одному» / "No lift, 2 to 1"
  - «30 секунд» / "30 seconds"
  - «Время вышло» / "Time up"
- Background music 80% volume from local folder
- Athlete personal MP3 (uploaded via Telegram bot in PowerTable; via file picker in our model) plays at 100% during walk-in
- Auto-duck to 50% during attempt timer

Decision: V2 ships beeps + RU/EN voice announcements. V3 adds music/walk-in. V1 ships a single placeholder beep at attempt end so Sprint 2 judging UI is not silent during testing.

V1 impact: none.

## D19 — Awards ceremony view (V2 deferred)

Source: PowerTable `Награждение` route. Spec: 3 modes (Весовые / Абсолютка / Команды), keyboard advance (space-bar = next medalist), filter by place (№1/№2/№3 / All), optional ceremonial music player.

Decision: V2 dedicated `/awards` full-screen route. V1 ships nothing (operators read places off the Results page).

## D20 — Local broadcast publisher (V3)

Source: PowerTable serves 30+ HTML views from cloud (`/api/hs/p/<view>`). Each is designed for embed in OBS/vMix/projectors.

Decision: V3 introduces a `BroadcastPublisher` Tauri-bundled HTTP server that exposes the same view set on `localhost:<port>`. Operators point OBS/projectors at the local server; works fully offline.

Architecture sketch (V3):
- Rust-side micro-server (axum or rocket) bundled with Tauri
- Reads from shared app state via the same SQLite/JSON store
- Emits HTML views identical in shape to PowerTable's

V1/V2 impact: none.

## D21 — OBS chromakey HTML modes (V3)

Source: PowerTable broadcast catalog has 6 chromakey-`#00FF00` variants:
- Рабочая таблица (chromakey)
- Последовательность выхода (chromakey)
- Информация о спортсмене (chromakey)
- Нижняя планка — 4 transition variants (static / hide-show / slide / fade)
- План соревнований (chromakey)

Decision: V3 view set parallels each in two flavors: `default` and `chromakey`. The chromakey variant uses CSS `background: #00FF00` and removes any non-text background elements.

V1/V2 impact: none.

## D22 — Multi-platform broadcast layouts (V3)

Source: PowerTable provides composite views with mirrored multi-platform variants: «Оценки + табло ассистентов + информация о спортсмене + основное табло. На 1 и 2 помосты» and the inverse «На 2 и 1 помосты».

Decision: V3 supports composite multi-platform broadcast layouts. The mirroring matters: it lets the broadcast director feed the leading platform into the primary frame.

V1/V2 impact: none.

## D23 — Public share-link sk-token auth (V3)

Source: PowerTable URL pattern `https://powertable.ru/api/hs/p/<view>?user=133&sk=0c7a1145-6fde-4738-a5d5-7e0f77741927&pomost=1` — `sk` is the federation-wide security key visible in operator settings. Anyone with the URL can read.

Decision: V3 broadcast publisher uses a similar share-link model: time-limited tokens for spectator/coach views; no user accounts. Trade-off: convenient onboarding for spectators, vulnerable to leak. Mitigation: per-meet tokens (auto-rotate post-meet) instead of federation-wide.

V1/V2 impact: none.

## D24 — ISF discipline catalog as preset (V1)

Source: PowerTable `Дисциплины` tab — 22 disciplines per meet with explicit formula assignment (`ISF points` for Classic + WC; `Результат умножить на значение` for Multirep).

Decision: V1 ships ISF discipline catalog as a built-in preset. Operator enables/disables disciplines per meet; cannot create new ones.

```ts
export type DisciplineCode =
  // Classic — formula = isf_points
  | "classic_2lift"
  | "classic_pu"
  | "classic_di"
  // Multirep two-lift — formula = result_x_coefficient
  | "multirep_2lift_8_12"   // F sub-jr/jr/masters
  | "multirep_2lift_8_16"   // M youth (sub-jr)
  | "multirep_2lift_12_16"  // F open
  | "multirep_2lift_16_24"  // M jr / masters
  | "multirep_2lift_24_32"  // M amateur open
  | "multirep_2lift_32_48"  // M pro
  // Multirep single-lift PU — formula = result_x_coefficient
  | "multirep_pu_8" | "multirep_pu_12" | "multirep_pu_16"
  | "multirep_pu_24" | "multirep_pu_32"
  // Multirep single-lift DI — formula = result_x_coefficient
  | "multirep_di_12" | "multirep_di_16" | "multirep_di_24"
  | "multirep_di_32" | "multirep_di_48";

export type Discipline = {
  code: DisciplineCode;
  labelRu: string;
  labelEn: string;
  competitionFormat: CompetitionFormat;
  event: Event;
  presetLoadKg?: { PU?: number; DI?: number };
  formula: FormulaCode;
};

// Reserved for V3 (catalog visible but disabled in V1):
// "wc_multiathlon", "wc_muscleup", "wc_squat"
```

The full preset list ships in `src/domain/presets/disciplines.ts`.

Implementation: `MeetState.enabledDisciplineCodes: DisciplineCode[]`. Selection UI in Meet Setup.

## D25 — Plate set extended to 0.25 kg / 50 kg (V1, supersedes D8)

Source: PowerTable `Диски` visualization shows full set:
- 50 kg (record)
- 25, 20, 15, 10, 5 kg (standard ISF v5.1 §6.6 set)
- 2.5, 2, 1.5, 1.25 kg (transition + record range)
- 1, 0.75, 0.5, 0.25 kg (record-only fractional)

Decision: extend default plate preset from D8 to include sub-1.25 kg record plates and 50 kg (record). Add `Plate.recordOnly: boolean` to the schema. Standard plate increment validation (multiple of 1.25 kg, ISF v5.1 §7) remains; record plates only count when the attempt is flagged as a record attempt.

```ts
export type Plate = {
  weightKg: number;
  pairCount: number;
  color: string;
  recordOnly?: boolean;  // NEW vs D8 — true for sub-1.25 kg plates and 50 kg
};

const ISF_V51_DEFAULT_PLATES_V2: Plate[] = [
  { weightKg: 50,    pairCount: 0, color: "green",  recordOnly: true },
  { weightKg: 25,    pairCount: 4, color: "red" },
  { weightKg: 20,    pairCount: 2, color: "blue" },
  { weightKg: 15,    pairCount: 2, color: "yellow" },
  { weightKg: 10,    pairCount: 2, color: "green" },   // ISF v5.1 §6.6 colors take precedence over PowerTable display
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

## D26 — M5/M6 masters split is the single largest correctness differentiator

Source (re-confirmed against new evidence):
- PowerTable `Возрастные категории` tab shows M5 = 60–99 and M6 = 99–99 (placeholder, never matches).
- PowerGage `CALC_PTS.proc` lines 132 + `CURRENTTOTALL.proc` lines 99–104 encode 60+ → 1.125 as a single band.
- ISF v5.1 §10.9.4: M5 (60–69) → 1.125, M6 (70+) → 1.150.

Decision: D6 from v1 stands. M5 covers 60–69, M6 covers 70+ → 1.150. This is **the single most user-visible correctness defect in both incumbents at launch** — any 70-year-old athlete in PowerTable or PowerGage is scored against an outdated multiplier.

Implementation: emphasize in marketing copy. Sprint 1 must include explicit boundary tests at ages 60, 69, 70, 80 to prove the M5/M6 split.

## D27 — ISF age categories as preset (V1)

Source: PowerTable `Возрастные категории` tab + ISF v5.1 §10.9.4 (with M5/M6 corrected per D26).

Decision: V1 ships preset:

```ts
export const ISF_V51_AGE_CATEGORIES: AgeCategory[] = [
  { code: "open",        label: "Open",        labelRu: "Open",        minAge: 13, maxAge: null, ratingEligible: true },
  { code: "youth",       label: "Sub-Juniors", labelRu: "Юноши",       minAge: 13, maxAge: 17,   ratingEligible: true },
  { code: "junior",      label: "Juniors",     labelRu: "Юниоры",      minAge: 18, maxAge: 22,   ratingEligible: true },
  { code: "masters_m1",  label: "Masters M1",  labelRu: "Masters M1",  minAge: 40, maxAge: 44,   ratingEligible: true },
  { code: "masters_m2",  label: "Masters M2",  labelRu: "Masters M2",  minAge: 45, maxAge: 49,   ratingEligible: true },
  { code: "masters_m3",  label: "Masters M3",  labelRu: "Masters M3",  minAge: 50, maxAge: 54,   ratingEligible: true },
  { code: "masters_m4",  label: "Masters M4",  labelRu: "Masters M4",  minAge: 55, maxAge: 59,   ratingEligible: true },
  { code: "masters_m5",  label: "Masters M5",  labelRu: "Masters M5",  minAge: 60, maxAge: 69,   ratingEligible: true },  // CORRECT vs PT/PG
  { code: "masters_m6",  label: "Masters M6",  labelRu: "Masters M6",  minAge: 70, maxAge: null, ratingEligible: true },  // CORRECT vs PT/PG
];
```

## D28 — ISF weight categories as preset (V1)

Source: PowerTable `Весовые категории` tab.

Decision: V1 ships preset:

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

The M_52 restriction («Доступно для: Юноши, девушки» in PowerTable) is encoded via `ageCategoryCodes` filter. Senior men do not nominate to M_52.

## D29 — Sprint 1 GO check (re-confirmed against v2)

With D15 (judgeVotes) added as a V1 schema-level change, Sprint 1 is **still GO**. The change is mechanical: replace `attempt.status` reads with `attemptStatusFromVotes(attempt.judgeVotes)`.

### Sprint 1 backlog amendments (v1 → v2)

| Sprint 1 item | New scope from v2 |
|---|---|
| bootstrap new client app | unchanged |
| implement domain types | + `JudgeVotes`, + `Discipline`, + `ForecastResult`, + `Plate.recordOnly`, + `Entry.country`, + `Entry.reweighKg` |
| implement meet setup preset system | + discipline catalog selector (D24) + age preset (D27) + weight preset (D28) + extended plate set (D25) |
| implement save/load | + state-version v2 + migration v1→v2 |
| implement registration CRUD | + country field |
| implement weigh-in for Classic | + reweighKg field |
| implement result calculation for Classic | + correct M5/M6 masters split (D26) + 3-judge vote aggregation (D15) + additional points formula (D7) |
| implement Classic order logic | + lowerBodyweightFirstTiebreak toggle (carryover from D2 / powergage findings) + declaration-time tiebreak (D2B) |
| **NEW:** implement judge-votes domain | `JudgeVotes` type + `attemptStatusFromVotes` + `isSplitDecision` |
| **NEW:** implement forecast service stub | `ResultCalculator.forecast()` returns trivial result; full impl in V2 |

Definition of done (extended):
- Can create a Classic meet from preset, save/load it
- Can enter athletes (incl. country, reweighKg) and weigh-ins
- Can compute best results, totals, ISF points (with masters M5 split at 60 and M6 at 70 — explicit fixture)
- Domain unit tests cover: tiebreaks (D2A, D2B), masters multipliers (boundary tests at 60, 69, 70, 80), additional points formula, judge-vote aggregation (3-0, 2-1, 1-2, 0-3, partial)

## Summary table

| ID | Title | Sprint | Blueprint § impact |
|---|---|---|---|
| D13 | Athlete↔Nomination split | V2 | new §6 entities |
| D14 | Stream/Group entities | V2 | new §6.9 + UI |
| D15 | Three-judge vote model | **V1 BLOCKER** | §6.4, §6.5 |
| D16 | Forecast service interface | V1 stub / V2 UI | §7.3 |
| D17 | Sport rank computation | V2 | new §8.4 |
| D18 | Audio system | V2 | new §11.6 audio |
| D19 | Awards ceremony view | V2 | new §11.8 |
| D20 | Local broadcast publisher | V3 | new architecture layer |
| D21 | OBS chromakey HTML modes | V3 | broadcast view set |
| D22 | Multi-platform broadcast layouts | V3 | broadcast view set |
| D23 | Public share-link sk-token auth | V3 | broadcast auth |
| D24 | ISF discipline catalog preset | V1 | §6.1 + §6.8 + presets/ |
| D25 | Plate set extension to 0.25 kg / 50 kg | V1 | §6.8 plates |
| D26 | M5/M6 masters split (re-affirmed) | V1 | §8.2 (D6 reaffirmed) |
| D27 | ISF age categories preset | V1 | §6.2 + presets/ |
| D28 | ISF weight categories preset | V1 | §6.3 + presets/ |
| D29 | Sprint 1 GO re-confirmed | V1 | §14 |

## One-line summary

The PowerTable installed-client analysis closes 17 additional decisions, of which 7 are V1 blockers (judgeVotes, forecast interface, discipline/age/weight/plate presets, Sprint 1 GO recheck). Sprint 1 remains GO; the largest correctness differentiator versus both PowerTable and PowerGage is the M5/M6 split at age 70.
