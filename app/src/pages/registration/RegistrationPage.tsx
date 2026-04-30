/**
 * Registration page — Sprint 1 §5.
 *
 * - DataTable with sortable / filterable columns
 * - Modal form for add / edit (react-hook-form + zod)
 * - CSV import / export
 * - Lot-number assignment (deterministic with optional seed)
 *
 * Lot-number is the entries[] index + 1 (per blueprint v2 §10 — entries are
 * stored in lot-order; lastLotNumber tracks the next value).
 */

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Container,
  Stack,
  Title,
  Group,
  Button,
  ActionIcon,
  Tooltip,
  TextInput,
  Card,
  Text,
  NumberInput,
  Modal,
} from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";

import { useAppDispatch, useAppSelector } from "@store/index";
import {
  addEntry,
  updateEntry,
  removeEntry,
  bulkImportEntries,
  applyLotAssignment,
  selectEntries,
} from "@store/registration-slice";
import type { EntryDraft } from "@store/registration-slice";
import type { Entry } from "@domain/models";
import { ISF_V51_DISCIPLINES } from "@domain/presets";
import { ageInYears, resolveAgeCategory } from "@logic/isf/age";
import { resolveWeightCategory } from "@logic/isf/weight-category-resolver";
import { assignLotNumbers } from "@logic/isf/lot-assignment";
import { buildRegistrationCsv } from "@logic/isf/csv-export";

import { EntryFormModal } from "./EntryFormModal";
import { CsvImportModal } from "./CsvImportModal";
import { Counters } from "./Counters";
import type { EntryFormValues } from "./entry-form-schema";

function entryToFormValues(e: Entry): EntryFormValues {
  return {
    name: e.name,
    sex: e.sex === "F" ? "F" : "M",
    birthDate: e.birthDate,
    ageOverride: e.ageOverride,
    country: e.country,
    division: e.division,
    disciplineCode: e.disciplineCode,
    day: e.day,
    platform: e.platform,
    flight: e.flight,
    team: e.team ?? "",
    memberId: e.memberId ?? "",
    guest: e.guest,
    instagram: e.instagram ?? "",
    notes: e.notes ?? "",
    bodyweightKg: e.bodyweightKg,
    reweighKg: e.reweighKg,
  };
}

function formValuesToDraft(v: EntryFormValues): EntryDraft {
  return {
    name: v.name.trim(),
    sex: v.sex,
    birthDate: v.birthDate,
    ageOverride: v.ageOverride,
    country: v.country,
    division: v.division,
    disciplineCode: v.disciplineCode as EntryDraft["disciplineCode"],
    day: v.day,
    platform: v.platform,
    flight: v.flight,
    ...(v.team && v.team.trim() !== "" ? { team: v.team.trim() } : {}),
    ...(v.memberId && v.memberId.trim() !== ""
      ? { memberId: v.memberId.trim() }
      : {}),
    guest: v.guest,
    ...(v.instagram && v.instagram.trim() !== ""
      ? { instagram: v.instagram.trim() }
      : {}),
    ...(v.notes && v.notes.trim() !== "" ? { notes: v.notes.trim() } : {}),
    bodyweightKg: v.bodyweightKg,
    reweighKg: v.reweighKg,
  };
}

function downloadAsFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function RegistrationPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const entries = useAppSelector(selectEntries);
  const meet = useAppSelector((s) => s.meet.current);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
  const [drawSeed, setDrawSeed] = useState<number | "">("");
  const [search, setSearch] = useState("");

  const isRu = i18n.language.startsWith("ru");
  const meetDate = meet?.meet.date ?? new Date().toISOString().slice(0, 10);
  const ageCategories = meet?.meet.ageCategories ?? [];
  const weightCategories = meet?.meet.weightCategories ?? [];
  const enabledDisciplineCodes = meet?.meet.enabledDisciplineCodes ?? [];
  const lastLotNumber = meet?.registration.lastLotNumber ?? 0;

  const disciplineLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of ISF_V51_DISCIPLINES) {
      map.set(d.code, isRu ? d.labelRu : d.labelEn);
    }
    return map;
  }, [isRu]);

  const visibleEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.team ?? "").toLowerCase().includes(q) ||
        (e.country ?? "").toLowerCase().includes(q) ||
        (e.memberId ?? "").toLowerCase().includes(q),
    );
  }, [entries, search]);

  function ageOf(e: Entry): number | null {
    if (e.ageOverride !== null) return e.ageOverride;
    if (e.birthDate) return ageInYears(e.birthDate, meetDate);
    return null;
  }

  function ageCatOf(e: Entry): string | null {
    if (e.assignedAgeCategoryCode) return e.assignedAgeCategoryCode;
    const age = ageOf(e);
    if (age === null) return null;
    return resolveAgeCategory(age, ageCategories)?.code ?? null;
  }

  function weightCatOf(e: Entry): string | null {
    if (e.assignedWeightCategoryCode) return e.assignedWeightCategoryCode;
    if (e.bodyweightKg === null) return null;
    const ac = ageCatOf(e);
    return (
      resolveWeightCategory(e.bodyweightKg, e.sex, ac as never, weightCategories)
        ?.code ?? null
    );
  }

  function handleAdd(values: EntryFormValues) {
    dispatch(addEntry(formValuesToDraft(values)));
    setFormOpen(false);
    setEditing(null);
  }

  function handleEdit(values: EntryFormValues) {
    if (!editing) return;
    dispatch(
      updateEntry({
        id: editing.id,
        patch: formValuesToDraft(values),
      }),
    );
    setFormOpen(false);
    setEditing(null);
  }

  function confirmRemove(entry: Entry) {
    modals.openConfirmModal({
      title: t("registration.deleteConfirmTitle"),
      children: (
        <Text size="sm">
          {t("registration.deleteConfirmBody")} — <b>{entry.name}</b>
        </Text>
      ),
      labels: {
        confirm: t("registration.delete"),
        cancel: t("registration.cancel"),
      },
      confirmProps: { color: "red" },
      onConfirm: () => dispatch(removeEntry({ id: entry.id })),
    });
  }

  function handleExport() {
    const csv = buildRegistrationCsv(entries);
    const fname = `${meet?.meet.name || "meet"}-registration.csv`.replace(
      /[\\/:*?"<>|]+/g,
      "_",
    );
    downloadAsFile(fname, csv, "text/csv;charset=utf-8");
    notifications.show({
      color: "green",
      message: t("registration.csvExport.successToast", {
        n: entries.length,
      }),
    });
  }

  function handleCsvCommit(result: {
    drafts: Array<unknown>;
    errors: Array<{ rowIndex: number; field: string; message: string }>;
    totalRows: number;
  }) {
    // Adapt ImportedEntryDraft → EntryDraft (drop the marker prop).
    const drafts: EntryDraft[] = (
      result.drafts as Array<{ __pendingCompetitionFormat: true } & EntryDraft>
    ).map((d) => {
      const { __pendingCompetitionFormat: _drop, ...rest } = d;
      void _drop;
      return rest;
    });
    if (drafts.length > 0) {
      dispatch(bulkImportEntries({ drafts }));
    }
    notifications.show({
      color: drafts.length > 0 ? "green" : "yellow",
      title: t("registration.importCsv"),
      message: `${t("registration.csvImport.successToast", {
        n: drafts.length,
      })} · ${t("registration.csvImport.errorsToast", {
        n: result.errors.length,
      })}`,
    });
  }

  function handleDrawLots() {
    const seed = drawSeed === "" ? undefined : Number(drawSeed);
    const ids = entries.map((e) => e.id);
    const { lotByEntryId, lastLotNumber: nextLast } = assignLotNumbers(
      ids,
      0, // for drawing, we re-assign starting from 1; lot-number = index+1
      seed,
    );
    dispatch(
      applyLotAssignment({
        lotByEntryId,
        lastLotNumber: Math.max(nextLast, lastLotNumber),
      }),
    );
    setDrawOpen(false);
    setDrawSeed("");
    notifications.show({
      color: "green",
      message: t("registration.drawLots") + " ✓",
    });
  }

  if (!meet) return null;

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>{t("registration.title")}</Title>
          <Group gap="sm">
            <Button onClick={() => setFormOpen(true)}>
              + {t("registration.add")}
            </Button>
            <Button variant="default" onClick={() => setCsvOpen(true)}>
              {t("registration.importCsv")}
            </Button>
            <Button
              variant="default"
              onClick={handleExport}
              disabled={entries.length === 0}
            >
              {t("registration.exportCsv")}
            </Button>
            <Button
              variant="default"
              onClick={() => setDrawOpen(true)}
              disabled={entries.length === 0}
            >
              {t("registration.drawLots")}
            </Button>
          </Group>
        </Group>

        <Counters entries={entries} />

        <Group>
          <TextInput
            placeholder={t("registration.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={280}
          />
          <Text size="xs" c="dimmed">
            {t("registration.tipDoubleClick")}
          </Text>
        </Group>

        {entries.length === 0 ? (
          <Card withBorder>
            <Text c="dimmed">{t("registration.empty")}</Text>
          </Card>
        ) : (
          <DataTable<Entry>
            withTableBorder
            withColumnBorders
            striped
            highlightOnHover
            minHeight={200}
            records={visibleEntries.slice()}
            idAccessor="id"
            onRowDoubleClick={({ record }) => {
              setEditing(record);
              setFormOpen(true);
            }}
            columns={[
              {
                accessor: "lot",
                title: t("registration.columns.lot"),
                width: 50,
                render: (e: Entry) =>
                  String(entries.findIndex((x) => x.id === e.id) + 1),
              },
              {
                accessor: "name",
                title: t("registration.columns.name"),
                sortable: true,
              },
              {
                accessor: "sex",
                title: t("registration.columns.sex"),
                width: 60,
                sortable: true,
              },
              {
                accessor: "birthDate",
                title: t("registration.columns.birthDate"),
                width: 120,
                sortable: true,
                render: (e: Entry) => e.birthDate ?? "—",
              },
              {
                accessor: "age",
                title: t("registration.columns.age"),
                width: 60,
                sortable: true,
                render: (e: Entry) => ageOf(e) ?? "—",
              },
              {
                accessor: "country",
                title: t("registration.columns.country"),
                sortable: true,
                render: (e: Entry) => e.country ?? "—",
              },
              {
                accessor: "division",
                title: t("registration.columns.division"),
                sortable: true,
              },
              {
                accessor: "discipline",
                title: t("registration.columns.discipline"),
                sortable: true,
                render: (e: Entry) =>
                  disciplineLabel.get(e.disciplineCode) ?? e.disciplineCode,
              },
              {
                accessor: "weightCategory",
                title: t("registration.columns.weightCategory"),
                sortable: true,
                render: (e: Entry) => weightCatOf(e) ?? "—",
              },
              {
                accessor: "ageCategory",
                title: t("registration.columns.ageCategory"),
                sortable: true,
                render: (e: Entry) => {
                  const c = ageCatOf(e);
                  return c
                    ? t(`ageCategories.${c}`, { defaultValue: c })
                    : "—";
                },
              },
              {
                accessor: "team",
                title: t("registration.columns.team"),
                sortable: true,
                render: (e: Entry) => e.team ?? "—",
              },
              {
                accessor: "actions",
                title: t("registration.columns.actions"),
                width: 110,
                render: (e: Entry) => (
                  <Group gap={4} wrap="nowrap">
                    <Tooltip label={t("registration.edit")}>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => {
                          setEditing(e);
                          setFormOpen(true);
                        }}
                      >
                        ✎
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t("registration.delete")}>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => confirmRemove(e)}
                      >
                        ✕
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                ),
              },
            ]}
          />
        )}

        <EntryFormModal
          opened={formOpen}
          {...(editing
            ? { initialValues: entryToFormValues(editing) }
            : {})}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={editing ? handleEdit : handleAdd}
        />

        <CsvImportModal
          opened={csvOpen}
          enabledDisciplineCodes={enabledDisciplineCodes}
          existingEntries={entries}
          onClose={() => setCsvOpen(false)}
          onCommit={handleCsvCommit}
        />

        <Modal
          opened={drawOpen}
          onClose={() => setDrawOpen(false)}
          title={t("registration.drawLots")}
          centered
        >
          <Stack gap="md">
            <Text size="sm">{t("registration.drawLotsConfirm")}</Text>
            <NumberInput
              label={t("registration.drawLotsSeedLabel")}
              value={drawSeed}
              onChange={(v) =>
                setDrawSeed(typeof v === "number" ? v : "")
              }
              allowNegative={false}
              hideControls
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setDrawOpen(false)}>
                {t("registration.cancel")}
              </Button>
              <Button onClick={handleDrawLots}>
                {t("registration.drawLots")}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}

// Re-export for routing / lazy-loading.
export default RegistrationPage;
