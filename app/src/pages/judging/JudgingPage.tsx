/**
 * JudgingPage — Sprint 2 Classic + Sprint 3 Multirep judging screen.
 *
 * Blueprint v2 §11.6 layout:
 *   Left panel:  next 5 items in queue
 *   Right panel: active attempt with timer + judge vote cards + controls
 *
 * Route guard: handled by RequireMeet in App.tsx.
 */

import { useEffect, useRef, useCallback } from "react";
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
  Divider,
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
  getMultirepActiveItem,
} from "@logic/isf/multirep-queue";
import { attemptStatusFromVotes, isSplitDecision } from "@logic/isf/judge-votes";
import { ISF_V51_DISCIPLINES } from "@domain/presets";
import type { JudgeVotes } from "@domain/models";
import { JudgeVoteCard } from "@components/judge-vote-card/JudgeVoteCard";
import { TimerDisplay } from "@components/timer-display/TimerDisplay";

// ─── Tab value types ─────────────────────────────────────────────────────────

type ClassicTab = "PU" | "DI";
type ActiveTab = ClassicTab | `multirep_${string}`;

export function JudgingPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const meet = useAppSelector((s) => s.meet.current);
  const entries = useAppSelector(selectEntries);
  const judging = useAppSelector((s) => s.judging);

  // Which exercise tab is active — prefer first enabled exercise in meet config.
  const enabledDisciplines = meet?.meet.enabledDisciplineCodes ?? [];

  // Classic tabs
  const hasPU =
    enabledDisciplines.some((c) => c.includes("pu") || c === "classic_2lift") ||
    entries.some((e) => e.event === "PU" || e.event === "PUDI");
  const hasDI =
    enabledDisciplines.some((c) => c.includes("di") || c === "classic_2lift") ||
    entries.some((e) => e.event === "DI" || e.event === "PUDI");

  // Multirep tabs: enabled multirep discipline codes
  const enabledMultirepCodes = enabledDisciplines.filter((c) => {
    const disc = ISF_V51_DISCIPLINES.find((d) => d.code === c);
    return disc?.competitionFormat === "multirep";
  });

  const defaultExercise: "PU" | "DI" = hasPU ? "PU" : "DI";

  const [activeTab, setActiveTab] = useStateLazy<ActiveTab>(() =>
    defaultExercise,
  );

  const isMultirepTab = activeTab.startsWith("multirep_");
  const activeMultirepCode = isMultirepTab ? activeTab : null;

  const lowerBWFirst = meet?.meet.lowerBodyweightFirstTiebreak ?? true;
  const defaultClassicDuration =
    meet?.meet.classicLoadConfig?.defaultAttemptDurationSec ?? 60;
  const defaultMultirepDuration =
    meet?.meet.multirepConfig?.defaultAttemptDurationSec ?? 120;

  const defaultDuration = isMultirepTab
    ? defaultMultirepDuration
    : defaultClassicDuration;

  const savedActiveEntryIndex = meet?.judging.activeEntryIndex ?? null;
  const savedActiveAttemptSequence = meet?.judging.activeAttemptSequence ?? null;

  // Classic queue
  const classicExercise: "PU" | "DI" = isMultirepTab
    ? "PU"
    : (activeTab as "PU" | "DI");

  const classicQueue = buildAttemptQueue(entries, classicExercise, lowerBWFirst);
  const classicActiveItem = getActiveItem(
    entries,
    classicExercise,
    savedActiveEntryIndex,
    savedActiveAttemptSequence,
    lowerBWFirst,
  );

  // Multirep queue (filtered to the active multirep discipline code)
  const allMultirepQueue = buildMultirepQueue(entries, lowerBWFirst);
  const filteredMultirepQueue = activeMultirepCode
    ? allMultirepQueue.filter(
        (item) => item.entry.disciplineCode === activeMultirepCode,
      )
    : [];

  const multirepActiveItem = activeMultirepCode
    ? (getMultirepActiveItem(
        entries.filter((e) => e.disciplineCode === activeMultirepCode),
        savedActiveEntryIndex,
        lowerBWFirst,
      ) ?? null)
    : null;

  // Timer interval.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearInterval_ = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (judging.timerRunning) {
      intervalRef.current = setInterval(() => {
        dispatch(tickTimer());
      }, 1000);
    } else {
      clearInterval_();
    }
    return clearInterval_;
  }, [judging.timerRunning, dispatch, clearInterval_]);

  // Beep when timer hits 0.
  const prevRunning = useRef(judging.timerRunning);
  useEffect(() => {
    if (
      prevRunning.current &&
      !judging.timerRunning &&
      judging.timerSecondsLeft === 0
    ) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 880;
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch {
        // Ignore if Web Audio not available.
      }
    }
    prevRunning.current = judging.timerRunning;
  }, [judging.timerRunning, judging.timerSecondsLeft]);

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

  // ─── Classic queue helpers ──────────────────────────────────────────────────

  function getNextClassicItem(after: typeof classicActiveItem) {
    if (!after) return classicQueue[0] ?? null;
    const idx = classicQueue.findIndex(
      (item) =>
        item.entryIndex === after.entryIndex &&
        item.sequence === after.sequence,
    );
    return classicQueue[idx + 1] ?? classicQueue[0] ?? null;
  }

  function advanceClassicQueue(after: typeof classicActiveItem) {
    const next = getNextClassicItem(after);
    if (next) {
      dispatch(
        updateJudgingState({
          activeEntryIndex: next.entryIndex,
          activeAttemptSequence: next.sequence,
        }),
      );
    } else {
      dispatch(
        updateJudgingState({
          activeEntryIndex: null,
          activeAttemptSequence: null,
        }),
      );
    }
    dispatch(clearPendingVotes());
    dispatch(stopTimer());
  }

  function handleClassicConfirm() {
    if (!classicActiveItem) return;
    const votes: JudgeVotes = {
      left: judging.pendingLeft,
      center: judging.pendingCenter,
      right: judging.pendingRight,
    };
    dispatch(
      commitAttemptVotes({
        entryIndex: classicActiveItem.entryIndex,
        exercise: classicActiveItem.exercise,
        sequence: classicActiveItem.sequence,
        votes,
        ...(classicActiveItem.attempt?.declaredLoadKg !== undefined &&
        classicActiveItem.attempt.declaredLoadKg !== null
          ? { declaredLoadKg: classicActiveItem.attempt.declaredLoadKg }
          : {}),
        lastDeclarationAt: new Date().toISOString(),
      }),
    );
    advanceClassicQueue(classicActiveItem);
  }

  function handleClassicSkip() {
    advanceClassicQueue(classicActiveItem);
  }

  // ─── Multirep queue helpers ─────────────────────────────────────────────────

  function getNextMultirepItem(after: typeof multirepActiveItem) {
    if (!after) return filteredMultirepQueue[0] ?? null;
    const idx = filteredMultirepQueue.findIndex(
      (item) => item.entryIndex === after.entryIndex && item.exercise === after.exercise,
    );
    return filteredMultirepQueue[idx + 1] ?? filteredMultirepQueue[0] ?? null;
  }

  function advanceMultirepQueue(after: typeof multirepActiveItem) {
    const next = getNextMultirepItem(after);
    if (next) {
      dispatch(
        updateJudgingState({
          activeEntryIndex: next.entryIndex,
          activeAttemptSequence: 1,
        }),
      );
    } else {
      dispatch(
        updateJudgingState({
          activeEntryIndex: null,
          activeAttemptSequence: null,
        }),
      );
    }
    dispatch(clearPendingVotes());
    dispatch(stopTimer());
  }

  function handleMultirepConfirm() {
    if (!multirepActiveItem) return;
    // exercise must be PU or DI (PUDI items are split into separate entries)
    const exercise = multirepActiveItem.exercise;
    if (exercise !== "PU" && exercise !== "DI") return;

    const votes: JudgeVotes = {
      left: judging.pendingLeft,
      center: judging.pendingCenter,
      right: judging.pendingRight,
    };
    dispatch(
      commitMultirepAttempt({
        entryIndex: multirepActiveItem.entryIndex,
        exercise,
        reps: judging.pendingReps ?? 0,
        votes,
      }),
    );
    advanceMultirepQueue(multirepActiveItem);
  }

  function handleMultirepSkip() {
    advanceMultirepQueue(multirepActiveItem);
  }

  if (!meet) return null;

  const pendingVotes: JudgeVotes = {
    left: judging.pendingLeft,
    center: judging.pendingCenter,
    right: judging.pendingRight,
  };
  const currentStatus = attemptStatusFromVotes(pendingVotes);
  const isSplit = isSplitDecision(pendingVotes);

  const activeQueue = isMultirepTab ? filteredMultirepQueue : classicQueue;
  const activeItem = isMultirepTab ? multirepActiveItem : classicActiveItem;
  const next5 = activeQueue.slice(0, 5);

  // ─── Multirep active disc info ──────────────────────────────────────────────
  const activeDisc = activeMultirepCode
    ? ISF_V51_DISCIPLINES.find((d) => d.code === activeMultirepCode)
    : null;

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Title order={2}>{t("judging.title")}</Title>
          <Group gap="xs">
            <Tabs
              value={activeTab}
              onChange={(v) => {
                if (v) {
                  setActiveTab(v as ActiveTab);
                  dispatch(clearPendingVotes());
                  dispatch(stopTimer());
                }
              }}
            >
              <Tabs.List>
                {hasPU && <Tabs.Tab value="PU">{t("judging.exercisePU")}</Tabs.Tab>}
                {hasDI && <Tabs.Tab value="DI">{t("judging.exerciseDI")}</Tabs.Tab>}
                {enabledMultirepCodes.length > 0 && (
                  <>
                    <Divider orientation="vertical" mx="xs" />
                    {enabledMultirepCodes.map((code) => {
                      const disc = ISF_V51_DISCIPLINES.find((d) => d.code === code);
                      return (
                        <Tabs.Tab key={code} value={code}>
                          {disc?.labelEn ?? code}
                        </Tabs.Tab>
                      );
                    })}
                  </>
                )}
              </Tabs.List>
            </Tabs>
          </Group>
        </Group>

        {activeQueue.length === 0 && entries.length === 0 ? (
          <Card withBorder>
            <Text c="dimmed">{t("judging.noEntries")}</Text>
          </Card>
        ) : activeQueue.length === 0 ? (
          <Card withBorder>
            <Text c="dimmed">{t("judging.allDone")}</Text>
          </Card>
        ) : (
          <Grid>
            {/* Left panel: Queue */}
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card withBorder h="100%">
                <Stack gap="xs">
                  <Text fw={600}>{t("judging.queue.title")}</Text>
                  {next5.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      {t("judging.queue.empty")}
                    </Text>
                  ) : isMultirepTab ? (
                    // Multirep queue items
                    next5.map((item, i) => {
                      const mItem = item as typeof filteredMultirepQueue[0];
                      const isActive =
                        activeItem &&
                        mItem.entryIndex === activeItem.entryIndex;
                      const repsDisplay =
                        mItem.attempt?.reps !== null &&
                        mItem.attempt?.reps !== undefined
                          ? String(mItem.attempt.reps)
                          : "–";
                      return (
                        <Card
                          key={`${mItem.entryIndex}-${mItem.exercise}`}
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
                                  ? `▶ ${mItem.entry.name}`
                                  : mItem.entry.name}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {mItem.entry.bodyweightKg !== null
                                  ? `${mItem.entry.bodyweightKg} kg`
                                  : "—"}
                              </Text>
                            </Stack>
                            <Group gap="xs">
                              <Badge size="sm" color="teal" variant="light">
                                {mItem.exercise}
                              </Badge>
                              <Badge size="sm" color="gray" variant="outline">
                                {repsDisplay}
                              </Badge>
                            </Group>
                          </Group>
                        </Card>
                      );
                    })
                  ) : (
                    // Classic queue items
                    next5.map((item, i) => {
                      const cItem = item as typeof classicQueue[0];
                      const isActive =
                        activeItem &&
                        cItem.entryIndex === activeItem.entryIndex &&
                        (activeItem as typeof classicQueue[0]).sequence === cItem.sequence;
                      return (
                        <Card
                          key={`${cItem.entryIndex}-${cItem.sequence}`}
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
                                  ? `▶ ${cItem.entry.name}`
                                  : cItem.entry.name}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {cItem.entry.bodyweightKg !== null
                                  ? `${cItem.entry.bodyweightKg} kg`
                                  : "—"}
                              </Text>
                            </Stack>
                            <Group gap="xs">
                              <Badge size="sm" color="blue" variant="light">
                                {t("judging.round")} {cItem.sequence}
                              </Badge>
                              {cItem.attempt?.declaredLoadKg !== null &&
                              cItem.attempt?.declaredLoadKg !== undefined ? (
                                <Badge size="sm" color="teal" variant="outline">
                                  {cItem.attempt.declaredLoadKg} kg
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

            {/* Right panel: Active attempt */}
            <Grid.Col span={{ base: 12, md: 8 }}>
              {activeItem ? (
                <Card withBorder>
                  <Stack gap="md">
                    {/* Athlete info */}
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
                        {isMultirepTab ? (
                          <>
                            <Badge size="lg" color="teal">
                              {(activeItem as typeof filteredMultirepQueue[0]).exercise}
                            </Badge>
                            {activeDisc?.presetLoadKg && (
                              <Badge size="lg" color="orange" variant="outline">
                                {t("judging.presetLoad")}:{" "}
                                {activeDisc.presetLoadKg.PU !== undefined
                                  ? `${activeDisc.presetLoadKg.PU} kg PU`
                                  : ""}
                                {activeDisc.presetLoadKg.PU !== undefined &&
                                activeDisc.presetLoadKg.DI !== undefined
                                  ? " + "
                                  : ""}
                                {activeDisc.presetLoadKg.DI !== undefined
                                  ? `${activeDisc.presetLoadKg.DI} kg DI`
                                  : ""}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <>
                            <Badge size="lg" color="blue">
                              {t("judging.round")}{" "}
                              {(activeItem as typeof classicQueue[0]).sequence}
                            </Badge>
                            {(activeItem as typeof classicQueue[0]).attempt
                              ?.declaredLoadKg !== null &&
                            (activeItem as typeof classicQueue[0]).attempt
                              ?.declaredLoadKg !== undefined ? (
                              <Badge size="lg" color="teal">
                                {(activeItem as typeof classicQueue[0]).attempt!
                                  .declaredLoadKg}{" "}
                                kg
                              </Badge>
                            ) : null}
                          </>
                        )}
                      </Group>
                    </Group>

                    {/* Multirep: reps input */}
                    {isMultirepTab && (
                      <NumberInput
                        label={t("multirep.enterReps")}
                        min={0}
                        value={judging.pendingReps ?? ""}
                        onChange={(v) =>
                          dispatch(
                            setPendingReps(
                              typeof v === "number" && Number.isFinite(v)
                                ? v
                                : null,
                            ),
                          )
                        }
                        size="lg"
                        placeholder="0"
                      />
                    )}

                    {/* Timer */}
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

                    {/* Judge vote cards */}
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

                    {/* Status badges */}
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

                    {/* Aggregate buttons */}
                    <Group justify="center" gap="md">
                      <Button
                        color="green"
                        variant="light"
                        onClick={handleAllGood}
                      >
                        {t("judging.votes.allGood")}
                      </Button>
                      <Button
                        color="red"
                        variant="light"
                        onClick={handleAllNo}
                      >
                        {t("judging.votes.allNo")}
                      </Button>
                    </Group>

                    {/* Confirm / Skip */}
                    <Stack gap="xs">
                      <Button
                        size="lg"
                        color="blue"
                        onClick={
                          isMultirepTab
                            ? handleMultirepConfirm
                            : handleClassicConfirm
                        }
                        disabled={currentStatus === "pending"}
                      >
                        {t("judging.confirm")}
                      </Button>
                      <Button
                        size="sm"
                        variant="subtle"
                        color="gray"
                        onClick={
                          isMultirepTab ? handleMultirepSkip : handleClassicSkip
                        }
                      >
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
    </Container>
  );
}

// ─── Local useState with lazy initializer helper ─────────────────────────────

import { useState, type Dispatch, type SetStateAction } from "react";

function useStateLazy<T>(init: () => T): [T, Dispatch<SetStateAction<T>>] {
  return useState<T>(init);
}

export default JudgingPage;
