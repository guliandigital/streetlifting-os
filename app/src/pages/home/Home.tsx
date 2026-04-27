/**
 * Home page — Sprint 1 with save/load wired up.
 *
 * Buttons:
 *   - "Новое соревнование" → creates fresh meet from ISF v5.1 presets
 *   - "Загрузить соревнование" → opens file picker (Tauri) or browser file input
 *   - "Сохранить" → exports current meet to JSON file (Tauri save dialog or browser download)
 *   - "Продолжить" → no-op for now (would navigate to last-edited screen in V2)
 */

import { useState } from "react";
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

export function Home() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const meet = useAppSelector((s) => s.meet.current);
  const dirty = useAppSelector((s) => s.meet.dirty);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

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
      if (!result.saved) return; // user cancelled dialog
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

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1}>{t("home.title")}</Title>
          <Text c="dimmed">{t("app.tagline")}</Text>
        </Stack>

        <Group gap="sm">
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
          <Button size="md" variant="default" disabled>
            {t("home.continueMeet")}
          </Button>
        </Group>

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

        {meet && (
          <Card withBorder shadow="sm">
            <Stack gap="xs">
              <Title order={4}>
                Текущее соревнование: {meet.meet.name || "(без названия)"}
              </Title>
              <Text size="sm" c="dimmed">
                Дата: {meet.meet.date} · Город: {meet.meet.city || "—"} ·
                Формат: {meet.meet.competitionFormat} · Спортсменов:{" "}
                {meet.registration.entries.length}
              </Text>
              <Text size="xs" c="dimmed">
                stateVersion: {meet.versions.stateVersion} · releaseVersion:{" "}
                {meet.versions.releaseVersion}
              </Text>
            </Stack>
          </Card>
        )}

        <Alert
          color="red"
          variant="light"
          title={t("about.correctness.title")}
        >
          {t("about.correctness.m6")}
        </Alert>

        <Card withBorder shadow="sm">
          <Stack gap="xs">
            <Title order={4}>Sprint 1 build status — 10/10</Title>
            <Text size="sm" c="dimmed">
              Выполнено: типы, ISF v5.1 пресеты, голосование судей, age/masters,
              расчёт результата (Classic + ISF points), порядок подходов,
              forecast-stub, сохранение/загрузка с миграциями, регистрация +
              взвешивание. 167/167 тестов проходят.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
