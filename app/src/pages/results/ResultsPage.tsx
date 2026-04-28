/**
 * ResultsPage — Sprint 2 results screen.
 *
 * Two tabs:
 *   1. By Category — grouped by (sex × age × weight), with attempt columns
 *   2. By ISF Points — flat absolute ranking by isfFinalPoints DESC
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function placeColor(place: number | null): string | undefined {
  if (place === 1) return "#FFD700"; // gold
  if (place === 2) return "#C0C0C0"; // silver
  if (place === 3) return "#CD7F32"; // bronze
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

function PlaceCell({ row }: { row: ClassicResultRow }) {
  const { t } = useTranslation();
  if (row.entry.guest) {
    return <Text size="sm" fs="italic" c="dimmed">{t("results.guest")}</Text>;
  }
  if (row.place === null) return <Text size="sm">–</Text>;
  const color = placeColor(row.place);
  return (
    <Text size="sm" fw={600} style={{ color }}>
      {row.place}
    </Text>
  );
}

// ─── Category table ──────────────────────────────────────────────────────────

function CategoryGroupTable({ group }: { group: ClassicResultGroup }) {
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
              style={{ fontStyle: row.entry.guest ? "italic" : undefined, opacity: row.entry.guest ? 0.75 : 1 }}
            >
              <Table.Td>
                <PlaceCell row={row} />
              </Table.Td>
              <Table.Td>
                <Text size="sm">{row.entry.name}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">{row.entry.team ?? "–"}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs">{row.resolvedWeightCategoryCode ?? "–"}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs">{row.entry.bodyweightKg ?? "–"}</Text>
              </Table.Td>
              <Table.Td><AttemptCell val={row.puAttempts[0]} /></Table.Td>
              <Table.Td><AttemptCell val={row.puAttempts[1]} /></Table.Td>
              <Table.Td><AttemptCell val={row.puAttempts[2]} /></Table.Td>
              <Table.Td>
                <Text size="xs" fw={500}>{row.puBest > 0 ? row.puBest : "–"}</Text>
              </Table.Td>
              <Table.Td><AttemptCell val={row.diAttempts[0]} /></Table.Td>
              <Table.Td><AttemptCell val={row.diAttempts[1]} /></Table.Td>
              <Table.Td><AttemptCell val={row.diAttempts[2]} /></Table.Td>
              <Table.Td>
                <Text size="xs" fw={500}>{row.diBest > 0 ? row.diBest : "–"}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs" fw={600}>{row.total}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs">{row.isfCoefficient.toFixed(3)}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs">{row.isfFinalPoints.toFixed(2)}</Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

// ─── Absolute (by ISF points) table ─────────────────────────────────────────

function AbsoluteTable({ rows }: { rows: ClassicResultRow[] }) {
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
              <Table.Td>
                <Text size="sm" fw={600} style={{ color }}>{place}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{row.entry.name}</Text>
              </Table.Td>
              <Table.Td>
                <Badge size="xs" variant="light">{row.entry.sex}</Badge>
              </Table.Td>
              <Table.Td>
                <Text size="xs">{row.resolvedWeightCategoryCode ?? "–"}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs">{row.entry.bodyweightKg ?? "–"}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs" fw={600}>{row.total}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs">{row.isfCoefficient.toFixed(3)}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs" fw={600}>{row.isfFinalPoints.toFixed(2)}</Text>
              </Table.Td>
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

  const groups = useMemo<ClassicResultGroup[]>(() => {
    if (!meet) return [];
    return computeClassicResults(entries, meet.meet, meetDate);
  }, [meet, entries, meetDate]);

  // All non-guest rows for absolute tab
  const allNonGuestRows = useMemo<ClassicResultRow[]>(() => {
    if (!meet) return [];
    const rows = computeClassicRows(entries, meet.meet, meetDate);
    return rows.filter((r) => !r.entry.guest);
  }, [meet, entries, meetDate]);

  const hasAttempts = useMemo(() => {
    return allNonGuestRows.some((r) => r.total > 0);
  }, [allNonGuestRows]);

  function handleDownloadCsv() {
    const csv = exportClassicProtocolCsv(groups, meetName, meetDate);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `results-${meetDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="lg">
        <Title order={2}>{t("results.title")}</Title>
        <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
          {t("results.downloadCsv")}
        </Button>
      </Group>

      {!hasAttempts && allNonGuestRows.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          {t("results.noResults")}
        </Text>
      ) : (
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
                <CategoryGroupTable key={group.label} group={group} />
              ))
            )}
          </Tabs.Panel>

          <Tabs.Panel value="byPoints">
            <Text fw={600} size="md" mb="md">{t("results.absolute")}</Text>
            {allNonGuestRows.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                {t("results.noResults")}
              </Text>
            ) : (
              <AbsoluteTable rows={allNonGuestRows} />
            )}
          </Tabs.Panel>
        </Tabs>
      )}
    </Container>
  );
}
