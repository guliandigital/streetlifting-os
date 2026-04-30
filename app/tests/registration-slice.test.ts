/**
 * Registration slice tests — CRUD invariants on `meet.current.registration`.
 *
 * We exercise the actions through the configured store so we also catch
 * meet-slice extraReducers wiring.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import meetReducer, { newMeet } from "@store/meet-slice";
import {
  registrationReducer,
  addEntry,
  updateEntry,
  removeEntry,
  setBodyweight,
  setReweigh,
  confirmWeighIn,
  bulkImportEntries,
  applyLotAssignment,
} from "@store/registration-slice";
import type { EntryDraft } from "@store/registration-slice";

function makeStore() {
  return configureStore({
    reducer: { meet: meetReducer, registration: registrationReducer },
  });
}

const draftA: EntryDraft = {
  name: "Alice",
  sex: "F",
  birthDate: "1995-04-12",
  ageOverride: null,
  country: "RU",
  division: "amateur",
  disciplineCode: "classic_2lift",
  day: 1,
  platform: 1,
  flight: "A",
  guest: false,
  bodyweightKg: 58.4,
  reweighKg: null,
};

const draftB: EntryDraft = {
  ...draftA,
  name: "Bob",
  sex: "M",
  bodyweightKg: 82.5,
};

describe("registration-slice CRUD", () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
    store.dispatch(newMeet());
  });

  it("addEntry appends an Entry with derived event/format", () => {
    store.dispatch(addEntry(draftA));
    const registration = store.getState().meet.current!.registration;
    const entries = registration.entries;
    expect(entries.length).toBe(1);
    expect(entries[0]?.name).toBe("Alice");
    expect(entries[0]?.competitionFormat).toBe("classic");
    expect(entries[0]?.event).toBe("PUDI");
    expect(entries[0]?.id).toBeTruthy();
    expect(registration.athletes[0]).toMatchObject({
      id: `ath_${entries[0]!.id}`,
      name: "Alice",
      sex: "F",
      country: "RU",
    });
    expect(registration.nominations[0]).toMatchObject({
      id: `nom_${entries[0]!.id}`,
      athleteId: `ath_${entries[0]!.id}`,
      disciplineCode: "classic_2lift",
      division: "amateur",
      bodyweightKg: 58.4,
    });
  });

  it("addEntry monotonically increments lastLotNumber", () => {
    store.dispatch(addEntry(draftA));
    store.dispatch(addEntry(draftB));
    expect(store.getState().meet.current!.registration.lastLotNumber).toBe(2);
  });

  it("addEntry sets dirty=true", () => {
    expect(store.getState().meet.dirty).toBe(true); // newMeet sets dirty
    store.dispatch(addEntry(draftA));
    expect(store.getState().meet.dirty).toBe(true);
  });

  it("updateEntry mutates target entry only", () => {
    store.dispatch(addEntry(draftA));
    store.dispatch(addEntry(draftB));
    const id = store.getState().meet.current!.registration.entries[1]!.id;
    store.dispatch(
      updateEntry({ id, patch: { name: "Robert", bodyweightKg: 85 } }),
    );
    const entries = store.getState().meet.current!.registration.entries;
    expect(entries[0]?.name).toBe("Alice");
    expect(entries[1]?.name).toBe("Robert");
    expect(entries[1]?.bodyweightKg).toBe(85);
    const registration = store.getState().meet.current!.registration;
    expect(registration.athletes[1]?.name).toBe("Robert");
    expect(registration.nominations[1]?.bodyweightKg).toBe(85);
  });

  it("updateEntry re-derives competitionFormat/event when disciplineCode changes", () => {
    store.dispatch(addEntry(draftA));
    const id = store.getState().meet.current!.registration.entries[0]!.id;
    store.dispatch(
      updateEntry({
        id,
        patch: { disciplineCode: "multirep_pu_8" },
      }),
    );
    const e = store.getState().meet.current!.registration.entries[0]!;
    expect(e.competitionFormat).toBe("multirep");
    expect(e.event).toBe("PU");
  });

  it("removeEntry drops by id", () => {
    store.dispatch(addEntry(draftA));
    store.dispatch(addEntry(draftB));
    const id = store.getState().meet.current!.registration.entries[0]!.id;
    store.dispatch(removeEntry({ id }));
    const entries = store.getState().meet.current!.registration.entries;
    expect(entries.length).toBe(1);
    expect(entries[0]?.name).toBe("Bob");
    expect(store.getState().meet.current!.registration.athletes).toHaveLength(1);
    expect(store.getState().meet.current!.registration.nominations).toHaveLength(1);
  });

  it("setBodyweight + setReweigh write through", () => {
    store.dispatch(addEntry(draftA));
    const id = store.getState().meet.current!.registration.entries[0]!.id;
    store.dispatch(setBodyweight({ id, bodyweightKg: 60 }));
    store.dispatch(setReweigh({ id, reweighKg: 60.1 }));
    const e = store.getState().meet.current!.registration.entries[0]!;
    expect(e.bodyweightKg).toBe(60);
    expect(e.reweighKg).toBe(60.1);
    const nomination = store.getState().meet.current!.registration.nominations[0]!;
    expect(nomination.bodyweightKg).toBe(60);
    expect(nomination.reweighKg).toBe(60.1);
  });

  it("confirmWeighIn freezes assigned codes; null clears them", () => {
    store.dispatch(addEntry(draftA));
    const id = store.getState().meet.current!.registration.entries[0]!.id;
    store.dispatch(
      confirmWeighIn({
        id,
        weightCategoryCode: "F_60",
        ageCategoryCode: "open",
      }),
    );
    let e = store.getState().meet.current!.registration.entries[0]!;
    expect(e.assignedWeightCategoryCode).toBe("F_60");
    expect(e.assignedAgeCategoryCode).toBe("open");

    store.dispatch(
      confirmWeighIn({
        id,
        weightCategoryCode: null,
        ageCategoryCode: null,
      }),
    );
    e = store.getState().meet.current!.registration.entries[0]!;
    expect(e.assignedWeightCategoryCode).toBeUndefined();
    expect(e.assignedAgeCategoryCode).toBeUndefined();
  });

  it("bulkImportEntries appends all + bumps lastLotNumber accordingly", () => {
    store.dispatch(bulkImportEntries({ drafts: [draftA, draftB, draftA] }));
    const reg = store.getState().meet.current!.registration;
    expect(reg.entries.length).toBe(3);
    expect(reg.athletes.length).toBe(3);
    expect(reg.nominations.length).toBe(3);
    expect(reg.lastLotNumber).toBe(3);
  });

  it("buildEntry defaults missing day/platform/flight to 1/1/'A'", () => {
    // Programmatic dispatch shape: omit placement fields entirely.
    const draftWithoutPlacement: EntryDraft = {
      name: "Charlie",
      sex: "M",
      birthDate: "1992-06-01",
      ageOverride: null,
      country: "RU",
      division: "amateur",
      disciplineCode: "classic_2lift",
      guest: false,
      bodyweightKg: 75,
      reweighKg: null,
    };
    store.dispatch(addEntry(draftWithoutPlacement));
    const e = store.getState().meet.current!.registration.entries[0]!;
    expect(e.day).toBe(1);
    expect(e.platform).toBe(1);
    expect(e.flight).toBe("A");
  });

  it("buildEntry defaults empty/whitespace flight to 'A'", () => {
    store.dispatch(addEntry({ ...draftA, flight: "   " }));
    store.dispatch(addEntry({ ...draftA, name: "Empty", flight: "" }));
    const entries = store.getState().meet.current!.registration.entries;
    expect(entries[0]?.flight).toBe("A");
    expect(entries[1]?.flight).toBe("A");
  });

  it("buildEntry preserves explicitly provided day/platform/flight", () => {
    store.dispatch(addEntry({ ...draftA, day: 2, platform: 3, flight: "B" }));
    const e = store.getState().meet.current!.registration.entries[0]!;
    expect(e.day).toBe(2);
    expect(e.platform).toBe(3);
    expect(e.flight).toBe("B");
  });

  it("applyLotAssignment re-orders by the supplied map", () => {
    store.dispatch(addEntry(draftA)); // Alice
    store.dispatch(addEntry(draftB)); // Bob
    const [aliceId, bobId] = [
      store.getState().meet.current!.registration.entries[0]!.id,
      store.getState().meet.current!.registration.entries[1]!.id,
    ];
    store.dispatch(
      applyLotAssignment({
        lotByEntryId: { [aliceId]: 2, [bobId]: 1 },
        lastLotNumber: 2,
      }),
    );
    const entries = store.getState().meet.current!.registration.entries;
    expect(entries[0]?.name).toBe("Bob");
    expect(entries[1]?.name).toBe("Alice");
  });
});

describe("registration actions on null meet — silent no-ops", () => {
  it("addEntry without an open meet does nothing", () => {
    const store = makeStore();
    store.dispatch(addEntry(draftA));
    expect(store.getState().meet.current).toBeNull();
  });
});
