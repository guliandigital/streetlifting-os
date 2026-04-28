/**
 * Meet slice — Sprint 1 baseline. Holds the current SaveFile (or null) in memory.
 *
 * V2 will split this into multiple slices (registration, judging, ui) — for V1
 * we keep one slice with all sub-states for simplicity.
 *
 * Sprint 1 §5 + §6: extraReducers wire registration-slice actions into
 * `state.current.registration`. The registration slice is a thin facade —
 * mutations happen here.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  SaveFile,
  JudgeVotes,
  Plate,
  WeightCategory,
  AgeCategory,
  CompetitionFormat,
  ScoringFormula,
  DisciplineCode,
} from "@domain/models";
import { PENDING_VOTES } from "@domain/models";
import {
  ISF_V51_AGE_CATEGORIES,
  ISF_V51_WEIGHT_CATEGORIES,
  ISF_V51_DEFAULT_PLATES,
  ISF_V51_MULTIREP_PRESETS,
  ISF_V51_DISCIPLINES,
} from "@domain/presets";
import { CURRENT_STATE_VERSION, APP_RELEASE_VERSION } from "@/persistence";
import {
  addEntry,
  updateEntry,
  removeEntry,
  setBodyweight,
  setReweigh,
  confirmWeighIn,
  bulkImportEntries,
  applyLotAssignment,
  registrationHelpers,
} from "./registration-slice";

export type MeetSliceState = {
  /** null = no meet loaded; user has only Home page accessible. */
  current: SaveFile | null;
  /** Path on disk if loaded from a file (Tauri only); null in browser. */
  filePath: string | null;
  /** Set when meet has unsaved changes. */
  dirty: boolean;
};

const initialState: MeetSliceState = {
  current: null,
  filePath: null,
  dirty: false,
};

/**
 * Build a fresh empty meet using ISF v5.1 presets.
 * Operator can adjust everything in Meet Setup screen later.
 */
function buildNewMeet(): SaveFile {
  const today = new Date().toISOString().slice(0, 10);
  return {
    versions: {
      stateVersion: CURRENT_STATE_VERSION,
      releaseVersion: APP_RELEASE_VERSION,
    },
    meet: {
      name: "",
      federation: "ISF",
      country: "",
      state: "",
      city: "",
      date: today,
      competitionFormat: "classic",
      enabledDisciplineCodes: [
        "classic_2lift",
        "classic_pu",
        "classic_di",
      ],
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

const meetSlice = createSlice({
  name: "meet",
  initialState,
  reducers: {
    newMeet(state) {
      state.current = buildNewMeet();
      state.filePath = null;
      state.dirty = true;
    },
    loadMeet(
      state,
      action: PayloadAction<{ saveFile: SaveFile; filePath?: string }>,
    ) {
      state.current = action.payload.saveFile;
      state.filePath = action.payload.filePath ?? null;
      state.dirty = false;
    },
    markSaved(state, action: PayloadAction<{ filePath?: string }>) {
      state.dirty = false;
      if (action.payload.filePath) state.filePath = action.payload.filePath;
    },
    closeMeet(state) {
      state.current = null;
      state.filePath = null;
      state.dirty = false;
    },

    /**
     * Update the persisted judging position (activeEntryIndex, activeAttemptSequence).
     * Called by JudgingPage when advancing to the next item.
     */
    updateJudgingState(
      state,
      action: PayloadAction<{
        activeEntryIndex: number | null;
        activeAttemptSequence: 1 | 2 | 3 | 4 | null;
      }>,
    ) {
      if (!state.current) return;
      state.current.judging.activeEntryIndex = action.payload.activeEntryIndex;
      state.current.judging.activeAttemptSequence =
        action.payload.activeAttemptSequence;
      state.dirty = true;
    },

    /**
     * Write judge votes (and optionally a declared load) for one attempt.
     * Creates the attempt object if it doesn't exist yet.
     * This is the primary "commit result" action for Classic judging.
     */
    commitAttemptVotes(
      state,
      action: PayloadAction<{
        entryIndex: number;
        exercise: "PU" | "DI";
        sequence: 1 | 2 | 3;
        votes: JudgeVotes;
        declaredLoadKg?: number;
        lastDeclarationAt?: string;
      }>,
    ) {
      if (!state.current) return;
      const { entryIndex, exercise, sequence, votes, declaredLoadKg, lastDeclarationAt } =
        action.payload;
      const entries = state.current.registration.entries;
      const entry = entries[entryIndex];
      if (!entry) return;

      // Ensure the exercise result exists with classic format.
      if (!entry.exercises[exercise]) {
        entry.exercises[exercise] = {
          format: "classic",
          exercise,
          attempts: [],
        };
      }
      const ex = entry.exercises[exercise];
      if (ex.format !== "classic") return;

      // Find or create the attempt for this sequence.
      let att = ex.attempts.find((a) => a.sequence === sequence);
      if (!att) {
        att = {
          sequence,
          declaredLoadKg: declaredLoadKg ?? null,
          judgeVotes: { ...PENDING_VOTES },
          lastDeclarationAt: lastDeclarationAt ?? null,
          changesUsedInRound: 0,
        };
        ex.attempts.push(att);
      }

      att.judgeVotes = votes;
      if (declaredLoadKg !== undefined) {
        att.declaredLoadKg = declaredLoadKg;
      }
      if (lastDeclarationAt !== undefined) {
        att.lastDeclarationAt = lastDeclarationAt;
      }

      state.dirty = true;
    },

    /**
     * Merge-patch the basic meet metadata fields.
     * Only provided keys are updated; dirty=true.
     */
    updateMeetBasics(
      state,
      action: PayloadAction<{
        name?: string;
        federation?: string;
        country?: string;
        state?: string;
        city?: string;
        date?: string;
        competitionFormat?: CompetitionFormat;
        formula?: ScoringFormula;
        useMastersAdjustment?: boolean;
        lowerBodyweightFirstTiebreak?: boolean;
      }>,
    ) {
      if (!state.current) return;
      const m = state.current.meet;
      const p = action.payload;
      if (p.name !== undefined) m.name = p.name;
      if (p.federation !== undefined) m.federation = p.federation;
      if (p.country !== undefined) m.country = p.country;
      if (p.state !== undefined) m.state = p.state;
      if (p.city !== undefined) m.city = p.city;
      if (p.date !== undefined) m.date = p.date;
      if (p.competitionFormat !== undefined) m.competitionFormat = p.competitionFormat;
      if (p.formula !== undefined) m.formula = p.formula;
      if (p.useMastersAdjustment !== undefined) m.useMastersAdjustment = p.useMastersAdjustment;
      if (p.lowerBodyweightFirstTiebreak !== undefined) m.lowerBodyweightFirstTiebreak = p.lowerBodyweightFirstTiebreak;
      state.dirty = true;
    },

    /**
     * Toggle a discipline code: add if absent, remove if present.
     */
    toggleDisciplineCode(state, action: PayloadAction<DisciplineCode>) {
      if (!state.current) return;
      const codes = state.current.meet.enabledDisciplineCodes;
      const idx = codes.indexOf(action.payload);
      if (idx === -1) {
        codes.push(action.payload);
      } else {
        codes.splice(idx, 1);
      }
      state.dirty = true;
    },

    /**
     * Replace the full list of enabled discipline codes.
     */
    setEnabledDisciplineCodes(state, action: PayloadAction<DisciplineCode[]>) {
      if (!state.current) return;
      state.current.meet.enabledDisciplineCodes = [...action.payload];
      state.dirty = true;
    },

    /**
     * Mutate a plate at the given index with the given patch.
     */
    updatePlate(
      state,
      action: PayloadAction<{ index: number; patch: Partial<Plate> }>,
    ) {
      if (!state.current) return;
      const plates = state.current.meet.classicLoadConfig?.plates;
      if (!plates) return;
      const { index, patch } = action.payload;
      if (index < 0 || index >= plates.length) return;
      const plate = plates[index];
      if (!plate) return;
      Object.assign(plate, patch);
      state.dirty = true;
    },

    /**
     * Append a new plate to classicLoadConfig.plates.
     */
    addPlate(state, action: PayloadAction<Plate>) {
      if (!state.current) return;
      const cfg = state.current.meet.classicLoadConfig;
      if (!cfg) return;
      cfg.plates.push({ ...action.payload });
      state.dirty = true;
    },

    /**
     * Remove the plate at the given index.
     */
    removePlate(state, action: PayloadAction<number>) {
      if (!state.current) return;
      const cfg = state.current.meet.classicLoadConfig;
      if (!cfg) return;
      const idx = action.payload;
      if (idx < 0 || idx >= cfg.plates.length) return;
      cfg.plates.splice(idx, 1);
      state.dirty = true;
    },

    /**
     * Replace the full list of weight categories.
     */
    setWeightCategories(state, action: PayloadAction<WeightCategory[]>) {
      if (!state.current) return;
      state.current.meet.weightCategories = [...action.payload];
      state.dirty = true;
    },

    /**
     * Replace the full list of age categories.
     */
    setAgeCategories(state, action: PayloadAction<AgeCategory[]>) {
      if (!state.current) return;
      state.current.meet.ageCategories = [...action.payload];
      state.dirty = true;
    },

    /**
     * Write reps + judgeVotes for a Multirep attempt.
     * Creates the attempt object if it doesn't exist yet (sequence always = 1).
     * Gets presetLoadKg from the ISF discipline catalog.
     */
    commitMultirepAttempt(
      state,
      action: PayloadAction<{
        entryIndex: number;
        exercise: "PU" | "DI";
        reps: number;
        votes: JudgeVotes;
        noRepCount?: number;
      }>,
    ) {
      if (!state.current) return;
      const { entryIndex, exercise, reps, votes, noRepCount } = action.payload;
      const entries = state.current.registration.entries;
      const entry = entries[entryIndex];
      if (!entry) return;

      // Look up presetLoadKg from discipline catalog
      const disc = ISF_V51_DISCIPLINES.find(
        (d) => d.code === entry.disciplineCode,
      );
      const presetLoadKg =
        disc?.presetLoadKg?.[exercise] ?? null;

      // Ensure the exercise result exists with multirep format
      if (!entry.exercises[exercise]) {
        entry.exercises[exercise] = {
          format: "multirep",
          exercise,
          attempts: [],
        };
      }
      const ex = entry.exercises[exercise];
      if (ex.format !== "multirep") return;

      // Find or create the single attempt (sequence = 1)
      let att = ex.attempts.find((a) => a.sequence === 1);
      if (!att) {
        att = {
          sequence: 1,
          presetLoadKg,
          reps: null,
          judgeVotes: { ...PENDING_VOTES },
          durationSec: state.current.meet.multirepConfig?.defaultAttemptDurationSec ?? 120,
        };
        ex.attempts.push(att);
      }

      att.reps = reps;
      att.judgeVotes = votes;
      if (noRepCount !== undefined) {
        att.noRepCount = noRepCount;
      }

      state.dirty = true;
    },
  },
  extraReducers: (builder) => {
    // ─── Registration CRUD (Sprint 1 §5) ────────────────────────────────
    builder
      .addCase(addEntry, (state, action) => {
        if (!state.current) return;
        const entry = registrationHelpers.buildEntry(action.payload);
        state.current.registration.entries.push(entry);
        state.current.registration.lastLotNumber += 1;
        state.dirty = true;
      })
      .addCase(updateEntry, (state, action) => {
        if (!state.current) return;
        const { id, patch } = action.payload;
        const list = state.current.registration.entries;
        const idx = list.findIndex((e) => e.id === id);
        if (idx === -1) return;
        const prev = list[idx];
        if (!prev) return;
        // Build a fresh entry from a merged draft so disciplineCode change
        // re-derives competitionFormat / event consistently.
        const draftMerged = {
          name: patch.name ?? prev.name,
          sex: patch.sex ?? prev.sex,
          birthDate: patch.birthDate ?? prev.birthDate,
          ageOverride: patch.ageOverride ?? prev.ageOverride,
          country:
            patch.country !== undefined ? patch.country : prev.country,
          division: patch.division ?? prev.division,
          disciplineCode: patch.disciplineCode ?? prev.disciplineCode,
          day: patch.day ?? prev.day,
          platform: patch.platform ?? prev.platform,
          flight: patch.flight ?? prev.flight,
          team: patch.team !== undefined ? patch.team : prev.team,
          memberId:
            patch.memberId !== undefined ? patch.memberId : prev.memberId,
          guest: patch.guest ?? prev.guest,
          instagram:
            patch.instagram !== undefined ? patch.instagram : prev.instagram,
          notes: patch.notes !== undefined ? patch.notes : prev.notes,
          bodyweightKg:
            patch.bodyweightKg !== undefined
              ? patch.bodyweightKg
              : prev.bodyweightKg,
          reweighKg:
            patch.reweighKg !== undefined ? patch.reweighKg : prev.reweighKg,
        };
        const meta = registrationHelpers.disciplineMeta(
          draftMerged.disciplineCode,
        );
        list[idx] = {
          ...prev,
          ...draftMerged,
          competitionFormat: meta.competitionFormat,
          event: meta.event,
        };
        state.dirty = true;
      })
      .addCase(removeEntry, (state, action) => {
        if (!state.current) return;
        const { id } = action.payload;
        state.current.registration.entries =
          state.current.registration.entries.filter((e) => e.id !== id);
        state.dirty = true;
      })
      .addCase(setBodyweight, (state, action) => {
        if (!state.current) return;
        const { id, bodyweightKg } = action.payload;
        const e = state.current.registration.entries.find((x) => x.id === id);
        if (!e) return;
        e.bodyweightKg = bodyweightKg;
        state.dirty = true;
      })
      .addCase(setReweigh, (state, action) => {
        if (!state.current) return;
        const { id, reweighKg } = action.payload;
        const e = state.current.registration.entries.find((x) => x.id === id);
        if (!e) return;
        e.reweighKg = reweighKg;
        state.dirty = true;
      })
      .addCase(confirmWeighIn, (state, action) => {
        if (!state.current) return;
        const { id, weightCategoryCode, ageCategoryCode } = action.payload;
        const e = state.current.registration.entries.find((x) => x.id === id);
        if (!e) return;
        if (weightCategoryCode === null) {
          delete e.assignedWeightCategoryCode;
        } else {
          e.assignedWeightCategoryCode = weightCategoryCode;
        }
        if (ageCategoryCode === null) {
          delete e.assignedAgeCategoryCode;
        } else {
          e.assignedAgeCategoryCode = ageCategoryCode;
        }
        state.dirty = true;
      })
      .addCase(bulkImportEntries, (state, action) => {
        if (!state.current) return;
        for (const draft of action.payload.drafts) {
          const entry = registrationHelpers.buildEntry(draft);
          state.current.registration.entries.push(entry);
          state.current.registration.lastLotNumber += 1;
        }
        state.dirty = true;
      })
      .addCase(applyLotAssignment, (state, action) => {
        if (!state.current) return;
        // We don't currently store lot-number on Entry (it's derived from the
        // entries[] order — see save-file v2 §10). Apply by re-ordering the
        // entries array per the lotByEntryId map; entries not in the map keep
        // their relative order at the tail.
        const { lotByEntryId, lastLotNumber } = action.payload;
        const list = state.current.registration.entries;
        const indexed = list.map((e, idx) => ({ e, idx }));
        indexed.sort((a, b) => {
          const la = lotByEntryId[a.e.id];
          const lb = lotByEntryId[b.e.id];
          if (la !== undefined && lb !== undefined) return la - lb;
          if (la !== undefined) return -1;
          if (lb !== undefined) return 1;
          return a.idx - b.idx;
        });
        state.current.registration.entries = indexed.map((x) => x.e);
        state.current.registration.lastLotNumber = lastLotNumber;
        state.dirty = true;
      });
  },
});

export const {
  newMeet,
  loadMeet,
  markSaved,
  closeMeet,
  updateJudgingState,
  commitAttemptVotes,
  commitMultirepAttempt,
  updateMeetBasics,
  toggleDisciplineCode,
  setEnabledDisciplineCodes,
  updatePlate,
  addPlate,
  removePlate,
  setWeightCategories,
  setAgeCategories,
} = meetSlice.actions;
export default meetSlice.reducer;
