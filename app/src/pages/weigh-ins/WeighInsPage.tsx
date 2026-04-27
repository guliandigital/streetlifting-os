/**
 * Weigh-ins page — Sprint 1 §6.
 *
 * - Table of all registered athletes
 * - Inline-editable bodyweightKg + reweighKg (0.1 kg precision per ISF v5.1 §7.2)
 * - Auto-resolved weight & age categories shown as preview
 * - "Confirm" per row freezes assignedWeightCategoryCode + assignedAgeCategoryCode
 * - "Confirm all" — bulk confirm for athletes with a known bodyweight
 *
 * Route guard: handled by RequireMeet in App.tsx.
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Container,
  Stack,
  Title,
  Group,
  Button,
  Text,
  Badge,
  Tooltip,
  Card,
  ActionIcon,
} from "@mantine/core";
import { DataTable } from "mantine-datatable";
import { notifications } from "@mantine/notifications";

import { useAppDispatch, useAppSelector } from "@store/index";
import {
  setBodyweight,
  setReweigh,
  confirmWeighIn,
  selectEntries,
} from "@store/registration-slice";
import type { AgeCategoryCode } from "@domain/models";
import { ageInYears, resolveAgeCategory } from "@logic/isf/age";
import { resolveWeightCategory } from "@logic/isf/weight-category-resolver";

import { WeighInCell } from "./WeighInCell";

type RowState = "pending" | "confirmed" | "needsBodyweight";

export function WeighInsPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const entries = useAppSelector(selectEntries);
  const meet = useAppSelector((s) => s.meet.current);

  const meetDate = meet?.meet.date ?? new Date().toISOString().slice(0, 10);
  const ageCategories = meet?.meet.ageCategories ?? [];
  const weightCategories = meet?.meet.weightCategories ?? [];

  const enriched = useMemo(() => {
    return entries.map((e) => {
      const age =
        e.ageOverride ??
        (e.birthDate ? ageInYears(e.birthDate, meetDate) : null);
      const ageCatCode =
        e.assignedAgeCategoryCode ??
        (age !== null
          ? (resolveAgeCategory(age, ageCategories)?.code as
              | AgeCategoryCode
              | undefined)
          : undefined) ??
        null;
      const wc =
        e.bodyweightKg !== null
          ? resolveWeightCategory(
              e.bodyweightKg,
              e.sex,
              ageCatCode,
              weightCategories,
            )
          : null;
      const status: RowState =
        e.bodyweightKg === null
          ? "needsBodyweight"
          : e.assignedWeightCategoryCode !== undefined
            ? "confirmed"
            : "pending";
      return {
        entry: e,
        age,
        ageCatCode,
        weightCatCode: wc?.code ?? null,
        status,
      };
    });
  }, [entries, meetDate, ageCategories, weightCategories]);

  function handleSetBodyweight(id: string, value: number | null) {
    dispatch(setBodyweight({ id, bodyweightKg: value }));
  }

  function handleSetReweigh(id: string, value: number | null) {
    const target = entries.find((x) => x.id === id);
    if (target && target.bodyweightKg === null && value !== null) {
      notifications.show({
        color: "orange",
        message: t("weighIns.reweighRequiresBodyweight"),
      });
      return;
    }
    dispatch(setReweigh({ id, reweighKg: value }));
  }

  function handleConfirm(row: (typeof enriched)[number]) {
    if (row.entry.bodyweightKg === null) return;
    dispatch(
      confirmWeighIn({
        id: row.entry.id,
        weightCategoryCode: row.weightCatCode,
        ageCategoryCode: row.ageCatCode,
      }),
    );
    notifications.show({
      color: "green",
      message: `${row.entry.name}: ${row.weightCatCode ?? "—"} / ${
        row.ageCatCode ? t(`ageCategories.${row.ageCatCode}`) : "—"
      } ✓`,
    });
  }

  function handleConfirmAll() {
    let n = 0;
    for (const row of enriched) {
      if (row.entry.bodyweightKg === null) continue;
      dispatch(
        confirmWeighIn({
          id: row.entry.id,
          weightCategoryCode: row.weightCatCode,
          ageCategoryCode: row.ageCatCode,
        }),
      );
      n += 1;
    }
    notifications.show({
      color: n > 0 ? "green" : "yellow",
      message:
        n > 0
          ? t("weighIns.bulkConfirmedToast", { n })
          : t("weighIns.bulkConfirmedNoneToast"),
    });
  }

  if (!meet) return null;

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>{t("weighIns.title")}</Title>
          <Group gap="sm">
            <Text size="xs" c="dimmed">
              {t("weighIns.precisionHint")}
            </Text>
            <Button onClick={handleConfirmAll} disabled={entries.length === 0}>
              {t("weighIns.confirmAll")}
            </Button>
          </Group>
        </Group>

        {entries.length === 0 ? (
          <Card withBorder>
            <Text c="dimmed">{t("registration.empty")}</Text>
          </Card>
        ) : (
          <DataTable
            withTableBorder
            withColumnBorders
            striped
            highlightOnHover
            minHeight={200}
            records={enriched}
            idAccessor={(r) => r.entry.id}
            columns={[
              {
                accessor: "lot",
                title: t("registration.columns.lot"),
                width: 50,
                render: (r) =>
                  String(
                    entries.findIndex((x) => x.id === r.entry.id) + 1,
                  ),
              },
              {
                accessor: "name",
                title: t("registration.columns.name"),
                render: (r) => (
                  <span>
                    {r.entry.name}{" "}
                    <Text component="span" size="xs" c="dimmed">
                      ({r.entry.sex})
                    </Text>
                  </span>
                ),
              },
              {
                accessor: "declared",
                title: t("weighIns.declared"),
                width: 120,
                render: (r) =>
                  r.entry.assignedWeightCategoryCode ??
                  t("weighIns.notResolved"),
              },
              {
                accessor: "birthDate",
                title: t("registration.columns.birthDate"),
                width: 110,
                render: (r) => r.entry.birthDate ?? "—",
              },
              {
                accessor: "bodyweight",
                title: t("registration.columns.bodyweight"),
                width: 120,
                render: (r) => (
                  <WeighInCell
                    ariaLabel={`${r.entry.name} bodyweight`}
                    value={r.entry.bodyweightKg}
                    onCommit={(v) => handleSetBodyweight(r.entry.id, v)}
                  />
                ),
              },
              {
                accessor: "reweigh",
                title: t("registration.columns.reweigh"),
                width: 130,
                render: (r) => (
                  <Tooltip
                    label={t("weighIns.reweighRequiresBodyweight")}
                    disabled={r.entry.bodyweightKg !== null}
                  >
                    <span>
                      <WeighInCell
                        ariaLabel={`${r.entry.name} reweigh`}
                        value={r.entry.reweighKg}
                        disabled={r.entry.bodyweightKg === null}
                        onCommit={(v) => handleSetReweigh(r.entry.id, v)}
                      />
                    </span>
                  </Tooltip>
                ),
              },
              {
                accessor: "actualWc",
                title: t("registration.columns.weightCategory"),
                width: 120,
                render: (r) =>
                  r.weightCatCode ? (
                    <Badge color="teal" variant="light">
                      {r.weightCatCode}
                    </Badge>
                  ) : (
                    "—"
                  ),
              },
              {
                accessor: "actualAc",
                title: t("registration.columns.ageCategory"),
                width: 130,
                render: (r) =>
                  r.ageCatCode ? (
                    <Badge color="grape" variant="light">
                      {t(`ageCategories.${r.ageCatCode}`, {
                        defaultValue: r.ageCatCode,
                      })}
                    </Badge>
                  ) : (
                    "—"
                  ),
              },
              {
                accessor: "status",
                title: "Status",
                width: 130,
                render: (r) =>
                  r.status === "confirmed" ? (
                    <Badge color="green">
                      {t("weighIns.statusConfirmed")}
                    </Badge>
                  ) : r.status === "pending" ? (
                    <Badge color="orange">
                      {t("weighIns.statusPending")}
                    </Badge>
                  ) : (
                    <Badge color="gray">—</Badge>
                  ),
              },
              {
                accessor: "actions",
                title: t("registration.columns.actions"),
                width: 80,
                render: (r) => (
                  <ActionIcon
                    variant="subtle"
                    color="green"
                    disabled={r.entry.bodyweightKg === null}
                    onClick={() => handleConfirm(r)}
                    aria-label={t("weighIns.confirm")}
                  >
                    ✓
                  </ActionIcon>
                ),
              },
            ]}
          />
        )}
      </Stack>
    </Container>
  );
}

export default WeighInsPage;
