/**
 * AwardsCeremonyPage — /awards
 *
 * Two display modes:
 *   - "compact" (default): in-page card with order toggle, prev/next.
 *   - "fullscreen": fixed-position overlay covering the viewport with
 *     projector-scale fonts and place-accent colors (gold/silver/bronze).
 *     Used when the operator's laptop drives a projector during the
 *     awards ceremony — no separate display route needed yet (V3 broadcast
 *     publisher will provide that).
 *
 * Keyboard:
 *   - ←  previous award
 *   - →  next award
 *   - Space  next award
 *   - F  toggle fullscreen
 *   - Esc  exit fullscreen
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  Container,
  Group,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useAppSelector } from "@store/index";
import { selectEntries } from "@store/registration-slice";
import { computeClassicResults } from "@logic/isf/classic-placing";
import { computeMultirepResults } from "@logic/isf/multirep-placing";
import {
  buildAwardsList,
  placeAccent,
  type AwardOrder,
  type CeremonyAward,
} from "@logic/reports/awards-ceremony";

const AUTO_ADVANCE_MS = 6000;

function FullscreenOverlay({
  award,
  index,
  total,
  onPrev,
  onNext,
  onExit,
  meetName,
  meetDate,
  autoAdvance,
  onToggleAutoAdvance,
}: {
  award: CeremonyAward;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  meetName: string;
  meetDate: string;
  autoAdvance: boolean;
  onToggleAutoAdvance: () => void;
}) {
  const { t } = useTranslation();
  const accent = placeAccent(award.place);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: `linear-gradient(135deg, ${accent.background}, #0a0a0a 80%)`,
        color: accent.text,
        display: "flex",
        flexDirection: "column",
        padding: "32px 48px",
        fontFamily: "var(--mantine-font-family)",
      }}
    >
      <Group justify="space-between" align="flex-start">
        <Stack gap={2}>
          <Text size="sm" style={{ opacity: 0.7 }}>
            {meetName} · {meetDate}
          </Text>
          <Text size="xl" fw={700}>
            {t("awards.title")}
          </Text>
        </Stack>
        <Group gap="md">
          <Switch
            size="sm"
            color="yellow"
            label={t("awards.autoAdvance")}
            checked={autoAdvance}
            onChange={onToggleAutoAdvance}
            styles={{ label: { color: accent.text } }}
          />
          <Button
            size="sm"
            color="dark"
            variant="white"
            onClick={onExit}
          >
            {t("awards.exitFullscreen")} (Esc)
          </Button>
        </Group>
      </Group>

      <Stack
        gap="md"
        align="center"
        justify="center"
        style={{ flex: 1, textAlign: "center" }}
      >
        <Badge
          size="xl"
          variant="white"
          color="dark"
          style={{ fontSize: 22, padding: "12px 22px", letterSpacing: 1 }}
        >
          {award.format === "classic" ? "Classic" : "Multirep"}
        </Badge>
        <Text style={{ fontSize: 36, opacity: 0.85 }}>{award.category}</Text>
        <Text
          style={{
            fontSize: 200,
            fontWeight: 900,
            lineHeight: 1,
            color: accent.badge,
            textShadow: "0 4px 30px rgba(0,0,0,0.6)",
          }}
        >
          {t("awards.place", { place: award.place })}
        </Text>
        <Text
          style={{
            fontSize: 96,
            fontWeight: 900,
            lineHeight: 1.1,
            maxWidth: "80vw",
            wordBreak: "break-word",
          }}
        >
          {award.athleteName}
        </Text>
        {award.team && (
          <Text style={{ fontSize: 36, opacity: 0.8 }}>{award.team}</Text>
        )}
        <Text
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: accent.badge,
          }}
        >
          {award.disciplineCode} · {award.result}
        </Text>
      </Stack>

      <Group justify="space-between" align="flex-end">
        <Button
          size="lg"
          variant="white"
          color="dark"
          onClick={onPrev}
          disabled={index === 0}
        >
          ← {t("awards.previous")}
        </Button>
        <Text size="xl" fw={700} style={{ opacity: 0.85 }}>
          {index + 1} / {total}
        </Text>
        <Button
          size="lg"
          variant="white"
          color="dark"
          onClick={onNext}
          disabled={index >= total - 1}
        >
          {t("awards.next")} →
        </Button>
      </Group>
    </div>
  );
}

export function AwardsCeremonyPage() {
  const { t } = useTranslation();
  const meet = useAppSelector((s) => s.meet.current);
  const entries = useAppSelector(selectEntries);
  const [order, setOrder] = useState<AwardOrder>("thirdToFirst");
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);

  const meetDate = meet?.meet.date ?? new Date().toISOString().slice(0, 10);
  const meetName = meet?.meet.name ?? "Meet";

  const awards = useMemo(() => {
    if (!meet) return [];
    const classicGroups = computeClassicResults(entries, meet.meet, meetDate);
    const multirepGroups = computeMultirepResults(entries, meet.meet, meetDate);
    return buildAwardsList(
      {
        classicGroups,
        multirepGroups,
        kgUnitLabel: t("print.kg"),
        repsUnitLabel: t("multirep.reps"),
      },
      order,
    );
  }, [entries, meet, meetDate, order, t]);

  const activeAward = awards[activeIndex] ?? null;

  useEffect(() => {
    setActiveIndex(0);
  }, [order, awards.length]);

  // Keyboard navigation — works in both compact and fullscreen modes.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        setActiveIndex((idx) =>
          Math.min(idx + 1, Math.max(awards.length - 1, 0)),
        );
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((idx) => Math.max(idx - 1, 0));
      }
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        setFullscreen((on) => !on);
      }
      if (event.key === "Escape") {
        if (fullscreen) {
          event.preventDefault();
          setFullscreen(false);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [awards.length, fullscreen]);

  // Auto-advance ticker in fullscreen mode.
  useEffect(() => {
    if (!fullscreen || !autoAdvance || awards.length === 0) return;
    const id = window.setInterval(() => {
      setActiveIndex((idx) => {
        if (idx >= awards.length - 1) return idx;
        return idx + 1;
      });
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [fullscreen, autoAdvance, awards.length]);

  if (fullscreen && activeAward) {
    return (
      <FullscreenOverlay
        award={activeAward}
        index={activeIndex}
        total={awards.length}
        onPrev={() => setActiveIndex((idx) => Math.max(idx - 1, 0))}
        onNext={() =>
          setActiveIndex((idx) =>
            Math.min(idx + 1, Math.max(awards.length - 1, 0)),
          )
        }
        onExit={() => setFullscreen(false)}
        meetName={meetName}
        meetDate={meetDate}
        autoAdvance={autoAdvance}
        onToggleAutoAdvance={() => setAutoAdvance((v) => !v)}
      />
    );
  }

  return (
    <Container size="lg" py="md">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Title order={2}>{t("awards.title")}</Title>
            <Text size="sm" c="dimmed">
              {meetName} · {meetDate}
            </Text>
          </Stack>
          <Group gap="md">
            <SegmentedControl
              value={order}
              onChange={(value) => setOrder(value as AwardOrder)}
              data={[
                { value: "thirdToFirst", label: t("awards.thirdToFirst") },
                { value: "firstToThird", label: t("awards.firstToThird") },
              ]}
            />
            <Button
              variant="filled"
              color="red"
              onClick={() => setFullscreen(true)}
              disabled={!activeAward}
            >
              {t("awards.enterFullscreen")} (F)
            </Button>
          </Group>
        </Group>

        {!activeAward ? (
          <Text c="dimmed" ta="center" py="xl">
            {t("awards.empty")}
          </Text>
        ) : (
          <Stack gap="lg" align="center" py="xl">
            <Badge size="xl" color={activeAward.format === "classic" ? "red" : "blue"}>
              {activeAward.format === "classic" ? "Classic" : "Multirep"}
            </Badge>
            <Text size="xl" c="dimmed" ta="center">
              {activeAward.category}
            </Text>
            <Text size="48px" fw={900} ta="center">
              {t("awards.place", { place: activeAward.place })}
            </Text>
            <Text size="44px" fw={900} ta="center">
              {activeAward.athleteName}
            </Text>
            {activeAward.team && (
              <Text size="xl" c="dimmed" ta="center">
                {activeAward.team}
              </Text>
            )}
            <Text size="28px" fw={700} c="red" ta="center">
              {activeAward.disciplineCode} · {activeAward.result}
            </Text>
          </Stack>
        )}

        <Group justify="space-between">
          <Button
            variant="outline"
            onClick={() => setActiveIndex((idx) => Math.max(idx - 1, 0))}
            disabled={activeIndex === 0}
          >
            {t("awards.previous")}
          </Button>
          <Text size="sm" c="dimmed">
            {awards.length === 0 ? "0 / 0" : `${activeIndex + 1} / ${awards.length}`}
          </Text>
          <Button
            onClick={() =>
              setActiveIndex((idx) =>
                Math.min(idx + 1, Math.max(awards.length - 1, 0)),
              )
            }
            disabled={activeIndex >= awards.length - 1}
          >
            {t("awards.next")}
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
