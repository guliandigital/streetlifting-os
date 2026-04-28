/**
 * ScoreboardPage — /scoreboard
 *
 * Full-screen projector/TV display. Dark theme, no sidebar.
 * Opens in a separate browser tab so it can be moved to the projector.
 *
 * Layout:
 *   Header: meet name | ISF | clock
 *   Left panel: current athlete + timer + vote lights
 *   Right panel: next 5 athletes in queue
 *   Footer: top-3 classic results ticker
 *
 * Route does NOT require RequireMeet — shows a placeholder when no meet is loaded.
 */

import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  MantineProvider,
  Text,
  Group,
  Stack,
  Badge,
  RingProgress,
  Center,
} from "@mantine/core";
import { useAppSelector } from "@store/index";
import { selectEntries } from "@store/registration-slice";
import { buildAttemptQueue } from "@logic/isf/attempt-queue";
import { computeClassicRows } from "@logic/isf/classic-placing";
import { theme } from "@app/theme";

// ─── Constants ────────────────────────────────────────────────────────────────

const DARK_BG = "#1A1B1E";
const ISF_RED = "#e03131";
const PANEL_BG = "#25262b";
const TEXT_DIM = "#909296";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function clockString(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function timerColor(secondsLeft: number): string {
  if (secondsLeft > 20) return "green";
  if (secondsLeft > 10) return "orange";
  return "red";
}

// ─── Vote light ──────────────────────────────────────────────────────────────

function VoteLight({ value }: { value: boolean | null }) {
  const color =
    value === true ? "#2f9e44" : value === false ? "#e03131" : "#495057";
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: value !== null ? `0 0 12px ${color}` : undefined,
        transition: "background-color 0.2s",
      }}
    />
  );
}

// ─── Timer circle ─────────────────────────────────────────────────────────────

function ScoreboardTimer({
  secondsLeft,
  totalSeconds,
  running,
}: {
  secondsLeft: number;
  totalSeconds: number;
  running: boolean;
}) {
  const safeTotal = totalSeconds > 0 ? totalSeconds : 60;
  const pct = Math.round((secondsLeft / safeTotal) * 100);
  const color = timerColor(secondsLeft);

  return (
    <RingProgress
      size={100}
      thickness={8}
      sections={[{ value: pct, color }]}
      label={
        <Center>
          <Text
            size="lg"
            fw={700}
            c={running ? color : TEXT_DIM}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {secondsLeft}
          </Text>
        </Center>
      }
    />
  );
}

// ─── Main scoreboard inner (uses Redux) ──────────────────────────────────────

function ScoreboardInner() {
  const { t } = useTranslation();

  const meet = useAppSelector((s) => s.meet.current);
  const entries = useAppSelector(selectEntries);
  const timerSecondsLeft = useAppSelector((s) => s.judging.timerSecondsLeft);
  const timerRunning = useAppSelector((s) => s.judging.timerRunning);
  const pendingLeft = useAppSelector((s) => s.judging.pendingLeft);
  const pendingCenter = useAppSelector((s) => s.judging.pendingCenter);
  const pendingRight = useAppSelector((s) => s.judging.pendingRight);

  const [clock, setClock] = useState(clockString());
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    clockRef.current = setInterval(() => setClock(clockString()), 1000);
    return () => {
      if (clockRef.current !== null) clearInterval(clockRef.current);
    };
  }, []);

  if (!meet) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: DARK_BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text size="xl" c={TEXT_DIM}>
          {t("scoreboard.noMeet")}
        </Text>
      </div>
    );
  }

  const meetName = meet.meet.name;
  const meetDate = meet.meet.date ?? new Date().toISOString().slice(0, 10);
  const lowerBWFirst = meet.meet.lowerBodyweightFirstTiebreak ?? false;

  // Build PU queue (primary exercise for scoreboard — show whichever is active)
  const puQueue = buildAttemptQueue(entries, "PU", lowerBWFirst);
  const diQueue = buildAttemptQueue(entries, "DI", lowerBWFirst);
  // Prefer the non-empty queue; if both are non-empty, show PU
  const queue = puQueue.length > 0 ? puQueue : diQueue;

  const activeItem = queue[0] ?? null;
  const nextItems = queue.slice(1, 6);

  // Top results
  const allRows = meet
    ? computeClassicRows(entries, meet.meet, meetDate).filter((r) => !r.entry.guest && r.total > 0)
    : [];
  const top3 = [...allRows]
    .sort((a, b) => b.isfFinalPoints - a.isfFinalPoints)
    .slice(0, 3);

  // Vote split counts
  const goodVotes = [pendingLeft, pendingCenter, pendingRight].filter(
    (v) => v === true,
  ).length;
  const noVotes = [pendingLeft, pendingCenter, pendingRight].filter(
    (v) => v === false,
  ).length;
  const isSplit = goodVotes > 0 && noVotes > 0;

  const headerH = 56;
  const footerH = 48;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: DARK_BG,
        color: "white",
        fontFamily: "var(--mantine-font-family, sans-serif)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: headerH,
          backgroundColor: PANEL_BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: `2px solid ${ISF_RED}`,
          flexShrink: 0,
        }}
      >
        <Text fw={700} size="lg" c="white">
          {meetName}
        </Text>
        <Badge color="red" variant="filled" size="lg">
          ISF
        </Badge>
        <Text
          fw={600}
          size="lg"
          c="white"
          style={{ fontVariantNumeric: "tabular-nums", minWidth: 80, textAlign: "right" }}
        >
          {clock}
        </Text>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          minHeight: 0,
        }}
      >
        {/* Left panel — current athlete */}
        <div
          style={{
            backgroundColor: "#1c1d21",
            borderRight: `1px solid #373A40`,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <Text size="xs" c={TEXT_DIM} tt="uppercase" fw={600} style={{ letterSpacing: 2 }}>
            {t("scoreboard.current")}
          </Text>

          {activeItem ? (
            <>
              <div>
                <Text
                  size="2.4rem"
                  fw={900}
                  c="white"
                  style={{ lineHeight: 1.1 }}
                >
                  {activeItem.entry.name}
                </Text>
                <Group gap="xs" mt={4}>
                  <Badge size="sm" color="gray" variant="outline">
                    {activeItem.entry.sex}
                  </Badge>
                  {activeItem.entry.assignedWeightCategoryCode && (
                    <Badge size="sm" color="blue" variant="outline">
                      {activeItem.entry.assignedWeightCategoryCode}
                    </Badge>
                  )}
                  {activeItem.entry.team && (
                    <Text size="sm" c={TEXT_DIM}>
                      {activeItem.entry.team}
                    </Text>
                  )}
                </Group>
              </div>

              <div>
                {activeItem.entry.bodyweightKg !== null && (
                  <Text size="sm" c={TEXT_DIM}>
                    BW: <Text span c="white" fw={600}>{activeItem.entry.bodyweightKg} кг</Text>
                  </Text>
                )}
                <Text size="sm" c={TEXT_DIM}>
                  {activeItem.exercise} · {t("scoreboard.round")} {activeItem.sequence}
                  {activeItem.attempt?.declaredLoadKg !== undefined &&
                    activeItem.attempt.declaredLoadKg !== null && (
                      <Text span c="white" fw={600}>
                        {" "}· {activeItem.attempt.declaredLoadKg} кг
                      </Text>
                    )}
                </Text>
              </div>

              {/* Timer */}
              <Group align="center" gap="md">
                <ScoreboardTimer
                  secondsLeft={timerSecondsLeft}
                  totalSeconds={60}
                  running={timerRunning}
                />
              </Group>

              {/* Vote lights */}
              <div>
                <Text size="xs" c={TEXT_DIM} mb={8}>
                  {isSplit ? (
                    <Text span c="orange" fw={700}>
                      {goodVotes}-{noVotes} SPLIT
                    </Text>
                  ) : goodVotes === 3 ? (
                    <Text span c="green" fw={700}>
                      ЗАЧЁТ
                    </Text>
                  ) : noVotes === 3 ? (
                    <Text span c="red" fw={700}>
                      НЕ ЗАЧЁТ
                    </Text>
                  ) : (
                    "–"
                  )}
                </Text>
                <Group gap="md" align="center">
                  <Stack gap={4} align="center">
                    <VoteLight value={pendingLeft} />
                    <Text size="xs" c={TEXT_DIM}>L</Text>
                  </Stack>
                  <Stack gap={4} align="center">
                    <VoteLight value={pendingCenter} />
                    <Text size="xs" c={TEXT_DIM}>C</Text>
                  </Stack>
                  <Stack gap={4} align="center">
                    <VoteLight value={pendingRight} />
                    <Text size="xs" c={TEXT_DIM}>R</Text>
                  </Stack>
                </Group>
              </div>
            </>
          ) : (
            <Text size="lg" c={TEXT_DIM} pt="xl">
              {t("judging.allDone")}
            </Text>
          )}
        </div>

        {/* Right panel — next athletes */}
        <div
          style={{
            backgroundColor: PANEL_BG,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Text size="xs" c={TEXT_DIM} tt="uppercase" fw={600} style={{ letterSpacing: 2 }}>
            {t("scoreboard.next")}
          </Text>

          {nextItems.length === 0 ? (
            <Text c={TEXT_DIM}>{t("judging.queue.empty")}</Text>
          ) : (
            nextItems.map((item, idx) => (
              <div
                key={`${item.entry.id}-${item.exercise}-${item.sequence}`}
                style={{
                  padding: "10px 14px",
                  backgroundColor: "#2C2E33",
                  borderRadius: 8,
                  borderLeft: `3px solid ${idx === 0 ? ISF_RED : "#373A40"}`,
                }}
              >
                <Group justify="space-between" align="center">
                  <Text size="sm" fw={600} c="white">
                    {idx + 1}. {item.entry.name}
                  </Text>
                  <Group gap={6}>
                    <Badge size="xs" color="gray" variant="outline">
                      {item.exercise}
                    </Badge>
                    <Text size="xs" c={TEXT_DIM}>
                      R{item.sequence}
                      {item.attempt?.declaredLoadKg !== undefined &&
                        item.attempt.declaredLoadKg !== null &&
                        ` · ${item.attempt.declaredLoadKg} кг`}
                    </Text>
                  </Group>
                </Group>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer ticker */}
      {top3.length > 0 && (
        <div
          style={{
            height: footerH,
            backgroundColor: "#101113",
            borderTop: `2px solid ${ISF_RED}`,
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            gap: 32,
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <Text size="xs" c={ISF_RED} fw={700} tt="uppercase" style={{ flexShrink: 0, letterSpacing: 1 }}>
            {t("scoreboard.results")}:
          </Text>
          {top3.map((row, i) => (
            <Text key={row.entry.id} size="sm" c="white">
              <Text span c={TEXT_DIM}>{i + 1}. </Text>
              {row.entry.name}{" "}
              <Text span c="#74C0FC">
                {row.puBest > 0 && `PU ${row.puBest}`}
                {row.puBest > 0 && row.diBest > 0 && "+"}
                {row.diBest > 0 && `DI ${row.diBest}`}
                {row.total > 0 && `=${row.total}`}
              </Text>
            </Text>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Exported page (wraps with MantineProvider for dark theme) ───────────────

export function ScoreboardPage() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <ScoreboardInner />
    </MantineProvider>
  );
}
