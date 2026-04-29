/**
 * Stream/Group scheduling and duration estimation.
 *
 * The planner is deterministic and conservative: it projects existing Entry
 * fields into V2 ScheduleStream/AttemptGroup shapes and estimates wall-clock
 * time from explicit parameters. It does not mutate entries or save-files.
 */

import type {
  AttemptGroup,
  Entry,
  Exercise,
  MeetState,
  SchedulePlan,
  ScheduleStream,
} from "@domain/models";

export type ScheduleEstimationConfig = {
  classicAttemptsPerExercise: number;
  classicAttemptBufferSec: number;
  multirepAttemptBufferSec: number;
  groupSetupSec: number;
  streamBreakSec: number;
};

export const DEFAULT_SCHEDULE_ESTIMATION: ScheduleEstimationConfig = {
  classicAttemptsPerExercise: 3,
  classicAttemptBufferSec: 30,
  multirepAttemptBufferSec: 45,
  groupSetupSec: 180,
  streamBreakSec: 300,
};

function streamKey(entry: Entry): string {
  return `${entry.day}|${entry.platform}|${entry.flight.trim()}`;
}

function streamId(entry: Entry): string {
  const flight = entry.flight.trim() || "unassigned";
  return `day${entry.day}-platform${entry.platform}-flight${flight}`;
}

function exercisesForEntry(entry: Entry): Array<"PU" | "DI"> {
  if (entry.event === "PU") return ["PU"];
  if (entry.event === "DI") return ["DI"];
  if (entry.event === "PUDI") return ["PU", "DI"];
  return [];
}

function formatOrder(format: Entry["competitionFormat"]): number {
  if (format === "classic") return 0;
  if (format === "multirep") return 1;
  return 2;
}

function exerciseOrder(exercise: Exercise): number {
  if (exercise === "PU") return 0;
  if (exercise === "DI") return 1;
  if (exercise === "MU_BAR" || exercise === "MU_RING") return 2;
  return 3;
}

function estimateGroupDurationSec(
  group: Pick<AttemptGroup, "competitionFormat" | "exercise" | "entryIds">,
  meet: MeetState,
  config: ScheduleEstimationConfig,
): number {
  const athleteCount = group.entryIds.length;
  if (athleteCount === 0) return 0;

  if (group.competitionFormat === "classic") {
    const attemptDuration =
      meet.classicLoadConfig?.defaultAttemptDurationSec ?? 60;
    return (
      config.groupSetupSec +
      athleteCount *
        config.classicAttemptsPerExercise *
        (attemptDuration + config.classicAttemptBufferSec)
    );
  }

  if (group.competitionFormat === "multirep") {
    const attemptDuration =
      meet.multirepConfig?.defaultAttemptDurationSec ?? 120;
    return (
      config.groupSetupSec +
      athleteCount * (attemptDuration + config.multirepAttemptBufferSec)
    );
  }

  const attemptDuration =
    meet.classicLoadConfig?.defaultAttemptDurationSec ?? 60;
  return (
    config.groupSetupSec +
    athleteCount *
      config.classicAttemptsPerExercise *
      (attemptDuration + config.classicAttemptBufferSec)
  );
}

export function buildSchedulePlan(
  entries: ReadonlyArray<Entry>,
  meet: MeetState,
  config: ScheduleEstimationConfig = DEFAULT_SCHEDULE_ESTIMATION,
): SchedulePlan {
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    if (a.platform !== b.platform) return a.platform - b.platform;
    if (a.flight !== b.flight) return a.flight.localeCompare(b.flight);
    return entries.indexOf(a) - entries.indexOf(b);
  });

  const streamByKey = new Map<string, ScheduleStream>();
  for (const entry of sortedEntries) {
    const key = streamKey(entry);
    const existing = streamByKey.get(key);
    if (existing) {
      existing.entryIds.push(entry.id);
    } else {
      streamByKey.set(key, {
        id: streamId(entry),
        day: entry.day,
        platform: entry.platform,
        flight: entry.flight,
        entryIds: [entry.id],
      });
    }
  }

  const streams = [...streamByKey.values()];
  const groups: AttemptGroup[] = [];

  for (const stream of streams) {
    const streamEntries = sortedEntries.filter((entry) =>
      stream.entryIds.includes(entry.id),
    );
    const groupEntryIds = new Map<string, string[]>();

    for (const entry of streamEntries) {
      for (const exercise of exercisesForEntry(entry)) {
        const key = [
          entry.competitionFormat,
          entry.disciplineCode,
          exercise,
        ].join("|");
        const ids = groupEntryIds.get(key) ?? [];
        ids.push(entry.id);
        groupEntryIds.set(key, ids);
      }
    }

    const streamGroups = [...groupEntryIds.entries()]
      .map(([key, entryIds]) => {
        const [competitionFormat, disciplineCode, exercise] = key.split("|");
        const partial = {
          id: `${stream.id}-${disciplineCode}-${exercise}`.toLowerCase(),
          streamId: stream.id,
          competitionFormat: competitionFormat as Entry["competitionFormat"],
          disciplineCode: disciplineCode as Entry["disciplineCode"],
          exercise: exercise as Exercise,
          entryIds,
          estimatedDurationSec: 0,
        };
        return {
          ...partial,
          estimatedDurationSec: estimateGroupDurationSec(partial, meet, config),
        };
      })
      .sort((a, b) => {
        const formatDelta =
          formatOrder(a.competitionFormat) - formatOrder(b.competitionFormat);
        if (formatDelta !== 0) return formatDelta;
        const disciplineDelta = a.disciplineCode.localeCompare(b.disciplineCode);
        if (disciplineDelta !== 0) return disciplineDelta;
        return exerciseOrder(a.exercise) - exerciseOrder(b.exercise);
      });

    groups.push(...streamGroups);
  }

  const streamBreakTotal =
    streams.length > 1 ? (streams.length - 1) * config.streamBreakSec : 0;
  const groupTotal = groups.reduce(
    (sum, group) => sum + group.estimatedDurationSec,
    0,
  );

  return {
    streams,
    groups,
    totalEstimatedDurationSec: groupTotal + streamBreakTotal,
  };
}
