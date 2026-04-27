# Decisions v1 — answers to blueprint §18 open questions

> **Continued in [decisions-v2.md](decisions-v2.md) (D13–D29)** — installed PowerTable client + broadcast catalog analysis surfaced 17 additional decisions, of which 7 are V1 blockers (judgeVotes D15, forecast interface D16, discipline/age/weight/plate presets D24/D25/D27/D28, Sprint 1 GO recheck D29). Read both v1 and v2 before starting implementation.

Date: 2026-04-25
Source of truth: ISF Rules v5.1 (en-US), `C:\PROJECTS\streetlifting-os\ISF_Rules_ver.5.1_(en-US).docx`. All numbered citations in this document refer to that file's section numbering.
Anchors:
- [openlifter-isf-implementation-blueprint-v1.md](openlifter-isf-implementation-blueprint-v1.md)
- [powergage-findings-v1.md](powergage-findings-v1.md)
- [powertable-findings-v1.md](powertable-findings-v1.md)
- [reference-comparison-v1.md](reference-comparison-v1.md)

This document closes the five open questions in blueprint §18 and records seven additional decisions surfaced during the reference closure pass.

## Decision 1 — Canonical rules sources (blueprint §18.1)

**Decision**: ISF Rules v5.1 (PDF/DOCX) is the single source of competition rules. Three streetlifting.ru endpoints supplement it for material not in the rulebook itself.

| Source | Authority | Use for |
|---|---|---|
| `ISF_Rules_ver.5.1_(en-US).docx` + `(RU).docx` | Binding | Disciplines, formats, attempt rules, draw rules, tie-break, masters multipliers, additional-points formula, equipment |
| `https://streetlifting.ru/docs/isf-rules` | Mirror of above | Online cross-reference only |
| `https://streetlifting.ru/points/` | Authoritative | ISF absolute-coefficient lookup tables (`isf_abs_coef(bw, exer, sex)` values) — these are not in the rulebook |
| `https://streetlifting.ru/docs/standards` | Authoritative | Sport-rank classification norms (МС, КМС, etc.) — separate from competition rules |
| `https://streetlifting.ru/docs/isf-rules/faq` | Supplementary | Edge-case interpretations only; never overrides v5.1 |

**Implementation impact**: our `IsfPointsService` (blueprint §8) sources its constant tables exclusively from streetlifting.ru/points/. PowerGage's `isf_abs_coef` Firebird table is **not** a valid source — see Decision 6 below for why.

## Decision 2 — Tie-break rules (blueprint §18.2)

**Decision**: implement three distinct tie-break rules, each in a different code path. ISF v5.1 specifies them separately.

### 2A. Final placing tie (§7.10)

> 7.10.1 If two or more athletes achieve an identical total score or result, the lighter athlete shall be ranked above the heavier athlete.
> 7.10.2 If, upon re-weighing, the body weights of the tied athletes remain identical and they have produced the same result by the end of the competition, the higher place shall be awarded to the athlete whose weight is lighter in the additional weigh-in.
> 7.10.3 If the athletes' body weights are still identical after the re-weighing, both athletes shall be awarded the same place, and the next place shall remain vacant.

**Implementation**:
```ts
// in ClassicPlacingService and MultirepPlacingService
function tiebreak(a: Entry, b: Entry): number {
  // 1. lighter wins
  if (a.bodyweightKg !== b.bodyweightKg) return a.bodyweightKg - b.bodyweightKg;
  // 2. lighter at re-weigh wins (optional second column)
  if (a.reweighKg !== b.reweighKg) return (a.reweighKg ?? a.bodyweightKg) - (b.reweighKg ?? b.bodyweightKg);
  // 3. shared place, next place vacant — leave equal and let placing layer skip
  return 0;
}
```

Add `reweighKg: number | null` to `Entry` (blueprint §6.7). Add `vacantNextPlace: boolean` flag in placing output, or implement the gap by emitting place numbers with a counter increment of 2 when ties land on the same number.

### 2B. Draw / attempt-order tie (§7.4.3)

> 7.4.3 Within each group: Attempts proceed in ascending order of declared weight. In case of equal declared weight, the athlete with the lower bodyweight lifts first. If both weight and bodyweight are equal, the earlier declaration takes precedence.

**Implementation**: `ClassicOrderService.compare()` ordering:
1. declared weight ASC,
2. bodyweight ASC,
3. declaration timestamp ASC.

Add `lastDeclarationAt: string` ISO timestamp to `ClassicAttempt` (blueprint §6.4) — needed for tiebreak 3.

### 2C. Record-holder tie (§7.7.6)

> 7.7.6 Tied Results — Official record-holder status is awarded to the athlete who first achieved the result at the competition.

**Implementation**: deferred until the records module is in scope. Out of V1.

## Decision 3 — Multirep fixed loads (blueprint §18.3)

**Decision**: ship the ISF v5.1 §2.2 preset table verbatim as the default `MultirepConfig.presetLoads`. Operator can override per meet via the Competition Regulations (rule allows it with ISF approval).

ISF v5.1 §2.2 verbatim:

> All specified loads are mandatory at official ISF events.
> Any changes require ISF approval and must be detailed in the Competition Regulations.

### 3A. Men

| Exercise | Sub-Jr (13–17) | Jr (18–22) & Masters (40+) | Amateur (Open) | Pro |
|---|---:|---:|---:|---:|
| Pull-Ups | 8 kg | 16 kg | 24 kg | 32 kg |
| Dips | 16 kg | 24 kg | 32 kg | 48 kg |

Two-Lift combos (PU + Dip kg load): 8+16, 16+24, 24+32, 32+48.

### 3B. Women

| Exercise | Sub-Jr / Jr / Masters | Open |
|---:|---:|---:|
| Pull-Ups | 8 kg | 12 kg |
| Dips | 12 kg | 16 kg |

Two-Lift combos: 8+12, 12+16.

### 3C. Data shape

```ts
const ISF_V51_MULTIREP_PRESETS: MultirepPreset[] = [
  // Men
  { sex: "M", exercise: "PU", division: "amateur", ageCategoryCodes: ["youth"],         loadKg: 8 },
  { sex: "M", exercise: "PU", division: "amateur", ageCategoryCodes: ["junior", "masters40plus"], loadKg: 16 },
  { sex: "M", exercise: "PU", division: "amateur", ageCategoryCodes: ["open"],          loadKg: 24 },
  { sex: "M", exercise: "PU", division: "pro",     ageCategoryCodes: ["open"],          loadKg: 32 },
  { sex: "M", exercise: "DI", division: "amateur", ageCategoryCodes: ["youth"],         loadKg: 16 },
  { sex: "M", exercise: "DI", division: "amateur", ageCategoryCodes: ["junior", "masters40plus"], loadKg: 24 },
  { sex: "M", exercise: "DI", division: "amateur", ageCategoryCodes: ["open"],          loadKg: 32 },
  { sex: "M", exercise: "DI", division: "pro",     ageCategoryCodes: ["open"],          loadKg: 48 },
  // Women
  { sex: "F", exercise: "PU", division: "amateur", ageCategoryCodes: ["youth", "junior", "masters40plus"], loadKg: 8 },
  { sex: "F", exercise: "PU", division: "amateur", ageCategoryCodes: ["open"],          loadKg: 12 },
  { sex: "F", exercise: "DI", division: "amateur", ageCategoryCodes: ["youth", "junior", "masters40plus"], loadKg: 12 },
  { sex: "F", exercise: "DI", division: "amateur", ageCategoryCodes: ["open"],          loadKg: 16 },
];
```

Extend `MultirepPreset` (blueprint §6.8) with `division: Division` and `ageCategoryCodes: AgeCategoryCode[]`. The current shape (`sex` + `exercise` + `loadKg`) is insufficient.

## Decision 4 — Weighted Calisthenics roadmap (blueprint §18.4)

**Decision**: out of scope V1 and V2. Tracked for V3.

Rationale:
- Weighted Calisthenics is a **first-class ISF discipline** equal in status to Classic and Multirep (§2.3, §4.3, §4.4).
- It is a four-lift contest: Muscle-Up + Pull-Ups + Dips + Barbell Squats (§2.3).
- Adding it requires:
  - Two new exercises (Muscle-Up, Barbell Squat). Currently `Exercise = "PU" | "DI"` in blueprint §6.1.
  - Different bar setup (squat rack), out of streetlifting equipment domain.
  - Records system upgrade — WC records are tetrathlon, not 2-lift (§10.2).
  - Female athletes default to Ring Muscle-Up (§ Glossary), with an opt-out window — domain edge case.
- Sprint 1–3 already cover Classic + Multirep. Adding WC at this stage doubles the scope.

**Action**: extend `Exercise` enum to `"PU" | "DI" | "MU" | "SQ"` only when V3 work begins. Preserve `competitionFormat` enum extensibility now: change `CompetitionFormat = "classic" | "multirep"` to allow `"weighted_calisthenics"` as a planned future value (commented out in V1 but reserved).

## Decision 5 — V1 deliverable form factor (blueprint §18.5)

**Decision**: **browser-first PWA + Tauri desktop wrapper**.

Rationale (evidence from references):
- PowerTable is cloud-only (no offline) — the disruptable weakness. Our offline-first stance is the differentiator.
- PowerGage is Windows-only Firebird — proves a desktop client is viable but ties operators to one OS.
- OpenLifter ships exactly this combination (browser SPA + `src-tauri/` wrapper) and works in production today.
- ISF tournaments require a **1-minute attempt timer (Classic, WC) and 2-minute timer (Multirep)** with **mandatory video recording** (§7.5.1, §7.7.5). Network outages on tournament day cannot block the timer.
- A pure web app without offline support fails the network-outage test. A pure desktop app fails operators on a borrowed Mac/Linux scoreboard machine.

**Rejected alternatives**:
- Pure web app, browser-only with local storage: fails because (a) no Tauri = no native time-sync hook for stream broadcasts, (b) browser cache is fragile under tab-close on tournament day.
- Native Win-only desktop: PowerGage already occupies that niche, and operators using macOS / Linux laptops at international ISF events would be excluded.
- Mobile-first: judges and secretaries operate on laptops, not phones. PowerTable's Android/iOS apps are companions, not the primary judge desk.

**Implementation order**:
1. Sprint 1–3 ship as a **browser SPA**, served from `localhost` via `npx serve` or similar. Save-file via download/upload.
2. After Sprint 3, wrap the same SPA in **Tauri** for one-click desktop install on Win/macOS/Linux. Save-file via filesystem.
3. PWA install (web manifest, service worker) as a fallback for users without admin rights to install Tauri binaries.

## Decision 6 — Masters multiplier table (new — supersedes blueprint §8.2 implicit shape)

**Decision**: use ISF v5.1 §10.9.4 masters table directly. **Do not** copy the masters values found in PowerGage's `CALC_PTS.proc`.

ISF v5.1 §10.9.4:

| Category | Age | Result multiplier |
|---|---|---:|
| Masters M1 | 40–44 | 1.025 |
| Masters M2 | 45–49 | 1.050 |
| Masters M3 | 50–54 | 1.075 |
| Masters M4 | 55–59 | 1.100 |
| Masters M5 | 60–69 | 1.125 |
| Masters M6 | 70+   | 1.150 |

PowerGage divergence: `CALC_PTS.proc` lines 132 and `CURRENTTOTALL.proc` lines 99–104 both encode the 60+ band as a single `1.125` step, with no M6 / 1.150 split. PowerGage encodes an older ISF rule version (likely v5.0 or earlier).

**Implication**: blueprint §6.2 `AgeCategoryCode` already lists `masters_m1..m6` — keep all six. The findings doc's earlier paragraph that read "masters multipliers 1.025/1.05/1.075/1.1/1.125 [from PowerGage]" is **partially correct as PowerGage evidence** but **wrong as ISF v5.1 source of truth**. Decisions doc supersedes findings doc on this constant.

## Decision 7 — Additional points formula (new — closes blueprint §8.2)

**Decision**: implement ISF v5.1 §10.9.5 additional-points formula. Do not derive from PowerGage (verified absent in `.proc`) or PowerTable (not exposed).

ISF v5.1 §10.9.5 verbatim:

> Body weight limits:
> Men: Pull-Up — 90 kg, Dip — 100 kg, Total (2 lifts) — 95 kg
> Women: Pull-Up — 55 kg, Dip — 65 kg, Total (2 lifts) — 60 kg
> Bonus formula: Additional Points = (Bodyweight − Limit) × 0.5
> If Bodyweight ≤ Limit, then Additional Points = 0.

**Implementation**:
```ts
type BwLimits = { PU: number; DI: number; PUDI: number };
const ISF_V51_BW_LIMITS: { M: BwLimits; F: BwLimits } = {
  M: { PU: 90, DI: 100, PUDI: 95 },
  F: { PU: 55, DI: 65, PUDI: 60 },
};
function additionalPoints(sex: "M" | "F", event: Event, bw: number): number {
  const limit = ISF_V51_BW_LIMITS[sex][event];
  return Math.max(0, (bw - limit) * 0.5);
}
```

Wire into `IsfPointBreakdown.additionalPoints` (blueprint §8.3). Verify the rule applies only to Classic — the rulebook places it in §10.9, the Classic scoring section. Confirm with the Russian edition before shipping.

## Decision 8 — Plate increment and validation (new)

**Decision**: enforce ISF v5.1 §7 weight-progression rule: total belt weight must be a multiple of 1.25 kg.

Verbatim from §7 (line 388 in extracted English text):
> The total weight attached to the athlete's belt must be a multiple of 1.25 kg.

**Implementation**: add validation in `MeetSetup` for `classicLoadConfig.plates` and in attempt-declaration UI. Smallest plate must be 0.25 kg or 0.5 kg pair to allow 0.5/1.0/1.5/2.0/2.5/… kg increments down to 1.25 kg.

ISF v5.1 §6.6 plate set (recommended color coding):
- 5 kg — White
- 10 kg — Green
- 15 kg — Yellow
- 20 kg — Blue
- 25 kg — Red

Tolerance: ±10 g per plate (§6.6).

Default `Plate[]` for `classicLoadConfig`:
```ts
const ISF_V51_DEFAULT_PLATES: Plate[] = [
  { weightKg: 25,   pairCount: 4, color: "red" },
  { weightKg: 20,   pairCount: 2, color: "blue" },
  { weightKg: 15,   pairCount: 2, color: "yellow" },
  { weightKg: 10,   pairCount: 2, color: "green" },
  { weightKg: 5,    pairCount: 2, color: "white" },
  { weightKg: 2.5,  pairCount: 2, color: "black" },   // small plate
  { weightKg: 1.25, pairCount: 2, color: "gray" },    // smallest required
];
```

## Decision 9 — Weight-change protocol & auto-progression (new)

**Decision**: implement §7.4.6 verbatim in the Judging UI declaration flow.

ISF v5.1 §7.4.6 verbatim:

> Round 1: one change (↑ or ↓) allowed up to 5 minutes before attempt.
> Round 2: no changes allowed.
> Round 3: two changes allowed (↑ or ↓) before being called.
> If weight is not declared within 1 minute:
>   After a successful attempt — weight automatically increases by +2.5 kg.
>   After a failed attempt — the previous weight is repeated.

**Implementation**: extend `ClassicAttempt` with `changesUsedInRound: number` and a per-round change-count cap. Add a 60-second declaration timer in the Judging screen with auto-fill behavior on expiry.

This rule is not present in PowerTable or PowerGage as far as we can verify. It is unique to ISF v5.1 and is one of the differentiators that makes our product ISF-correct.

## Decision 10 — Attempt time limits (new)

**Decision**: hardcode attempt-time defaults from §7.5.1.

| Format | Limit |
|---|---:|
| Classic Streetlifting | 60 s |
| Weighted Calisthenics | 60 s |
| Multirep Streetlifting | 120 s |

Update blueprint §6.8: `MultirepConfig.defaultAttemptDurationSec = 120`. Add `ClassicConfig.defaultAttemptDurationSec = 60` (currently missing).

## Decision 11 — 4th attempt (record-only) (new)

**Decision**: model the 4th attempt slot in V2 (post-Multirep). Visible in the data model from V1 but not editable.

ISF v5.1 §7.4.7 + §7.7.4 + §10.6:
- Allowed only after Round 3.
- Only in **Classic** disciplines (NOT Multirep, NOT WC).
- Requires Jury approval.
- Submission must be declared ≤1 minute after the previous attempt.
- Weight progression ≥1.25 kg from current record.
- Does NOT count toward points / rankings / qualification.

**Implementation**:
- V1: extend `ClassicAttempt.sequence: 1 | 2 | 3 | 4`. Slot 4 is reserved for record use; placing logic ignores it.
- V1: render the slot as `(R)` column in the protocol view (matching PowerTable's `P(R)1` / `D(R)1` convention).
- V2: enable editing the slot, add Jury-approval workflow, add record-progression validation.

## Decision 12 — Bodyweight precision (new)

**Decision**: store bodyweight as `number` with 0.1 kg precision per ISF v5.1 weigh-in spec.

> The weigh-in protocol must record: Full name of the athlete; Bodyweight (accurate to 0.1 kg)…

Validation in `WeighinsContainer`: reject input with more than one fractional digit.

Bodyweight category match: an athlete weighed at 75.00 kg counts as "up to 75 kg", per the rulebook example (§7.2 area, line 329).

## 13. Go/no-go for Sprint 1

**Status**: **GO**.

Sprint 1 backlog (blueprint §14) is unblocked because every decision needed before code starts has now been made:

| Sprint 1 item | Blocking question | Resolution |
|---|---|---|
| bootstrap new client app | Form factor (D5) | Browser SPA + Tauri wrapper |
| implement domain types | Multirep schema (D3), divisions, age cats (D4 reserves WC) | All resolved |
| implement meet setup preset system | Multirep loads (D3), plate set (D8), masters (D6) | All resolved |
| implement save/load | Save-file format (blueprint §10) | Already decided |
| implement registration CRUD | Bodyweight precision (D12), categories (D3, D4) | Resolved |
| implement weigh-in for Classic | Bodyweight precision (D12) | Resolved |
| implement result calculation for Classic | Tie-break (D2A), masters (D6), additional points (D7) | Resolved |
| implement Classic order logic | Draw tie-break (D2B), weight increment (D8), weight-change protocol (D9), 60s timer (D10) | Resolved |

Items deferred from Sprint 1 to Sprint 2:
- 4th-attempt UI (D11) — model only in V1.
- Records module (D2C) — not in V1.
- Reweigh logic for tied placing (D2A.2) — model in V1 (`reweighKg` field), enable in Sprint 2.

Items explicitly out of V1 / V2:
- Weighted Calisthenics (D4).
- Live online scoreboard (PowerGage / PowerTable parity feature).
- Telegram bot integration.
- OBS / streaming integration.
- Multi-platform (помост) operation.
- Athlete personal pages / online registration.
- Records archive across meets.

## 14. What changes in the blueprint

The following blueprint sections need amendment in v2 of the blueprint (a separate edit pass after this decisions doc):

- §6.1 — `MultirepPreset` extended with `division` and `ageCategoryCodes` (D3).
- §6.2 — keep `masters_m1..m6` (D6 confirms).
- §6.4 — `ClassicAttempt.sequence: 1 | 2 | 3 | 4` with slot 4 reserved (D11).
- §6.4 — add `ClassicAttempt.lastDeclarationAt: string` (D2B).
- §6.4 — add `ClassicAttempt.changesUsedInRound: number` (D9).
- §6.7 — add `Entry.reweighKg: number | null` (D2A).
- §6.8 — add `MeetState.classicConfig.defaultAttemptDurationSec: number = 60` (D10).
- §6.8 — `MultirepConfig.defaultAttemptDurationSec` default = 120 (D10).
- §6.8 — `MeetState.lowerBodyweightFirstTiebreak: boolean` (PowerGage-borrowed toggle, see findings §6).
- §8.2 — replace "additional points above threshold" with the verbatim formula from D7.
- §9.1 — Classic order tiebreak rule = D2B (3 levels, declared-weight → bodyweight → declaration time).
- §9.3 — placing tiebreak = D2A.
- §11.6 — Judging screen must show 60-second declaration timer + auto-progression behavior (D9).
- §11.7 — Results: add `(R)` 4th-attempt column (D11), add FORECAST column (PowerTable-borrowed, see comparison §13).
- §11.7 — Required reports list = blueprint set + `attempt card`, `team standings`, `absolute classification`, `diploma` (PowerGage-borrowed, see findings §6).
- Add a new §20 "Sources of constants" listing each constant with its citation.

## 15. One-line summary

Five blueprint open questions are closed. Seven additional rule-based decisions are recorded. Sprint 1 is GO. PowerGage's masters-table divergence from ISF v5.1 is the single most important constant-level finding — ISF v5.1 splits 60+ into M5 (60–69) and M6 (70+), PowerGage does not.
