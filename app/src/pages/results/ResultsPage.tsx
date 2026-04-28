/**
 * ResultsPage — Sprint 2 (Classic) + Sprint 3 (Multirep) results screen.
 *
 * Top-level format tabs (Classic | Multirep) — shown only for formats present
 * in the entry list. Within each format: byCategory + byPoints sub-tabs and a
 * CSV download button.
 *
 * Route guard: handled by RequireMeet in App.tsx.
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Container,
  Title,
  Tabs,
  Table,
  Text,
  Button,
  Group,
  Stack,
  Badge,
} from "@mantine/core";
import { useAppSelector } from "@store/index";
import { selectEntries } from "@store/registration-slice";
import {
  computeClassicResults,
  computeClassicRows,
} from "@logic/isf/classic-placing";
import type {
  ClassicResultRow,
  ClassicResultGroup,
  AttemptDisplay,
} from "@logic/isf/classic-placing";
import { exportClassicProtocolCsv } from "@logic/isf/csv-export-classic";
import {
  computeMultirepResults,
  computeMultirepRows,
} from "@logic/isf/multirep-placing";
import type {
  MultirepResultRow,
  MultirepResultGroup,
} from "@logic/isf/multirep-placing";
import { exportMultirepProtocolCsv } from "@logic/isf/csv-export-multirep";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function placeColor(place: number | null): string | undefined {
  if (place === 1) return "#FFD700";
  if (place === 2) return "#C0C0C0";
  if (place === 3) return "#CD7F32";
  return undefined;
}

function AttemptCell({ val }: { val: AttemptDisplay }) {
  if (val === null) {
    return <Text size="xs" c="dimmed">–</Text>;
  }
  if (val < 0) {
    return (
      <Text size="xs" c="red" td="line-through">
        {Math.abs(val)}
      </Text>
    );
  }
  return <Text size="xs" c="green">{val}</Text>;
}

function PlaceCell({
  place,
  guest,
}: {
  place: number | null;
  guest: boolean;
}) {
  const { t } = useTranslation();
  if (guest) {
    return <Text size="sm" fs="italic" c="dimmed">{t("results.guest")}</Text>;
  }
  if (place === null) return <Text size="sm">–</Text>;
  const color = placeColor(place);
  return (
    <Text size="sm" fw={600} style={{ color }}>
      {place}
    </Text>
  );
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Classic — Category table ────────────────────────────────────────────────

function ClassicCategoryGroupTable({ group }: { group: ClassicResultGroup }) {
  const { t } = useTranslation();

  return (
    <Stack gap="xs" mb="xl">
      <Text fw={600} size="md" mb={4}>
        {group.label}
      </Text>
      <Table striped withTableBorder withColumnBorders fz="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("results.place")}</Table.Th>
            <Table.Th>{t("results.name")}</Table.Th>
            <Table.Th>{t("results.team")}</Table.Th>
            <Table.Th>{t("results.weightCat")}</Table.Th>
            <Table.Th>{t("results.bodyweight")}</Table.Th>
            <Table.Th>P1</Table.Th>
            <Table.Th>P2</Table.Th>
            <Table.Th>P3</Table.Th>
            <Table.Th>{t("results.puBest")}</Table.Th>
            <Table.Th>D1</Table.Th>
            <Table.Th>D2</Table.Th>
            <Table.Th>D3</Table.Th>
            <Table.Th>{t("results.diBest")}</Table.Th>
            <Table.Th>{t("results.total")}</Table.Th>
            <Table.Th>{t("results.coef")}</Table.Th>
            <Table.Th>{t("results.isfPoints")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {group.rows.map((row) => (
            <Table.Tr
              key={row.entry.id}
              style={{
                fontStyle: row.entry.guest ? "italic" : undefined,
                opacity: row.entry.guest ? 0.75 : 1,
              }}
            >
              <Table.Td>
                <PlaceCell place={row.place} guest={row.entry.guest} />
              </Table.Td>
              <Table.Td><Text size="sm">{row.entry.name}</Text></Table.Td>
              <Table.Td><Text size="sm" c="dimmed">{row.entry.team ?? "–"}</Text></Table.Td>
              <Table.Td><Text size="xs">{row.resolvedWeightCategoryCode ?? "–"}</Text></Table.Td>
              <Table.Td><Text size="xs">{row.entry.bodyweightKg ?? "–"}</Text></Table.Td>
              <Table.Td><AttemptCell val={row.puAttempts[0]} /></Table.Td>
              <Table.Td><AttemptCell val={row.puAttempts[1]} /></Table.Td>
              <Table.Td><AttemptCell val={row.puAttempts[2]} /></Table.Td>
              <Table.Td><Text size="xs" fw={500}>{row.puBest > 0 ? row.puBest : "–"}</Text></Table.Td>
              <Table.Td><AttemptCell val={row.diAttempts[0]} /></Table.Td>
              <Table.Td><AttemptCell val={row.diAttempts[1]} /></Table.Td>
              <Table.Td><AttemptCell val={row.diAttempts[2]} /></Table.Td>
              <Table.Td><Text size="xs" fw={500}>{row.diBest > 0 ? row.diBest : "–"}</Text></Table.Td>
              <Table.Td><Text size="xs" fw={600}>{row.total}</Text></Table.Td>
              <Table.Td><Text size="xs">{row.isfCoefficient.toFixed(3)}</Text></Table.Td>
              <Table.Td><Text size="xs">{row.isfFinalPoints.toFixed(2)}</Text></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

function ClassicAbsoluteTable({ rows }: { rows: ClassicResultRow[] }) {
  const { t } = useTranslation();

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.isfFinalPoints - a.isfFinalPoints),
    [rows],
  );

  return (
    <Table striped withTableBorder withColumnBorders fz="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t("results.place")}</Table.Th>
          <Table.Th>{t("results.name")}</Table.Th>
          <Table.Th>Пол / Sex</Table.Th>
          <Table.Th>{t("results.weightCat")}</Table.Th>
          <Table.Th>{t("results.bodyweight")}</Table.Th>
          <Table.Th>{t("results.total")}</Table.Th>
          <Table.Th>{t("results.coef")}</Table.Th>
          <Table.Th>{t("results.isfPoints")}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {sorted.map((row, i) => {
          const place = i + 1;
          const color = placeColor(place);
          return (
            <Table.Tr key={row.entry.id}>
              <Table.Td><Text size="sm" fw={600} style={{ color }}>{place}</Text></Table.Td>
              <Table.Td><Text size="sm">{row.entry.name}</Text></Table.Td>
              <Table.Td><Badge size="xs" variant="light">{row.entry.sex}</Badge></Table.Td>
              <Table.Td><Text size="xs">{row.resolvedWeightCategoryCode ?? "–"}</Text></Table.Td>
              <Table.Td><Text size="xs">{row.entry.bodyweightKg ?? "–"}</Text></Table.Td>
              <Table.Td><Text size="xs" fw={600}>{row.total}</Text></Table.Td>
              <Table.Td><Text size="xs">{row.isfCoefficient.toFixed(3)}</Text></Table.Td>
              <Table.Td><Text size="xs" fw={600}>{row.isfFinalPoints.toFixed(2)}</Text></Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}

// ─── Multirep — Category table ───────────────────────────────────────────────

function MultirepCategoryGroupTable({ group }: { group: MultirepResultGroup }) {
  const { t } = useTranslation();

  return (
    <Stack gap="xs" mb="xl">
      <Text fw={600} size="md" mb={4}>
        {group.label}
      </Text>
      <Table striped withTableBorder withColumnBorders fz="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("results.place")}</Table.Th>
            <Table.Th>{t("results.name")}</Table.Th>
            <Table.Th>{t("results.team")}</Table.Th>
            <Table.Th>{t("results.weightCat")}</Table.Th>
            <Table.Th>{t("results.bodyweight")}</Table.Th>
            <Table.Th>{t("results.multirep.puLoad")}</Table.Th>
            <Table.Th>{t("results.multirep.puReps")}</Table.Th>
            <Table.Th>{t("results.multirep.diLoad")}</Table.Th>
            <Table.Th>{t("results.multirep.diReps")}</Table.Th>
            <Table.Th>{t("results.multirep.totalReps")}</Table.Th>
            <Table.Th>{t("results.coef")}</Table.Th>
            <Table.Th>{t("results.isfPoints")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {group.rows.map((row) => (
            <Table.Tr
              key={row.entry.id}
              style={{
                fontStyle: row.entry.guest ? "italic" : undefined,
                opacity: row.entry.guest ? 0.75 : 1,
              }}
            >
              <Table.Td>
                <PlaceCell place={row.place} guest={row.entry.guest} />
              </Table.Td>
              <Table.Td><Text size="sm">{row.entry.name}</Text></Table.Td>
              <Table.Td><Text size="sm" c="dimmed">{row.entry.team ?? "–"}</Text></Table.Td>
              <Table.Td><Text size="xs">{row.resolvedWeightCategoryCode ?? "–"}</Text></Table.Td>
              <Table.Td><Text size="xs">{row.entry.bodyweightKg ?? "–"}</Text></Table.Td>
              <Table.Td><Text size="xs">{row.presetLoadKgPU ?? "–"}</Text></Table.Td>
              <Table.Td><Text size="xs" fw={500}>{row.puReps > 0 ? row.puReps : "–"}</Text></Table.Td>
              <Table.Td><Text size="xs">{row.presetLoadKgDI ?? "–"}</Text></Table.Td>
              <Table.Td><Text size="xs" fw={500}>{row.diReps > 0 ? row.diReps : "–"}</Text></Table.Td>
              <Table.Td><Text size="xs" fw={600}>{row.totalReps}</Text></Table.Td>
              <Table.Td><Text size="xs">{row.isfCoefficient.toFixed(3)}</Text></Table.Td>
              <Table.Td><Text size="xs">{row.isfFinalPoints.toFixed(2)}</Text></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

function MultirepAbsoluteTable({ rows }: { rows: MultirepResultRow[] }) {
  const { t } = useTranslation();

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.isfFinalPoints - a.isfFinalPoints),
    [rows],
  );

  return (
    <Table striped withTableBorder withColumnBorders fz="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t("results.place")}</Table.Th>
          <Table.Th>{t("results.name")}</Table.Th>
          <Table.Th>Пол / Sex</Table.Th>
          <Table.Th>{t("results.weightCat")}</Table.Th>
          <Table.Th>{t("results.bodyweight")}</Table.Th>
          <Table.Th>{t("results.multirep.totalReps")}</Table.Th>
          <Table.Th>{t("results.coef")}</Table.Th>
          <Table.Th>{t("results.isfPoints")}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {sorted.map((row, i) => {
          const place = i + 1;
          const color = placeColor(place);
          return (
            <Table.Tr key={row.entry.id}>
              <Table.Td><Text size="sm" fw={600} style={{ color }}>{place}</Text></Table.Td>
              <Table.Td><Text size="sm">{row.entry.name}</Text></Table.Td>
              <Table.Td><Badge size="xs" variant="light">{row.entry.sex}</Badge></Table.Td>
              <Table.Td><Text size="xs">{row.resolvedWeightCategoryCode ?? "–"}</Text></Table.Td>
              <Table.Td><Text size="xs">{row.entry.bodyweightKg ?? "–"}</Text></Table.Td>
              <Table.Td><Text size="xs" fw={600}>{row.totalReps}</Text></Table.Td>
              <Table.Td><Text size="xs">{row.isfCoefficient.toFixed(3)}</Text></Table.Td>
              <Table.Td><Text size="xs" fw={600}>{row.isfFinalPoints.toFixed(2)}</Text></Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function ResultsPage() {
  const { t } = useTranslation();
  const meet = useAppSelector((s) => s.meet.current);
  const entries = useAppSelector(selectEntries);

  const meetDate = meet?.meet.date ?? new Date().toISOString().slice(0, 10);
  const meetName = meet?.meet.name ?? "Meet";

  const hasClassic = entries.some((e) => e.competitionFormat === "classic");
  const hasMultirep = entries.some((e) => e.competitionFormat === "multirep");

  const classicGroups = useMemo<ClassicResultGroup[]>(() => {
    if (!meet || !hasClassic) return [];
    return computeClassicResults(entries, meet.meet, meetDate);
  }, [meet, entries, meetDate, hasClassic]);

  const classicRows = useMemo<ClassicResultRow[]>(() => {
    if (!meet || !hasClassic) return [];
    return computeClassicRows(entries, meet.meet, meetDate).filter((r) => !r.entry.guest);
  }, [meet, entries, meetDate, hasClassic]);

  const multirepGroups = useMemo<MultirepResultGroup[]>(() => {
    if (!meet || !hasMultirep) return [];
    return computeMultirepResults(entries, meet.meet, meetDate);
  }, [meet, entries, meetDate, hasMultirep]);

  const multirepRows = useMemo<MultirepResultRow[]>(() => {
    if (!meet || !hasMultirep) return [];
    return computeMultirepRows(entries, meet.meet, meetDate).filter((r) => !r.entry.guest);
  }, [meet, entries, meetDate, hasMultirep]);

  function handleDownloadClassicCsv() {
    const csv = exportClassicProtocolCsv(classicGroups, meetName, meetDate);
    downloadCsv(csv, `results-${meetDate}.csv`);
  }

  function handleDownloadMultirepCsv() {
    const csv = exportMultirepProtocolCsv(multirepGroups, meetName, meetDate);
    downloadCsv(csv, `multirep-results-${meetDate}.csv`);
  }

  const showFormatTabs = hasClassic && hasMultirep;
  const onlyClassic = hasClassic && !hasMultirep;
  const onlyMultirep = hasMultirep && !hasClassic;
  const noEntries = !hasClassic && !hasMultirep;

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="lg">
        <Title order={2}>{t("results.title")}</Title>
      </Group>

      {noEntries ? (
        <Text c="dimmed" ta="center" py="xl">
          {t("results.noResults")}
        </Text>
      ) : showFormatTabs ? (
        <Tabs defaultValue="classic">
          <Tabs.List mb="md">
            <Tabs.Tab value="classic">{t("results.formatTab.classic")}</Tabs.Tab>
            <Tabs.Tab value="multirep">{t("results.formatTab.multirep")}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="classic">
            <ClassicResultsBlock
              groups={classicGroups}
              nonGuestRows={classicRows}
              onDownload={handleDownloadClassicCsv}
            />
          </Tabs.Panel>

          <Tabs.Panel value="multirep">
            <MultirepResultsBlock
              groups={multirepGroups}
              nonGuestRows={multirepRows}
              onDownload={handleDownloadMultirepCsv}
            />
          </Tabs.Panel>
        </Tabs>
      ) : onlyClassic ? (
        <ClassicResultsBlock
          groups={classicGroups}
          nonGuestRows={classicRows}
          onDownload={handleDownloadClassicCsv}
        />
      ) : onlyMultirep ? (
        <MultirepResultsBlock
          groups={multirepGroups}
          nonGuestRows={multirepRows}
          onDownload={handleDownloadMultirepCsv}
        />
      ) : null}
    </Container>
  );
}

function ClassicResultsBlock({
  groups,
  nonGuestRows,
  onDownload,
}: {
  groups: ClassicResultGroup[];
  nonGuestRows: ClassicResultRow[];
  onDownload: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <Group justify="flex-end">
        <Button variant="outline" size="sm" onClick={onDownload}>
          {t("results.downloadCsv")}
        </Button>
      </Group>
      <Tabs defaultValue="byCategory">
        <Tabs.List mb="md">
          <Tabs.Tab value="byCategory">{t("results.byCategory")}</Tabs.Tab>
          <Tabs.Tab value="byPoints">{t("results.byPoints")}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="byCategory">
          {groups.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              {t("results.noResults")}
            </Text>
          ) : (
            groups.map((group) => (
              <ClassicCategoryGroupTable key={group.label} group={group} />
            ))
          )}
        </Tabs.Panel>

        <Tabs.Panel value="byPoints">
          <Text fw={600} size="md" mb="md">
            {t("results.absolute")}
          </Text>
          {nonGuestRows.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              {t("results.noResults")}
            </Text>
          ) : (
            <ClassicAbsoluteTable rows={nonGuestRows} />
          )}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function MultirepResultsBlock({
  groups,
  nonGuestRows,
  onDownload,
}: {
  groups: MultirepResultGroup[];
  nonGuestRows: MultirepResultRow[];
  onDownload: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <Group justify="flex-end">
        <Button variant="outline" size="sm" onClick={onDownload}>
          {t("results.downloadCsv")}
        </Button>
      </Group>
      <Tabs defaultValue="byCategory">
        <Tabs.List mb="md">
          <Tabs.Tab value="byCategory">{t("results.byCategory")}</Tabs.Tab>
          <Tabs.Tab value="byPoints">{t("results.byPoints")}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="byCategory">
          {groups.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              {t("results.noResults")}
            </Text>
          ) : (
            groups.map((group) => (
              <MultirepCategoryGroupTable key={group.label} group={group} />
            ))
          )}
        </Tabs.Panel>

        <Tabs.Panel value="byPoints">
          <Text fw={600} size="md" mb="md">
            {t("results.absolute")}
          </Text>
          {nonGuestRows.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              {t("results.noResults")}
            </Text>
          ) : (
            <MultirepAbsoluteTable rows={nonGuestRows} />
          )}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
