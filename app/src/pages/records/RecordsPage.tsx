/**
 * RecordsPage — Sprint 6 (1.0.0 GA).
 *
 * Displays per-competition records grouped by discipline → age category → sex.
 *
 * Route: /records (requires meet)
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Container,
  Title,
  Table,
  Text,
  Button,
  Group,
  Stack,
  Badge,
} from "@mantine/core";
import { useAppSelector } from "@store/index";
import { selectEntries } from "@store/registration-slice";
import { computeRecords } from "@logic/isf/records";
import type { CompetitionRecord } from "@logic/isf/records";
import { ISF_V51_DISCIPLINES } from "@domain/presets";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function exerciseLabel(exercise: "PU" | "DI" | "PUDI"): string {
  if (exercise === "PU") return "PU";
  if (exercise === "DI") return "DI";
  return "Total";
}

function formatResult(record: CompetitionRecord): string {
  if (record.unit === "kg") return `${record.result} кг`;
  return `${record.result} повт.`;
}

// ─── Records section ──────────────────────────────────────────────────────────

interface RecordGroup {
  label: string;
  records: CompetitionRecord[];
}

function RecordSection({ group }: { group: RecordGroup }) {
  const { t } = useTranslation();

  return (
    <Stack gap="xs" mb="xl">
      <Text fw={600} size="md" mb={4}>
        {group.label}
      </Text>
      <Table striped withTableBorder withColumnBorders fz="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("records.exercise")}</Table.Th>
            <Table.Th>{t("records.holder")}</Table.Th>
            <Table.Th>ВК / WC</Table.Th>
            <Table.Th>{t("records.result")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {group.records.map((rec, i) => (
            <Table.Tr key={i}>
              <Table.Td>
                <Badge size="xs" variant="light">
                  {exerciseLabel(rec.exercise)}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{rec.holder.name}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs">{rec.weightCategoryCode ?? "–"}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs" fw={600}>
                  {formatResult(rec)}
                </Text>
                {rec.isNew && (
                  <Badge size="xs" color="green" ml={4}>
                    {t("records.isNew")}
                  </Badge>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function RecordsPage() {
  const { t } = useTranslation();
  const meet = useAppSelector((s) => s.meet.current);
  const entries = useAppSelector(selectEntries);

  const meetDate = meet?.meet.date ?? new Date().toISOString().slice(0, 10);
  const meetName = meet?.meet.name ?? "Meet";

  const records = useMemo<CompetitionRecord[]>(() => {
    if (!meet) return [];
    return computeRecords(entries, meet.meet, meetDate);
  }, [meet, entries, meetDate]);

  // Group records by discipline → label
  const groups = useMemo<RecordGroup[]>(() => {
    if (records.length === 0) return [];

    const groupMap = new Map<string, CompetitionRecord[]>();

    for (const rec of records) {
      const disc = ISF_V51_DISCIPLINES.find((d) => d.code === rec.disciplineCode);
      const discLabel = disc ? disc.labelRu : rec.disciplineCode;
      const sexLabel = rec.sex === "M" ? "Мужчины / Men" : rec.sex === "F" ? "Женщины / Women" : "Open";
      const ageLabel = rec.ageCategoryCode ?? "Open";
      const label = `${discLabel} — ${sexLabel} — ${ageLabel}`;

      if (!groupMap.has(label)) groupMap.set(label, []);
      groupMap.get(label)!.push(rec);
    }

    return Array.from(groupMap.entries()).map(([label, recs]) => ({
      label,
      records: recs.sort((a, b) => {
        const exOrder: Record<string, number> = { PU: 0, DI: 1, PUDI: 2 };
        return (exOrder[a.exercise] ?? 3) - (exOrder[b.exercise] ?? 3);
      }),
    }));
  }, [records]);

  function handlePrint() {
    window.print();
  }

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="lg">
        <Stack gap={2}>
          <Title order={2}>{t("records.title")}</Title>
          <Text size="sm" c="dimmed">
            {meetName} · {meetDate}
          </Text>
        </Stack>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          {t("records.print")}
        </Button>
      </Group>

      {groups.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          {t("records.noRecords")}
        </Text>
      ) : (
        groups.map((group) => (
          <RecordSection key={group.label} group={group} />
        ))
      )}
    </Container>
  );
}
