/**
 * SaveFile fixtures for persistence tests.
 */

import type { SaveFile } from "@domain/models";
import {
  ISF_V51_AGE_CATEGORIES,
  ISF_V51_WEIGHT_CATEGORIES,
  ISF_V51_DEFAULT_PLATES,
  ISF_V51_MULTIREP_PRESETS,
  ISF_V51_RULES_PACK_REF,
} from "@domain/presets";

export function buildEmptyV2SaveFile(): SaveFile {
  return {
    versions: {
      stateVersion: "4",
      releaseVersion: "1.1.0",
    },
    meet: {
      name: "Test Meet",
      federation: "ISF",
      country: "RU",
      state: "",
      city: "Krasnodar",
      date: "2026-04-26",
      rulesPackRef: { ...ISF_V51_RULES_PACK_REF },
      competitionFormat: "classic",
      enabledDisciplineCodes: ["classic_2lift", "classic_pu", "classic_di"],
      divisions: ["amateur", "pro"],
      ageCategories: [...ISF_V51_AGE_CATEGORIES],
      weightCategories: [...ISF_V51_WEIGHT_CATEGORIES],
      formula: "ISF_POINTS",
      useMastersAdjustment: true,
      lowerBodyweightFirstTiebreak: true,
      inKg: true,
      showAlternateUnits: false,
      classicLoadConfig: {
        useBeltLoading: true,
        plates: [...ISF_V51_DEFAULT_PLATES],
        defaultAttemptDurationSec: 60,
      },
      multirepConfig: {
        defaultAttemptDurationSec: 120,
        presetLoads: [...ISF_V51_MULTIREP_PRESETS],
      },
    },
    registration: {
      athletes: [],
      nominations: [],
      entries: [],
      lastLotNumber: 0,
    },
    judging: {
      activeDisciplineIndex: 0,
      activeEntryIndex: null,
      activeAttemptSequence: null,
      attemptStartedAt: null,
    },
    ui: {
      locale: "ru-RU",
      workTableSortMode: "by_weight_cat_then_name",
      showForecastColumns: false,
    },
  };
}

export function buildSyntheticV3SaveFile(): unknown {
  const current = buildEmptyV2SaveFile();
  const meetWithoutRulesPack: Record<string, unknown> = { ...current.meet };
  delete meetWithoutRulesPack["rulesPackRef"];
  return {
    ...current,
    versions: {
      stateVersion: "3",
      releaseVersion: "1.1.0",
    },
    meet: meetWithoutRulesPack,
  };
}

/**
 * Build a raw legacy v2 save-file shape: valid v2 Entry projection, but no
 * Athlete/Nomination arrays. Used for v2→v3 migration tests.
 */
export function buildSyntheticV2SaveFile(): unknown {
  const current = buildEmptyV2SaveFile();
  return {
    ...current,
    versions: {
      stateVersion: "2",
      releaseVersion: "1.1.0",
    },
    registration: {
      entries: [
        {
          id: "ent-002",
          competitionFormat: "classic",
          disciplineCode: "classic_2lift",
          event: "PUDI",
          day: 1,
          platform: 1,
          flight: "A",
          name: "Petrov Petr",
          sex: "M",
          birthDate: "1992-03-04",
          ageOverride: null,
          division: "amateur",
          team: "Team A",
          memberId: "ISF-42",
          guest: false,
          instagram: "petrov",
          notes: "Seeded",
          country: "RU",
          bodyweightKg: 82.4,
          reweighKg: null,
          assignedAgeCategoryCode: "open",
          assignedWeightCategoryCode: "m_80_90",
          exercises: {},
        },
      ],
      lastLotNumber: 1,
    },
  };
}

/**
 * Build a synthetic legacy v1 save-file shape (with `status` instead of `judgeVotes`,
 * missing country/reweighKg/disciplineCode/etc.) for migration testing.
 *
 * Returns raw `unknown` because the v1 shape is not a valid current SaveFile.
 */
export function buildSyntheticV1SaveFile(): unknown {
  return {
    versions: {
      stateVersion: "1",
      releaseVersion: "0.0.1-pre",
    },
    meet: {
      name: "Legacy Meet",
      federation: "ISF",
      country: "RU",
      state: "",
      city: "Moscow",
      date: "2026-01-15",
      competitionFormat: "classic",
      divisions: ["amateur"],
      ageCategories: [],
      weightCategories: [],
      formula: "ISF_POINTS",
      useMastersAdjustment: true,
      inKg: true,
      showAlternateUnits: false,
      classicLoadConfig: {
        useBeltLoading: true,
        plates: [
          { weightKg: 25, pairCount: 4, color: "red" },
          { weightKg: 5, pairCount: 2, color: "white" },
        ],
        // no defaultAttemptDurationSec → migration adds 60
      },
    },
    registration: {
      entries: [
        {
          id: "ent-001",
          competitionFormat: "classic",
          // no disciplineCode → migration infers
          event: "PUDI",
          day: 1,
          platform: 1,
          flight: "A",
          name: "Иванов Иван",
          sex: "M",
          birthDate: "1990-05-01",
          ageOverride: null,
          division: "amateur",
          guest: false,
          // no country, no reweighKg → migration adds null
          bodyweightKg: 80,
          exercises: {
            PU: {
              format: "classic",
              exercise: "PU",
              attempts: [
                {
                  sequence: 1,
                  declaredLoadKg: 100,
                  status: "success", // legacy field
                  // no judgeVotes, no lastDeclarationAt, no changesUsedInRound
                },
                {
                  sequence: 2,
                  declaredLoadKg: 110,
                  status: "fail",
                },
                {
                  sequence: 3,
                  declaredLoadKg: 110,
                  status: "pending",
                },
              ],
            },
          },
        },
      ],
      lastLotNumber: 1,
    },
    judging: {
      activeDisciplineIndex: 0,
      activeEntryIndex: null,
      activeAttemptSequence: null,
      attemptStartedAt: null,
    },
    ui: {
      locale: "ru-RU",
      workTableSortMode: "by_weight_cat_then_name",
      showForecastColumns: false,
    },
  };
}
