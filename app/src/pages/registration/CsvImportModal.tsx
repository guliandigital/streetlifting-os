/**
 * CSV import modal for registration page.
 *
 * Operator picks a file → we parse via papaparse, show preview + errors,
 * commit on confirm.
 */

import { useRef, useState } from "react";
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
} from "@mantine/core";

import { parseRegistrationCsv } from "@logic/isf/csv-import";
import type { ImportResult } from "@logic/isf/csv-import";
import type { DisciplineCode } from "@domain/models";

export type CsvImportModalProps = {
  opened: boolean;
  enabledDisciplineCodes: ReadonlyArray<DisciplineCode>;
  onClose: () => void;
  onCommit: (result: ImportResult) => void;
};

export function CsvImportModal(props: CsvImportModalProps) {
  const { opened, enabledDisciplineCodes, onClose, onCommit } = props;
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  function reset() {
    setFileName(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseRegistrationCsv(text, enabledDisciplineCodes);
    setResult(parsed);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleCommit() {
    if (!result) return;
    onCommit(result);
    reset();
    onClose();
  }

  const previewRows = result?.drafts.slice(0, 10) ?? [];
  const errorRows = result?.errors.slice(0, 20) ?? [];

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
            disabled={!result || result.drafts.length === 0}
            onClick={handleCommit}
          >
            {t("registration.csvImport.doImport", {
              n: result?.drafts.length ?? 0,
            })}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
