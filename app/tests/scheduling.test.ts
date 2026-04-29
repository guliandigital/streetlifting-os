import { describe, expect, it } from "vitest";

import {
  buildSchedulePlan,
  DEFAULT_SCHEDULE_ESTIMATION,
} from "@logic/isf/scheduling";
import { buildEmptyV2SaveFile } from "./fixtures/save-file";
import { buildClassicEntry, buildMultirepEntry } from "./fixtures/builders";

const meet = buildEmptyV2SaveFile().meet;

describe("buildSchedulePlan", () => {
  it("projects legacy day/platform/flight fields into streams", () => {
    const a = buildClassicEntry("A", { day: 1, platform: 1, flight: "A" });
    const b = buildClassicEntry("B", { day: 1, platform: 1, flight: "A" });
    const c = buildClassicEntry("C", { day: 1, platform: 2, flight: "A" });

    const plan = buildSchedulePlan([c, b, a], meet);

    expect(plan.streams).toEqual([
      expect.objectContaining({
        id: "day1-platform1-flightA",
        entryIds: [b.id, a.id],
      }),
      expect.objectContaining({
        id: "day1-platform2-flightA",
        entryIds: [c.id],
      }),
    ]);
  });

  it("creates classic PU and DI groups for a two-lift entry", () => {
    const entry = buildClassicEntry("A", {
      disciplineCode: "classic_2lift",
      event: "PUDI",
    });

    const plan = buildSchedulePlan([entry], meet);

    expect(plan.groups.map((group) => group.exercise)).toEqual(["PU", "DI"]);
    expect(plan.groups.every((group) => group.entryIds.includes(entry.id))).toBe(
      true,
    );
  });

  it("creates only one group for single-lift entries", () => {
    const entry = buildClassicEntry("A", {
      disciplineCode: "classic_pu",
      event: "PU",
    });

    const plan = buildSchedulePlan([entry], meet);

    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]).toMatchObject({
      disciplineCode: "classic_pu",
      exercise: "PU",
    });
  });

  it("estimates classic duration from attempts, timer, buffer, and setup", () => {
    const entry = buildClassicEntry("A", {
      disciplineCode: "classic_pu",
      event: "PU",
    });

    const plan = buildSchedulePlan([entry], meet);
    const expected =
      DEFAULT_SCHEDULE_ESTIMATION.groupSetupSec +
      1 *
        DEFAULT_SCHEDULE_ESTIMATION.classicAttemptsPerExercise *
        (60 + DEFAULT_SCHEDULE_ESTIMATION.classicAttemptBufferSec);

    expect(plan.groups[0]?.estimatedDurationSec).toBe(expected);
    expect(plan.totalEstimatedDurationSec).toBe(expected);
  });

  it("estimates multirep duration as one timed attempt per athlete", () => {
    const entry = buildMultirepEntry("A", {
      disciplineCode: "multirep_pu_16",
      event: "PU",
    });

    const plan = buildSchedulePlan([entry], meet);
    const expected =
      DEFAULT_SCHEDULE_ESTIMATION.groupSetupSec +
      1 * (120 + DEFAULT_SCHEDULE_ESTIMATION.multirepAttemptBufferSec);

    expect(plan.groups[0]?.estimatedDurationSec).toBe(expected);
  });

  it("adds stream breaks between streams", () => {
    const a = buildClassicEntry("A", { day: 1, platform: 1, flight: "A" });
    const b = buildClassicEntry("B", { day: 1, platform: 1, flight: "B" });

    const plan = buildSchedulePlan([a, b], meet);
    const groupTotal = plan.groups.reduce(
      (sum, group) => sum + group.estimatedDurationSec,
      0,
    );

    expect(plan.streams).toHaveLength(2);
    expect(plan.totalEstimatedDurationSec).toBe(
      groupTotal + DEFAULT_SCHEDULE_ESTIMATION.streamBreakSec,
    );
  });
});
