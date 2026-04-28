/**
 * Judging slice — Sprint 2.
 *
 * Holds TRANSIENT state that is NOT persisted to the SaveFile:
 *   - Timer countdown
 *   - Pending judge votes for the current attempt
 *
 * The persisted "last active position" (activeEntryIndex, activeAttemptSequence)
 * lives in SaveFile.judging and is mutated via meet-slice actions.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type JudgingSliceState = {
  timerRunning: boolean;
  timerSecondsLeft: number;
  /** Pending vote from the left judge; null = not yet cast. */
  pendingLeft: boolean | null;
  /** Pending vote from the center judge; null = not yet cast. */
  pendingCenter: boolean | null;
  /** Pending vote from the right judge; null = not yet cast. */
  pendingRight: boolean | null;
  /** Pending rep count for Multirep judging; null = not yet entered. */
  pendingReps: number | null;
};

const DEFAULT_DURATION_SEC = 60;

const initialState: JudgingSliceState = {
  timerRunning: false,
  timerSecondsLeft: DEFAULT_DURATION_SEC,
  pendingLeft: null,
  pendingCenter: null,
  pendingRight: null,
  pendingReps: null,
};

const judgingSlice = createSlice({
  name: "judging",
  initialState,
  reducers: {
    /** Reset the timer to `durationSec` and start it running. */
    startTimer(state, action: PayloadAction<number>) {
      state.timerSecondsLeft = action.payload;
      state.timerRunning = true;
    },

    /** Stop the timer without committing the attempt. */
    stopTimer(state) {
      state.timerRunning = false;
    },

    /**
     * Decrement the timer by 1 second.
     * When it reaches 0 it stops automatically.
     */
    tickTimer(state) {
      if (!state.timerRunning) return;
      if (state.timerSecondsLeft <= 0) {
        state.timerRunning = false;
        state.timerSecondsLeft = 0;
        return;
      }
      state.timerSecondsLeft -= 1;
      if (state.timerSecondsLeft === 0) {
        state.timerRunning = false;
      }
    },

    /** Set a pending vote for one judge. */
    castVote(
      state,
      action: PayloadAction<{
        judge: "left" | "center" | "right";
        value: boolean;
      }>,
    ) {
      const { judge, value } = action.payload;
      if (judge === "left") state.pendingLeft = value;
      else if (judge === "center") state.pendingCenter = value;
      else state.pendingRight = value;
    },

    /** Clear one judge's pending vote back to null. */
    resetVote(
      state,
      action: PayloadAction<{ judge: "left" | "center" | "right" }>,
    ) {
      const { judge } = action.payload;
      if (judge === "left") state.pendingLeft = null;
      else if (judge === "center") state.pendingCenter = null;
      else state.pendingRight = null;
    },

    /** Clear all pending votes (called after commit or advance). */
    clearPendingVotes(state) {
      state.pendingLeft = null;
      state.pendingCenter = null;
      state.pendingRight = null;
      state.pendingReps = null;
    },

    /** Set pending reps count for Multirep judging. */
    setPendingReps(state, action: PayloadAction<number | null>) {
      state.pendingReps = action.payload;
    },
  },
});

export const {
  startTimer,
  stopTimer,
  tickTimer,
  castVote,
  resetVote,
  clearPendingVotes,
  setPendingReps,
} = judgingSlice.actions;

export default judgingSlice.reducer;
