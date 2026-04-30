/**
 * AwardsFullscreenOverlay — the projector-scale view of the active
 * podium award. Used by:
 *   - AwardsCeremonyPage (operator) with full controls.
 *   - DisplayAwardsPage   (projector) without controls — tab is a
 *     read-only follower of broadcasts from the operator tab.
 *
 * Visual contract:
 *   - Background gradient picks up the medal accent for the active
 *     place (gold / silver / bronze) per `placeAccent`.
 *   - Place number scales to 200 px, athlete name to 96 px.
 *   - z-index 1000 + position:fixed covers the AppShell when used
 *     inside the operator route; on the dedicated display route the
 *     route is mounted outside AppShell so this is moot but harmless.
 */

import { Badge, Button, Group, Stack, Switch, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  placeAccent,
  type CeremonyAward,
} from "@logic/reports/awards-ceremony";

export type AwardsFullscreenControls = {
  onPrev?: () => void;
  onNext?: () => void;
  onExit?: () => void;
  autoAdvance?: boolean;
  onToggleAutoAdvance?: () => void;
};

export function AwardsFullscreenOverlay({
  award,
  index,
  total,
  meetName,
  meetDate,
  controls,
}: {
  award: CeremonyAward;
  index: number;
  total: number;
  meetName: string;
  meetDate: string;
  controls?: AwardsFullscreenControls;
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
          {controls?.onToggleAutoAdvance && (
            <Switch
              size="sm"
              color="yellow"
              label={t("awards.autoAdvance")}
              checked={controls.autoAdvance ?? false}
              onChange={controls.onToggleAutoAdvance}
              styles={{ label: { color: accent.text } }}
            />
          )}
          {controls?.onExit && (
            <Button size="sm" color="dark" variant="white" onClick={controls.onExit}>
              {t("awards.exitFullscreen")} (Esc)
            </Button>
          )}
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
        {controls?.onPrev ? (
          <Button
            size="lg"
            variant="white"
            color="dark"
            onClick={controls.onPrev}
            disabled={index === 0}
          >
            ← {t("awards.previous")}
          </Button>
        ) : (
          <div />
        )}
        <Text size="xl" fw={700} style={{ opacity: 0.85 }}>
          {index + 1} / {total}
        </Text>
        {controls?.onNext ? (
          <Button
            size="lg"
            variant="white"
            color="dark"
            onClick={controls.onNext}
            disabled={index >= total - 1}
          >
            {t("awards.next")} →
          </Button>
        ) : (
          <div />
        )}
      </Group>
    </div>
  );
}
