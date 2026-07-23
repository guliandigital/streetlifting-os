/**
 * Athlete/Nomination split — V2 foundation.
 *
 * Athlete is the person-level identity. Nomination is the athlete's registration
 * in a specific meet discipline/division/flight with meet-scoped results.
 *
 * During the V2 transition `registration.entries` remains as the UI-compatible
 * projection, while `athletes` + `nominations` become the backend-ready shape.
 */

import type { AgeCategoryCode } from "./age-category";
import type { ExerciseResult } from "./attempts";
import type { DisciplineCode } from "./discipline";
import type { CompetitionFormat, Division, Event, Sex } from "./enums";
import type { Entry } from "./entry";

export type Athlete = {
  id: string;
  name: string;
  sex: Sex;
  birthDate: string | null;
  /** Operator override for age in years; takes precedence over birthDate-derived age. */
  ageOverride: number | null;
  /** ISO 3166-1 alpha-2 or full country name until federation profiles narrow it. */
  country: string | null;
  memberId?: string;
  /** Confirmed external ISF person identifier, never inferred from a name. */
  isfPersonId?: string;
  instagram?: string;
};

export type Nomination = {
  id: string;
  athleteId: string;
  competitionFormat: CompetitionFormat;
  disciplineCode: DisciplineCode;
  event: Event;

  day: number;
  platform: number;
  /** V2 follow-up introduces Stream/Group entities; keep the current label for now. */
  flight: string;

  division: Division;
  team?: string;
  guest: boolean;
  notes?: string;

  bodyweightKg: number | null;
  reweighKg: number | null;
  assignedAgeCategoryCode?: AgeCategoryCode;
  assignedWeightCategoryCode?: string;

  exercises: {
    PU?: ExerciseResult;
    DI?: ExerciseResult;
  };
};

export function athleteIdForEntry(entryId: string): string {
  return `ath_${entryId}`;
}

export function nominationIdForEntry(entryId: string): string {
  return `nom_${entryId}`;
}

export function splitEntry(entry: Entry): {
  athlete: Athlete;
  nomination: Nomination;
} {
  const athlete: Athlete = {
    id: athleteIdForEntry(entry.id),
    name: entry.name,
    sex: entry.sex,
    birthDate: entry.birthDate,
    ageOverride: entry.ageOverride,
    country: entry.country,
    ...(entry.memberId ? { memberId: entry.memberId } : {}),
    ...(entry.isfPersonId ? { isfPersonId: entry.isfPersonId } : {}),
    ...(entry.instagram ? { instagram: entry.instagram } : {}),
  };

  const nomination: Nomination = {
    id: nominationIdForEntry(entry.id),
    athleteId: athlete.id,
    competitionFormat: entry.competitionFormat,
    disciplineCode: entry.disciplineCode,
    event: entry.event,
    day: entry.day,
    platform: entry.platform,
    flight: entry.flight,
    division: entry.division,
    ...(entry.team ? { team: entry.team } : {}),
    guest: entry.guest,
    ...(entry.notes ? { notes: entry.notes } : {}),
    bodyweightKg: entry.bodyweightKg,
    reweighKg: entry.reweighKg,
    ...(entry.assignedAgeCategoryCode
      ? { assignedAgeCategoryCode: entry.assignedAgeCategoryCode }
      : {}),
    ...(entry.assignedWeightCategoryCode
      ? { assignedWeightCategoryCode: entry.assignedWeightCategoryCode }
      : {}),
    exercises: entry.exercises,
  };

  return { athlete, nomination };
}

export function syncIdentityFromEntries(entries: Entry[]): {
  athletes: Athlete[];
  nominations: Nomination[];
} {
  const pairs = entries.map(splitEntry);
  return {
    athletes: pairs.map((pair) => pair.athlete),
    nominations: pairs.map((pair) => pair.nomination),
  };
}
