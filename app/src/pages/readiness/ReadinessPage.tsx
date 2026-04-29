/**
 * ReadinessPage — /readiness
 *
 * Pre-flight gate before judging starts. Renders the structured checklist
 * from `@logic/readiness/checklist` and surfaces blockers/warnings with
 * direct links into the relevant page that fixes each.
 *
 * The page never blocks navigation — it is advisory. Operators can still
 * open Judging directly from the sidebar; this screen exists so they do
 * not start judging with broken pre-conditions and discover the gap mid-meet.
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Title,
  Stack,
  Group,
  Text,
  Badge,
  Card,
  Progress,
  Button,
  Divider,
  Alert,
} from "@mantine/core";
import { useAppSelector } from "@store/index";
import {
  buildReadinessReport,
  type ReadinessCheck,
} from "@logic/readiness/checklist";

function statusColor(status: ReadinessCheck["status"]): string {
  if (status === "ok") return "green";
  if (status === "warn") return "yellow";
  return "red";
}

function severityLabel(
  severity: ReadinessCheck["severity"],
  t: (k: string) => string,
): string {
  return severity === "blocker"
    ? t("readiness.severity.blocker")
    : t("readiness.severity.warning");
}

export function ReadinessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const saveFile = useAppSelector((s) => s.meet.current);
  const dirty = useAppSelector((s) => s.meet.dirty);
  const filePath = useAppSelector((s) => s.meet.filePath);

  const report = useMemo(
    () => buildReadinessReport({ saveFile, dirty, filePath }),
    [saveFile, dirty, filePath],
  );

  const { summary, checks } = report;
  const progressValue =
    summary.totalChecks > 0
      ? Math.round((summary.okChecks / summary.totalChecks) * 100)
      : 0;

  return (
    <Container size="md" py="md">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={2}>{t("readiness.title")}</Title>
          <Text c="dimmed" size="sm">
            {t("readiness.subtitle")}
          </Text>
        </Stack>

        <Card withBorder padding="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={600}>
                {t("readiness.summary.completed", {
                  ok: summary.okChecks,
                  total: summary.totalChecks,
                })}
              </Text>
              <Group gap="xs">
                <Badge color="red" variant="light">
                  {t("readiness.summary.blockers", { n: summary.blockerFails })}
                </Badge>
                <Badge color="yellow" variant="light">
                  {t("readiness.summary.warnings", { n: summary.warningFails })}
                </Badge>
              </Group>
            </Group>
            <Progress
              value={progressValue}
              color={
                summary.blockerFails > 0
                  ? "red"
                  : summary.warningFails > 0
                    ? "yellow"
                    : "green"
              }
              size="md"
              radius="sm"
            />
            {summary.canStartJudging ? (
              <Alert color="green" variant="light">
                {t("readiness.summary.readyToJudge")}
              </Alert>
            ) : (
              <Alert color="red" variant="light">
                {t("readiness.summary.blockedFromJudging")}
              </Alert>
            )}
            <Group>
              <Button
                color="red"
                disabled={!summary.canStartJudging}
                onClick={() => void navigate("/judging")}
              >
                {t("readiness.startJudging")}
              </Button>
              <Button
                variant="default"
                onClick={() => void navigate("/meet-setup")}
              >
                {t("nav.meetSetup")}
              </Button>
            </Group>
          </Stack>
        </Card>

        <Divider label={t("readiness.checklistLabel")} labelPosition="center" />

        <Stack gap="xs">
          {checks.map((c) => (
            <Card key={c.id} withBorder padding="sm">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={4} style={{ flex: 1 }}>
                  <Group gap="xs" wrap="nowrap">
                    <Badge color={statusColor(c.status)} variant="filled">
                      {t(`readiness.statusValue.${c.status}`)}
                    </Badge>
                    <Text fw={500}>{t(c.labelKey)}</Text>
                    <Badge
                      color={c.severity === "blocker" ? "red" : "yellow"}
                      variant="light"
                      size="xs"
                    >
                      {severityLabel(c.severity, t)}
                    </Badge>
                  </Group>
                  {c.status !== "ok" && (
                    <Text size="sm" c="dimmed">
                      {t(c.hintKey)}
                    </Text>
                  )}
                  {c.detail !== null && (
                    <Text size="xs" c="dimmed">
                      {c.detail}
                    </Text>
                  )}
                </Stack>
                {c.status !== "ok" && c.fixPath !== null && (
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => void navigate(c.fixPath!)}
                  >
                    {t("readiness.fix")}
                  </Button>
                )}
              </Group>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
