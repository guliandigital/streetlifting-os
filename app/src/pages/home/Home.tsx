/**
 * Home page — Sprint 5 tournament dashboard.
 *
 * Shows a welcome card with quick-start guide when no meet is open.
 * Shows meet stats (athletes, weigh-ins, attempts, disciplines) when a meet is loaded.
 * Includes auto-updater check button when running in Tauri.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Stack,
  Title,
  Text,
  Button,
  Group,
  Card,
  Alert,
  Notification,
  SimpleGrid,
  Progress,
  List,
  Badge,
  Divider,
} from "@mantine/core";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "@store/index";
import {
  newMeet as newMeetAction,
  loadMeet as loadMeetAction,
  markSaved,
} from "@store/meet-slice";
import {
  saveToFile,
  loadFromFile,
  SaveFileDecodeError,
} from "@/persistence";
import { countWeighedIn, countAttemptsDone, countAttemptsTotal } from "./home-stats";

const APP_RELEASE_VERSION = "0.5.0";

declare global {
  interface Window {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  }
}

function isTauriEnv(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.__TAURI__ !== undefined || window.__TAURI_INTERNALS__ !== undefined)
  );
}

export function Home() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const meet = useAppSelector((s) => s.meet.current);
  const dirty = useAppSelector((s) => s.meet.dirty);
  const filePath = useAppSelector((s) => s.meet.filePath);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  function handleNew() {
    dispatch(newMeetAction());
    setOkMsg(t("home.newMeet") + " ✓");
    setErrMsg(null);
  }

  async function handleLoad() {
    setErrMsg(null);
    setOkMsg(null);
    try {
      const result = await loadFromFile();
      if (!result.loaded || !result.saveFile) return;
      dispatch(
        loadMeetAction({
          saveFile: result.saveFile,
          ...(result.path !== undefined && { filePath: result.path }),
        }),
      );
      setOkMsg(t("home.loadMeet") + " ✓");
    } catch (err) {
      setErrMsg(
        err instanceof SaveFileDecodeError
          ? `Ошибка загрузки: ${err.message}`
          : `Не удалось загрузить файл: ${
              err instanceof Error ? err.message : String(err)
            }`,
      );
    }
  }

  async function handleSave() {
    if (!meet) return;
    setErrMsg(null);
    setOkMsg(null);
    try {
      const result = await saveToFile(meet);
      if (!result.saved) return;
      dispatch(
        markSaved(result.path !== undefined ? { filePath: result.path } : {}),
      );
      setOkMsg(t("home.saveMeet") + " ✓");
    } catch (err) {
      setErrMsg(
        `Не удалось сохранить файл: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async function handleCheckUpdates() {
    setCheckingUpdate(true);
    setUpdateMsg(null);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update?.available) {
        setUpdateMsg(`${t("home.updateAvailable")}: v${update.version}`);
      } else {
        setUpdateMsg(t("home.upToDate"));
      }
    } catch {
      // Placeholder pubkey or no network — silently degrade
      setUpdateMsg(t("home.updateUnavailable"));
    } finally {
      setCheckingUpdate(false);
    }
  }

  // Stats for meet dashboard
  const entries = meet?.registration.entries ?? [];
  const totalAthletes = entries.length;
  const weighedIn = countWeighedIn(entries);
  const attemptsDone = countAttemptsDone(entries);
  const attemptsTotal = countAttemptsTotal(entries);
  const disciplineCount = meet?.meet.enabledDisciplineCodes.length ?? 0;
  const progressPct =
    attemptsTotal > 0 ? Math.round((attemptsDone / attemptsTotal) * 100) : 0;

  const fileStatusText =
    dirty || !filePath
      ? t("home.unsaved")
      : `${t("home.savedAt")}: ${filePath}`;

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        {/* Action toolbar */}
        <Stack gap={4}>
          <Group gap="sm" wrap="wrap">
            <Button size="md" onClick={handleNew}>
              {t("home.newMeet")}
            </Button>
            <Button size="md" variant="default" onClick={() => { void handleLoad(); }}>
              {t("home.loadMeet")}
            </Button>
            <Button
              size="md"
              variant="default"
              onClick={() => { void handleSave(); }}
              disabled={!meet}
            >
              {t("home.saveMeet")}
              {dirty ? " *" : ""}
            </Button>
          </Group>

          {/* File path indicator */}
          <Text size="xs" c={dirty || !filePath ? "orange" : "dimmed"}>
            {fileStatusText}
          </Text>
        </Stack>

        {/* Notifications */}
        {okMsg && (
          <Notification
            color="green"
            onClose={() => setOkMsg(null)}
            title="OK"
          >
            {okMsg}
          </Notification>
        )}
        {errMsg && (
          <Notification
            color="red"
            onClose={() => setErrMsg(null)}
            title="Ошибка"
          >
            {errMsg}
          </Notification>
        )}
        {updateMsg && (
          <Notification
            color={updateMsg === t("home.upToDate") ? "green" : "blue"}
            onClose={() => setUpdateMsg(null)}
            title={t("home.checkUpdates")}
          >
            {updateMsg}
          </Notification>
        )}

        {/* No meet: welcome card */}
        {!meet && (
          <Card withBorder shadow="sm" p="xl">
            <Stack gap="md" align="center">
              {/* ISF logo placeholder */}
              <Badge color="red" size="xl" variant="filled" radius="sm">
                ISF v5.1
              </Badge>
              <Title order={2} ta="center">
                Streetlifting OS
              </Title>
              <Text c="dimmed" ta="center">
                {t("app.tagline")}
              </Text>
              <Text c="dimmed" ta="center" size="sm">
                {t("home.quickStart.title")} — создайте новое соревнование или
                загрузите существующий файл
              </Text>

              <Divider w="100%" />

              <Stack gap="xs" w="100%">
                <Text fw={600}>{t("home.quickStart.title")}</Text>
                <List type="ordered" spacing="xs" size="sm">
                  <List.Item>{t("home.quickStart.step1")}</List.Item>
                  <List.Item>{t("home.quickStart.step2")}</List.Item>
                  <List.Item>{t("home.quickStart.step3")}</List.Item>
                  <List.Item>{t("home.quickStart.step4")}</List.Item>
                  <List.Item>{t("home.quickStart.step5")}</List.Item>
                </List>
              </Stack>
            </Stack>
          </Card>
        )}

        {/* Meet open: dashboard */}
        {meet && (
          <Stack gap="md">
            {/* Meet header */}
            <Stack gap={2}>
              <Title order={2}>
                {meet.meet.name || "(без названия)"}
              </Title>
              <Text c="dimmed" size="sm">
                {meet.meet.federation}
                {meet.meet.city ? ` · ${meet.meet.city}` : ""}
                {meet.meet.date ? ` · ${meet.meet.date}` : ""}
              </Text>
            </Stack>

            {/* Stat cards grid */}
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
              <StatCard
                emoji="👤"
                label={t("home.stats.athletes")}
                value={String(totalAthletes)}
              />
              <StatCard
                emoji="⚖️"
                label={t("home.stats.weighedIn")}
                value={`${weighedIn} / ${totalAthletes}`}
              />
              <StatCard
                emoji="🏋️"
                label={t("home.stats.attempts")}
                value={`${attemptsDone} / ${attemptsTotal}`}
              />
              <StatCard
                emoji="🏆"
                label={t("home.stats.disciplines")}
                value={String(disciplineCount)}
              />
            </SimpleGrid>

            {/* Progress bar */}
            {attemptsTotal > 0 && (
              <Stack gap={4}>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    {t("home.stats.attempts")}: {progressPct}%
                  </Text>
                  <Text size="sm" c="dimmed">
                    {attemptsDone} / {attemptsTotal}
                  </Text>
                </Group>
                <Progress value={progressPct} color="blue" size="sm" />
              </Stack>
            )}

            {/* Quick jump buttons */}
            <Stack gap="xs">
              <Text size="sm" fw={600} c="dimmed">
                {t("home.quickJump")}
              </Text>
              <Group gap="sm" wrap="wrap">
                <Button
                  size="sm"
                  variant="light"
                  color="blue"
                  onClick={() => void navigate("/judging")}
                >
                  🏋️ {t("nav.judging")}
                </Button>
                <Button
                  size="sm"
                  variant="light"
                  color="teal"
                  onClick={() => void navigate("/results")}
                >
                  🏆 {t("nav.results")}
                </Button>
                <Button
                  size="sm"
                  variant="light"
                  color="grape"
                  onClick={() => void navigate("/registration")}
                >
                  📋 {t("nav.registration")}
                </Button>
                <Button
                  size="sm"
                  variant="light"
                  color="orange"
                  onClick={() => void navigate("/weigh-ins")}
                >
                  ⚖️ {t("nav.weighIns")}
                </Button>
              </Group>
            </Stack>
          </Stack>
        )}

        {/* Scoreboard link */}
        <Group>
          <a href="/scoreboard" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <Button size="xs" variant="subtle" color="gray" leftSection={<Text span>📺</Text>}>
              {t("scoreboard.openScoreboard")}
            </Button>
          </a>
        </Group>

        {/* ISF correctness marketing card */}
        <Alert
          color="red"
          variant="light"
          title={t("about.correctness.title")}
        >
          {t("about.correctness.m6")}
        </Alert>

        {/* Tauri: update check */}
        {isTauriEnv() && (
          <Group>
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              loading={checkingUpdate}
              onClick={() => void handleCheckUpdates()}
            >
              {t("home.checkUpdates")}
            </Button>
          </Group>
        )}

        {/* Version badge */}
        <Text size="xs" c="dimmed">
          Streetlifting OS v{APP_RELEASE_VERSION} · ISF Rules v5.1 (2025-08-01)
        </Text>
      </Stack>
    </Container>
  );
}

// ─── StatCard sub-component ───────────────────────────────────────────────────

interface StatCardProps {
  emoji: string;
  label: string;
  value: string;
}

function StatCard({ emoji, label, value }: StatCardProps) {
  return (
    <Card withBorder shadow="xs" p="md">
      <Stack gap={4} align="center">
        <Text size="xl">{emoji}</Text>
        <Text size="xs" c="dimmed" ta="center">
          {label}
        </Text>
        <Title order={3} ta="center">
          {value}
        </Title>
      </Stack>
    </Card>
  );
}
