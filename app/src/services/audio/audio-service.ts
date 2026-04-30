export type AudioCue =
  | "timer_30_sec"
  | "timer_3_sec"
  | "timer_timeout"
  | "attempt_failed";

export type AudioSettings = {
  /** Master toggle for beep cues (timer warnings, attempt-failed). */
  enabled: boolean;
  /** Master toggle for voice announcements (awards announcer, future verdict voice). */
  voiceEnabled: boolean;
  /** 0..1 linear gain. Applies to both beeps and voice. */
  volume: number;
};

export type VoiceLocale = "ru-RU" | "en-US";

export type VoicePhraseKey =
  | "timerThirtySeconds"
  | "timerThreeSeconds"
  | "timerTimeout"
  | "attemptFailed"
  | "attemptPassed"
  | "awardsNext"
  | "awardsWinner";

export type VoicePhraseContract = Record<
  VoiceLocale,
  Record<VoicePhraseKey, string>
>;

export const VOICE_PHRASES: VoicePhraseContract = {
  "ru-RU": {
    timerThirtySeconds: "Осталось тридцать секунд",
    timerThreeSeconds: "Три секунды",
    timerTimeout: "Время",
    attemptFailed: "Попытка не засчитана",
    attemptPassed: "Попытка засчитана",
    awardsNext: "Следующий награждаемый",
    awardsWinner: "Победитель",
  },
  "en-US": {
    timerThirtySeconds: "Thirty seconds remaining",
    timerThreeSeconds: "Three seconds",
    timerTimeout: "Time",
    attemptFailed: "No lift",
    attemptPassed: "Good lift",
    awardsNext: "Next award",
    awardsWinner: "Winner",
  },
};

type AudioContextCtor = typeof AudioContext;

const cueSpecs: Record<AudioCue, { frequencyHz: number; durationMs: number; repeats?: number }> = {
  timer_30_sec: { frequencyHz: 660, durationMs: 140 },
  timer_3_sec: { frequencyHz: 760, durationMs: 100, repeats: 3 },
  timer_timeout: { frequencyHz: 880, durationMs: 300 },
  attempt_failed: { frequencyHz: 220, durationMs: 180, repeats: 2 },
};

class AudioService {
  private ctx: AudioContext | null = null;

  playCue(cue: AudioCue, settings: AudioSettings): void {
    if (!settings.enabled || settings.volume <= 0) return;

    const spec = cueSpecs[cue];
    const repeats = spec.repeats ?? 1;

    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === "suspended") void ctx.resume();

      for (let i = 0; i < repeats; i += 1) {
        this.scheduleBeep(ctx, spec.frequencyHz, spec.durationMs, settings.volume, i * 0.16);
      }
    } catch {
      // Audio is non-critical during judging; unsupported/locked Web Audio must not break the timer.
    }
  }

  playVoicePhrase(
    phrase: VoicePhraseKey,
    locale: VoiceLocale,
    settings: AudioSettings,
  ): void {
    const text = VOICE_PHRASES[locale][phrase];
    this.speak(text, locale, settings);
  }

  /**
   * Speak arbitrary text via the Web Speech API (browser TTS). Used by the
   * awards-ceremony announcer to read podium results aloud. Runtime is
   * best-effort: if `speechSynthesis` is unavailable (older WebKit, locked
   * audio context, no installed voice for the requested locale), the call
   * is silently a no-op so the rest of the ceremony continues.
   *
   * Each new speak() cancels any utterance currently in flight so rapid
   * Next-award presses don't queue overlapping voice.
   */
  speak(text: string, locale: VoiceLocale, settings: AudioSettings): void {
    if (!settings.voiceEnabled || settings.volume <= 0) return;
    if (typeof window === "undefined") return;

    try {
      const synth = window.speechSynthesis;
      if (!synth) return;

      synth.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = locale;
      utter.volume = Math.min(Math.max(settings.volume, 0), 1);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      synth.speak(utter);
    } catch {
      // Voice is non-critical; never break the ceremony on TTS failure.
    }
  }

  /** Stop any in-flight voice immediately. Used on unmount + on settings off. */
  cancelVoice(): void {
    if (typeof window === "undefined") return;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignored
    }
  }

  private getContext(): AudioContext | null {
    if (this.ctx) return this.ctx;

    const w = window as Window & { webkitAudioContext?: AudioContextCtor };
    const Ctor = window.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;

    this.ctx = new Ctor();
    return this.ctx;
  }

  private scheduleBeep(
    ctx: AudioContext,
    frequencyHz: number,
    durationMs: number,
    volume: number,
    delaySec: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startAt = ctx.currentTime + delaySec;
    const stopAt = startAt + durationMs / 1000;

    osc.type = "sine";
    osc.frequency.value = frequencyHz;
    gain.gain.setValueAtTime(Math.min(Math.max(volume, 0), 1), startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, stopAt);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(stopAt);
  }
}

export const audioService = new AudioService();
