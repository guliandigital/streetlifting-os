/**
 * meet-slice-setup tests — Sprint 4.
 *
 * Tests the new meet setup actions:
 *   updateMeetBasics, toggleDisciplineCode, setEnabledDisciplineCodes,
 *   updatePlate, addPlate, removePlate, setWeightCategories, setAgeCategories
 */

import { describe, it, expect, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import meetReducer, {
  newMeet,
  updateMeetBasics,
  toggleDisciplineCode,
  setEnabledDisciplineCodes,
  updatePlate,
  addPlate,
  removePlate,
  setWeightCategories,
  setAgeCategories,
} from "@store/meet-slice";
import { registrationReducer } from "@store/registration-slice";
import {
  ISF_V51_WEIGHT_CATEGORIES,
  ISF_V51_AGE_CATEGORIES,
} from "@domain/presets";
import type { Plate, WeightCategory, AgeCategory } from "@domain/models";

function makeStore() {
  return configureStore({
    reducer: { meet: meetReducer, registration: registrationReducer },
  });
}

describe("updateMeetBasics", () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
    store.dispatch(newMeet());
  });

  it("updates name and sets dirty=true", () => {
    store.dispatch(updateMeetBasics({ name: "Test Meet" }));
    expect(store.getState().meet.current?.meet.name).toBe("Test Meet");
    expect(store.getState().meet.dirty).toBe(true);
  });

  it("pins new meets to the built-in ISF v5.1 RulesPack", () => {
    expect(store.getState().meet.current?.meet.rulesPackRef).toMatchObject({
      id: "isf:5.1",
      federation: "ISF",
      version: "5.1",
      source: "builtin",
    });
  });

  it("updates formula", () => {
    store.dispatch(updateMeetBasics({ formula: "RESULT_X_COEFFICIENT" }));
    expect(store.getState().meet.current?.meet.formula).toBe("RESULT_X_COEFFICIENT");
    expect(store.getState().meet.dirty).toBe(true);
  });

  it("updates federation", () => {
    store.dispatch(updateMeetBasics({ federation: "WABBA" }));
    expect(store.getState().meet.current?.meet.federation).toBe("WABBA");
  });

  it("updates useMastersAdjustment", () => {
    store.dispatch(updateMeetBasics({ useMastersAdjustment: false }));
    expect(store.getState().meet.current?.meet.useMastersAdjustment).toBe(false);
  });

  it("updates lowerBodyweightFirstTiebreak", () => {
    store.dispatch(updateMeetBasics({ lowerBodyweightFirstTiebreak: false }));
    expect(store.getState().meet.current?.meet.lowerBodyweightFirstTiebreak).toBe(false);
  });

  it("no-op when state.current === null", () => {
    const emptyStore = makeStore(); // no newMeet dispatched
    emptyStore.dispatch(updateMeetBasics({ name: "Should Not Apply" }));
    expect(emptyStore.getState().meet.current).toBeNull();
  });
});

describe("toggleDisciplineCode", () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
    store.dispatch(newMeet());
  });

  it("removes discipline code when already present", () => {
    const before = store.getState().meet.current?.meet.enabledDisciplineCodes ?? [];
    expect(before).toContain("classic_pu");
    store.dispatch(toggleDisciplineCode("classic_pu"));
    const after = store.getState().meet.current?.meet.enabledDisciplineCodes ?? [];
    expect(after).not.toContain("classic_pu");
    expect(store.getState().meet.dirty).toBe(true);
  });

  it("adds discipline code when not present", () => {
    // First remove it
    store.dispatch(toggleDisciplineCode("multirep_pu_8"));
    let codes = store.getState().meet.current?.meet.enabledDisciplineCodes ?? [];
    // multirep_pu_8 not in default list, so toggling adds it
    expect(codes).toContain("multirep_pu_8");

    // Toggle again — now it should be removed
    store.dispatch(toggleDisciplineCode("multirep_pu_8"));
    codes = store.getState().meet.current?.meet.enabledDisciplineCodes ?? [];
    expect(codes).not.toContain("multirep_pu_8");
  });

  it("no-op when state.current === null", () => {
    const emptyStore = makeStore();
    emptyStore.dispatch(toggleDisciplineCode("classic_pu"));
    expect(emptyStore.getState().meet.current).toBeNull();
  });
});

describe("setEnabledDisciplineCodes", () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
    store.dispatch(newMeet());
  });

  it("replaces the full enabled discipline list", () => {
    store.dispatch(setEnabledDisciplineCodes(["classic_2lift", "multirep_pu_16"]));
    const codes = store.getState().meet.current?.meet.enabledDisciplineCodes ?? [];
    expect(codes).toHaveLength(2);
    expect(codes).toContain("classic_2lift");
    expect(codes).toContain("multirep_pu_16");
    expect(store.getState().meet.dirty).toBe(true);
  });

  it("no-op when state.current === null", () => {
    const emptyStore = makeStore();
    emptyStore.dispatch(setEnabledDisciplineCodes(["classic_pu"]));
    expect(emptyStore.getState().meet.current).toBeNull();
  });
});

describe("updatePlate", () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
    store.dispatch(newMeet());
  });

  it("updates pairCount of plate at index 0", () => {
    const platesBefore = store.getState().meet.current?.meet.classicLoadConfig?.plates ?? [];
    expect(platesBefore.length).toBeGreaterThan(0);

    store.dispatch(updatePlate({ index: 0, patch: { pairCount: 6 } }));
    const platesAfter = store.getState().meet.current?.meet.classicLoadConfig?.plates ?? [];
    expect(platesAfter[0]?.pairCount).toBe(6);
    expect(store.getState().meet.dirty).toBe(true);
  });

  it("updates color of plate", () => {
    store.dispatch(updatePlate({ index: 1, patch: { color: "purple" } }));
    const plates = store.getState().meet.current?.meet.classicLoadConfig?.plates ?? [];
    expect(plates[1]?.color).toBe("purple");
  });

  it("no-op when state.current === null", () => {
    const emptyStore = makeStore();
    emptyStore.dispatch(updatePlate({ index: 0, patch: { pairCount: 99 } }));
    expect(emptyStore.getState().meet.current).toBeNull();
  });
});

describe("addPlate", () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
    store.dispatch(newMeet());
  });

  it("appends a new plate to the list", () => {
    const platesBefore = store.getState().meet.current?.meet.classicLoadConfig?.plates ?? [];
    const countBefore = platesBefore.length;

    const newPlate: Plate = { weightKg: 3, pairCount: 2, color: "orange" };
    store.dispatch(addPlate(newPlate));

    const platesAfter = store.getState().meet.current?.meet.classicLoadConfig?.plates ?? [];
    expect(platesAfter.length).toBe(countBefore + 1);
    expect(platesAfter[platesAfter.length - 1]).toMatchObject(newPlate);
    expect(store.getState().meet.dirty).toBe(true);
  });

  it("no-op when state.current === null", () => {
    const emptyStore = makeStore();
    emptyStore.dispatch(addPlate({ weightKg: 5, pairCount: 2, color: "red" }));
    expect(emptyStore.getState().meet.current).toBeNull();
  });
});

describe("removePlate", () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
    store.dispatch(newMeet());
  });

  it("removes plate at index 2", () => {
    const platesBefore = store.getState().meet.current?.meet.classicLoadConfig?.plates ?? [];
    const countBefore = platesBefore.length;
    const plateAtIndex2 = platesBefore[2];

    store.dispatch(removePlate(2));

    const platesAfter = store.getState().meet.current?.meet.classicLoadConfig?.plates ?? [];
    expect(platesAfter.length).toBe(countBefore - 1);
    // The plate that was at index 3 is now at index 2
    expect(platesAfter[2]).not.toMatchObject(plateAtIndex2 ?? {});
    expect(store.getState().meet.dirty).toBe(true);
  });

  it("no-op when state.current === null", () => {
    const emptyStore = makeStore();
    emptyStore.dispatch(removePlate(0));
    expect(emptyStore.getState().meet.current).toBeNull();
  });
});

describe("setWeightCategories", () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
    store.dispatch(newMeet());
  });

  it("replaces the weight category list", () => {
    const subset: WeightCategory[] = [
      { code: "M_82_5", sex: "M", minKg: 75, maxKg: 82.5 },
      { code: "F_60", sex: "F", minKg: 56, maxKg: 60 },
    ];
    store.dispatch(setWeightCategories(subset));
    const cats = store.getState().meet.current?.meet.weightCategories ?? [];
    expect(cats).toHaveLength(2);
    expect(cats[0]?.code).toBe("M_82_5");
    expect(store.getState().meet.dirty).toBe(true);
  });

  it("resets to ISF defaults", () => {
    store.dispatch(setWeightCategories([...ISF_V51_WEIGHT_CATEGORIES]));
    const cats = store.getState().meet.current?.meet.weightCategories ?? [];
    expect(cats).toHaveLength(ISF_V51_WEIGHT_CATEGORIES.length);
  });

  it("no-op when state.current === null", () => {
    const emptyStore = makeStore();
    emptyStore.dispatch(setWeightCategories([{ code: "F_60", sex: "F", minKg: 56, maxKg: 60 }]));
    expect(emptyStore.getState().meet.current).toBeNull();
  });
});

describe("setAgeCategories", () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
    store.dispatch(newMeet());
  });

  it("replaces the age category list", () => {
    const subset: AgeCategory[] = [
      { code: "open", label: "Open", labelRu: "Open", minAge: 13, maxAge: null, ratingEligible: true },
    ];
    store.dispatch(setAgeCategories(subset));
    const cats = store.getState().meet.current?.meet.ageCategories ?? [];
    expect(cats).toHaveLength(1);
    expect(cats[0]?.code).toBe("open");
    expect(store.getState().meet.dirty).toBe(true);
  });

  it("resets to ISF defaults", () => {
    store.dispatch(setAgeCategories([...ISF_V51_AGE_CATEGORIES]));
    const cats = store.getState().meet.current?.meet.ageCategories ?? [];
    expect(cats).toHaveLength(ISF_V51_AGE_CATEGORIES.length);
  });

  it("no-op when state.current === null", () => {
    const emptyStore = makeStore();
    emptyStore.dispatch(setAgeCategories([
      { code: "open", label: "Open", labelRu: "Open", minAge: 13, maxAge: null, ratingEligible: true },
    ]));
    expect(emptyStore.getState().meet.current).toBeNull();
  });
});
