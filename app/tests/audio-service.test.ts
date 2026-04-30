/**
 * Audio service tests — focuses on the voice path (Web Speech API
 * wrapper). Beep-cue path is exercised end-to-end during judging
 * smoke tests; the OscillatorNode/AudioContext machinery in
 * happy-dom is partial and not worth re-mocking here.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { audioService } from "@/services/audio/audio-service";
import type { AudioSettings } from "@/services/audio/audio-service";

type SpeakSpy = ReturnType<typeof vi.fn>;
type CancelSpy = ReturnType<typeof vi.fn>;

class FakeUtterance {
  text: string;
  lang = "";
  volume = 1;
  rate = 1;
  pitch = 1;
  constructor(text: string) {
    this.text = text;
  }
}

function installSpeechSynthesis(): { speak: SpeakSpy; cancel: CancelSpy } {
  const speak = vi.fn();
  const cancel = vi.fn();
  (window as unknown as { speechSynthesis: unknown }).speechSynthesis = {
    speak,
    cancel,
    pending: false,
    paused: false,
    speaking: false,
  };
  (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance =
    FakeUtterance;
  return { speak, cancel };
}

const FULL_VOLUME_VOICE_ON: AudioSettings = {
  enabled: true,
  voiceEnabled: true,
  volume: 0.9,
};

describe("audioService.speak", () => {
  beforeEach(() => {
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
  });

  it("calls speechSynthesis.speak with the right text and lang", () => {
    const { speak } = installSpeechSynthesis();
    audioService.speak("Привет", "ru-RU", FULL_VOLUME_VOICE_ON);
    expect(speak).toHaveBeenCalledTimes(1);
    const utter = speak.mock.calls[0]![0] as FakeUtterance;
    expect(utter.text).toBe("Привет");
    expect(utter.lang).toBe("ru-RU");
    expect(utter.volume).toBeCloseTo(0.9);
  });

  it("cancels any in-flight utterance before speaking the new one", () => {
    const { speak, cancel } = installSpeechSynthesis();
    audioService.speak("First", "en-US", FULL_VOLUME_VOICE_ON);
    audioService.speak("Second", "en-US", FULL_VOLUME_VOICE_ON);
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it("is a no-op when voiceEnabled is false", () => {
    const { speak } = installSpeechSynthesis();
    audioService.speak("Hi", "en-US", {
      ...FULL_VOLUME_VOICE_ON,
      voiceEnabled: false,
    });
    expect(speak).not.toHaveBeenCalled();
  });

  it("is a no-op when volume is zero", () => {
    const { speak } = installSpeechSynthesis();
    audioService.speak("Hi", "en-US", {
      ...FULL_VOLUME_VOICE_ON,
      volume: 0,
    });
    expect(speak).not.toHaveBeenCalled();
  });

  it("is a silent no-op when speechSynthesis is unavailable", () => {
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
    expect(() =>
      audioService.speak("Hi", "en-US", FULL_VOLUME_VOICE_ON),
    ).not.toThrow();
  });

  it("clamps volume into [0, 1] before assigning to the utterance", () => {
    const { speak } = installSpeechSynthesis();
    audioService.speak("Hi", "en-US", {
      enabled: true,
      voiceEnabled: true,
      volume: 1.5,
    });
    const utter = speak.mock.calls[0]![0] as FakeUtterance;
    expect(utter.volume).toBe(1);
  });
});

describe("audioService.cancelVoice", () => {
  beforeEach(() => {
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
  });

  it("calls speechSynthesis.cancel", () => {
    const { cancel } = installSpeechSynthesis();
    audioService.cancelVoice();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("does not throw when speechSynthesis is unavailable", () => {
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
    expect(() => audioService.cancelVoice()).not.toThrow();
  });
});

describe("audioService.playVoicePhrase", () => {
  beforeEach(() => {
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
  });

  it("dispatches a known phrase in the requested locale", () => {
    const { speak } = installSpeechSynthesis();
    audioService.playVoicePhrase("attemptPassed", "ru-RU", FULL_VOLUME_VOICE_ON);
    const utter = speak.mock.calls[0]![0] as FakeUtterance;
    expect(utter.text).toBe("Попытка засчитана");
    expect(utter.lang).toBe("ru-RU");
  });
});
