/**
 * FlightOrderPage — /flight-order
 *
 * Shows a printable starting list (flight order) for the current meet.
 * Entries are grouped by flight, sorted by opener weight (Classic) or lot number.
 *
 * Print-optimised: nav and buttons are hidden via @media print CSS.
 */

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Container,
  Title,
  Group,
  Button,
  Text,
  Table,
  Stack,
  SegmentedControl,
  Badge,
} from "@mantine/core";
import { useAppSelector } from "@store/index";
import { selectEntries } from "@store/registration-slice";
import type { Entry } from "@domain/models";

// Print styles: hide navigation and buttons when printing
const PRINT_STYLE = `
@media print {
  nav, button, .no-print { display: none !important; }
  .print-only { display: block !important; }
}
`;

/** Get the opener (first declared) load for Classic, or preset load for Multirep. */
function getOpenerLoad(entry: Entry, exerciseFilter: "PU" | "DI" | "ALL"): number | null {
  if (entry.competitionFormat === "classic") {
    const exercises = exerciseFilter === "ALL"
      ? (["PU", "DI"] as const)
      : ([exerciseFilter] as const);
    for (const ex of exercises) {
      const exResult = entry.exercises[ex];
      if (exResult?.format === "classic" && exResult.attempts.length > 0) {
        const firstAttempt = [...exResult.attempts].sort((a, b) => a.sequence - b.sequence)[0];
        if (firstAttempt?.declaredLoadKg != null) return firstAttempt.declaredLoadKg;
      }
    }
    return null;
  }
  // Multirep: get preset load
  if (exerciseFilter === "PU") {
    const pu = entry.exercises.PU;
    if (pu?.format === "multirep" && pu.attempts.length > 0) {
      return pu.attempts[0]?.presetLoadKg ?? null;
    }
  }
  if (exerciseFilter === "DI") {
    const di = entry.exercises.DI;
    if (di?.format === "multirep" && di.attempts.length > 0) {
      return di.attempts[0]?.presetLoadKg ?? null;
    }
  }
  return null;
}

/** Format opener load for display */
function formatLoad(load: number | null): string {
  if (load === null) return "–";
  return `${load} kg`;
}

interface FlightGroup {
  flight: string;
  entries: Entry[];
}

function groupByFlight(entries: readonly Entry[], exerciseFilter: "PU" | "DI" | "ALL"): FlightGroup[] {
  const flightMap = new Map<string, Entry[]>();
  for (const entry of entries) {
    const f = entry.flight ?? "A";
    if (!flightMap.has(f)) flightMap.set(f, []);
    flightMap.get(f)!.push(entry);
  }

  // Sort within each flight
  for (const [, list] of flightMap) {
    list.sort((a, b) => {
      if (a.competitionFormat === "classic") {
        const loadA = getOpenerLoad(a, exerciseFilter);
        const loadB = getOpenerLoad(b, exerciseFilter);
        if (loadA !== null && loadB !== null) return loadA - loadB;
        if (loadA !== null) return -1;
        if (loadB !== null) return 1;
      }
      // Multirep or no declared load: sort by disciplineCode then index (lot order)
      if (a.disciplineCode !== b.disciplineCode) {
        return a.disciplineCode.localeCompare(b.disciplineCode);
      }
      return a.id.localeCompare(b.id);
    });
  }

  // Sort flights alphabetically
  const sorted = [...flightMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  return sorted.map(([flight, flightEntries]) => ({ flight, entries: flightEntries }));
}

function EntryRow({ entry, idx, exerciseFilter }: { entry: Entry; idx: number; exerciseFilter: "PU" | "DI" | "ALL" }) {
  const load = getOpenerLoad(entry, exerciseFilter);

  return (
    <Table.Tr>
      <Table.Td>
        <Text size="xs">{idx + 1}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{entry.name}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs">{entry.disciplineCode}</Text>
      </Table.Td>
      <Table.Td>
        <Badge size="xs" variant="light">{entry.sex}</Badge>
      </Table.Td>
      <Table.Td>
        <Text size="xs">{entry.assignedWeightCategoryCode ?? "–"}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs">{entry.bodyweightKg != null ? `${entry.bodyweightKg} kg` : "–"}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="xs">{formatLoad(load)}</Text>
      </Table.Td>
    </Table.Tr>
  );
}

function FlightSection({ group, exerciseFilter }: { group: FlightGroup; exerciseFilter: "PU" | "DI" | "ALL" }) {
  const { t } = useTranslation();

  return (
    <Stack gap="xs" mb="xl">
      <Text fw={700} size="md">
        {t("flightOrder.flight")} {group.flight}
      </Text>
      <Table withTableBorder withColumnBorders fz="xs" striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("flightOrder.lot")}</Table.Th>
            <Table.Th>{t("registration.columns.name")}</Table.Th>
            <Table.Th>{t("registration.columns.discipline")}</Table.Th>
            <Table.Th>{t("registration.columns.sex")}</Table.Th>
            <Table.Th>{t("registration.columns.weightCategory")}</Table.Th>
            <Table.Th>{t("registration.columns.bodyweight")}</Table.Th>
            <Table.Th>{t("flightOrder.load")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {group.entries.map((entry, idx) => (
            <EntryRow key={entry.id} entry={entry} idx={idx} exerciseFilter={exerciseFilter} />
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

export function FlightOrderPage() {
  const { t } = useTranslation();
  const meet = useAppSelector((s) => s.meet.current);
  const entries = useAppSelector(selectEntries);
  const [exerciseFilter, setExerciseFilter] = useState<"PU" | "DI" | "ALL">("ALL");

  const meetName = meet?.meet.name ?? "";
  const meetDate = meet?.meet.date ?? "";

  const flightGroups = useMemo(
    () => groupByFlight(entries, exerciseFilter),
    [entries, exerciseFilter],
  );

  return (
    <>
      <style>{PRINT_STYLE}</style>
      <Container size="xl" py="md">
        <Group justify="space-between" mb="lg" className="no-print">
          <Stack gap={4}>
            <Title order={2}>{t("flightOrder.title")}</Title>
            {meetName && (
              <Text size="sm" c="dimmed">
                {meetName} · {meetDate}
              </Text>
            )}
          </Stack>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            {t("flightOrder.print")}
          </Button>
        </Group>

        <Group mb="lg" className="no-print">
          <Text size="sm" fw={500}>Filter:</Text>
          <SegmentedControl
            value={exerciseFilter}
            onChange={(val) => setExerciseFilter(val as "PU" | "DI" | "ALL")}
            data={[
              { label: "PU", value: "PU" },
              { label: "DI", value: "DI" },
              { label: "All", value: "ALL" },
            ]}
            size="xs"
          />
        </Group>

        {entries.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            {t("flightOrder.noEntries")}
          </Text>
        ) : (
          flightGroups.map((group) => (
            <FlightSection key={group.flight} group={group} exerciseFilter={exerciseFilter} />
          ))
        )}
      </Container>
    </>
  );
}
