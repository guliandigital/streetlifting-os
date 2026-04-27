# OpenLifter -> ISF Streetlifting

> **⚠ Superseded by [openlifter-isf-implementation-blueprint-v2.md](openlifter-isf-implementation-blueprint-v2.md) (2026-04-25)**.
> v2 absorbs all amendments from [decisions-v2.md](decisions-v2.md) (D13–D29) — judge votes, forecast interface, ISF preset catalogs, extended plate set. Read v2 for Sprint 1 implementation. v1 retained for narrative reference.

## Architecture V1

Date: 2026-04-25

Source of truth:
- ISF Rules v5.1, effective from 2025-08-01
- `C:\PROJECTS\streetlifting-os\ISF_Rules_ver.5.1_(RU).docx`
- `C:\PROJECTS\streetlifting-os\ISF_Rules_ver.5.1_(en-US).docx`
- `https://streetlifting.ru/docs/isf-rules`
- `https://streetlifting.ru/docs/isf-rules/faq`
- `https://streetlifting.ru/docs/standards`
- `https://streetlifting.ru/points/`

## 1. Goal

Build an offline-first competition client for ISF streetlifting based on OpenLifter ideas, but with a native ISF domain model.

Primary target:
- Classic Streetlifting meet-day workflow

Secondary target:
- Multirep Streetlifting as a separate module on top of the same platform

Out of scope for V1:
- athlete personal accounts
- online applications
- public ranking portal
- federation CRM/ERP workflows
- live cloud synchronization

## 2. Constraints

- OpenLifter is tightly coupled to powerlifting concepts `S/B/D`.
- ISF `Classic` and `Multirep` use different attempt models.
- OpenLifter is AGPL v3, so direct code reuse affects licensing strategy.
- Weight categories and divisions in ISF are not modeled the same way as in OpenLifter.
- Youth-specific weight classes and optional Open category are not representable by OpenLifter as-is.

## 3. Risks

- Treating `Classic` and `Multirep` as a single scoring mode will create rework.
- Treating `Classic / Multirep / Weighted Calisthenics` as divisions will pollute the model.
- Building on top of AGPL code without a licensing decision creates product risk.
- Reusing OpenLifter's `bar loading` and `attempt order` logic without redesign will break Multirep.
- If tie-break rules are not formalized before implementation, results can diverge from judging expectations.

## 4. Product boundary

The solution should be split conceptually into two products.

### 4.1 Meet Client

Purpose:
- local operation on tournament day
- no internet dependency
- save/load meet file
- registration adjustments
- weigh-in workflow
- judging workflow
- results and exports

### 4.2 Admin Platform

Purpose:
- event setup before meet day
- athlete applications
- publishing protocols
- ratings
- integrations

For V1, only `Meet Client` should be implemented.

## 5. Recommended implementation strategy

Recommended choice:
- clean-room implementation

Reason:
- avoids AGPL inheritance
- avoids dragging `S/B/D` assumptions into the new codebase
- makes Multirep support much cleaner
- gives a stable foundation for future backend integration

Fallback choice:
- temporary fork for a fast Classic-only pilot

Reason:
- useful only if the goal is a short-term offline prototype for real tournaments

## 6. Target domain model

### 6.1 Core enums

```ts
export type CompetitionFormat = "classic" | "multirep";

export type Exercise = "PU" | "DI";
export type Event = "PU" | "DI" | "PUDI";

export type Division = "amateur" | "pro" | "adaptive";
export type Sex = "M" | "F" | "OPEN";

export type AttemptStatus = "pending" | "success" | "fail";
export type ResultUnit = "kg" | "reps";
```

### 6.2 Age categories

```ts
export type AgeCategoryCode =
  | "youth"
  | "junior"
  | "open"
  | "masters40plus"
  | "masters_m1"
  | "masters_m2"
  | "masters_m3"
  | "masters_m4"
  | "masters_m5"
  | "masters_m6";

export type AgeCategory = {
  code: AgeCategoryCode;
  label: string;
  minAge: number | null;
  maxAge: number | null;
  ratingEligible: boolean;
};
```

### 6.3 Weight categories

```ts
export type WeightCategory = {
  code: string;
  sex: Sex;
  minKg: number | null;
  maxKg: number | null;
  ageCategoryCodes?: AgeCategoryCode[];
};
```

Notes:
- `ageCategoryCodes` is needed because some classes are only valid for youth.
- weight categories must not be stored as plain arrays of numbers.

### 6.4 Classic attempts

```ts
export type ClassicAttempt = {
  sequence: 1 | 2 | 3;
  declaredLoadKg: number | null;
  status: AttemptStatus;
};
```

### 6.5 Multirep attempts

```ts
export type MultirepAttempt = {
  sequence: 1;
  presetLoadKg: number | null;
  reps: number | null;
  status: AttemptStatus;
  durationSec: number;
  noRepCount?: number;
};
```

### 6.6 Exercise result

```ts
export type ExerciseResult =
  | {
      format: "classic";
      exercise: Exercise;
      attempts: ClassicAttempt[];
    }
  | {
      format: "multirep";
      exercise: Exercise;
      attempts: MultirepAttempt[];
    };
```

### 6.7 Entry

```ts
export type Entry = {
  id: string;
  competitionFormat: CompetitionFormat;
  event: Event;

  day: number;
  platform: number;
  flight: string;

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

  bodyweightKg: number | null;
  assignedAgeCategoryCode?: AgeCategoryCode;
  assignedWeightCategoryCode?: string;

  exercises: {
    PU?: ExerciseResult;
    DI?: ExerciseResult;
  };
};
```

### 6.8 Meet config

```ts
export type Plate = {
  weightKg: number;
  pairCount: number;
  color: string;
};

export type ClassicLoadConfig = {
  useBeltLoading: boolean;
  plates: Plate[];
};

export type MultirepPreset = {
  sex: Sex;
  exercise: Exercise;
  loadKg: number;
};

export type MultirepConfig = {
  defaultAttemptDurationSec: number;
  presetLoads: MultirepPreset[];
};

export type MeetState = {
  name: string;
  federation: string;
  country: string;
  state: string;
  city: string;
  date: string;

  competitionFormat: CompetitionFormat;
  allowedEvents: Event[];
  divisions: Division[];
  ageCategories: AgeCategory[];
  weightCategories: WeightCategory[];

  formula: "ISF_POINTS" | "RESULT";
  useMastersAdjustment: boolean;

  inKg: true;
  showAlternateUnits: boolean;

  classicLoadConfig?: ClassicLoadConfig;
  multirepConfig?: MultirepConfig;
};
```

## 7. Result calculation

### 7.1 Classic

- per exercise result = best successful declared load
- total result = `bestPU + bestDI`
- result unit = `kg`

### 7.2 Multirep

- per exercise result = counted reps from the single official attempt
- total result = `repsPU + repsDI`
- result unit = `reps`

### 7.3 Rule service interfaces

```ts
export type CalculatedResult = {
  unit: ResultUnit;
  pu: number;
  di: number;
  total: number;
};

export interface ResultCalculator {
  getExerciseResult(entry: Entry, exercise: Exercise): number;
  getTotal(entry: Entry): CalculatedResult;
}
```

## 8. ISF points service

### 8.1 Inputs

- sex
- exercise or total event
- bodyweight
- competition format
- result
- age category

### 8.2 Requirements

- use official `A/B/C` constants from ISF documents
- masters adjustment before final point computation
- additional points above threshold in Classic
- no bodyweight added to sport result

### 8.3 Service shape

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

## 9. Order and placing logic

### 9.1 Classic order

Order by:
- declared load of current attempt
- lot number if enabled
- bodyweight
- stable fallback by name

### 9.2 Multirep order

Do not reuse Classic weight ordering.

Possible strategies:
- fixed order by flight list
- order by preset load group and then by lot
- manual override order

Recommendation:
- implement `manual fixed order` for Multirep V1
- no auto-sort by reps because reps are not declared input

### 9.3 Placing

Separate placing strategies are required:
- `ClassicPlacingService`
- `MultirepPlacingService`

Shared rules:
- guests do not place
- result `0` means no official placing
- age and weight category filters must be explicit

## 10. Persistence model

### 10.1 Save file

Use JSON save files:

```ts
export type SaveFile = {
  versions: {
    stateVersion: string;
    releaseVersion: string;
  };
  meet: MeetState;
  registration: RegistrationState;
  judging: JudgingState;
  ui: UIState;
};
```

### 10.2 Versioning

Requirements:
- `stateVersion` starts from `1`
- every breaking schema change must increment `stateVersion`
- a migration layer must be added before first production release

## 11. UI map

### 11.1 Home

Functions:
- create new meet
- load from file
- save to file
- continue meet
- choose language

### 11.2 Meet Setup

Fields:
- meet identity
- competition format
- allowed events
- divisions
- age categories
- weight categories
- scoring mode
- classic belt loading config
- multirep timer and preset load config

### 11.3 Registration

Fields:
- athlete identity
- sex
- date of birth
- division
- event
- day / platform / flight
- team / member ID / guest / notes

Bulk tools:
- CSV import
- CSV export
- assign lot numbers

### 11.4 Weigh-ins

Fields:
- bodyweight
- assigned category
- opener declaration for Classic
- preset confirmation for Multirep

### 11.5 Flight Order

Classic:
- printable order by exercise and attempt progression

Multirep:
- printable start list by group

### 11.6 Judging

Classic judging screen:
- current athlete
- current declared load
- next athlete
- `good lift / no lift`
- attempt table
- belt loading view

Multirep judging screen:
- current athlete
- preset load
- countdown timer
- reps entry
- confirm result
- no-rep correction

### 11.7 Results

Views:
- by division
- by age category
- by weight category
- by ISF points

Exports:
- official protocol CSV
- printable protocol data
- federation export adapter

## 12. User flow

### 12.1 Classic meet-day flow

1. Create meet
2. Select `Classic`
3. Select default ISF preset
4. Import registrations or enter manually
5. Assign day/platform/flight
6. Weigh athletes in
7. Confirm openers
8. Run judging for `PU`
9. Run judging for `DI`
10. Review results
11. Export protocols
12. Save final meet file

### 12.2 Multirep meet-day flow

1. Create meet
2. Select `Multirep`
3. Select ISF multirep preset
4. Import registrations
5. Assign groups
6. Weigh athletes in
7. Confirm preset load per exercise
8. Run one-attempt judging with timer
9. Enter reps
10. Review results
11. Export protocols

## 13. Suggested code structure

```text
src/
  app/
  pages/
    home/
    meet-setup/
    registration/
    weigh-ins/
    flight-order/
    judging/
    results/
  components/
  store/
  domain/
    models/
    presets/
  logic/
    isf/
      age.ts
      categories.ts
      result.ts
      classic-order.ts
      multirep-order.ts
      classic-placing.ts
      multirep-placing.ts
      points.ts
      export.ts
  persistence/
    save-file.ts
    migrations/
  translations/
```

## 14. Sprint backlog

### Sprint 1

Goal:
- foundation and Classic domain

Backlog:
- bootstrap new client app
- implement domain types
- implement meet setup preset system
- implement save/load
- implement registration CRUD
- implement weigh-in for Classic
- implement result calculation for Classic
- implement Classic order logic

Definition of done:
- can create a Classic meet and save/load it
- can enter athletes and weigh-ins
- can compute best results and totals

### Sprint 2

Goal:
- Classic judging and results

Backlog:
- implement Classic judging screen
- implement `good lift / no lift`
- implement belt load visualization
- implement results by category
- implement ISF points
- implement Classic export CSV
- add regression tests for Classic

Definition of done:
- full Classic tournament can be simulated locally end-to-end

### Sprint 3

Goal:
- Multirep module

Backlog:
- add Multirep preset config
- add one-attempt timed workflow
- implement timer
- implement reps/no-rep result entry
- implement Multirep results and placing
- implement Multirep ISF points
- implement Multirep export
- add regression tests for Multirep

Definition of done:
- full Multirep tournament can be simulated locally end-to-end

## 15. Testing strategy

Required test groups:
- category assignment
- age category assignment
- Classic result calculation
- Multirep result calculation
- Classic order calculation
- Multirep order calculation
- category placing
- ISF points
- save file migrations
- CSV import/export

Recommended fixtures:
- `classic-small-meet.json`
- `classic-tie-break.json`
- `classic-masters.json`
- `multirep-basic.json`
- `multirep-preset-loads.json`

## 16. Decision table

| Option | Pros | Cons | Recommended use |
|---|---|---|---|
| Direct fork of OpenLifter | Fastest prototype, ready offline architecture, existing page model | AGPL, old stack, powerlifting assumptions everywhere, Multirep hard to fit cleanly | Only for temporary pilot |
| Clean-room implementation inspired by OpenLifter | Clean ISF model, no AGPL inheritance, scalable for future backend integration | Longer initial build time | Recommended product path |

## 17. Final recommendation

Recommended product decision:
- build a clean-room `Meet Client`
- ship `Classic` first
- ship `Multirep` second

Recommended technical decision:
- do not model ISF on top of `S/B/D`
- do not use a single attempt schema for Classic and Multirep
- implement explicit ISF rule services from day one

Recommended business decision:
- use OpenLifter as a benchmark and reference architecture
- do not use OpenLifter code as the commercial long-term core unless AGPL obligations are explicitly accepted

## 18. Open questions before implementation

1. Which exact `streetlifting.ru` documents are final for production rules: only `ISF Rules v5.1`, or `v5.1 + FAQ + standards + points` together?
2. What tie-break rule must be implemented for equal Classic result and equal bodyweight?
3. What exact fixed loads must be used for Multirep in your production format?
4. Is `Weighted Calisthenics` in roadmap, or out of scope for the next 12 months?
5. Do you want the first deliverable as:
   - standalone offline desktop/web client
   - web app with local-first browser save
   - desktop app package for judges

## 19. PowerGage as secondary reference

Local archive:
- `C:\PROJECTS\streetlifting-os\PG_Free.zip`

Observed contents:
- `PG_Free/PowerGage28cli.exe`
- `PG_Free/PowerGage28srv.exe`
- `PG_Free/powergage_2801.051.exe`

Static observations:
- all three files are `x86 PE32`
- all three binaries contain `Nullsoft Install System v3.10` manifest markers
- filenames suggest:
  - `cli` = client-side executable or package
  - `srv` = server-side executable or package
  - `powergage_2801.051.exe` = installer/release package

Current conclusion:
- PowerGage is useful as a product and UX reference
- PowerGage is not currently usable as a source-code reference
- until unpacked or installed in isolation, it should be treated as a black-box proprietary product

Recommended usage:
- use OpenLifter as architecture reference
- use PowerGage as workflow and screen-behavior reference

Recommended next step if deeper analysis is needed:
- perform isolated installation in a disposable Windows sandbox or VM
- capture:
  - installed file tree
  - config files
  - local database format
  - export/import file formats
  - screenshots of key screens
  - live workflow for registration, weigh-in, judging, results

Explicit caution:
- do not make product decisions dependent on PowerGage internals until its installed format and storage model are inspected
