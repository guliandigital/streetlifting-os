import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AudioSettings } from "@/services/audio/audio-service";

const AUDIO_SETTINGS_STORAGE_KEY = "streetlifting-os.audio-settings.v1";

export type AudioSliceState = AudioSettings;

const defaultAudioSettings: AudioSliceState = {
  enabled: true,
  voiceEnabled: true,
  volume: 0.7,
};

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) return defaultAudioSettings.volume;
  return Math.min(Math.max(volume, 0), 1);
}

export function loadAudioSettings(): AudioSliceState {
  if (typeof window === "undefined") return defaultAudioSettings;

  try {
    const raw = window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
    if (!raw) return defaultAudioSettings;
    const parsed = JSON.parse(raw) as Partial<AudioSliceState>;
    return {
      enabled:
        typeof parsed.enabled === "boolean"
          ? parsed.enabled
          : defaultAudioSettings.enabled,
      voiceEnabled:
        typeof parsed.voiceEnabled === "boolean"
          ? parsed.voiceEnabled
          : defaultAudioSettings.voiceEnabled,
      volume:
        typeof parsed.volume === "number"
          ? clampVolume(parsed.volume)
          : defaultAudioSettings.volume,
    };
  } catch {
    return defaultAudioSettings;
  }
}

export function saveAudioSettings(settings: AudioSliceState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      AUDIO_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        enabled: settings.enabled,
        voiceEnabled: settings.voiceEnabled,
        volume: clampVolume(settings.volume),
      }),
    );
  } catch {
    // Operator preference persistence is best-effort; judging must continue without it.
  }
}

const audioSlice = createSlice({
  name: "audio",
  initialState: loadAudioSettings(),
  reducers: {
    setAudioEnabled(state, action: PayloadAction<boolean>) {
      state.enabled = action.payload;
    },
    setVoiceEnabled(state, action: PayloadAction<boolean>) {
      state.voiceEnabled = action.payload;
    },
    setAudioVolume(state, action: PayloadAction<number>) {
      state.volume = clampVolume(action.payload);
    },
    resetAudioSettings() {
      return defaultAudioSettings;
    },
  },
});

export const {
  setAudioEnabled,
  setVoiceEnabled,
  setAudioVolume,
  resetAudioSettings,
} = audioSlice.actions;

export default audioSlice.reducer;
