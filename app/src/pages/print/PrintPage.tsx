/**
 * PrintPage — /print
 *
 * Dedicated print forms:
 *   1. Протокол / Protocol — full results table
 *   2. Карточки атлетов / Athlete Cards — 2-per-A4, attempt spaces
 *   3. Пустографка / Blank Sheet — blank judging sheet
 *   4. Грамоты / Diplomas — one per category winner (places 1-3), A5 size
 *   5. Командный протокол / Team Protocol — team scoring with contributors
 *   6. Сертификаты рекордов / Record Certificates — one per new record
 *   7. Порядок взвешивания / Weigh-in Order — by day/platform/flight
 *   8. Медальный зачёт / Medal Count — by team and country
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
  Badge,
} from "@mantine/core";
import { useAppSelector } from "@store/index";
import { selectEntries } from "@store/registration-slice";
import {
  computeClassicResults,
  computeClassicRows,
} from "@logic/isf/classic-placing";
import type { ClassicResultGroup } from "@logic/isf/classic-placing";
import { computeMultirepResults } from "@logic/isf/multirep-placing";
import type { MultirepResultGroup } from "@logic/isf/multirep-placing";
import {
  buildReportRegistry,
  type ReportRegistryItem,
} from "@logic/reports/report-registry";
import { exportOpenPowerliftingCsv } from "@logic/isf/csv-export-classic";
import { computeTeamScores, type TeamScore } from "@logic/isf/team-scoring";
import { computeRecords } from "@logic/isf/records";
import {
  buildRecordCertificates,
  type RecordCertificate,
} from "@logic/reports/record-certificates";
import {
  buildWeighInOrder,
  type WeighInOrderGroup,
} from "@logic/reports/weigh-in-order";
import {
  buildMedalCountReport,
  type MedalCountReport,
} from "@logic/reports/medal-count";
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

function ReportsRegistryContent({
  items,
  onDownloadOpenPowerlifting,
}: {
  items: ReportRegistryItem[];
  onDownloadOpenPowerlifting: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Table withTableBorder withColumnBorders fz="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t("reports.report")}</Table.Th>
          <Table.Th>{t("reports.scope")}</Table.Th>
          <Table.Th>{t("reports.format")}</Table.Th>
          <Table.Th>{t("reports.items")}</Table.Th>
          <Table.Th>{t("reports.status")}</Table.Th>
          <Table.Th>{t("reports.action")}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {items.map((item) => (
          <Table.Tr key={item.id}>
            <Table.Td>
              <Text size="sm" fw={500}>{t(item.labelKey)}</Text>
            </Table.Td>
            <Table.Td><Text size="sm">{t(`reports.scopeValue.${item.scope}`)}</Text></Table.Td>
            <Table.Td><Text size="sm">{t(`reports.formatValue.${item.outputFormat}`)}</Text></Table.Td>
            <Table.Td><Text size="sm">{item.itemCount}</Text></Table.Td>
            <Table.Td>
              <Badge
                color={
                  item.status === "ready"
                    ? "green"
                    : item.status === "planned"
                      ? "yellow"
                      : "gray"
                }
                variant="light"
              >
                {t(`reports.statusValue.${item.status}`)}
              </Badge>
            </Table.Td>
            <Table.Td>
              {item.id === "openpowerlifting-export" && (
                <Button
                  size="xs"
                  variant="light"
                  disabled={item.status !== "ready"}
                  onClick={onDownloadOpenPowerlifting}
                >
                  {t("reports.download")}
                </Button>
              )}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function ProtocolContent({
  classicGroups,
  multirepGroups,
}: {
  classicGroups: ClassicResultGroup[];
  multirepGroups: MultirepResultGroup[];
}) {
  const { t } = useTranslation();

  if (classicGroups.length === 0 && multirepGroups.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t("results.noResults")}
      </Text>
    );
  }

  return (
    <Stack gap="xl">
      {classicGroups.map((group) => (
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
      {multirepGroups.map((group) => (
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
                <Table.Th>{t("multirep.puLoad")}</Table.Th>
                <Table.Th>{t("multirep.puReps")}</Table.Th>
                <Table.Th>{t("multirep.diLoad")}</Table.Th>
                <Table.Th>{t("multirep.diReps")}</Table.Th>
                <Table.Th>{t("multirep.totalReps")}</Table.Th>
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
                  <Table.Td><Text size="xs">{row.presetLoadKgPu ?? "–"}</Text></Table.Td>
                  <Table.Td><Text size="xs" fw={600}>{row.puReps}</Text></Table.Td>
                  <Table.Td><Text size="xs">{row.presetLoadKgDi ?? "–"}</Text></Table.Td>
                  <Table.Td><Text size="xs" fw={600}>{row.diReps}</Text></Table.Td>
                  <Table.Td><Text size="xs" fw={700}>{row.totalReps}</Text></Table.Td>
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
  const attempts = entry.competitionFormat === "multirep" ? ["MR"] : ["R1", "R2", "R3"];

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
        <Text fw={900} size="xs" c="var(--mantine-color-red-7)">
          Streetlifting OS
        </Text>
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
  classicGroups,
  multirepGroups,
  meetName,
  meetDate,
}: {
  classicGroups: ClassicResultGroup[];
  multirepGroups: MultirepResultGroup[];
  meetName: string;
  meetDate: string;
}) {
  const { t } = useTranslation();
  const diplomas: Array<{
    place: 1 | 2 | 3;
    athleteName: string;
    discipline: string;
    category: string;
    result: string;
  }> = [];

  for (const group of classicGroups) {
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

  for (const group of multirepGroups) {
    for (const row of group.rows) {
      if (row.place === 1 || row.place === 2 || row.place === 3) {
        diplomas.push({
          place: row.place,
          athleteName: row.entry.name,
          discipline: row.entry.disciplineCode,
          category: group.label,
          result: row.totalReps > 0 ? `${row.totalReps} ${t("multirep.reps")}` : "–",
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

// ─── Team Protocol tab ────────────────────────────────────────────────────────

function TeamProtocolContent({
  teamScores,
  meetName,
  meetDate,
}: {
  teamScores: TeamScore[];
  meetName: string;
  meetDate: string;
}) {
  const { t } = useTranslation();
  if (teamScores.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t("print.team.empty")}
      </Text>
    );
  }
  return (
    <Stack gap="md">
      <Stack gap={2}>
        <Text fw={700} size="md">
          {t("print.team.title")}
        </Text>
        <Text size="xs" c="dimmed">
          {meetName} · {meetDate}
        </Text>
      </Stack>
      <Table withTableBorder withColumnBorders fz="xs" striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("results.place")}</Table.Th>
            <Table.Th>{t("print.team.team")}</Table.Th>
            <Table.Th>{t("print.team.totalPoints")}</Table.Th>
            <Table.Th>{t("print.team.contributors")}</Table.Th>
            <Table.Th>{t("print.team.athleteCount")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {teamScores.map((ts) => (
            <Table.Tr key={ts.teamName}>
              <Table.Td>
                <Text size="xs" fw={600}>
                  {ts.place}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs" fw={500}>
                  {ts.teamName}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs" fw={700}>
                  {ts.totalPoints.toFixed(2)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Stack gap={0}>
                  {ts.contributors.map((c) => (
                    <Text size="xs" key={c.entry.id}>
                      {c.entry.name} — {c.points.toFixed(2)}
                    </Text>
                  ))}
                </Stack>
              </Table.Td>
              <Table.Td>
                <Text size="xs">{ts.athleteCount}</Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

// ─── Record Certificates tab ──────────────────────────────────────────────────

function RecordCertificateCard({
  cert,
  meetName,
  meetDate,
}: {
  cert: RecordCertificate;
  meetName: string;
  meetDate: string;
}) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        border: "3px solid #1971c2",
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
      <Group justify="space-between" align="flex-start">
        <Text fw={900} size="xs" c="var(--mantine-color-blue-7)">
          Streetlifting OS
        </Text>
        <Stack gap={2} align="center" style={{ flex: 1 }}>
          <Text fw={900} size="xl" ta="center" c="var(--mantine-color-blue-7)">
            {t("print.records.certificate")}
          </Text>
          <Text size="xs" c="dimmed" ta="center">
            {meetName} · {meetDate}
          </Text>
        </Stack>
        <div style={{ width: 48 }} />
      </Group>

      <Divider />

      <Text size="md" fw={600} ta="center">
        🏅 {t("print.records.newRecord")}
      </Text>

      <Text size="xs" c="dimmed" ta="center" tt="uppercase">
        {t("print.awardedTo")}
      </Text>
      <Text size="xl" fw={900} ta="center">
        {cert.record.holder.name}
      </Text>

      <Text size="sm" c="dimmed" ta="center">
        {cert.record.disciplineCode} · {cert.exerciseLabel} ·{" "}
        {cert.categoryLabel}
      </Text>

      <Text size="lg" fw={700} ta="center" c="var(--mantine-color-blue-7)">
        {cert.resultLabel}
      </Text>

      <Divider mt="auto" />

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

function RecordCertificatesContent({
  certificates,
  meetName,
  meetDate,
}: {
  certificates: RecordCertificate[];
  meetName: string;
  meetDate: string;
}) {
  const { t } = useTranslation();
  if (certificates.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t("print.records.empty")}
      </Text>
    );
  }

  const pairs: Array<[RecordCertificate, RecordCertificate | null]> = [];
  for (let i = 0; i < certificates.length; i += 2) {
    pairs.push([certificates[i]!, certificates[i + 1] ?? null]);
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
          <RecordCertificateCard
            cert={a}
            meetName={meetName}
            meetDate={meetDate}
          />
          {b && (
            <RecordCertificateCard
              cert={b}
              meetName={meetName}
              meetDate={meetDate}
            />
          )}
        </div>
      ))}
    </Stack>
  );
}

// ─── Weigh-in Order tab ───────────────────────────────────────────────────────

function WeighInOrderContent({
  groups,
  meetName,
  meetDate,
}: {
  groups: WeighInOrderGroup[];
  meetName: string;
  meetDate: string;
}) {
  const { t } = useTranslation();
  if (groups.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t("print.weighInOrder.empty")}
      </Text>
    );
  }
  return (
    <Stack gap="lg">
      <Stack gap={2}>
        <Text fw={700} size="md">
          {t("print.weighInOrder.title")}
        </Text>
        <Text size="xs" c="dimmed">
          {meetName} · {meetDate}
        </Text>
      </Stack>
      {groups.map((g) => (
        <Stack gap="xs" key={`${g.day}-${g.platform}-${g.flight}`}>
          <Text fw={600} size="sm">
            {t("print.weighInOrder.groupLabel", {
              day: g.day,
              platform: g.platform,
              flight: g.flight,
            })}
          </Text>
          <Table withTableBorder withColumnBorders fz="xs" striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ minWidth: 32 }}>
                  {t("flightOrder.lot")}
                </Table.Th>
                <Table.Th style={{ minWidth: 160 }}>
                  {t("results.name")}
                </Table.Th>
                <Table.Th>{t("registration.columns.sex")}</Table.Th>
                <Table.Th>{t("registration.columns.discipline")}</Table.Th>
                <Table.Th>{t("results.weightCat")}</Table.Th>
                <Table.Th style={{ minWidth: 70 }}>
                  {t("results.bodyweight")}
                </Table.Th>
                <Table.Th style={{ minWidth: 80 }}>
                  {t("print.weighInOrder.signature")}
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {g.rows.map((r) => (
                <Table.Tr key={r.entry.id} style={{ height: 28 }}>
                  <Table.Td>
                    <Text size="xs">{r.lot}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{r.entry.name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{r.entry.sex}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{r.entry.disciplineCode}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">
                      {r.entry.assignedWeightCategoryCode ?? "–"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">{r.entry.bodyweightKg ?? ""}</Text>
                  </Table.Td>
                  <Table.Td />
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      ))}
    </Stack>
  );
}

// ─── Medal Count tab ──────────────────────────────────────────────────────────

function MedalCountContent({
  report,
  meetName,
  meetDate,
}: {
  report: MedalCountReport;
  meetName: string;
  meetDate: string;
}) {
  const { t } = useTranslation();
  const empty = report.byTeam.length === 0 && report.byCountry.length === 0;
  if (empty) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t("print.medalCount.empty")}
      </Text>
    );
  }

  function renderTable(title: string, rows: MedalCountReport["byTeam"]) {
    if (rows.length === 0) return null;
    return (
      <Stack gap="xs">
        <Text fw={600} size="sm">
          {title}
        </Text>
        <Table withTableBorder withColumnBorders fz="xs" striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("results.place")}</Table.Th>
              <Table.Th>{title}</Table.Th>
              <Table.Th>🥇</Table.Th>
              <Table.Th>🥈</Table.Th>
              <Table.Th>🥉</Table.Th>
              <Table.Th>{t("print.medalCount.total")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <Table.Tr key={`${title}-${r.label}`}>
                <Table.Td>
                  <Text size="xs" fw={600}>
                    {r.place}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs">{r.label}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs">{r.gold}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs">{r.silver}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs">{r.bronze}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" fw={700}>
                    {r.total}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Stack gap={2}>
        <Text fw={700} size="md">
          {t("print.medalCount.title")}
        </Text>
        <Text size="xs" c="dimmed">
          {meetName} · {meetDate}
        </Text>
      </Stack>
      {renderTable(t("print.medalCount.byTeam"), report.byTeam)}
      {renderTable(t("print.medalCount.byCountry"), report.byCountry)}
    </Stack>
  );
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PrintPage() {
  const { t } = useTranslation();
  const meet = useAppSelector((s) => s.meet.current);
  const entries = useAppSelector(selectEntries);

  const meetDate = meet?.meet.date ?? new Date().toISOString().slice(0, 10);
  const meetName = meet?.meet.name ?? "Meet";

  const classicGroups = useMemo<ClassicResultGroup[]>(() => {
    if (!meet) return [];
    return computeClassicResults(entries, meet.meet, meetDate);
  }, [meet, entries, meetDate]);

  const multirepGroups = useMemo<MultirepResultGroup[]>(() => {
    if (!meet) return [];
    return computeMultirepResults(entries, meet.meet, meetDate);
  }, [meet, entries, meetDate]);

  const teamScores = useMemo<TeamScore[]>(() => {
    if (!meet) return [];
    const rows = computeClassicRows(entries, meet.meet, meetDate);
    return computeTeamScores(rows);
  }, [meet, entries, meetDate]);

  const records = useMemo(() => {
    if (!meet) return [];
    return computeRecords(entries, meet.meet, meetDate);
  }, [meet, entries, meetDate]);

  const recordCertificates = useMemo<RecordCertificate[]>(
    () =>
      buildRecordCertificates(records, {
        kgUnitLabel: t("print.kg"),
      }),
    [records, t],
  );

  const weighInOrder = useMemo<WeighInOrderGroup[]>(
    () => buildWeighInOrder(entries),
    [entries],
  );

  const medalCount = useMemo<MedalCountReport>(
    () => buildMedalCountReport(classicGroups, multirepGroups),
    [classicGroups, multirepGroups],
  );

  const reportRegistry = useMemo(
    () =>
      buildReportRegistry({
        entries,
        classicGroups,
        multirepGroups,
        teamScores,
        records,
        medalCountRowCount: medalCount.byTeam.length + medalCount.byCountry.length,
      }),
    [entries, classicGroups, multirepGroups, teamScores, records, medalCount],
  );

  const printEntries = useMemo(
    () => entries.filter((e) => e.competitionFormat === "classic" || e.competitionFormat === "multirep"),
    [entries],
  );

  function handleDownloadOpenPowerlifting() {
    if (!meet) return;

    const csv = exportOpenPowerliftingCsv(classicGroups, {
      meetName,
      meetDate,
      federation: meet.meet.federation || "ISF",
      parentFederation: "ISF",
      meetCountry: meet.meet.country,
      meetState: meet.meet.state,
      sanctioned: "Yes",
    });

    downloadCsv(
      `${meetName.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "meet"}-openpowerlifting.csv`,
      csv,
    );
  }

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
            <Tabs.Tab value="reports">{t("reports.title")}</Tabs.Tab>
            <Tabs.Tab value="protocol">{t("print.protocol")}</Tabs.Tab>
            <Tabs.Tab value="athleteCards">{t("print.athleteCards")}</Tabs.Tab>
            <Tabs.Tab value="blankSheet">{t("print.blankSheet")}</Tabs.Tab>
            <Tabs.Tab value="diplomas">{t("print.diplomas")}</Tabs.Tab>
            <Tabs.Tab value="teamProtocol">{t("print.team.tab")}</Tabs.Tab>
            <Tabs.Tab value="recordCerts">{t("print.records.tab")}</Tabs.Tab>
            <Tabs.Tab value="weighInOrder">{t("print.weighInOrder.tab")}</Tabs.Tab>
            <Tabs.Tab value="medalCount">{t("print.medalCount.tab")}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="reports" className="print-section">
            <ReportsRegistryContent
              items={reportRegistry}
              onDownloadOpenPowerlifting={handleDownloadOpenPowerlifting}
            />
          </Tabs.Panel>

          <Tabs.Panel value="protocol" className="print-section print-active">
            <ProtocolContent
              classicGroups={classicGroups}
              multirepGroups={multirepGroups}
            />
          </Tabs.Panel>

          <Tabs.Panel value="athleteCards" className="print-section">
            <AthleteCardsContent entries={printEntries} />
          </Tabs.Panel>

          <Tabs.Panel value="blankSheet" className="print-section">
            <BlankSheetContent />
          </Tabs.Panel>

          <Tabs.Panel value="diplomas" className="print-section">
            <DiplomasContent
              classicGroups={classicGroups}
              multirepGroups={multirepGroups}
              meetName={meetName}
              meetDate={meetDate}
            />
          </Tabs.Panel>

          <Tabs.Panel value="teamProtocol" className="print-section">
            <TeamProtocolContent
              teamScores={teamScores}
              meetName={meetName}
              meetDate={meetDate}
            />
          </Tabs.Panel>

          <Tabs.Panel value="recordCerts" className="print-section">
            <RecordCertificatesContent
              certificates={recordCertificates}
              meetName={meetName}
              meetDate={meetDate}
            />
          </Tabs.Panel>

          <Tabs.Panel value="weighInOrder" className="print-section">
            <WeighInOrderContent
              groups={weighInOrder}
              meetName={meetName}
              meetDate={meetDate}
            />
          </Tabs.Panel>

          <Tabs.Panel value="medalCount" className="print-section">
            <MedalCountContent
              report={medalCount}
              meetName={meetName}
              meetDate={meetDate}
            />
          </Tabs.Panel>
        </Tabs>
      </Container>
    </>
  );
}
