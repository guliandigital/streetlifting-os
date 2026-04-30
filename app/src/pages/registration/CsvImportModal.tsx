/**
 * CSV import modal for registration page.
 *
 * Operator picks a file → we parse via papaparse, show preview + errors +
 * duplicate-detection plan, commit on confirm. Duplicate detection (per
 * `@logic/isf/import-duplicates`) catches:
 *   - matches against existing entries by member-id, name+birth-date,
 *     or name+sex+country
 *   - matches within the same import batch (e.g. accidentally repeated
 *     rows in the spreadsheet)
 * Operator can choose to import all rows (creating duplicates) or skip
 * the flagged rows. Per-row "merge into existing" UX is V2.5+.
 */

import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Button,
  Group,
  Stack,
  Text,
  Alert,
  Code,
  ScrollArea,
  Table,
  SegmentedControl,
  Badge,
} from "@mantine/core";

import { parseRegistrationCsv } from "@logic/isf/csv-import";
import type { ImportResult, ImportedEntryDraft } from "@logic/isf/csv-import";
import {
  buildImportDuplicatePlan,
  type ImportDuplicateMatch,
} from "@logic/isf/import-duplicates";
import type { DisciplineCode, Entry } from "@domain/models";

export type CsvImportModalProps = {
  opened: boolean;
  enabledDisciplineCodes: ReadonlyArray<DisciplineCode>;
  /** Already-registered entries used for duplicate detection. */
  existingEntries: ReadonlyArray<Entry>;
  onClose: () => void;
  /**
   * Receives the (possibly filtered) result the operator chose to commit.
   * `drafts` matches the `mode`: full list when "all", duplicates removed
   * when "skipDuplicates".
   */
  onCommit: (result: ImportResult & { drafts: ImportedEntryDraft[] }) => void;
};

type ImportMode = "all" | "skipDuplicates";

function reasonLabel(
  reason: ImportDuplicateMatch["reason"],
  t: (k: string) => string,
): string {
  switch (reason) {
    case "member_id":
      return t("registration.csvImport.duplicateReason.memberId");
    case "name_birth_date":
      return t("registration.csvImport.duplicateReason.nameBirthDate");
    case "name_sex_country":
      return t("registration.csvImport.duplicateReason.nameSexCountry");
    case "same_import_batch":
      return t("registration.csvImport.duplicateReason.sameImportBatch");
  }
}

export function CsvImportModal(props: CsvImportModalProps) {
  const { opened, enabledDisciplineCodes, existingEntries, onClose, onCommit } =
    props;
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<ImportMode>("all");

  function reset() {
    setFileName(null);
    setResult(null);
    setMode("all");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseRegistrationCsv(text, enabledDisciplineCodes);
    setResult(parsed);
    setMode("all");
  }

  const duplicatePlan = useMemo(
    () =>
      result
        ? buildImportDuplicatePlan(existingEntries, result.drafts)
        : null,
    [result, existingEntries],
  );

  const reviewDecisions = useMemo(
    () =>
      duplicatePlan?.decisions.filter((d) => d.action === "review") ?? [],
    [duplicatePlan],
  );

  const importableDrafts: ImportedEntryDraft[] = useMemo(() => {
    if (!result || !duplicatePlan) return [];
    if (mode === "skipDuplicates") return duplicatePlan.autoCreateDrafts;
    return result.drafts;
  }, [result, duplicatePlan, mode]);

  function handleClose() {
    reset();
    onClose();
  }

  function handleCommit() {
    if (!result) return;
    onCommit({ ...result, drafts: importableDrafts });
    reset();
    onClose();
  }

  const previewRows = result?.drafts.slice(0, 10) ?? [];
  const errorRows = result?.errors.slice(0, 20) ?? [];
  const reviewPreviewRows = reviewDecisions.slice(0, 10);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("registration.csvImport.title")}
      size="xl"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t("registration.csvImport.bodyHeaders")}
        </Text>

        <Group>
          <Button
            variant="default"
            onClick={() => fileInputRef.current?.click()}
          >
            {t("registration.csvImport.pickFile")}
          </Button>
          <Text size="sm">
            {fileName ?? t("registration.csvImport.noFile")}
          </Text>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </Group>

        {result && (
          <>
            {errorRows.length > 0 && (
              <Alert color="red" title={t("registration.csvImport.errors")}>
                <ScrollArea.Autosize mah={150}>
                  <Stack gap={2}>
                    {errorRows.map((er, i) => (
                      <Text size="xs" key={i}>
                        row {er.rowIndex} — <Code>{er.field}</Code>:{" "}
                        {er.message}
                        {er.rawValue !== undefined ? ` («${er.rawValue}»)` : ""}
                      </Text>
                    ))}
                    {result.errors.length > errorRows.length && (
                      <Text size="xs" c="dimmed">
                        … +{result.errors.length - errorRows.length}
                      </Text>
                    )}
                  </Stack>
                </ScrollArea.Autosize>
              </Alert>
            )}

            {reviewDecisions.length > 0 && (
              <Alert
                color="yellow"
                title={t("registration.csvImport.duplicateAlertTitle", {
                  n: reviewDecisions.length,
                })}
              >
                <Stack gap="xs">
                  <Text size="xs">
                    {t("registration.csvImport.duplicateAlertBody")}
                  </Text>
                  <ScrollArea.Autosize mah={140}>
                    <Stack gap={2}>
                      {reviewPreviewRows.map((dec) => (
                        <Group key={dec.draftIndex} gap="xs" wrap="nowrap">
                          <Text size="xs" fw={500} style={{ minWidth: 30 }}>
                            #{dec.draftIndex + 1}
                          </Text>
                          <Text size="xs">{dec.draft.name}</Text>
                          {dec.matches.map((m, i) => (
                            <Badge
                              key={i}
                              size="xs"
                              variant="light"
                              color={m.confidence === "high" ? "red" : "yellow"}
                            >
                              {reasonLabel(m.reason, t)}
                            </Badge>
                          ))}
                        </Group>
                      ))}
                      {reviewDecisions.length > reviewPreviewRows.length && (
                        <Text size="xs" c="dimmed">
                          … +
                          {reviewDecisions.length - reviewPreviewRows.length}
                        </Text>
                      )}
                    </Stack>
                  </ScrollArea.Autosize>
                  <Group>
                    <Text size="xs" fw={500}>
                      {t("registration.csvImport.duplicateMode")}
                    </Text>
                    <SegmentedControl
                      size="xs"
                      value={mode}
                      onChange={(value) => setMode(value as ImportMode)}
                      data={[
                        {
                          value: "all",
                          label: t("registration.csvImport.modeImportAll", {
                            n: result.drafts.length,
                          }),
                        },
                        {
                          value: "skipDuplicates",
                          label: t("registration.csvImport.modeSkipDuplicates", {
                            n:
                              duplicatePlan?.autoCreateDrafts.length ?? 0,
                          }),
                        },
                      ]}
                    />
                  </Group>
                </Stack>
              </Alert>
            )}

            <ScrollArea.Autosize mah={250}>
              <Table withColumnBorders striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>name</Table.Th>
                    <Table.Th>sex</Table.Th>
                    <Table.Th>division</Table.Th>
                    <Table.Th>discipline</Table.Th>
                    <Table.Th>BW</Table.Th>
                    <Table.Th>country</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {previewRows.map((d, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>{d.name}</Table.Td>
                      <Table.Td>{d.sex}</Table.Td>
                      <Table.Td>{d.division}</Table.Td>
                      <Table.Td>{d.disciplineCode}</Table.Td>
                      <Table.Td>{d.bodyweightKg ?? "—"}</Table.Td>
                      <Table.Td>{d.country ?? "—"}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              {result.drafts.length > previewRows.length && (
                <Text size="xs" c="dimmed" mt="xs">
                  … +{result.drafts.length - previewRows.length}
                </Text>
              )}
            </ScrollArea.Autosize>
          </>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={handleClose}>
            {t("registration.cancel")}
          </Button>
          <Button
            disabled={!result || importableDrafts.length === 0}
            onClick={handleCommit}
          >
            {t("registration.csvImport.doImport", {
              n: importableDrafts.length,
            })}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
