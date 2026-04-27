/**
 * JudgingPage — Sprint 2 Classic judging screen.
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
} from "@mantine/core";
import { useAppDispatch, useAppSelector } from "@store/index";
import {
  startTimer,
  stopTimer,
  tickTimer,
  castVote,
  resetVote,
  clearPendingVotes,
} from "@store/judging-slice";
import {
  commitAttemptVotes,
  updateJudgingState,
} from "@store/meet-slice";
import { selectEntries } from "@store/registration-slice";
import {
  buildAttemptQueue,
  getActiveItem,
} from "@logic/isf/attempt-queue";
import { attemptStatusFromVotes, isSplitDecision } from "@logic/isf/judge-votes";
import type { JudgeVotes } from "@domain/models";
import { JudgeVoteCard } from "@components/judge-vote-card/JudgeVoteCard";
import { TimerDisplay } from "@components/timer-display/TimerDisplay";

export function JudgingPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const meet = useAppSelector((s) => s.meet.current);
  const entries = useAppSelector(selectEntries);
  const judging = useAppSelector((s) => s.judging);

  // Which exercise tab is active — prefer first enabled exercise in meet config.
  const enabledDisciplines = meet?.meet.enabledDisciplineCodes ?? [];
  const hasPU =
    enabledDisciplines.some((c) => c.includes("pu") || c === "classic_2lift") ||
    entries.some((e) => e.event === "PU" || e.event === "PUDI");
  const hasDI =
    enabledDisciplines.some((c) => c.includes("di") || c === "classic_2lift") ||
    entries.some((e) => e.event === "DI" || e.event === "PUDI");

  const defaultExercise: "PU" | "DI" = hasPU ? "PU" : "DI";

  const [activeExercise, setActiveExercise] = useStateLazy<"PU" | "DI">(
    () => defaultExercise,
  );

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
    if (prevRunning.current && !judging.timerRunning && judging.timerSecondsLeft === 0) {
      // Simple Web Audio beep.
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

  if (!meet) return null;

  const pendingVotes: JudgeVotes = {
    left: judging.pendingLeft,
    center: judging.pendingCenter,
    right: judging.pendingRight,
  };
  const currentStatus = attemptStatusFromVotes(pendingVotes);
  const isSplit = isSplitDecision(pendingVotes);

  const next5 = queue.slice(0, 5);

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Title order={2}>{t("judging.title")}</Title>
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
            {/* Left panel: Queue */}
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
                        onClick={handleConfirm}
                        disabled={currentStatus === "pending"}
                      >
                        {t("judging.confirm")}
                      </Button>
                      <Button
                        size="sm"
                        variant="subtle"
                        color="gray"
                        onClick={handleSkip}
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
