/**
 * SchedulePage — /schedule
 *
 * Wall-clock projection for the meet, built on the pure
 * `buildSchedulePlan` service. Operator sees:
 *   - total estimated duration (with day/platform/flight breaks
 *     factored in)
 *   - per-day → per-platform → per-stream → per-group rows with
 *     athlete count + duration estimate
 *   - editable estimation config (attempt buffers, group setup, stream
 *     break) — local-only for V1.4; persisted MeetState extension is
 *     V2 work.
 *
 * Read-only: this page does not mutate the meet save-file. The plan
 * is recomputed on every entries / config change.
 */

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  NumberInput,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useAppSelector } from "@store/index";
import { selectEntries } from "@store/registration-slice";
import {
  buildSchedulePlan,
  DEFAULT_SCHEDULE_ESTIMATION,
  type ScheduleEstimationConfig,
} from "@logic/isf/scheduling";
import {
  formatDurationCompact,
  type DurationLocale,
} from "@logic/isf/duration-format";
import { exportSchedulePlanCsv } from "@logic/reports/csv-export-schedule";
import type { AttemptGroup, ScheduleStream } from "@domain/models";

const PRINT_STYLE = `
.print-only { display: none; }
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  @page { margin: 12mm; }
}
`;

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type StreamWithGroups = {
  stream: ScheduleStream;
  groups: AttemptGroup[];
  totalSec: number;
};

function groupStreamsByDayPlatform(
  plan: ReturnType<typeof buildSchedulePlan>,
): Map<number, Map<number, StreamWithGroups[]>> {
  const groupsByStream = new Map<string, AttemptGroup[]>();
  for (const group of plan.groups) {
    const list = groupsByStream.get(group.streamId) ?? [];
    list.push(group);
    groupsByStream.set(group.streamId, list);
  }
  const byDay = new Map<number, Map<number, StreamWithGroups[]>>();
  for (const stream of plan.streams) {
    const groups = groupsByStream.get(stream.id) ?? [];
    const totalSec = groups.reduce(
      (sum, g) => sum + g.estimatedDurationSec,
      0,
    );
    const dayMap = byDay.get(stream.day) ?? new Map<number, StreamWithGroups[]>();
    const platformList = dayMap.get(stream.platform) ?? [];
    platformList.push({ stream, groups, totalSec });
    dayMap.set(stream.platform, platformList);
    byDay.set(stream.day, dayMap);
  }
  return byDay;
}

export function SchedulePage() {
  const { t, i18n } = useTranslation();
  const meet = useAppSelector((s) => s.meet.current);
  const entries = useAppSelector(selectEntries);
  const [config, setConfig] = useState<ScheduleEstimationConfig>(
    DEFAULT_SCHEDULE_ESTIMATION,
  );

  const locale: DurationLocale = i18n.language === "ru-RU" ? "ru-RU" : "en-US";

  const plan = useMemo(() => {
    if (!meet) return null;
    return buildSchedulePlan(entries, meet.meet, config);
  }, [entries, meet, config]);

  const byDayPlatform = useMemo<
    Map<number, Map<number, StreamWithGroups[]>>
  >(
    () =>
      plan
        ? groupStreamsByDayPlatform(plan)
        : new Map<number, Map<number, StreamWithGroups[]>>(),
    [plan],
  );

  function setConfigField<K extends keyof ScheduleEstimationConfig>(
    key: K,
    value: number,
  ): void {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  if (!meet) return null;

  const totalLabel = plan
    ? formatDurationCompact(plan.totalEstimatedDurationSec, locale)
    : "—";

  function meetSlug(): string {
    const name = meet?.meet.name ?? "meet";
    return name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "meet";
  }

  function handleDownloadCsv(): void {
    if (!plan) return;
    const csv = exportSchedulePlanCsv(plan);
    downloadCsv(`${meetSlug()}-schedule.csv`, csv);
  }

  return (
    <>
      <style>{PRINT_STYLE}</style>
      <Container size="xl" py="md">
        <Stack gap="lg">
        <Group justify="space-between" align="flex-start" className="no-print">
          <Stack gap={4}>
            <Title order={2}>{t("schedule.title")}</Title>
            <Text size="sm" c="dimmed">
              {t("schedule.subtitle")}
            </Text>
          </Stack>
          <Group gap="sm">
            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadCsv}
              disabled={!plan || plan.streams.length === 0}
            >
              {t("schedule.downloadCsv")}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => window.print()}
              disabled={!plan || plan.streams.length === 0}
            >
              {t("schedule.print")}
            </Button>
          </Group>
        </Group>

        <div className="print-only">
          <Title order={2}>{t("schedule.title")}</Title>
          <Text size="sm">{meet.meet.name} · {meet.meet.date}</Text>
        </div>

        <Card withBorder padding="md">
          <Group justify="space-between">
            <Stack gap={2}>
              <Text fw={700} size="md">
                {t("schedule.totalEstimate")}
              </Text>
              <Text size="xl" fw={900} c="red">
                {totalLabel}
              </Text>
            </Stack>
            <Stack gap={2} align="flex-end">
              <Text size="sm" c="dimmed">
                {t("schedule.entries", { n: entries.length })}
              </Text>
              <Text size="sm" c="dimmed">
                {t("schedule.streamsAndGroups", {
                  s: plan?.streams.length ?? 0,
                  g: plan?.groups.length ?? 0,
                })}
              </Text>
            </Stack>
          </Group>
        </Card>

        <Card withBorder padding="md" className="no-print">
          <Stack gap="sm">
            <Text fw={600} size="sm">
              {t("schedule.estimationConfig")}
            </Text>
            <Group grow gap="md">
              <NumberInput
                label={t("schedule.config.classicAttempts")}
                value={config.classicAttemptsPerExercise}
                onChange={(v) =>
                  setConfigField(
                    "classicAttemptsPerExercise",
                    typeof v === "number" ? v : Number(v) || 3,
                  )
                }
                min={1}
                max={10}
                step={1}
              />
              <NumberInput
                label={t("schedule.config.classicBufferSec")}
                value={config.classicAttemptBufferSec}
                onChange={(v) =>
                  setConfigField(
                    "classicAttemptBufferSec",
                    typeof v === "number" ? v : Number(v) || 30,
                  )
                }
                min={0}
                max={300}
                step={5}
              />
              <NumberInput
                label={t("schedule.config.multirepBufferSec")}
                value={config.multirepAttemptBufferSec}
                onChange={(v) =>
                  setConfigField(
                    "multirepAttemptBufferSec",
                    typeof v === "number" ? v : Number(v) || 45,
                  )
                }
                min={0}
                max={600}
                step={5}
              />
              <NumberInput
                label={t("schedule.config.groupSetupSec")}
                value={config.groupSetupSec}
                onChange={(v) =>
                  setConfigField(
                    "groupSetupSec",
                    typeof v === "number" ? v : Number(v) || 180,
                  )
                }
                min={0}
                max={1800}
                step={30}
              />
              <NumberInput
                label={t("schedule.config.streamBreakSec")}
                value={config.streamBreakSec}
                onChange={(v) =>
                  setConfigField(
                    "streamBreakSec",
                    typeof v === "number" ? v : Number(v) || 300,
                  )
                }
                min={0}
                max={3600}
                step={30}
              />
            </Group>
            <Group>
              <Button
                size="xs"
                variant="default"
                onClick={() => setConfig(DEFAULT_SCHEDULE_ESTIMATION)}
              >
                {t("schedule.resetDefaults")}
              </Button>
              <Text size="xs" c="dimmed">
                {t("schedule.configHint")}
              </Text>
            </Group>
          </Stack>
        </Card>

        {plan && plan.streams.length === 0 ? (
          <Alert color="yellow">{t("schedule.empty")}</Alert>
        ) : (
          <Stack gap="md">
            {Array.from(byDayPlatform.entries())
              .sort(([a], [b]) => a - b)
              .map(([day, platformMap]) => (
                <Card withBorder padding="md" key={`day-${day}`}>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text fw={700}>
                        {t("schedule.dayHeader", { day })}
                      </Text>
                      <Badge color="red" variant="light" size="lg">
                        {formatDurationCompact(
                          Array.from(platformMap.values())
                            .flat()
                            .reduce((sum, s) => sum + s.totalSec, 0),
                          locale,
                        )}
                      </Badge>
                    </Group>

                    {Array.from(platformMap.entries())
                      .sort(([a], [b]) => a - b)
                      .map(([platform, streamList]) => (
                        <Stack gap="xs" key={`day-${day}-platform-${platform}`}>
                          <Text fw={600} size="sm" c="dimmed">
                            {t("schedule.platformHeader", { platform })}
                          </Text>
                          <Table withTableBorder withColumnBorders fz="xs" striped>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>{t("schedule.col.flight")}</Table.Th>
                                <Table.Th>{t("schedule.col.discipline")}</Table.Th>
                                <Table.Th>{t("schedule.col.exercise")}</Table.Th>
                                <Table.Th>
                                  {t("schedule.col.athletes")}
                                </Table.Th>
                                <Table.Th>
                                  {t("schedule.col.duration")}
                                </Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {streamList.flatMap(({ stream, groups }) =>
                                groups.length === 0 ? (
                                  <Table.Tr key={stream.id}>
                                    <Table.Td>{stream.flight || "—"}</Table.Td>
                                    <Table.Td colSpan={3}>
                                      <Text size="xs" c="dimmed">
                                        {t("schedule.streamNoGroups")}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>—</Table.Td>
                                  </Table.Tr>
                                ) : (
                                  groups.map((g, i) => (
                                    <Table.Tr key={g.id}>
                                      <Table.Td>
                                        {i === 0 ? stream.flight || "—" : ""}
                                      </Table.Td>
                                      <Table.Td>{g.disciplineCode}</Table.Td>
                                      <Table.Td>{g.exercise}</Table.Td>
                                      <Table.Td>{g.entryIds.length}</Table.Td>
                                      <Table.Td>
                                        {formatDurationCompact(
                                          g.estimatedDurationSec,
                                          locale,
                                        )}
                                      </Table.Td>
                                    </Table.Tr>
                                  ))
                                ),
                              )}
                            </Table.Tbody>
                          </Table>
                        </Stack>
                      ))}
                  </Stack>
                </Card>
              ))}
          </Stack>
        )}
        </Stack>
      </Container>
    </>
  );
}
