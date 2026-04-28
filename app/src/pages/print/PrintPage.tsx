/**
 * PrintPage — /print
 *
 * Dedicated print forms:
 *   1. Протокол / Protocol    — full results table
 *   2. Карточки атлетов / Athlete Cards — 2-per-A4, attempt spaces
 *   3. Пустографка / Blank Sheet — blank judging sheet
 *   4. Грамоты / Diplomas — one per category winner (places 1-3), A5 size
 *
 * @media print CSS hides tabs + button and shows only the relevant content.
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
  Divider,
} from "@mantine/core";
import { useAppSelector } from "@store/index";
import { selectEntries } from "@store/registration-slice";
import {
  computeClassicResults,
} from "@logic/isf/classic-placing";
import type { ClassicResultGroup } from "@logic/isf/classic-placing";
import type { Entry } from "@domain/models";

// ─── Print CSS ────────────────────────────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  .no-print { display: none !important; }
  .print-section { display: none !important; }
  .print-active { display: block !important; }
  @page { margin: 12mm; }
}
`;

// ─── Protocol tab ─────────────────────────────────────────────────────────────

function ProtocolContent({ groups }: { groups: ClassicResultGroup[] }) {
  const { t } = useTranslation();

  if (groups.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t("results.noResults")}
      </Text>
    );
  }

  return (
    <Stack gap="xl">
      {groups.map((group) => (
        <Stack gap="xs" key={group.label}>
          <Text fw={700} size="md">
            {group.label}
          </Text>
          <Table withTableBorder withColumnBorders fz="xs" striped>
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
                <Table.Tr key={row.entry.id}>
                  <Table.Td>
                    <Text size="xs">{row.entry.guest ? t("results.guest") : (row.place ?? "–")}</Text>
                  </Table.Td>
                  <Table.Td><Text size="xs">{row.entry.name}</Text></Table.Td>
                  <Table.Td><Text size="xs">{row.entry.team ?? "–"}</Text></Table.Td>
                  <Table.Td><Text size="xs">{row.resolvedWeightCategoryCode ?? "–"}</Text></Table.Td>
                  <Table.Td><Text size="xs">{row.entry.bodyweightKg ?? "–"}</Text></Table.Td>
                  <Table.Td><Text size="xs">{row.puAttempts[0] !== null ? Math.abs(row.puAttempts[0]) : "–"}</Text></Table.Td>
                  <Table.Td><Text size="xs">{row.puAttempts[1] !== null ? Math.abs(row.puAttempts[1]) : "–"}</Text></Table.Td>
                  <Table.Td><Text size="xs">{row.puAttempts[2] !== null ? Math.abs(row.puAttempts[2]) : "–"}</Text></Table.Td>
                  <Table.Td><Text size="xs" fw={600}>{row.puBest > 0 ? row.puBest : "–"}</Text></Table.Td>
                  <Table.Td><Text size="xs">{row.diAttempts[0] !== null ? Math.abs(row.diAttempts[0]) : "–"}</Text></Table.Td>
                  <Table.Td><Text size="xs">{row.diAttempts[1] !== null ? Math.abs(row.diAttempts[1]) : "–"}</Text></Table.Td>
                  <Table.Td><Text size="xs">{row.diAttempts[2] !== null ? Math.abs(row.diAttempts[2]) : "–"}</Text></Table.Td>
                  <Table.Td><Text size="xs" fw={600}>{row.diBest > 0 ? row.diBest : "–"}</Text></Table.Td>
                  <Table.Td><Text size="xs" fw={700}>{row.total}</Text></Table.Td>
                  <Table.Td><Text size="xs">{row.isfCoefficient.toFixed(3)}</Text></Table.Td>
                  <Table.Td><Text size="xs">{row.isfFinalPoints.toFixed(2)}</Text></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      ))}
    </Stack>
  );
}

// ─── Athlete Cards tab ────────────────────────────────────────────────────────

function AthleteCardItem({ entry }: { entry: Entry }) {
  const { t } = useTranslation();
  const attempts = ["R1", "R2", "R3"];

  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 4,
        padding: "12px 16px",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      <Group justify="space-between" mb={8}>
        <Text fw={700} size="sm">{entry.name}</Text>
        <Text size="xs" c="dimmed">{entry.disciplineCode} · {entry.sex}</Text>
      </Group>
      <Group gap="xl" mb={8}>
        <Text size="xs">{t("results.weightCat")}: {entry.assignedWeightCategoryCode ?? "–"}</Text>
        <Text size="xs">{t("results.bodyweight")}: {entry.bodyweightKg ?? "–"} кг</Text>
        {entry.team && <Text size="xs">{entry.team}</Text>}
      </Group>
      <Table withTableBorder withColumnBorders fz="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th />
            {attempts.map((a) => (
              <Table.Th key={a}>{a}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr>
            <Table.Td><Text size="xs" fw={500}>PU</Text></Table.Td>
            {attempts.map((a) => <Table.Td key={a} style={{ minWidth: 50 }}><Text size="xs"> </Text></Table.Td>)}
          </Table.Tr>
          <Table.Tr>
            <Table.Td><Text size="xs" fw={500}>DI</Text></Table.Td>
            {attempts.map((a) => <Table.Td key={a} style={{ minWidth: 50 }}><Text size="xs"> </Text></Table.Td>)}
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </div>
  );
}

function AthleteCardsContent({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return <Text c="dimmed" ta="center" py="xl">–</Text>;
  }

  // 2-per-row grid for A4
  const pairs: Array<[Entry, Entry | null]> = [];
  for (let i = 0; i < entries.length; i += 2) {
    pairs.push([entries[i]!, entries[i + 1] ?? null]);
  }

  return (
    <Stack gap="md">
      {pairs.map(([a, b], i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            pageBreakAfter: "always",
            breakAfter: "page",
          }}
        >
          <AthleteCardItem entry={a} />
          {b && <AthleteCardItem entry={b} />}
        </div>
      ))}
    </Stack>
  );
}

// ─── Blank Sheet tab ─────────────────────────────────────────────────────────

function BlankSheetContent() {
  const { t } = useTranslation();
  const rows = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <Table withTableBorder withColumnBorders fz="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ minWidth: 32 }}>{t("flightOrder.lot")}</Table.Th>
          <Table.Th style={{ minWidth: 150 }}>{t("results.name")}</Table.Th>
          <Table.Th style={{ minWidth: 50 }}>{t("results.weightCat")}</Table.Th>
          <Table.Th style={{ minWidth: 50 }}>{t("results.bodyweight")}</Table.Th>
          <Table.Th>P1</Table.Th>
          <Table.Th>P2</Table.Th>
          <Table.Th>P3</Table.Th>
          <Table.Th>D1</Table.Th>
          <Table.Th>D2</Table.Th>
          <Table.Th>D3</Table.Th>
          <Table.Th style={{ minWidth: 60 }}>{t("results.total")}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((n) => (
          <Table.Tr key={n} style={{ height: 28 }}>
            <Table.Td><Text size="xs">{n}</Text></Table.Td>
            {Array.from({ length: 10 }).map((_, i) => (
              <Table.Td key={i} />
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

// ─── Diplomas tab ─────────────────────────────────────────────────────────────

function DiplomaCard({
  place,
  athleteName,
  discipline,
  category,
  result,
  meetName,
  meetDate,
}: {
  place: 1 | 2 | 3;
  athleteName: string;
  discipline: string;
  category: string;
  result: string;
  meetName: string;
  meetDate: string;
}) {
  const { t } = useTranslation();
  const placeEmoji = place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉";

  return (
    <div
      style={{
        border: "3px solid #e03131",
        borderRadius: 8,
        padding: "20px 24px",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 280,
      }}
    >
      {/* Logo + Title */}
      <Group justify="space-between" align="flex-start">
        <img
          src="/icon-64.png"
          alt="logo"
          style={{ width: 48, height: 48, objectFit: "contain" }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <Stack gap={2} align="center" style={{ flex: 1 }}>
          <Text fw={900} size="xl" ta="center" c="var(--mantine-color-red-7)">
            {t("print.diploma")}
          </Text>
          <Text size="xs" c="dimmed" ta="center">
            {meetName} · {meetDate}
          </Text>
        </Stack>
        <div style={{ width: 48 }} />
      </Group>

      <Divider />

      {/* Place */}
      <Text size="md" fw={600} ta="center">
        {placeEmoji} {t("print.place")} {place}
      </Text>

      {/* Awarded to */}
      <Text size="xs" c="dimmed" ta="center" tt="uppercase">
        {t("print.awardedTo")}
      </Text>
      <Text size="xl" fw={900} ta="center">
        {athleteName}
      </Text>

      {/* Discipline + Category */}
      <Text size="sm" c="dimmed" ta="center">
        {discipline} · {category}
      </Text>

      {/* Result */}
      <Text size="lg" fw={700} ta="center" c="var(--mantine-color-red-7)">
        {result}
      </Text>

      <Divider mt="auto" />

      {/* Signature */}
      <Group justify="space-between" mt={8}>
        <Text size="xs" c="dimmed">
          ________________________________
        </Text>
        <Text size="xs" c="dimmed">
          {t("print.signatureStamp")}
        </Text>
        <Text size="xs" c="dimmed">
          ________________________________
        </Text>
      </Group>
    </div>
  );
}

function DiplomasContent({
  groups,
  meetName,
  meetDate,
}: {
  groups: ClassicResultGroup[];
  meetName: string;
  meetDate: string;
}) {
  const diplomas: Array<{
    place: 1 | 2 | 3;
    athleteName: string;
    discipline: string;
    category: string;
    result: string;
  }> = [];

  for (const group of groups) {
    // Skip absolute group
    if (group.sex === null && group.ageCategoryCode === null) continue;

    for (const row of group.rows) {
      if (row.place === 1 || row.place === 2 || row.place === 3) {
        diplomas.push({
          place: row.place,
          athleteName: row.entry.name,
          discipline: row.entry.disciplineCode,
          category: group.label,
          result: row.total > 0 ? `${row.total} кг` : "–",
        });
      }
    }
  }

  if (diplomas.length === 0) {
    return <Text c="dimmed" ta="center" py="xl">–</Text>;
  }

  // 2 diplomas per A5 row
  const pairs: Array<[typeof diplomas[0], typeof diplomas[0] | null]> = [];
  for (let i = 0; i < diplomas.length; i += 2) {
    pairs.push([diplomas[i]!, diplomas[i + 1] ?? null]);
  }

  return (
    <Stack gap="lg">
      {pairs.map(([a, b], i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            pageBreakAfter: "always",
            breakAfter: "page",
          }}
        >
          <DiplomaCard
            place={a.place}
            athleteName={a.athleteName}
            discipline={a.discipline}
            category={a.category}
            result={a.result}
            meetName={meetName}
            meetDate={meetDate}
          />
          {b && (
            <DiplomaCard
              place={b.place}
              athleteName={b.athleteName}
              discipline={b.discipline}
              category={b.category}
              result={b.result}
              meetName={meetName}
              meetDate={meetDate}
            />
          )}
        </div>
      ))}
    </Stack>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PrintPage() {
  const { t } = useTranslation();
  const meet = useAppSelector((s) => s.meet.current);
  const entries = useAppSelector(selectEntries);

  const meetDate = meet?.meet.date ?? new Date().toISOString().slice(0, 10);
  const meetName = meet?.meet.name ?? "Meet";

  const groups = useMemo<ClassicResultGroup[]>(() => {
    if (!meet) return [];
    return computeClassicResults(entries, meet.meet, meetDate);
  }, [meet, entries, meetDate]);

  const classicEntries = useMemo(
    () => entries.filter((e) => e.competitionFormat === "classic"),
    [entries],
  );

  return (
    <>
      <style>{PRINT_STYLE}</style>
      <Container size="xl" py="md">
        <Group justify="space-between" mb="lg" className="no-print">
          <Stack gap={4}>
            <Title order={2}>{t("print.title")}</Title>
            {meetName && (
              <Text size="sm" c="dimmed">
                {meetName} · {meetDate}
              </Text>
            )}
          </Stack>
          <Button
            variant="outline"
            size="sm"
            className="no-print"
            onClick={() => window.print()}
          >
            {t("print.print")}
          </Button>
        </Group>

        <Tabs defaultValue="protocol">
          <Tabs.List mb="md" className="no-print">
            <Tabs.Tab value="protocol">{t("print.protocol")}</Tabs.Tab>
            <Tabs.Tab value="athleteCards">{t("print.athleteCards")}</Tabs.Tab>
            <Tabs.Tab value="blankSheet">{t("print.blankSheet")}</Tabs.Tab>
            <Tabs.Tab value="diplomas">{t("print.diplomas")}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="protocol" className="print-section print-active">
            <ProtocolContent groups={groups} />
          </Tabs.Panel>

          <Tabs.Panel value="athleteCards" className="print-section">
            <AthleteCardsContent entries={classicEntries} />
          </Tabs.Panel>

          <Tabs.Panel value="blankSheet" className="print-section">
            <BlankSheetContent />
          </Tabs.Panel>

          <Tabs.Panel value="diplomas" className="print-section">
            <DiplomasContent
              groups={groups}
              meetName={meetName}
              meetDate={meetDate}
            />
          </Tabs.Panel>
        </Tabs>
      </Container>
    </>
  );
}
