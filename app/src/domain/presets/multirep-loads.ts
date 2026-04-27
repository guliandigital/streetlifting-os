/**
 * ISF v5.1 §2.2 Multirep preset loads — D3 (decisions-v1).
 *
 * Verbatim from ISF v5.1 §2.2:
 * > All specified loads are mandatory at official ISF events.
 * > Any changes require ISF approval and must be detailed in the Competition Regulations.
 *
 * Men:
 * | Exercise | Sub-Jr (13–17) | Jr (18–22) & Masters (40+) | Amateur (Open) | Pro |
 * | Pull-Ups | 8 kg           | 16 kg                       | 24 kg          | 32 kg |
 * | Dips     | 16 kg          | 24 kg                       | 32 kg          | 48 kg |
 *
 * Women:
 * | Exercise | Sub-Jr / Jr / Masters | Open |
 * | Pull-Ups | 8 kg                  | 12 kg |
 * | Dips     | 12 kg                 | 16 kg |
 */

import type { MultirepPreset } from "../models/meet-state";

export const ISF_V51_MULTIREP_PRESETS: ReadonlyArray<MultirepPreset> = [
  // ─── Men, Pull-Ups ──────────────────────────────────────────────────────
  {
    sex: "M",
    exercise: "PU",
    division: "amateur",
    ageCategoryCodes: ["youth"],
    loadKg: 8,
  },
  {
    sex: "M",
    exercise: "PU",
    division: "amateur",
    ageCategoryCodes: [
      "junior",
      "masters_m1",
      "masters_m2",
      "masters_m3",
      "masters_m4",
      "masters_m5",
      "masters_m6",
    ],
    loadKg: 16,
  },
  {
    sex: "M",
    exercise: "PU",
    division: "amateur",
    ageCategoryCodes: ["open"],
    loadKg: 24,
  },
  {
    sex: "M",
    exercise: "PU",
    division: "pro",
    ageCategoryCodes: ["open"],
    loadKg: 32,
  },

  // ─── Men, Dips ──────────────────────────────────────────────────────────
  {
    sex: "M",
    exercise: "DI",
    division: "amateur",
    ageCategoryCodes: ["youth"],
    loadKg: 16,
  },
  {
    sex: "M",
    exercise: "DI",
    division: "amateur",
    ageCategoryCodes: [
      "junior",
      "masters_m1",
      "masters_m2",
      "masters_m3",
      "masters_m4",
      "masters_m5",
      "masters_m6",
    ],
    loadKg: 24,
  },
  {
    sex: "M",
    exercise: "DI",
    division: "amateur",
    ageCategoryCodes: ["open"],
    loadKg: 32,
  },
  {
    sex: "M",
    exercise: "DI",
    division: "pro",
    ageCategoryCodes: ["open"],
    loadKg: 48,
  },

  // ─── Women, Pull-Ups ────────────────────────────────────────────────────
  {
    sex: "F",
    exercise: "PU",
    division: "amateur",
    ageCategoryCodes: [
      "youth",
      "junior",
      "masters_m1",
      "masters_m2",
      "masters_m3",
      "masters_m4",
      "masters_m5",
      "masters_m6",
    ],
    loadKg: 8,
  },
  {
    sex: "F",
    exercise: "PU",
    division: "amateur",
    ageCategoryCodes: ["open"],
    loadKg: 12,
  },

  // ─── Women, Dips ────────────────────────────────────────────────────────
  {
    sex: "F",
    exercise: "DI",
    division: "amateur",
    ageCategoryCodes: [
      "youth",
      "junior",
      "masters_m1",
      "masters_m2",
      "masters_m3",
      "masters_m4",
      "masters_m5",
      "masters_m6",
    ],
    loadKg: 12,
  },
  {
    sex: "F",
    exercise: "DI",
    division: "amateur",
    ageCategoryCodes: ["open"],
    loadKg: 16,
  },
];
