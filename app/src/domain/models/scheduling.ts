/**
 * Stream/Group scheduling models.
 *
 * V2 introduces first-class scheduling without replacing legacy Entry.day /
 * platform / flight fields yet. The planner projects those fields into these
 * structures so UI/backend can evolve incrementally.
 */

import type { CompetitionFormat, Exercise } from "./enums";
import type { DisciplineCode } from "./discipline";

export type StreamId = string;
export type AttemptGroupId = string;

export type ScheduleStream = {
  id: StreamId;
  day: number;
  platform: number;
  flight: string;
  entryIds: string[];
};

export type AttemptGroup = {
  id: AttemptGroupId;
  streamId: StreamId;
  competitionFormat: CompetitionFormat;
  disciplineCode: DisciplineCode;
  exercise: Exercise;
  entryIds: string[];
  estimatedDurationSec: number;
};

export type SchedulePlan = {
  streams: ScheduleStream[];
  groups: AttemptGroup[];
  totalEstimatedDurationSec: number;
};
