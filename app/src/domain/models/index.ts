/** Public domain-model exports. */

export type {
  CompetitionFormat,
  Exercise,
  Event,
  Division,
  Sex,
  ResultUnit,
  FormulaCode,
  AttemptStatus,
} from "./enums";

export type { JudgeVote, JudgeVotes } from "./judge-votes";
export { PENDING_VOTES } from "./judge-votes";

export type { AgeCategoryCode, AgeCategory } from "./age-category";
export type { WeightCategory } from "./weight-category";
export type { DisciplineCode, Discipline } from "./discipline";
export type { Plate } from "./plate";

export type {
  ClassicAttempt,
  MultirepAttempt,
  ExerciseResult,
} from "./attempts";

export type { Entry } from "./entry";
export type {
  MeetState,
  ClassicLoadConfig,
  MultirepConfig,
  MultirepPreset,
  ScoringFormula,
} from "./meet-state";

export type {
  CalculatedResult,
  ForecastResult,
  IsfPointBreakdown,
} from "./calculated-result";

export type {
  SaveFile,
  CurrentStateVersion,
  RegistrationState,
  JudgingState,
  UIState,
  LicenseEnvelope,
  SaveFileSignature,
} from "./save-file";
