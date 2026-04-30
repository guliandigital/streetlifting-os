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

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useAppSelector, useAppDispatch } from "@store/index";
import { selectEntries } from "@store/registration-slice";
import { setVoiceEnabled } from "@store/audio-slice";
import { computeClassicResults } from "@logic/isf/classic-placing";
import { computeMultirepResults } from "@logic/isf/multirep-placing";
import {
  announceAward,
  buildAwardsList,
  type AnnouncerLocale,
  type AwardOrder,
} from "@logic/reports/awards-ceremony";
import { makeEnvelope } from "@logic/reports/awards-broadcast";
import { openAwardsPublisher } from "@/services/awards-broadcast";
import { audioService } from "@/services/audio/audio-service";
import { AwardsFullscreenOverlay } from "./AwardsFullscreen";

const AUTO_ADVANCE_MS = 6000;

export function AwardsCeremonyPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const meet = useAppSelector((s) => s.meet.current);
  const entries = useAppSelector(selectEntries);
  const audioSettings = useAppSelector((s) => s.audio);
  const [order, setOrder] = useState<AwardOrder>("thirdToFirst");
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);

  const meetDate = meet?.meet.date ?? new Date().toISOString().slice(0, 10);
  const meetName = meet?.meet.name ?? "Meet";

  const announcerLocale: AnnouncerLocale =
    i18n.language === "ru-RU" ? "ru-RU" : "en-US";

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

  // Voice announcer — speaks the active award when the operator is in
  // fullscreen mode. Speaking outside fullscreen would be surprising
  // since the compact card is meant to be glanced at silently. Cancel
  // any in-flight utterance on unmount + on toggle off.
  useEffect(() => {
    if (!fullscreen || !activeAward) return;
    audioService.speak(
      announceAward(activeAward, announcerLocale),
      announcerLocale,
      audioSettings,
    );
  }, [fullscreen, activeAward, announcerLocale, audioSettings]);
  useEffect(() => {
    return () => {
      audioService.cancelVoice();
    };
  }, []);

  // BroadcastChannel publisher — drives any /display/awards tab open in
  // the same browser context. Operator tab is the source of truth.
  const publisherRef = useRef<ReturnType<typeof openAwardsPublisher> | null>(
    null,
  );
  useEffect(() => {
    publisherRef.current = openAwardsPublisher();
    return () => {
      publisherRef.current?.close();
      publisherRef.current = null;
    };
  }, []);
  useEffect(() => {
    publisherRef.current?.send(
      makeEnvelope({
        meetName,
        meetDate,
        totalAwards: awards.length,
        currentIndex: activeIndex,
        award: activeAward,
      }),
    );
  }, [activeAward, activeIndex, awards.length, meetName, meetDate]);

  if (fullscreen && activeAward) {
    return (
      <AwardsFullscreenOverlay
        award={activeAward}
        index={activeIndex}
        total={awards.length}
        meetName={meetName}
        meetDate={meetDate}
        controls={{
          onPrev: () => setActiveIndex((idx) => Math.max(idx - 1, 0)),
          onNext: () =>
            setActiveIndex((idx) =>
              Math.min(idx + 1, Math.max(awards.length - 1, 0)),
            ),
          onExit: () => setFullscreen(false),
          autoAdvance,
          onToggleAutoAdvance: () => setAutoAdvance((v) => !v),
        }}
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
            <Switch
              size="sm"
              label={t("awards.voiceAnnouncer")}
              checked={audioSettings.voiceEnabled}
              onChange={(event) => {
                dispatch(setVoiceEnabled(event.currentTarget.checked));
                if (!event.currentTarget.checked) {
                  audioService.cancelVoice();
                }
              }}
            />
            <SegmentedControl
              value={order}
              onChange={(value) => setOrder(value as AwardOrder)}
              data={[
                { value: "thirdToFirst", label: t("awards.thirdToFirst") },
                { value: "firstToThird", label: t("awards.firstToThird") },
              ]}
            />
            <Button
              variant="default"
              onClick={() =>
                window.open("/display/awards", "streetlifting-os-awards-display")
              }
              disabled={!activeAward}
            >
              {t("awards.openProjector")}
            </Button>
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
