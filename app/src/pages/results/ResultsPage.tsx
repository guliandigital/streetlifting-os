/**
 * ResultsPage — Sprint 2 Classic + Sprint 3 Multirep results screen.
 *
 * Three tabs:
 *   1. By Category — grouped by (sex × age × weight), with attempt columns
 *   2. By ISF Points — flat absolute ranking by isfFinalPoints DESC
 *   3. Multirep — grouped by discipline × category, with reps columns
 *
 * Route guard: handled by RequireMeet in App.tsx.
 */

import { useMemo, useState } from "react";
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
  NumberInput,
  Select,
  Modal,
  TextInput,
  Textarea,
  PasswordInput,
  Alert,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useAppSelector } from "@store/index";
import { selectEntries } from "@store/registration-slice";
import {
  computeClassicResults,
  computeClassicRows,
} from "@logic/isf/classic-placing";
import { ClassicForecastService } from "@logic/isf/forecast";
import type { ForecastResult } from "@domain/models";
import type {
  ClassicResultRow,
  ClassicResultGroup,
  AttemptDisplay,
} from "@logic/isf/classic-placing";
import { computeMultirepResults } from "@logic/isf/multirep-placing";
import type {
  MultirepResultGroup,
  MultirepResultRow,
} from "@logic/isf/multirep-placing";
import { computeTeamScores } from "@logic/isf/team-scoring";
import type { TeamScore } from "@logic/isf/team-scoring";
import {
  exportResultsProtocolCsv,
} from "@logic/isf/csv-export-classic";
import { ISF_V51_DISCIPLINES } from "@domain/presets";
import type { SaveFile } from "@domain/models";
import {
  buildFinalProtocol,
  importEd25519PrivateKeyPem,
  signFinalProtocol,
} from "@logic/isf/final-protocol";
import {
  isTauriRuntime,
  uploadSignedFinalProtocol,
} from "@logic/isf/final-protocol-upload";

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

function MultirepPlaceCell({ row }: { row: MultirepResultRow }) {
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

function FinalProtocolModal({
  opened,
  onClose,
  saveFile,
}: {
  opened: boolean;
  onClose: () => void;
  saveFile: SaveFile;
}) {
  const [competitionId, setCompetitionId] = useState("");
  const [protocolId, setProtocolId] = useState(() => crypto.randomUUID());
  const [revision, setRevision] = useState(1);
  const [supersedesProtocolId, setSupersedesProtocolId] = useState("");
  const [federationKeyId, setFederationKeyId] = useState("");
  const [sanctioningCertId, setSanctioningCertId] = useState("");
  const [serviceToken, setServiceToken] = useState("");
  const [privateKeyPem, setPrivateKeyPem] = useState("");
  const [busy, setBusy] = useState(false);

  function closeAndClear() {
    setServiceToken("");
    setPrivateKeyPem("");
    onClose();
  }

  async function submit() {
    setBusy(true);
    try {
      const protocol = buildFinalProtocol(saveFile, {
        competitionId: competitionId.trim(),
        protocolId: protocolId.trim(),
        revision,
        supersedesProtocolId: supersedesProtocolId.trim() || null,
        issuedAt: new Date().toISOString(),
      });
      const privateKey = await importEd25519PrivateKeyPem(privateKeyPem);
      const envelope = await signFinalProtocol(protocol, {
        federationKeyId: federationKeyId.trim(),
        sanctioningCertId: sanctioningCertId.trim(),
        privateKey,
      });
      const response = await uploadSignedFinalProtocol(serviceToken, envelope);
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Federation service rejected the protocol (HTTP ${response.status})`);
      }
      notifications.show({
        color: "green",
        message: "Signed final protocol was accepted by the federation service.",
      });
      closeAndClear();
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "Final protocol upload failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal opened={opened} onClose={closeAndClear} title="Send signed final protocol" size="lg">
      <Stack gap="sm">
        {!isTauriRuntime() && (
          <Alert color="yellow">
            Protocol upload is available only in Streetlifting OS desktop. The PWA never sends a federation service token.
          </Alert>
        )}
        <TextInput
          label="Streetlifting App competition ID"
          value={competitionId}
          onChange={(event) => setCompetitionId(event.currentTarget.value)}
          required
        />
        <Group grow>
          <TextInput
            label="Protocol ID"
            value={protocolId}
            onChange={(event) => setProtocolId(event.currentTarget.value)}
            required
          />
          <NumberInput
            label="Revision"
            value={revision}
            min={1}
            allowDecimal={false}
            onChange={(value) => setRevision(typeof value === "number" ? value : 1)}
            required
          />
        </Group>
        {revision > 1 && (
          <TextInput
            label="Supersedes protocol ID"
            value={supersedesProtocolId}
            onChange={(event) => setSupersedesProtocolId(event.currentTarget.value)}
            required
          />
        )}
        <Group grow>
          <TextInput
            label="Federation key ID"
            value={federationKeyId}
            onChange={(event) => setFederationKeyId(event.currentTarget.value)}
            required
          />
          <TextInput
            label="Sanctioning certificate ID"
            value={sanctioningCertId}
            onChange={(event) => setSanctioningCertId(event.currentTarget.value)}
            required
          />
        </Group>
        <PasswordInput
          label="One-time ISF service token"
          value={serviceToken}
          onChange={(event) => setServiceToken(event.currentTarget.value)}
          autoComplete="off"
          required
        />
        <Textarea
          label="Ed25519 private key (PKCS#8 PEM)"
          value={privateKeyPem}
          onChange={(event) => setPrivateKeyPem(event.currentTarget.value)}
          autosize
          minRows={5}
          autoComplete="off"
          required
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={closeAndClear} disabled={busy}>Cancel</Button>
          <Button
            onClick={() => void submit()}
            disabled={
              busy ||
              !isTauriRuntime() ||
              !competitionId.trim() ||
              !protocolId.trim() ||
              !federationKeyId.trim() ||
              !sanctioningCertId.trim() ||
              !serviceToken.trim() ||
              !privateKeyPem.trim() ||
              (revision > 1 && !supersedesProtocolId.trim())
            }
          >
            {busy ? "Sending…" : "Sign and send"}
          </Button>
        </Group>
      </Stack>
    </Modal>
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

function AbsoluteTable({
  rows,
  forecastMap,
}: {
  rows: ClassicResultRow[];
  forecastMap: Map<string, ForecastResult>;
}) {
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
          <Table.Th>{t("results.predPlace")}</Table.Th>
          <Table.Th>{t("results.toFirst")}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {sorted.map((row, i) => {
          const place = i + 1;
          const color = placeColor(place);
          const forecast = forecastMap.get(row.entry.id);
          const predPlace = forecast?.predictedPlace ?? null;
          const kgToFirst = forecast?.kgToFirstPlace ?? null;
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
              <Table.Td>
                <Text size="xs" c="dimmed">
                  {predPlace !== null ? predPlace : "–"}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="xs" c="dimmed">
                  {kgToFirst === null
                    ? "–"
                    : kgToFirst === 0
                    ? "—"
                    : `+${kgToFirst.toFixed(2)} кг`}
                </Text>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}

// ─── Multirep group table ────────────────────────────────────────────────────

function MultirepGroupTable({ group }: { group: MultirepResultGroup }) {
  const { t } = useTranslation();

  // Determine which columns to show
  const hasDisc = ISF_V51_DISCIPLINES.find((d) => d.code === group.disciplineCode);
  const showPU = hasDisc?.presetLoadKg?.PU !== undefined || hasDisc?.event === "PUDI" || hasDisc?.event === "PU";
  const showDI = hasDisc?.presetLoadKg?.DI !== undefined || hasDisc?.event === "PUDI" || hasDisc?.event === "DI";

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
            {showPU && <Table.Th>{t("multirep.puLoad")}</Table.Th>}
            {showPU && <Table.Th>{t("multirep.puReps")}</Table.Th>}
            {showDI && <Table.Th>{t("multirep.diLoad")}</Table.Th>}
            {showDI && <Table.Th>{t("multirep.diReps")}</Table.Th>}
            <Table.Th>{t("multirep.totalReps")}</Table.Th>
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
                <MultirepPlaceCell row={row} />
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
              {showPU && (
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {row.presetLoadKgPu !== null ? `${row.presetLoadKgPu} kg` : "–"}
                  </Text>
                </Table.Td>
              )}
              {showPU && (
                <Table.Td>
                  <Text size="xs" fw={500}>
                    {row.puReps > 0 ? row.puReps : row.attemptStatus === "not_started" ? "–" : "0"}
                  </Text>
                </Table.Td>
              )}
              {showDI && (
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {row.presetLoadKgDi !== null ? `${row.presetLoadKgDi} kg` : "–"}
                  </Text>
                </Table.Td>
              )}
              {showDI && (
                <Table.Td>
                  <Text size="xs" fw={500}>
                    {row.diReps > 0 ? row.diReps : row.attemptStatus === "not_started" ? "–" : "0"}
                  </Text>
                </Table.Td>
              )}
              <Table.Td>
                <Text size="xs" fw={600}>{row.totalReps}</Text>
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

// ─── Team standings table ────────────────────────────────────────────────────

function TeamStandingsTab({
  rows,
}: {
  rows: ClassicResultRow[];
}) {
  const { t } = useTranslation();
  const [topN, setTopN] = useState<number>(3);

  const teamScores = useMemo<TeamScore[]>(
    () => computeTeamScores(rows, topN),
    [rows, topN],
  );

  const hasTeams = rows.some(
    (r) => !r.entry.guest && typeof r.entry.team === "string" && r.entry.team.trim().length > 0,
  );

  if (!hasTeams) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t("team.noTeams")}
      </Text>
    );
  }

  return (
    <Stack gap="md">
      <Group align="center">
        <Text size="sm" fw={500}>
          {t("team.topN")}:
        </Text>
        <NumberInput
          value={topN}
          onChange={(val) => {
            const n = typeof val === "number" ? val : parseInt(String(val), 10);
            if (!isNaN(n) && n >= 1 && n <= 10) setTopN(n);
          }}
          min={1}
          max={10}
          step={1}
          style={{ width: 80 }}
          size="xs"
        />
      </Group>

      <Table striped withTableBorder withColumnBorders fz="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("team.place")}</Table.Th>
            <Table.Th>{t("team.team")}</Table.Th>
            <Table.Th>{t("team.athletes")}</Table.Th>
            <Table.Th>{t("team.points")}</Table.Th>
            <Table.Th>{t("team.contributors")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {teamScores.map((ts) => {
            const color = placeColor(ts.place);
            const contribText = ts.contributors
              .map((c) => `${c.entry.name} ${c.points.toFixed(2)}`)
              .join(", ");
            return (
              <Table.Tr key={ts.teamName}>
                <Table.Td>
                  <Text size="sm" fw={600} style={{ color }}>
                    {ts.place}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {ts.teamName}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs">{ts.athleteCount}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" fw={600}>
                    {ts.totalPoints.toFixed(2)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {contribText}
                  </Text>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function ResultsPage() {
  const { t } = useTranslation();
  const meet = useAppSelector((s) => s.meet.current);
  const entries = useAppSelector(selectEntries);
  const [classicCategoryFilter, setClassicCategoryFilter] = useState<
    string | null
  >(null);
  const [multirepCategoryFilter, setMultirepCategoryFilter] = useState<
    string | null
  >(null);
  const [protocolOpen, setProtocolOpen] = useState(false);

  const meetDate = meet?.meet.date ?? new Date().toISOString().slice(0, 10);
  const meetName = meet?.meet.name ?? "Meet";

  // Classic results
  const groups = useMemo<ClassicResultGroup[]>(() => {
    if (!meet) return [];
    return computeClassicResults(entries, meet.meet, meetDate);
  }, [meet, entries, meetDate]);

  const allNonGuestRows = useMemo<ClassicResultRow[]>(() => {
    if (!meet) return [];
    const rows = computeClassicRows(entries, meet.meet, meetDate);
    return rows.filter((r) => !r.entry.guest);
  }, [meet, entries, meetDate]);

  const hasAttempts = useMemo(() => {
    return allNonGuestRows.some((r) => r.total > 0);
  }, [allNonGuestRows]);

  // Forecast map: entry.id → ForecastResult
  const forecastMap = useMemo<Map<string, ForecastResult>>(() => {
    if (!meet) return new Map();
    const svc = new ClassicForecastService(meetDate);
    const map = new Map<string, ForecastResult>();
    for (const row of allNonGuestRows) {
      map.set(row.entry.id, svc.forecast(row.entry, entries));
    }
    return map;
  }, [meet, allNonGuestRows, entries, meetDate]);

  // Multirep results
  const multirepGroups = useMemo<MultirepResultGroup[]>(() => {
    if (!meet) return [];
    return computeMultirepResults(entries, meet.meet, meetDate);
  }, [meet, entries, meetDate]);

  // Team scoring — uses all classic non-guest rows
  const allClassicRows = useMemo<ClassicResultRow[]>(() => {
    if (!meet) return [];
    return computeClassicRows(entries, meet.meet, meetDate);
  }, [meet, entries, meetDate]);

  const hasTeamEntries = useMemo(
    () =>
      allClassicRows.some(
        (r) =>
          !r.entry.guest &&
          typeof r.entry.team === "string" &&
          r.entry.team.trim().length > 0,
      ),
    [allClassicRows],
  );

  const hasMultirepDisciplines = useMemo(() => {
    const enabled = meet?.meet.enabledDisciplineCodes ?? [];
    return enabled.some((c) => {
      const disc = ISF_V51_DISCIPLINES.find((d) => d.code === c);
      return disc?.competitionFormat === "multirep";
    });
  }, [meet]);

  const hasMultirepAttempts = useMemo(() => {
    return multirepGroups.some((g) =>
      g.rows.some((r) => r.totalReps > 0),
    );
  }, [multirepGroups]);

  function handleDownloadCsv() {
    const csv = exportResultsProtocolCsv(
      groups,
      hasMultirepDisciplines ? multirepGroups : [],
      meetName,
      meetDate,
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `results-${meetDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const showAnyContent =
    hasAttempts || allNonGuestRows.length > 0 || hasMultirepDisciplines;

  const classicCategoryOptions = useMemo(
    () => [
      { value: "__all__", label: t("results.allCategories") },
      ...groups.map((group) => ({ value: group.label, label: group.label })),
    ],
    [groups, t],
  );

  const activeClassicCategory =
    classicCategoryFilter &&
    (classicCategoryFilter === "__all__" ||
      groups.some((group) => group.label === classicCategoryFilter))
      ? classicCategoryFilter
      : groups[0]?.label ?? "__all__";

  const visibleClassicGroups =
    activeClassicCategory === "__all__"
      ? groups
      : groups.filter((group) => group.label === activeClassicCategory);

  const multirepCategoryOptions = useMemo(
    () => [
      { value: "__all__", label: t("results.allCategories") },
      ...multirepGroups.map((group) => ({
        value: group.label,
        label: group.label,
      })),
    ],
    [multirepGroups, t],
  );

  const activeMultirepCategory =
    multirepCategoryFilter &&
    (multirepCategoryFilter === "__all__" ||
      multirepGroups.some((group) => group.label === multirepCategoryFilter))
      ? multirepCategoryFilter
      : multirepGroups[0]?.label ?? "__all__";

  const visibleMultirepGroups =
    activeMultirepCategory === "__all__"
      ? multirepGroups
      : multirepGroups.filter((group) => group.label === activeMultirepCategory);

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="lg">
        <Title order={2}>{t("results.title")}</Title>
        <Group>
          <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
            {t("results.downloadCsv")}
          </Button>
          <Button size="sm" onClick={() => setProtocolOpen(true)}>
            Send signed protocol
          </Button>
        </Group>
      </Group>

      {meet && (
        <FinalProtocolModal
          opened={protocolOpen}
          onClose={() => setProtocolOpen(false)}
          saveFile={meet}
        />
      )}

      {!showAnyContent ? (
        <Text c="dimmed" ta="center" py="xl">
          {t("results.noResults")}
        </Text>
      ) : (
        <Tabs defaultValue="byCategory">
          <Tabs.List mb="md">
            <Tabs.Tab value="byCategory">{t("results.byCategory")}</Tabs.Tab>
            <Tabs.Tab value="byPoints">{t("results.byPoints")}</Tabs.Tab>
            {hasMultirepDisciplines && (
              <Tabs.Tab value="multirep">{t("results.multirepTab")}</Tabs.Tab>
            )}
            {(hasTeamEntries || allClassicRows.length > 0) && (
              <Tabs.Tab value="team">{t("team.title")}</Tabs.Tab>
            )}
          </Tabs.List>

          <Tabs.Panel value="byCategory">
            {groups.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                {t("results.noResults")}
              </Text>
            ) : (
              <Stack gap="md">
                {groups.length > 1 && (
                  <Group justify="flex-end">
                    <Select
                      label={t("results.categoryFilter")}
                      data={classicCategoryOptions}
                      value={activeClassicCategory}
                      onChange={setClassicCategoryFilter}
                      w={{ base: "100%", sm: 360 }}
                      size="sm"
                    />
                  </Group>
                )}
                {visibleClassicGroups.map((group) => (
                  <CategoryGroupTable key={group.label} group={group} />
                ))}
              </Stack>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="byPoints">
            <Text fw={600} size="md" mb="md">{t("results.absolute")}</Text>
            {allNonGuestRows.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                {t("results.noResults")}
              </Text>
            ) : (
              <AbsoluteTable rows={allNonGuestRows} forecastMap={forecastMap} />
            )}
          </Tabs.Panel>

          {hasMultirepDisciplines && (
            <Tabs.Panel value="multirep">
              {!hasMultirepAttempts && multirepGroups.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  {t("results.noResults")}
                </Text>
              ) : multirepGroups.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  {t("results.noResults")}
                </Text>
              ) : (
                <Stack gap="md">
                  {multirepGroups.length > 1 && (
                    <Group justify="flex-end">
                      <Select
                        label={t("results.categoryFilter")}
                        data={multirepCategoryOptions}
                        value={activeMultirepCategory}
                        onChange={setMultirepCategoryFilter}
                        w={{ base: "100%", sm: 360 }}
                        size="sm"
                      />
                    </Group>
                  )}
                  {visibleMultirepGroups.map((group) => (
                    <MultirepGroupTable key={group.label} group={group} />
                  ))}
                </Stack>
              )}
            </Tabs.Panel>
          )}

          {(hasTeamEntries || allClassicRows.length > 0) && (
            <Tabs.Panel value="team" pt="md">
              <TeamStandingsTab rows={allClassicRows} />
            </Tabs.Panel>
          )}
        </Tabs>
      )}
    </Container>
  );
}
