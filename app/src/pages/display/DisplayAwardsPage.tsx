/**
 * DisplayAwardsPage — /display/awards
 *
 * Projector-side follower for the awards ceremony. Subscribes to the
 * awards-broadcast channel and renders whatever the operator's
 * `/awards` tab is currently announcing. No local controls — the
 * operator drives.
 *
 * Mounted outside AppShell (see App.tsx /display/* routing) so the
 * full viewport is available for the ceremony.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Stack, Text } from "@mantine/core";
import { openAwardsListener } from "@/services/awards-broadcast";
import {
  shouldApply,
  type AwardsBroadcastMessage,
} from "@logic/reports/awards-broadcast";
import { AwardsFullscreenOverlay } from "@pages/awards/AwardsFullscreen";

export function DisplayAwardsPage() {
  const { t } = useTranslation();
  const [latest, setLatest] = useState<AwardsBroadcastMessage | null>(null);

  useEffect(() => {
    const listener = openAwardsListener((message) => {
      setLatest((prev) => (shouldApply(prev, message) ? message : prev));
    });
    return () => listener.close();
  }, []);

  // Empty/waiting state — projector opened before the operator started.
  if (latest === null || latest.award === null || latest.totalAwards === 0) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#08090c",
          color: "#9aa3b2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--mantine-font-family)",
        }}
      >
        <Stack align="center" gap="md">
          <Text size="xl" fw={700} c="white">
            {t("awards.title")}
          </Text>
          <Text size="md">{t("awards.displayWaiting")}</Text>
          <Text size="sm" style={{ opacity: 0.6 }}>
            {t("awards.displayHint")}
          </Text>
        </Stack>
      </div>
    );
  }

  return (
    <AwardsFullscreenOverlay
      award={latest.award}
      index={latest.currentIndex}
      total={latest.totalAwards}
      meetName={latest.meetName}
      meetDate={latest.meetDate}
    />
  );
}
