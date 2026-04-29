import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { MantineProvider, Badge, Group, Stack, Text } from "@mantine/core";

import { theme } from "@app/theme";
import { useAppSelector, type RootState } from "@store/index";
import { selectEntries } from "@store/registration-slice";
import { buildAttemptQueue, type QueueItem } from "@logic/isf/attempt-queue";
import {
  buildMultirepQueue,
  type MultirepQueueItem,
} from "@logic/isf/multirep-queue";
import type { Entry, Plate } from "@domain/models";

type DisplayKind = "order" | "timer" | "plates" | "broadcast";

type DisplayQueueItem = {
  key: string;
  entry: Entry;
  entryIndex: number;
  exercise: "PU" | "DI";
  sequenceLabel: string;
  loadKg: number | null;
  isMultirep: boolean;
};

type PlateLoadItem = {
  plate: Plate;
  count: number;
};

type PlateLoadPlan = {
  loadKg: number | null;
  items: PlateLoadItem[];
  remainingKg: number;
};

const BG = "#08090c";
const PANEL = "#141720";
const PANEL_2 = "#1f2430";
const RED = "#e03131";
const TEXT_DIM = "#9aa3b2";
const GREEN = "#2f9e44";

function selectDisplayJudging(state: RootState) {
  return state.judging;
}

function selectCurrentMeet(state: RootState) {
  return state.meet.current;
}

function formatKg(value: number | null | undefined): string {
  return value === null || value === undefined ? "-" : `${value} kg`;
}

function statusLabel(values: Array<boolean | null>): {
  key: string;
  color: string;
} {
  const good = values.filter((v) => v === true).length;
  const fail = values.filter((v) => v === false).length;
  if (good >= 2) return { key: good === 3 ? "good30" : "good21", color: GREEN };
  if (fail >= 2) return { key: fail === 3 ? "fail03" : "fail12", color: RED };
  return { key: `${good}:${fail}`, color: TEXT_DIM };
}

function fromClassicItem(item: QueueItem): DisplayQueueItem {
  return {
    key: `${item.entry.id}-${item.exercise}-${item.sequence}`,
    entry: item.entry,
    entryIndex: item.entryIndex,
    exercise: item.exercise,
    sequenceLabel: `R${item.sequence}`,
    loadKg: item.attempt?.declaredLoadKg ?? null,
    isMultirep: false,
  };
}

function fromMultirepItem(item: MultirepQueueItem): DisplayQueueItem {
  return {
    key: `${item.entry.id}-${item.exercise}-mr`,
    entry: item.entry,
    entryIndex: item.entryIndex,
    exercise: item.exercise === "PUDI" ? "PU" : item.exercise,
    sequenceLabel: "MR",
    loadKg: item.attempt?.presetLoadKg ?? null,
    isMultirep: true,
  };
}

function getDisplayQueue(
  entries: readonly Entry[],
  lowerBodyweightFirst: boolean,
): DisplayQueueItem[] {
  const classicPu = buildAttemptQueue(entries, "PU", lowerBodyweightFirst).map(
    fromClassicItem,
  );
  const classicDi = buildAttemptQueue(entries, "DI", lowerBodyweightFirst).map(
    fromClassicItem,
  );
  const multirep = buildMultirepQueue(entries, lowerBodyweightFirst).map(
    fromMultirepItem,
  );

  if (classicPu.length > 0) return classicPu;
  if (classicDi.length > 0) return classicDi;
  return multirep;
}

function getActiveDisplayItem(
  queue: readonly DisplayQueueItem[],
  activeEntryIndex: number | null,
  activeAttemptSequence: number | null,
): DisplayQueueItem | null {
  if (queue.length === 0) return null;
  const matched = queue.find((item) => {
    if (item.entryIndex !== activeEntryIndex) return false;
    if (item.isMultirep) return true;
    return item.sequenceLabel === `R${activeAttemptSequence}`;
  });
  return matched ?? queue[0] ?? null;
}

function buildPlateLoadPlan(
  loadKg: number | null,
  plates: readonly Plate[],
  recordAttempt: boolean,
): PlateLoadPlan {
  if (loadKg === null || loadKg <= 0) {
    return { loadKg, items: [], remainingKg: 0 };
  }

  let remainingKg = loadKg;
  const items: PlateLoadItem[] = [];
  const sorted = [...plates]
    .filter((plate) => recordAttempt || !plate.recordOnly)
    .sort((a, b) => b.weightKg - a.weightKg);

  for (const plate of sorted) {
    const availableCount = plate.pairCount * 2;
    const neededCount = Math.floor(remainingKg / plate.weightKg);
    const count = Math.min(availableCount, neededCount);
    if (count <= 0) continue;
    items.push({ plate, count });
    remainingKg = Number((remainingKg - count * plate.weightKg).toFixed(3));
  }

  return { loadKg, items, remainingKg };
}

function DisplayShell({
  kind,
  children,
}: {
  kind: DisplayKind;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const meet = useAppSelector(selectCurrentMeet);

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <div
        style={{
          minHeight: "100vh",
          background: BG,
          color: "white",
          fontFamily: "var(--mantine-font-family, sans-serif)",
          display: "grid",
          gridTemplateRows: "64px 1fr",
        }}
      >
        <Group
          justify="space-between"
          px={28}
          style={{ borderBottom: `2px solid ${RED}`, background: PANEL }}
        >
          <Group gap="sm">
            <Badge color="red" variant="filled" size="lg">
              ISF
            </Badge>
            <Text fw={800}>{meet?.meet.name ?? t("scoreboard.noMeet")}</Text>
          </Group>
          <Badge color="gray" variant="outline" size="lg">
            {t(`display.kind.${kind}`)}
          </Badge>
        </Group>
        {meet ? (
          children
        ) : (
          <Stack align="center" justify="center" h="100%">
            <Text size="2rem" c={TEXT_DIM}>
              {t("scoreboard.noMeet")}
            </Text>
          </Stack>
        )}
      </div>
    </MantineProvider>
  );
}

function QueueRow({
  item,
  index,
  active,
}: {
  item: DisplayQueueItem;
  index: number;
  active?: boolean;
}) {
  return (
    <Group
      justify="space-between"
      px={22}
      py={14}
      style={{
        background: active ? "#2b1114" : PANEL_2,
        borderLeft: `5px solid ${active ? RED : "#3a4252"}`,
      }}
    >
      <Group gap="lg" style={{ minWidth: 0 }}>
        <Text fw={900} size={active ? "2.6rem" : "1.6rem"} c={active ? RED : TEXT_DIM}>
          {index + 1}
        </Text>
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fw={900} size={active ? "2.4rem" : "1.35rem"} truncate>
            {item.entry.name}
          </Text>
          <Group gap="xs">
            <Badge color={item.exercise === "PU" ? "blue" : "orange"} variant="light">
              {item.exercise}
            </Badge>
            <Badge color={item.isMultirep ? "violet" : "gray"} variant="outline">
              {item.sequenceLabel}
            </Badge>
            {item.entry.assignedWeightCategoryCode && (
              <Badge color="gray" variant="outline">
                {item.entry.assignedWeightCategoryCode}
              </Badge>
            )}
            {item.entry.team && <Text c={TEXT_DIM}>{item.entry.team}</Text>}
          </Group>
        </Stack>
      </Group>
      <Text fw={900} size={active ? "3rem" : "1.8rem"}>
        {formatKg(item.loadKg)}
      </Text>
    </Group>
  );
}

function useDisplayData() {
  const meet = useAppSelector(selectCurrentMeet);
  const entries = useAppSelector(selectEntries);
  const judging = useAppSelector(selectDisplayJudging);
  const lowerBodyweightFirst = meet?.meet.lowerBodyweightFirstTiebreak ?? true;
  const queue = useMemo(
    () => getDisplayQueue(entries, lowerBodyweightFirst),
    [entries, lowerBodyweightFirst],
  );
  const active = getActiveDisplayItem(
    queue,
    meet?.judging.activeEntryIndex ?? null,
    meet?.judging.activeAttemptSequence ?? null,
  );

  return { meet, entries, judging, queue, active };
}

export function DisplayOrderPage() {
  const { queue, active } = useDisplayData();
  const rest = queue.filter((item) => item.key !== active?.key).slice(0, 12);

  return (
    <DisplayShell kind="order">
      <div style={{ padding: 28, display: "grid", gap: 18 }}>
        {active && <QueueRow item={active} index={0} active />}
        <Stack gap={8}>
          {rest.map((item, index) => (
            <QueueRow key={item.key} item={item} index={index + 1} />
          ))}
        </Stack>
      </div>
    </DisplayShell>
  );
}

export function DisplayTimerPage() {
  const { judging, active } = useDisplayData();
  const total = active?.isMultirep ? 120 : 60;
  const pct = Math.max(0, Math.min(1, judging.timerSecondsLeft / total));
  const timeColor = judging.timerSecondsLeft <= 10 ? RED : judging.timerSecondsLeft <= 30 ? "#f08c00" : GREEN;

  return (
    <DisplayShell kind="timer">
      <Stack align="center" justify="center" h="100%" gap={28}>
        <Text fw={900} size="2.4rem" c={TEXT_DIM}>
          {active ? `${active.entry.name} · ${active.exercise} · ${active.sequenceLabel}` : "-"}
        </Text>
        <Text
          fw={900}
          style={{
            fontSize: "22vw",
            lineHeight: 0.9,
            color: timeColor,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {judging.timerSecondsLeft}
        </Text>
        <div style={{ width: "72vw", height: 18, background: PANEL_2 }}>
          <div
            style={{
              height: "100%",
              width: `${pct * 100}%`,
              background: timeColor,
              transition: "width 0.2s linear",
            }}
          />
        </div>
      </Stack>
    </DisplayShell>
  );
}

export function DisplayPlatesPage() {
  const { t } = useTranslation();
  const { meet, active, queue } = useDisplayData();
  const plan = buildPlateLoadPlan(
    active?.loadKg ?? null,
    meet?.meet.classicLoadConfig?.plates ?? [],
    false,
  );
  const next = queue.filter((item) => item.key !== active?.key).slice(0, 4);

  return (
    <DisplayShell kind="plates">
      <div style={{ padding: 28, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
        <Stack gap={18}>
          <Text c={TEXT_DIM} fw={800} tt="uppercase">
            {t("display.currentLoad")}
          </Text>
          <Text fw={900} style={{ fontSize: "8rem", lineHeight: 1 }}>
            {formatKg(plan.loadKg)}
          </Text>
          <Group gap={12}>
            {plan.items.length === 0 ? (
              <Text c={TEXT_DIM}>{t("display.noPlateLoad")}</Text>
            ) : (
              plan.items.map(({ plate, count }) => (
                <Stack key={`${plate.weightKg}-${plate.color}`} align="center" gap={6}>
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: "50%",
                      background: plate.color,
                      border: "5px solid white",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Text fw={900} c={plate.color === "white" ? "black" : "white"}>
                      {plate.weightKg}
                    </Text>
                  </div>
                  <Badge color="gray" variant="filled" size="xl">
                    x{count}
                  </Badge>
                </Stack>
              ))
            )}
          </Group>
          {plan.remainingKg > 0 && (
            <Badge color="red" size="xl">
              {t("display.remaining")} {formatKg(plan.remainingKg)}
            </Badge>
          )}
        </Stack>
        <Stack gap={10}>
          <Text c={TEXT_DIM} fw={800} tt="uppercase">
            {t("display.next")}
          </Text>
          {next.map((item, index) => (
            <QueueRow key={item.key} item={item} index={index + 1} />
          ))}
        </Stack>
      </div>
    </DisplayShell>
  );
}

export function DisplayBroadcastPage() {
  const { t } = useTranslation();
  const { judging, active, queue } = useDisplayData();
  const votes = [judging.pendingLeft, judging.pendingCenter, judging.pendingRight];
  const verdict = statusLabel(votes);
  const next = queue.find((item) => item.key !== active?.key);

  return (
    <DisplayShell kind="broadcast">
      <div style={{ padding: 32, display: "grid", gridTemplateRows: "1fr 132px", gap: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 24 }}>
          <Stack justify="end" gap={18}>
            <Text c={TEXT_DIM} fw={800} tt="uppercase">
              {t("display.onPlatform")}
            </Text>
            <Text fw={900} style={{ fontSize: "5.8rem", lineHeight: 0.95 }}>
              {active?.entry.name ?? "-"}
            </Text>
            <Group gap="sm">
              <Badge color="red" size="xl">
                {active?.exercise ?? "-"}
              </Badge>
              <Badge color="gray" variant="outline" size="xl">
                {active?.sequenceLabel ?? "-"}
              </Badge>
              <Badge color="blue" variant="filled" size="xl">
                {formatKg(active?.loadKg)}
              </Badge>
            </Group>
          </Stack>
          <Stack align="end" justify="center" gap={16}>
            <Text fw={900} style={{ fontSize: "9rem", lineHeight: 0.9, fontVariantNumeric: "tabular-nums" }}>
              {judging.timerSecondsLeft}
            </Text>
            <Badge color="gray" variant="outline" size="xl">
              {judging.timerRunning ? t("display.running") : t("display.ready")}
            </Badge>
            <Text fw={900} size="2rem" c={verdict.color}>
              {verdict.key.includes(":")
                ? verdict.key
                : t(`display.verdict.${verdict.key}`)}
            </Text>
          </Stack>
        </div>
        <Group justify="space-between" px={28} style={{ background: PANEL, borderTop: `4px solid ${RED}` }}>
          <Stack gap={0}>
            <Text c={TEXT_DIM} tt="uppercase" fw={800}>
              {t("display.next")}
            </Text>
            <Text fw={900} size="2rem">
              {next?.entry.name ?? "-"}
            </Text>
          </Stack>
          <Text fw={900} size="2.4rem">
            {next ? `${next.exercise} · ${next.sequenceLabel} · ${formatKg(next.loadKg)}` : "-"}
          </Text>
        </Group>
      </div>
    </DisplayShell>
  );
}
