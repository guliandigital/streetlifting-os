/**
 * judging-slice.test.ts — Sprint 2
 *
 * Tests for the transient judging slice (timer + pending votes).
 */

import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import judgingReducer, {
  startTimer,
  stopTimer,
  tickTimer,
  castVote,
  resetVote,
  clearPendingVotes,
  setPendingReps,
  type JudgingSliceState,
} from "@store/judging-slice";
import { attemptStatusFromVotes } from "@logic/isf/judge-votes";

// ─── Store helper ────────────────────────────────────────────────────────────

function makeStore() {
  return configureStore({ reducer: { judging: judgingReducer } });
}

function getState(store: ReturnType<typeof makeStore>): JudgingSliceState {
  return store.getState().judging;
}

// ─── Initial state ────────────────────────────────────────────────────────────

describe("judging-slice — initial state", () => {
  it("starts with timer stopped", () => {
    const store = makeStore();
    expect(getState(store).timerRunning).toBe(false);
  });

  it("starts with 60 seconds", () => {
    const store = makeStore();
    expect(getState(store).timerSecondsLeft).toBe(60);
  });

  it("starts with all votes null", () => {
    const store = makeStore();
    const s = getState(store);
    expect(s.pendingLeft).toBeNull();
    expect(s.pendingCenter).toBeNull();
    expect(s.pendingRight).toBeNull();
  });
});

// ─── startTimer ──────────────────────────────────────────────────────────────

describe("startTimer", () => {
  it("sets timerRunning=true and seconds to given duration", () => {
    const store = makeStore();
    store.dispatch(startTimer(60));
    const s = getState(store);
    expect(s.timerRunning).toBe(true);
    expect(s.timerSecondsLeft).toBe(60);
  });

  it("accepts custom duration (120 for multirep)", () => {
    const store = makeStore();
    store.dispatch(startTimer(120));
    expect(getState(store).timerSecondsLeft).toBe(120);
  });

  it("resets seconds to full when restarted", () => {
    const store = makeStore();
    store.dispatch(startTimer(60));
    store.dispatch(tickTimer());
    store.dispatch(tickTimer());
    expect(getState(store).timerSecondsLeft).toBe(58);
    store.dispatch(startTimer(60));
    expect(getState(store).timerSecondsLeft).toBe(60);
    expect(getState(store).timerRunning).toBe(true);
  });
});

// ─── stopTimer ───────────────────────────────────────────────────────────────

describe("stopTimer", () => {
  it("sets timerRunning=false", () => {
    const store = makeStore();
    store.dispatch(startTimer(60));
    store.dispatch(stopTimer());
    expect(getState(store).timerRunning).toBe(false);
  });

  it("does not change secondsLeft", () => {
    const store = makeStore();
    store.dispatch(startTimer(60));
    store.dispatch(tickTimer());
    store.dispatch(stopTimer());
    expect(getState(store).timerSecondsLeft).toBe(59);
  });

  it("is idempotent — stopping already stopped timer is fine", () => {
    const store = makeStore();
    store.dispatch(stopTimer());
    expect(getState(store).timerRunning).toBe(false);
  });
});

// ─── tickTimer ───────────────────────────────────────────────────────────────

describe("tickTimer", () => {
  it("decrements by 1 when running", () => {
    const store = makeStore();
    store.dispatch(startTimer(60));
    store.dispatch(tickTimer());
    expect(getState(store).timerSecondsLeft).toBe(59);
  });

  it("does not decrement when not running", () => {
    const store = makeStore();
    // timerRunning=false by default, seconds=60
    store.dispatch(tickTimer());
    expect(getState(store).timerSecondsLeft).toBe(60);
  });

  it("stops at 0 and sets timerRunning=false", () => {
    const store = makeStore();
    store.dispatch(startTimer(1));
    store.dispatch(tickTimer());
    const s = getState(store);
    expect(s.timerSecondsLeft).toBe(0);
    expect(s.timerRunning).toBe(false);
  });

  it("stays at 0, does not go negative", () => {
    const store = makeStore();
    store.dispatch(startTimer(1));
    store.dispatch(tickTimer()); // → 0, running=false
    store.dispatch(tickTimer()); // running=false, no change
    expect(getState(store).timerSecondsLeft).toBe(0);
  });

  it("multiple ticks count down correctly", () => {
    const store = makeStore();
    store.dispatch(startTimer(10));
    for (let i = 0; i < 5; i++) store.dispatch(tickTimer());
    expect(getState(store).timerSecondsLeft).toBe(5);
    expect(getState(store).timerRunning).toBe(true);
  });
});

// ─── castVote ────────────────────────────────────────────────────────────────

describe("castVote", () => {
  it("sets pendingLeft=true", () => {
    const store = makeStore();
    store.dispatch(castVote({ judge: "left", value: true }));
    expect(getState(store).pendingLeft).toBe(true);
  });

  it("sets pendingCenter=false", () => {
    const store = makeStore();
    store.dispatch(castVote({ judge: "center", value: false }));
    expect(getState(store).pendingCenter).toBe(false);
  });

  it("sets pendingRight=true", () => {
    const store = makeStore();
    store.dispatch(castVote({ judge: "right", value: true }));
    expect(getState(store).pendingRight).toBe(true);
  });

  it("overwrites previous vote", () => {
    const store = makeStore();
    store.dispatch(castVote({ judge: "left", value: true }));
    store.dispatch(castVote({ judge: "left", value: false }));
    expect(getState(store).pendingLeft).toBe(false);
  });
});

// ─── resetVote ───────────────────────────────────────────────────────────────

describe("resetVote", () => {
  it("clears left vote back to null", () => {
    const store = makeStore();
    store.dispatch(castVote({ judge: "left", value: true }));
    store.dispatch(resetVote({ judge: "left" }));
    expect(getState(store).pendingLeft).toBeNull();
  });

  it("clears center vote back to null", () => {
    const store = makeStore();
    store.dispatch(castVote({ judge: "center", value: false }));
    store.dispatch(resetVote({ judge: "center" }));
    expect(getState(store).pendingCenter).toBeNull();
  });

  it("clears right vote back to null", () => {
    const store = makeStore();
    store.dispatch(castVote({ judge: "right", value: true }));
    store.dispatch(resetVote({ judge: "right" }));
    expect(getState(store).pendingRight).toBeNull();
  });

  it("does not affect other votes", () => {
    const store = makeStore();
    store.dispatch(castVote({ judge: "left", value: true }));
    store.dispatch(castVote({ judge: "center", value: false }));
    store.dispatch(resetVote({ judge: "left" }));
    expect(getState(store).pendingLeft).toBeNull();
    expect(getState(store).pendingCenter).toBe(false);
  });
});

// ─── clearPendingVotes ───────────────────────────────────────────────────────

describe("clearPendingVotes", () => {
  it("resets all three votes to null", () => {
    const store = makeStore();
    store.dispatch(castVote({ judge: "left", value: true }));
    store.dispatch(castVote({ judge: "center", value: false }));
    store.dispatch(castVote({ judge: "right", value: true }));
    store.dispatch(clearPendingVotes());
    const s = getState(store);
    expect(s.pendingLeft).toBeNull();
    expect(s.pendingCenter).toBeNull();
    expect(s.pendingRight).toBeNull();
  });

  it("is idempotent when already all null", () => {
    const store = makeStore();
    store.dispatch(clearPendingVotes());
    const s = getState(store);
    expect(s.pendingLeft).toBeNull();
    expect(s.pendingCenter).toBeNull();
    expect(s.pendingRight).toBeNull();
  });

  it("also clears pendingReps to null", () => {
    const store = makeStore();
    store.dispatch(setPendingReps(15));
    expect(getState(store).pendingReps).toBe(15);
    store.dispatch(clearPendingVotes());
    expect(getState(store).pendingReps).toBeNull();
  });
});

// ─── setPendingReps (Multirep) ───────────────────────────────────────────────

describe("setPendingReps", () => {
  it("starts as null in initial state", () => {
    const store = makeStore();
    expect(getState(store).pendingReps).toBeNull();
  });

  it("sets pendingReps to the given integer", () => {
    const store = makeStore();
    store.dispatch(setPendingReps(20));
    expect(getState(store).pendingReps).toBe(20);
  });

  it("can be cleared by passing null", () => {
    const store = makeStore();
    store.dispatch(setPendingReps(20));
    store.dispatch(setPendingReps(null));
    expect(getState(store).pendingReps).toBeNull();
  });

  it("overwrites previous reps value", () => {
    const store = makeStore();
    store.dispatch(setPendingReps(10));
    store.dispatch(setPendingReps(15));
    expect(getState(store).pendingReps).toBe(15);
  });

  it("does not affect votes", () => {
    const store = makeStore();
    store.dispatch(castVote({ judge: "left", value: true }));
    store.dispatch(setPendingReps(12));
    expect(getState(store).pendingLeft).toBe(true);
    expect(getState(store).pendingReps).toBe(12);
  });
});

// ─── Integration: votes → attemptStatus ──────────────────────────────────────

describe("pending votes → attemptStatusFromVotes integration", () => {
  it("pending=null,null,null → status pending", () => {
    const store = makeStore();
    const s = getState(store);
    const votes = {
      left: s.pendingLeft,
      center: s.pendingCenter,
      right: s.pendingRight,
    };
    expect(attemptStatusFromVotes(votes)).toBe("pending");
  });

  it("all true → success", () => {
    const store = makeStore();
    store.dispatch(castVote({ judge: "left", value: true }));
    store.dispatch(castVote({ judge: "center", value: true }));
    store.dispatch(castVote({ judge: "right", value: true }));
    const s = getState(store);
    expect(
      attemptStatusFromVotes({ left: s.pendingLeft, center: s.pendingCenter, right: s.pendingRight }),
    ).toBe("success");
  });

  it("all false → fail", () => {
    const store = makeStore();
    store.dispatch(castVote({ judge: "left", value: false }));
    store.dispatch(castVote({ judge: "center", value: false }));
    store.dispatch(castVote({ judge: "right", value: false }));
    const s = getState(store);
    expect(
      attemptStatusFromVotes({ left: s.pendingLeft, center: s.pendingCenter, right: s.pendingRight }),
    ).toBe("fail");
  });

  it("2-1 split in favour of good → success", () => {
    const store = makeStore();
    store.dispatch(castVote({ judge: "left", value: true }));
    store.dispatch(castVote({ judge: "center", value: true }));
    store.dispatch(castVote({ judge: "right", value: false }));
    const s = getState(store);
    expect(
      attemptStatusFromVotes({ left: s.pendingLeft, center: s.pendingCenter, right: s.pendingRight }),
    ).toBe("success");
  });

  it("2-1 split in favour of no-lift → fail", () => {
    const store = makeStore();
    store.dispatch(castVote({ judge: "left", value: false }));
    store.dispatch(castVote({ judge: "center", value: false }));
    store.dispatch(castVote({ judge: "right", value: true }));
    const s = getState(store);
    expect(
      attemptStatusFromVotes({ left: s.pendingLeft, center: s.pendingCenter, right: s.pendingRight }),
    ).toBe("fail");
  });

  it("only 1 vote cast → still pending", () => {
    const store = makeStore();
    store.dispatch(castVote({ judge: "left", value: true }));
    const s = getState(store);
    expect(
      attemptStatusFromVotes({ left: s.pendingLeft, center: s.pendingCenter, right: s.pendingRight }),
    ).toBe("pending");
  });
});
