# Streetlifting OS V1.x Integration Contracts

Date: 2026-04-29
Status: canonical shared-domain contract for parallel V1.x work.

This guide is the coordination point for chats touching domain models, persistence,
result calculation, CSV/reporting, or migrations. It documents the current code
contract; it is not a feature plan.

## 1. Source of truth

- Domain types live in `app/src/domain/models/`.
- Runtime save-file validation lives in `app/src/persistence/schema.ts`.
- Save-file versioning and migrations live in `app/src/persistence/version.ts` and
  `app/src/persistence/migrations/`.
- Result calculation lives in `app/src/logic/isf/`.
- The active product roadmap remains `docs/current-implementation-plan.md`.

Any shape change must update TypeScript models, zod schema, migration coverage,
and affected pure logic/tests in the same PR.

## 2. Save-file and migration contract

- Current save-file baseline is `versions.stateVersion === "2"`.
- `encode()` always stamps `CURRENT_STATE_VERSION` and `APP_RELEASE_VERSION`.
- `decode()` must parse JSON, run migrations, then validate with zod.
- Version `"1"` is pre-release only, but must keep migrating through
  `v1-to-v2` because internal files may exist.
- Every future breaking save-file change must bump `CURRENT_STATE_VERSION`, add a
  forward migration, keep old files loadable, and update zod plus domain models.
- Do not add fields to saved attempts/results silently. Optional fields are allowed
  only when zod and migrations define the default/absence behavior.

## 3. Entry contract

`Entry` is one athlete-meet record in V1. Do not split it into `Athlete` and
`Nomination` in V1.x; that is V2 data-model work.

Stable fields other modules depend on:

- `id`: stable entry id.
- `competitionFormat`: `"classic"` or `"multirep"` in V1. `"weighted_calisthenics"`
  is reserved and must throw/not execute in V1 calculators.
- `disciplineCode`: foreign key into the ISF discipline catalog.
- `event`: `"PU"`, `"DI"`, or `"PUDI"` in V1.
- `day`, `platform`, `flight`: V1 scheduling fields. `flight` is an ad-hoc label;
  no `Stream`/`Group` entity exists until V2.
- athlete fields: `name`, `sex`, `birthDate`, `ageOverride`, `division`, optional
  `team`, `memberId`, `instagram`, `notes`, plus `country`.
- `guest`: guests are displayed but receive `place: null`.
- weigh-in fields: `bodyweightKg`, `reweighKg`, `assignedAgeCategoryCode`,
  `assignedWeightCategoryCode`.
- `exercises`: only `PU` and `DI` are supported in V1.

Age resolution order is explicit assigned age category, then `ageOverride`, then
`birthDate` against meet date. Weight category resolution uses
`minKg < bodyweightKg <= maxKg`, sex match, and optional age-category allow-list.

## 4. Attempt contract

Attempt status is never stored. It is always derived from `judgeVotes` by
`attemptStatusFromVotes()`.

Classic attempt:

- `sequence`: `1 | 2 | 3 | 4`.
- `sequence === 4` is record-only and excluded from best lift/placing totals.
- `declaredLoadKg`: nullable until declared.
- `judgeVotes`: three nullable judge votes.
- `lastDeclarationAt`: ISO timestamp or `null`.
- `changesUsedInRound`: non-negative integer.
- `isRecordAttempt`: optional marker for record-only handling.

Multirep attempt:

- `sequence`: always `1`.
- `presetLoadKg`: nullable but should match the selected discipline preset when set.
- `reps`: nullable until entered, non-negative integer when set.
- `judgeVotes`: same majority contract as Classic.
- `durationSec`: V1 default is 120 seconds.
- `noRepCount`: optional non-negative integer.

Majority rule:

- 2+ `true` votes -> `"success"`.
- 2+ `false` votes -> `"fail"`.
- fewer than 2 decided votes -> `"pending"`.

## 5. Discipline contract

V1 ships the ISF v5.1 discipline catalog:

- 3 Classic disciplines: `classic_2lift`, `classic_pu`, `classic_di`.
- 16 Multirep disciplines: six two-lift presets, five PU presets, five DI presets.
- `formula` is `"isf_points"` for Classic and `"result_x_coefficient"` for Multirep.
- `presetLoadKg` exists only for Multirep disciplines.
- WC discipline codes and exercises are reserved only; do not activate them in V1.x.

When adding UI/report logic, use `disciplineCode` as the stable key. Labels are
display data, not identifiers.

## 6. MeetConfig contract

The V1 MeetConfig shape is `MeetState`.

Stable fields:

- meet metadata: `name`, `federation`, `country`, `state`, `city`, `date`;
- selection/config: `competitionFormat`, `enabledDisciplineCodes`, `divisions`,
  `ageCategories`, `weightCategories`;
- scoring: `formula`, `useMastersAdjustment`,
  `lowerBodyweightFirstTiebreak`;
- units: `inKg: true`, `showAlternateUnits`;
- optional `classicLoadConfig`;
- optional `multirepConfig`.

`MeetState` is the flattened V1 view. V2 RulesPack work may project this shape
from a pack, but V1.x code must not require a backend, CDN, or live RulesPack fetch.

## 7. Result contracts

Result data is computed, not persisted in the save-file.

Shared calculator output:

- `CalculatedResult`: `{ unit, pu, di, total }`.
- Classic unit is `"kg"`.
- Multirep unit is `"reps"`.
- `ForecastResult` exists but is a V1 stub with nullable projection fields.

Classic result rules:

- per exercise result = best successful declared load;
- record-only sequence 4 is excluded;
- total = best PU + best DI;
- result rows include attempt displays, resolved categories, ISF breakdown,
  and placing flags.

Classic placing order:

1. `total` descending.
2. `isfFinalPoints` descending.
3. `bodyweightKg` ascending.
4. `reweighKg` ascending.
5. original registration index ascending.

Multirep result rules:

- per exercise result = reps from the single successful attempt;
- unsuccessful, pending, missing, or null-rep attempts count as 0;
- total = PU reps + DI reps;
- row/group output is grouped by `disciplineCode`, sex, resolved age category,
  and resolved weight category.

Multirep placing order:

1. `totalReps` descending.
2. `bodyweightKg` ascending.
3. original registration index ascending.

Guests stay in rows/groups but always get `place: null` and sort after placed
athletes inside the same group.

## 8. ISF points contract

`IsfPointsService.calculate(entry, event, meetDate)` is the only V1 point service.

Pipeline:

1. Resolve result through the appropriate calculator.
2. Compute ISF absolute coefficient from bodyweight, sex, and event.
3. `basePoints = result * coefficient`.
4. Apply masters multiplier from assigned/derived age category.
5. Add Classic-only additional points.

Important boundaries:

- `OPEN` sex uses neutral coefficient fallback.
- unsupported V2 events return neutral/zero behavior in V1.
- M5 is 60-69 with multiplier 1.125.
- M6 is 70+ with multiplier 1.150.

## 9. Parallel-chat rules

- Do not edit `app/src/domain/models/`, `app/src/persistence/schema.ts`,
  `app/src/persistence/migrations/`, or `app/src/logic/isf/` in another chat
  without first aligning this guide.
- UI/report/export chats may consume result rows but must not invent persisted
  result fields.
- Migration chats own state-version bumps; feature chats should not bump
  `stateVersion` opportunistically.
- If a feature needs `Athlete`, `Nomination`, `Stream`, `Group`, RulesPack, WC,
  backend license, or cryptographic signature behavior beyond nullable stubs,
  treat it as V2 design work, not V1.x hardening.
