/**
 * JudgingPage — Sprint 2 (Classic) + Sprint 3 (Multirep) judging screen.
 *
 * Top-level format selector (Classic | Multirep) routes to the appropriate
 * panel. Per blueprint v2 §11.6 + §16, both panels share the left/right grid
 * (queue + active card) but Multirep uses a single attempt with reps + 120s
 * timer (ISF v5.1 §7.5.1) and an auto-resolved preset load (ISF v5.1 §2.2).
 *
 * Route guard: handled by RequireMeet in App.tsx.
 */

import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Container,
  Grid,
  Stack,
  Title,
  Text,
  Group,
  Badge,
  Button,
  Card,
  Tabs,
  NumberInput,
  Alert,
  SegmentedControl,
} from "@mantine/core";
import { useAppDispatch, useAppSelector } from "@store/index";
import {
  startTimer,
  stopTimer,
  tickTimer,
  castVote,
  resetVote,
  clearPendingVotes,
  setPendingReps,
} from "@store/judging-slice";
import {
  commitAttemptVotes,
  commitMultirepAttempt,
  updateJudgingState,
} from "@store/meet-slice";
import { selectEntries } from "@store/registration-slice";
import {
  buildAttemptQueue,
  getActiveItem,
} from "@logic/isf/attempt-queue";
import {
  buildMultirepQueue,
  getActiveMultirepItem,
} from "@logic/isf/multirep-queue";
import { resolveMultirepPreset } from "@logic/isf/multirep-resolver";
import { ageInYears, resolveAgeCategory } from "@logic/isf/age";
import { ISF_V51_AGE_CATEGORIES } from "@domain/presets";
import { attemptStatusFromVotes, isSplitDecision } from "@logic/isf/judge-votes";
import type { JudgeVotes, Entry, AgeCategoryCode } from "@domain/models";
import { JudgeVoteCard } from "@components/judge-vote-card/JudgeVoteCard";
import { TimerDisplay } from "@components/timer-display/TimerDisplay";

type Format = "classic" | "multirep";

function resolveAgeCatCode(
  entry: Entry,
  meetDate: string,
): AgeCategoryCode | null {
  if (entry.assignedAgeCategoryCode) return entry.assignedAgeCategoryCode;
  let age: number | null = null;
  if (entry.ageOverride !== null) age = entry.ageOverride;
  else if (entry.birthDate !== null) age = ageInYears(entry.birthDate, meetDate);
  if (age === null) return null;
  const cat = resolveAgeCategory(age, ISF_V51_AGE_CATEGORIES);
  return cat ? cat.code : null;
}

// ─── Main page ───────────────────────────────────────────────────────────

export function JudgingPage() {
  const { t } = useTranslation();
  const meet = useAppSelector((s) => s.meet.current);
  const entries = useAppSelector(selectEntries);

  const hasClassic = entries.some((e) => e.competitionFormat === "classic");
  const hasMultirep = entries.some((e) => e.competitionFormat === "multirep");

  const defaultFormat: Format = hasClassic ? "classic" : hasMultirep ? "multirep" : "classic";
  const [format, setFormat] = useState<Format>(defaultFormat);

  // Reset format when entry-set changes from one to the other.
  useEffect(() => {
    if (format === "classic" && !hasClassic && hasMultirep) setFormat("multirep");
    if (format === "multirep" && !hasMultirep && hasClassic) setFormat("classic");
  }, [format, hasClassic, hasMultirep]);

  if (!meet) return null;

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={2}>{t("judging.title")}</Title>
          {hasClassic && hasMultirep && (
            <SegmentedControl
              value={format}
              onChange={(v) => {
                if (v === "classic" || v === "multirep") setFormat(v);
              }}
              data={[
                { label: t("judging.format.classic"), value: "classic" },
                { label: t("judging.format.multirep"), value: "multirep" },
              ]}
            />
          )}
        </Group>

        {format === "classic" ? (
          <ClassicJudgingPanel />
        ) : (
          <MultirepJudgingPanel />
        )}
      </Stack>
    </Container>
  );
}

// ─── Shared timer-tick effect helper ──────────────────────────────────────

function useTimerTick(timerRunning: boolean, timerSecondsLeft: number) {
  const dispatch = useAppDispatch();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearIv = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        dispatch(tickTimer());
      }, 1000);
    } else {
      clearIv();
    }
    return clearIv;
  }, [timerRunning, dispatch, clearIv]);

  // Beep on hitting zero.
  const prev = useRef(timerRunning);
  useEffect(() => {
    if (prev.current && !timerRunning && timerSecondsLeft === 0) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 880;
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch {
        // Web Audio missing — ignore.
      }
    }
    prev.current = timerRunning;
  }, [timerRunning, timerSecondsLeft]);
}

// ─── Classic panel ────────────────────────────────────────────────────────

function ClassicJudgingPanel() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const meet = useAppSelector((s) => s.meet.current);
  const entries = useAppSelector(selectEntries);
  const judging = useAppSelector((s) => s.judging);

  const enabledDisciplines = meet?.meet.enabledDisciplineCodes ?? [];
  const hasPU =
    enabledDisciplines.some((c) => c.includes("pu") || c === "classic_2lift") ||
    entries.some((e) => e.event === "PU" || e.event === "PUDI");
  const hasDI =
    enabledDisciplines.some((c) => c.includes("di") || c === "classic_2lift") ||
    entries.some((e) => e.event === "DI" || e.event === "PUDI");

  const defaultExercise: "PU" | "DI" = hasPU ? "PU" : "DI";
  const [activeExercise, setActiveExercise] = useState<"PU" | "DI">(defaultExercise);

  const lowerBWFirst = meet?.meet.lowerBodyweightFirstTiebreak ?? true;
  const defaultDuration = meet?.meet.classicLoadConfig?.defaultAttemptDurationSec ?? 60;

  const savedActiveEntryIndex = meet?.judging.activeEntryIndex ?? null;
  const savedActiveAttemptSequence = meet?.judging.activeAttemptSequence ?? null;

  const queue = buildAttemptQueue(entries, activeExercise, lowerBWFirst);
  const activeItem = getActiveItem(
    entries,
    activeExercise,
    savedActiveEntryIndex,
    savedActiveAttemptSequence,
    lowerBWFirst,
  );

  useTimerTick(judging.timerRunning, judging.timerSecondsLeft);

  function handleStartTimer() {
    dispatch(startTimer(defaultDuration));
  }
  function handleStopTimer() {
    dispatch(stopTimer());
  }
  function handleCastVote(judge: "left" | "center" | "right", value: boolean) {
    dispatch(castVote({ judge, value }));
  }
  function handleResetVote(judge: "left" | "center" | "right") {
    dispatch(resetVote({ judge }));
  }
  function handleAllGood() {
    dispatch(castVote({ judge: "left", value: true }));
    dispatch(castVote({ judge: "center", value: true }));
    dispatch(castVote({ judge: "right", value: true }));
  }
  function handleAllNo() {
    dispatch(castVote({ judge: "left", value: false }));
    dispatch(castVote({ judge: "center", value: false }));
    dispatch(castVote({ judge: "right", value: false }));
  }

  function getNextItem(after: typeof activeItem) {
    if (!after) return queue[0] ?? null;
    const idx = queue.findIndex(
      (item) =>
        item.entryIndex === after.entryIndex && item.sequence === after.sequence,
    );
    return queue[idx + 1] ?? queue[0] ?? null;
  }

  function advanceQueue(after: typeof activeItem) {
    const next = getNextItem(after);
    if (next) {
      dispatch(
        updateJudgingState({
          activeEntryIndex: next.entryIndex,
          activeAttemptSequence: next.sequence,
        }),
      );
    } else {
      dispatch(updateJudgingState({ activeEntryIndex: null, activeAttemptSequence: null }));
    }
    dispatch(clearPendingVotes());
    dispatch(stopTimer());
  }

  function handleConfirm() {
    if (!activeItem) return;
    const votes: JudgeVotes = {
      left: judging.pendingLeft,
      center: judging.pendingCenter,
      right: judging.pendingRight,
    };
    dispatch(
      commitAttemptVotes({
        entryIndex: activeItem.entryIndex,
        exercise: activeItem.exercise,
        sequence: activeItem.sequence,
        votes,
        ...(activeItem.attempt?.declaredLoadKg !== undefined &&
        activeItem.attempt.declaredLoadKg !== null
          ? { declaredLoadKg: activeItem.attempt.declaredLoadKg }
          : {}),
        lastDeclarationAt: new Date().toISOString(),
      }),
    );
    advanceQueue(activeItem);
  }

  function handleSkip() {
    advanceQueue(activeItem);
  }

  const pendingVotes: JudgeVotes = {
    left: judging.pendingLeft,
    center: judging.pendingCenter,
    right: judging.pendingRight,
  };
  const currentStatus = attemptStatusFromVotes(pendingVotes);
  const isSplit = isSplitDecision(pendingVotes);

  const next5 = queue.slice(0, 5);

  return (
    <Stack gap="md">
      <Group gap="xs">
        <Tabs
          value={activeExercise}
          onChange={(v) => {
            if (v === "PU" || v === "DI") {
              setActiveExercise(v);
              dispatch(clearPendingVotes());
              dispatch(stopTimer());
            }
          }}
        >
          <Tabs.List>
            {hasPU && <Tabs.Tab value="PU">{t("judging.exercisePU")}</Tabs.Tab>}
            {hasDI && <Tabs.Tab value="DI">{t("judging.exerciseDI")}</Tabs.Tab>}
          </Tabs.List>
        </Tabs>
      </Group>

      {queue.length === 0 && entries.length === 0 ? (
        <Card withBorder>
          <Text c="dimmed">{t("judging.noEntries")}</Text>
        </Card>
      ) : queue.length === 0 ? (
        <Card withBorder>
          <Text c="dimmed">{t("judging.allDone")}</Text>
        </Card>
      ) : (
        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder h="100%">
              <Stack gap="xs">
                <Text fw={600}>{t("judging.queue.title")}</Text>
                {next5.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    {t("judging.queue.empty")}
                  </Text>
                ) : (
                  next5.map((item, i) => {
                    const isActive =
                      activeItem &&
                      item.entryIndex === activeItem.entryIndex &&
                      item.sequence === activeItem.sequence;
                    return (
                      <Card
                        key={`${item.entryIndex}-${item.sequence}`}
                        withBorder
                        p="xs"
                        style={{
                          background: isActive
                            ? "var(--mantine-color-blue-light)"
                            : undefined,
                          borderColor: isActive
                            ? "var(--mantine-color-blue-5)"
                            : undefined,
                        }}
                      >
                        <Group justify="space-between" gap="xs">
                          <Stack gap={0}>
                            <Text size="sm" fw={isActive ? 700 : 400}>
                              {i === 0 && isActive
                                ? `▶ ${item.entry.name}`
                                : item.entry.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {item.entry.bodyweightKg !== null
                                ? `${item.entry.bodyweightKg} kg`
                                : "—"}
                            </Text>
                          </Stack>
                          <Group gap="xs">
                            <Badge size="sm" color="blue" variant="light">
                              {t("judging.round")} {item.sequence}
                            </Badge>
                            {item.attempt?.declaredLoadKg !== null &&
                            item.attempt?.declaredLoadKg !== undefined ? (
                              <Badge size="sm" color="teal" variant="outline">
                                {item.attempt.declaredLoadKg} kg
                              </Badge>
                            ) : (
                              <Badge size="sm" color="gray" variant="outline">
                                —
                              </Badge>
                            )}
                          </Group>
                        </Group>
                      </Card>
                    );
                  })
                )}
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 8 }}>
            {activeItem ? (
              <Card withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Stack gap={0}>
                      <Title order={3}>{activeItem.entry.name}</Title>
                      <Text size="sm" c="dimmed">
                        {activeItem.entry.division} ·{" "}
                        {activeItem.entry.bodyweightKg !== null
                          ? `${activeItem.entry.bodyweightKg} kg`
                          : "—"}
                      </Text>
                    </Stack>
                    <Group gap="xs">
                      <Badge size="lg" color="blue">
                        {t("judging.round")} {activeItem.sequence}
                      </Badge>
                      {activeItem.attempt?.declaredLoadKg !== null &&
                      activeItem.attempt?.declaredLoadKg !== undefined ? (
                        <Badge size="lg" color="teal">
                          {activeItem.attempt.declaredLoadKg} kg
                        </Badge>
                      ) : null}
                    </Group>
                  </Group>

                  <Group justify="center" gap="md">
                    <TimerDisplay
                      secondsLeft={judging.timerSecondsLeft}
                      totalSeconds={defaultDuration}
                      running={judging.timerRunning}
                    />
                    <Stack gap="xs">
                      <Button
                        color="green"
                        onClick={handleStartTimer}
                        disabled={judging.timerRunning}
                      >
                        {t("judging.timer.start")}
                      </Button>
                      <Button
                        color="gray"
                        variant="outline"
                        onClick={handleStopTimer}
                        disabled={!judging.timerRunning}
                      >
                        {t("judging.timer.stop")}
                      </Button>
                    </Stack>
                  </Group>

                  <Group justify="center" gap="xl">
                    <JudgeVoteCard
                      judgeLabel={t("judging.votes.left")}
                      vote={judging.pendingLeft}
                      onVote={(v) => handleCastVote("left", v)}
                      onReset={() => handleResetVote("left")}
                    />
                    <JudgeVoteCard
                      judgeLabel={t("judging.votes.center")}
                      vote={judging.pendingCenter}
                      onVote={(v) => handleCastVote("center", v)}
                      onReset={() => handleResetVote("center")}
                    />
                    <JudgeVoteCard
                      judgeLabel={t("judging.votes.right")}
                      vote={judging.pendingRight}
                      onVote={(v) => handleCastVote("right", v)}
                      onReset={() => handleResetVote("right")}
                    />
                  </Group>

                  <Group justify="center" gap="sm">
                    <Badge
                      size="xl"
                      color={
                        currentStatus === "success"
                          ? "green"
                          : currentStatus === "fail"
                            ? "red"
                            : "gray"
                      }
                    >
                      {currentStatus === "success"
                        ? t("judging.status.success")
                        : currentStatus === "fail"
                          ? t("judging.status.fail")
                          : t("judging.status.pending")}
                    </Badge>
                    {isSplit && (
                      <Badge size="xl" color="orange" variant="outline">
                        {t("judging.status.split")}
                      </Badge>
                    )}
                  </Group>

                  <Group justify="center" gap="md">
                    <Button color="green" variant="light" onClick={handleAllGood}>
                      {t("judging.votes.allGood")}
                    </Button>
                    <Button color="red" variant="light" onClick={handleAllNo}>
                      {t("judging.votes.allNo")}
                    </Button>
                  </Group>

                  <Stack gap="xs">
                    <Button
                      size="lg"
                      color="blue"
                      onClick={handleConfirm}
                      disabled={currentStatus === "pending"}
                    >
                      {t("judging.confirm")}
                    </Button>
                    <Button size="sm" variant="subtle" color="gray" onClick={handleSkip}>
                      {t("judging.skip")}
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            ) : (
              <Card withBorder>
                <Text c="dimmed">{t("judging.queue.empty")}</Text>
              </Card>
            )}
          </Grid.Col>
        </Grid>
      )}
    </Stack>
  );
}

// ─── Multirep panel ───────────────────────────────────────────────────────

function MultirepJudgingPanel() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const meet = useAppSelector((s) => s.meet.current);
  const entries = useAppSelector(selectEntries);
  const judging = useAppSelector((s) => s.judging);

  const meetDate = meet?.meet.date ?? new Date().toISOString().slice(0, 10);
  const presets = useMemo(
    () => meet?.meet.multirepConfig?.presetLoads ?? [],
    [meet],
  );

  const hasMultirepPU = entries.some(
    (e) => e.competitionFormat === "multirep" && (e.event === "PU" || e.event === "PUDI"),
  );
  const hasMultirepDI = entries.some(
    (e) => e.competitionFormat === "multirep" && (e.event === "DI" || e.event === "PUDI"),
  );

  const defaultExercise: "PU" | "DI" = hasMultirepPU ? "PU" : "DI";
  const [activeExercise, setActiveExercise] = useState<"PU" | "DI">(defaultExercise);

  const defaultDuration = meet?.meet.multirepConfig?.defaultAttemptDurationSec ?? 120;

  const savedActiveEntryIndex = meet?.judging.activeEntryIndex ?? null;

  const queue = buildMultirepQueue(entries, activeExercise);
  const activeItem = getActiveMultirepItem(entries, activeExercise, savedActiveEntryIndex);

  useTimerTick(judging.timerRunning, judging.timerSecondsLeft);

  // Manual override load when no preset matches.
  const [manualLoadKg, setManualLoadKg] = useState<number | null>(null);

  // Reset manual override when active item changes.
  const lastActiveKey = useRef<string | null>(null);
  useEffect(() => {
    const key = activeItem ? `${activeItem.entryIndex}-${activeExercise}` : null;
    if (key !== lastActiveKey.current) {
      setManualLoadKg(null);
      lastActiveKey.current = key;
    }
  }, [activeItem, activeExercise]);

  const ageCatCode = useMemo(() => {
    if (!activeItem) return null;
    return resolveAgeCatCode(activeItem.entry, meetDate);
  }, [activeItem, meetDate]);

  const presetMatch = useMemo(() => {
    if (!activeItem) return null;
    return resolveMultirepPreset(activeItem.entry, activeExercise, presets, ageCatCode);
  }, [activeItem, activeExercise, presets, ageCatCode]);

  const effectiveLoadKg: number | null = useMemo(() => {
    if (manualLoadKg !== null) return manualLoadKg;
    if (presetMatch) return presetMatch.loadKg;
    return null;
  }, [manualLoadKg, presetMatch]);

  function handleStartTimer() {
    dispatch(startTimer(defaultDuration));
  }
  function handleStopTimer() {
    dispatch(stopTimer());
  }
  function handleCastVote(judge: "left" | "center" | "right", value: boolean) {
    dispatch(castVote({ judge, value }));
  }
  function handleResetVote(judge: "left" | "center" | "right") {
    dispatch(resetVote({ judge }));
  }
  function handleAllGood() {
    dispatch(castVote({ judge: "left", value: true }));
    dispatch(castVote({ judge: "center", value: true }));
    dispatch(castVote({ judge: "right", value: true }));
  }
  function handleAllNo() {
    dispatch(castVote({ judge: "left", value: false }));
    dispatch(castVote({ judge: "center", value: false }));
    dispatch(castVote({ judge: "right", value: false }));
  }

  function getNextItem(after: typeof activeItem) {
    if (!after) return queue[0] ?? null;
    const idx = queue.findIndex((item) => item.entryIndex === after.entryIndex);
    return queue[idx + 1] ?? queue[0] ?? null;
  }

  function advanceQueue(after: typeof activeItem) {
    const next = getNextItem(after);
    if (next) {
      dispatch(
        updateJudgingState({
          activeEntryIndex: next.entryIndex,
          activeAttemptSequence: 1,
        }),
      );
    } else {
      dispatch(updateJudgingState({ activeEntryIndex: null, activeAttemptSequence: null }));
    }
    dispatch(clearPendingVotes());
    dispatch(stopTimer());
  }

  function handleConfirm() {
    if (!activeItem) return;
    if (judging.pendingReps === null) return;
    const votes: JudgeVotes = {
      left: judging.pendingLeft,
      center: judging.pendingCenter,
      right: judging.pendingRight,
    };
    dispatch(
      commitMultirepAttempt({
        entryIndex: activeItem.entryIndex,
        exercise: activeExercise,
        reps: judging.pendingReps,
        presetLoadKg: effectiveLoadKg,
        votes,
      }),
    );
    advanceQueue(activeItem);
  }

  function handleSkip() {
    advanceQueue(activeItem);
  }

  const pendingVotes: JudgeVotes = {
    left: judging.pendingLeft,
    center: judging.pendingCenter,
    right: judging.pendingRight,
  };
  const currentStatus = attemptStatusFromVotes(pendingVotes);
  const isSplit = isSplitDecision(pendingVotes);

  const next5 = queue.slice(0, 5);

  return (
    <Stack gap="md">
      <Group gap="xs">
        <Tabs
          value={activeExercise}
          onChange={(v) => {
            if (v === "PU" || v === "DI") {
              setActiveExercise(v);
              dispatch(clearPendingVotes());
              dispatch(stopTimer());
              setManualLoadKg(null);
            }
          }}
        >
          <Tabs.List>
            {hasMultirepPU && <Tabs.Tab value="PU">{t("judging.exercisePU")}</Tabs.Tab>}
            {hasMultirepDI && <Tabs.Tab value="DI">{t("judging.exerciseDI")}</Tabs.Tab>}
          </Tabs.List>
        </Tabs>
      </Group>

      {queue.length === 0 && entries.length === 0 ? (
        <Card withBorder>
          <Text c="dimmed">{t("judging.noEntries")}</Text>
        </Card>
      ) : queue.length === 0 ? (
        <Card withBorder>
          <Text c="dimmed">{t("judging.allDone")}</Text>
        </Card>
      ) : (
        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder h="100%">
              <Stack gap="xs">
                <Text fw={600}>{t("judging.queue.title")}</Text>
                {next5.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    {t("judging.queue.empty")}
                  </Text>
                ) : (
                  next5.map((item, i) => {
                    const isActive =
                      activeItem && item.entryIndex === activeItem.entryIndex;
                    return (
                      <Card
                        key={item.entryIndex}
                        withBorder
                        p="xs"
                        style={{
                          background: isActive
                            ? "var(--mantine-color-blue-light)"
                            : undefined,
                          borderColor: isActive
                            ? "var(--mantine-color-blue-5)"
                            : undefined,
                        }}
                      >
                        <Group justify="space-between" gap="xs">
                          <Stack gap={0}>
                            <Text size="sm" fw={isActive ? 700 : 400}>
                              {i === 0 && isActive
                                ? `▶ ${item.entry.name}`
                                : item.entry.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {item.entry.bodyweightKg !== null
                                ? `${item.entry.bodyweightKg} kg`
                                : "—"}
                            </Text>
                          </Stack>
                        </Group>
                      </Card>
                    );
                  })
                )}
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 8 }}>
            {activeItem ? (
              <Card withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Stack gap={0}>
                      <Title order={3}>{activeItem.entry.name}</Title>
                      <Text size="sm" c="dimmed">
                        {activeItem.entry.division} ·{" "}
                        {activeItem.entry.bodyweightKg !== null
                          ? `${activeItem.entry.bodyweightKg} kg`
                          : "—"}{" "}
                        · {ageCatCode ?? "—"}
                      </Text>
                    </Stack>
                    <Group gap="xs">
                      {effectiveLoadKg !== null ? (
                        <Badge size="lg" color="teal">
                          {t("judging.multirep.presetLoad")}: {effectiveLoadKg} kg
                        </Badge>
                      ) : (
                        <Badge size="lg" color="orange" variant="outline">
                          {t("judging.multirep.noPreset")}
                        </Badge>
                      )}
                    </Group>
                  </Group>

                  {presetMatch === null && (
                    <Alert color="orange" variant="light">
                      <Stack gap="xs">
                        <Text size="sm">{t("judging.multirep.noPreset")}</Text>
                        <NumberInput
                          label={t("judging.multirep.overrideLoad")}
                          value={manualLoadKg ?? ""}
                          onChange={(v) => {
                            if (v === "") {
                              setManualLoadKg(null);
                              return;
                            }
                            const num = typeof v === "number" ? v : Number(v);
                            setManualLoadKg(Number.isFinite(num) ? num : null);
                          }}
                          min={0}
                          step={0.5}
                          decimalScale={1}
                        />
                      </Stack>
                    </Alert>
                  )}

                  <Group justify="center" gap="md">
                    <TimerDisplay
                      secondsLeft={judging.timerSecondsLeft}
                      totalSeconds={defaultDuration}
                      running={judging.timerRunning}
                    />
                    <Stack gap="xs">
                      <Button
                        color="green"
                        onClick={handleStartTimer}
                        disabled={judging.timerRunning}
                      >
                        {t("judging.timer.start")}
                      </Button>
                      <Button
                        color="gray"
                        variant="outline"
                        onClick={handleStopTimer}
                        disabled={!judging.timerRunning}
                      >
                        {t("judging.timer.stop")}
                      </Button>
                    </Stack>
                  </Group>

                  <NumberInput
                    label={t("judging.multirep.repsLabel")}
                    placeholder={t("judging.multirep.repsPlaceholder")}
                    value={judging.pendingReps ?? ""}
                    onChange={(v) => {
                      if (v === "") {
                        dispatch(setPendingReps(null));
                        return;
                      }
                      const num = typeof v === "number" ? v : Number(v);
                      if (Number.isFinite(num)) {
                        dispatch(setPendingReps(Math.floor(num)));
                      }
                    }}
                    min={0}
                    max={200}
                    step={1}
                    decimalScale={0}
                    allowDecimal={false}
                    size="md"
                  />

                  <Group justify="center" gap="xl">
                    <JudgeVoteCard
                      judgeLabel={t("judging.votes.left")}
                      vote={judging.pendingLeft}
                      onVote={(v) => handleCastVote("left", v)}
                      onReset={() => handleResetVote("left")}
                    />
                    <JudgeVoteCard
                      judgeLabel={t("judging.votes.center")}
                      vote={judging.pendingCenter}
                      onVote={(v) => handleCastVote("center", v)}
                      onReset={() => handleResetVote("center")}
                    />
                    <JudgeVoteCard
                      judgeLabel={t("judging.votes.right")}
                      vote={judging.pendingRight}
                      onVote={(v) => handleCastVote("right", v)}
                      onReset={() => handleResetVote("right")}
                    />
                  </Group>

                  <Group justify="center" gap="sm">
                    <Badge
                      size="xl"
                      color={
                        currentStatus === "success"
                          ? "green"
                          : currentStatus === "fail"
                            ? "red"
                            : "gray"
                      }
                    >
                      {currentStatus === "success"
                        ? t("judging.status.success")
                        : currentStatus === "fail"
                          ? t("judging.status.fail")
                          : t("judging.status.pending")}
                    </Badge>
                    {isSplit && (
                      <Badge size="xl" color="orange" variant="outline">
                        {t("judging.status.split")}
                      </Badge>
                    )}
                  </Group>

                  <Group justify="center" gap="md">
                    <Button color="green" variant="light" onClick={handleAllGood}>
                      {t("judging.votes.allGood")}
                    </Button>
                    <Button color="red" variant="light" onClick={handleAllNo}>
                      {t("judging.votes.allNo")}
                    </Button>
                  </Group>

                  <Stack gap="xs">
                    <Button
                      size="lg"
                      color="blue"
                      onClick={handleConfirm}
                      disabled={
                        currentStatus === "pending" || judging.pendingReps === null
                      }
                    >
                      {t("judging.confirm")}
                    </Button>
                    <Button size="sm" variant="subtle" color="gray" onClick={handleSkip}>
                      {t("judging.skip")}
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            ) : (
              <Card withBorder>
                <Text c="dimmed">{t("judging.queue.empty")}</Text>
              </Card>
            )}
          </Grid.Col>
        </Grid>
      )}
    </Stack>
  );
}

export default JudgingPage;
