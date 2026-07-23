/**
 * Registration slice — Sprint 1 item 5.
 *
 * Operates on `state.meet.current.registration` directly. We keep the slice
 * thin: actions accept payloads, mutate the registration sub-tree of the
 * SaveFile, and bump `dirty: true` on the meet slice via shared event.
 *
 * Architectural note: V2 will split `Entry` into Athlete + Nomination (D13).
 * Until then we stay flat.
 */

import { createAction, createReducer } from "@reduxjs/toolkit";
import type { Entry, Sex, Division, DisciplineCode } from "@domain/models";
import type { RootState } from "./index";
import { ISF_V51_DISCIPLINES } from "@domain/presets";

/**
 * Operator-supplied fields when adding/editing an entry.
 *
 * `day`, `platform`, and `flight` are optional because lightweight
 * import paths (programmatic bulk dispatch, partial CSV columns) may
 * not have them. `buildEntry` defaults missing values to day=1,
 * platform=1, flight="A" so downstream code (Weigh-in order grouping,
 * flight scheduling) always sees a valid placement triple.
 */
export type EntryDraft = {
  name: string;
  sex: Sex;
  birthDate: string | null;
  ageOverride: number | null;
  country: string | null;
  division: Division;
  disciplineCode: DisciplineCode;
  day?: number;
  platform?: number;
  flight?: string;
  team?: string;
  memberId?: string;
  isfPersonId?: string;
  guest: boolean;
  instagram?: string;
  notes?: string;
  bodyweightKg: number | null;
  reweighKg: number | null;
};

/** Lookup competitionFormat + event from the discipline catalog. */
function disciplineMeta(code: DisciplineCode): {
  competitionFormat: Entry["competitionFormat"];
  event: Entry["event"];
} {
  const d = ISF_V51_DISCIPLINES.find((x) => x.code === code);
  if (!d) {
    // Should be impossible if validation is honored; fall back to classic_2lift.
    return { competitionFormat: "classic", event: "PUDI" };
  }
  return { competitionFormat: d.competitionFormat, event: d.event };
}

function newEntryId(): string {
  // crypto.randomUUID is available on Node 20+ and all modern browsers.
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `entry_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function buildEntry(draft: EntryDraft): Entry {
  const { competitionFormat, event } = disciplineMeta(draft.disciplineCode);
  return {
    id: newEntryId(),
    competitionFormat,
    disciplineCode: draft.disciplineCode,
    event,
    day: draft.day ?? 1,
    platform: draft.platform ?? 1,
    flight:
      typeof draft.flight === "string" && draft.flight.trim().length > 0
        ? draft.flight
        : "A",
    name: draft.name,
    sex: draft.sex,
    birthDate: draft.birthDate,
    ageOverride: draft.ageOverride,
    division: draft.division,
    ...(draft.team ? { team: draft.team } : {}),
    ...(draft.memberId ? { memberId: draft.memberId } : {}),
    ...(draft.isfPersonId ? { isfPersonId: draft.isfPersonId } : {}),
    guest: draft.guest,
    ...(draft.instagram ? { instagram: draft.instagram } : {}),
    ...(draft.notes ? { notes: draft.notes } : {}),
    country: draft.country,
    bodyweightKg: draft.bodyweightKg,
    reweighKg: draft.reweighKg,
    exercises: {},
  };
}

// ─── Actions ───────────────────────────────────────────────────────────────

export const addEntry = createAction<EntryDraft>("registration/addEntry");
export const updateEntry = createAction<{
  id: string;
  patch: Partial<EntryDraft>;
}>("registration/updateEntry");
export const removeEntry = createAction<{ id: string }>(
  "registration/removeEntry",
);
export const setBodyweight = createAction<{
  id: string;
  bodyweightKg: number | null;
}>("registration/setBodyweight");
export const setReweigh = createAction<{
  id: string;
  reweighKg: number | null;
}>("registration/setReweigh");
export const confirmWeighIn = createAction<{
  id: string;
  weightCategoryCode: string | null;
  ageCategoryCode: Entry["assignedAgeCategoryCode"] | null;
}>("registration/confirmWeighIn");
export const bulkImportEntries = createAction<{ drafts: EntryDraft[] }>(
  "registration/bulkImport",
);
export const applyLotAssignment = createAction<{
  /** Map of entry-id → assigned lot-number; only ids present in this map are reordered. */
  lotByEntryId: Record<string, number>;
  lastLotNumber: number;
}>("registration/applyLotAssignment");

// ─── Reducer ───────────────────────────────────────────────────────────────

/**
 * The registration slice doesn't own state; it observes `meet.current` from
 * the meet-slice. We expose a reducer that the store wires via `extraReducers`
 * on meet-slice (see store/index.ts). Returning a no-op reducer keeps the API
 * uniform — actual mutation happens in meet-slice via createReducer below.
 */

/** Reducer that mutates the SaveFile in place. Wired into meet-slice. */
export const registrationReducer = createReducer<{
  applied: number; // bump-counter so devtools show registration activity
}>({ applied: 0 }, (builder) => {
  builder
    .addCase(addEntry, (s) => {
      s.applied += 1;
    })
    .addCase(updateEntry, (s) => {
      s.applied += 1;
    })
    .addCase(removeEntry, (s) => {
      s.applied += 1;
    })
    .addCase(setBodyweight, (s) => {
      s.applied += 1;
    })
    .addCase(setReweigh, (s) => {
      s.applied += 1;
    })
    .addCase(confirmWeighIn, (s) => {
      s.applied += 1;
    })
    .addCase(bulkImportEntries, (s) => {
      s.applied += 1;
    })
    .addCase(applyLotAssignment, (s) => {
      s.applied += 1;
    });
});

// ─── Selectors ─────────────────────────────────────────────────────────────

export const selectEntries = (state: RootState): ReadonlyArray<Entry> =>
  state.meet.current?.registration.entries ?? [];

export const selectLastLotNumber = (state: RootState): number =>
  state.meet.current?.registration.lastLotNumber ?? 0;

// ─── Helpers exposed for meet-slice extraReducers ─────────────────────────

export const registrationHelpers = {
  buildEntry,
  disciplineMeta,
};
