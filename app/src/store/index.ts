/**
 * Redux Toolkit store — Sprint 1 baseline.
 */

import { configureStore } from "@reduxjs/toolkit";
import meetReducer from "./meet-slice";
import { registrationReducer } from "./registration-slice";
import judgingReducer from "./judging-slice";
import audioReducer from "./audio-slice";
import { saveAudioSettings } from "./audio-slice";

export const store = configureStore({
  reducer: {
    meet: meetReducer,
    registration: registrationReducer,
    judging: judgingReducer,
    audio: audioReducer,
  },
  middleware: (getDefault) => getDefault({ serializableCheck: true }),
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

let lastAudioSettings = store.getState().audio;
store.subscribe(() => {
  const nextAudioSettings = store.getState().audio;
  if (nextAudioSettings !== lastAudioSettings) {
    lastAudioSettings = nextAudioSettings;
    saveAudioSettings(nextAudioSettings);
  }
});

// Typed hooks for the rest of the app.
import {
  useDispatch as useDispatchUntyped,
  useSelector as useSelectorUntyped,
  type TypedUseSelectorHook,
} from "react-redux";
export const useAppDispatch: () => AppDispatch = useDispatchUntyped;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelectorUntyped;
