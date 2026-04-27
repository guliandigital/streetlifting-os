/**
 * Counter strip for the Registration page — total / by sex / by age cat / by weight cat.
 */

import { useMemo } from "react";
import { Card, Group, Stack, Text, Badge } from "@mantine/core";
import { useTranslation } from "react-i18next";

import type { Entry } from "@domain/models";
import { useAppSelector } from "@store/index";
import { ageInYears, resolveAgeCategory } from "@logic/isf/age";
import { resolveWeightCategory } from "@logic/isf/weight-category-resolver";

export function Counters({ entries }: { entries: ReadonlyArray<Entry> }) {
  const { t } = useTranslation();
  const meet = useAppSelector((s) => s.meet.current);
  const meetDate = meet?.meet.date ?? new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const ageCategories = meet?.meet.ageCategories ?? [];
    const weightCategories = meet?.meet.weightCategories ?? [];
    const bySex: Record<string, number> = {};
    const byAge: Record<string, number> = {};
    const byWeight: Record<string, number> = {};
    for (const e of entries) {
      bySex[e.sex] = (bySex[e.sex] ?? 0) + 1;

      const age =
        e.ageOverride ??
        (e.birthDate ? ageInYears(e.birthDate, meetDate) : null);
      const ageCat =
        e.assignedAgeCategoryCode ??
        (age !== null ? resolveAgeCategory(age, ageCategories)?.code : null) ??
        null;
      if (ageCat) byAge[ageCat] = (byAge[ageCat] ?? 0) + 1;

      const wcCode =
        e.assignedWeightCategoryCode ??
        (e.bodyweightKg !== null
          ? resolveWeightCategory(
              e.bodyweightKg,
              e.sex,
              ageCat,
              weightCategories,
            )?.code
          : null) ??
        null;
      if (wcCode) byWeight[wcCode] = (byWeight[wcCode] ?? 0) + 1;
    }
    return { bySex, byAge, byWeight };
  }, [entries, meetDate, meet]);

  return (
    <Card withBorder shadow="sm">
      <Stack gap="xs">
        <Group gap="md" wrap="wrap">
          <Text fw={600}>
            {t("registration.counters.total")}: {entries.length}
          </Text>

          <Group gap={4}>
            <Text size="sm" c="dimmed">
              {t("registration.counters.bySex")}:
            </Text>
            {Object.entries(stats.bySex).map(([k, v]) => (
              <Badge key={k} variant="light">
                {k}: {v}
              </Badge>
            ))}
          </Group>

          <Group gap={4}>
            <Text size="sm" c="dimmed">
              {t("registration.counters.byAge")}:
            </Text>
            {Object.entries(stats.byAge).map(([k, v]) => (
              <Badge key={k} variant="light" color="grape">
                {t(`ageCategories.${k}`, { defaultValue: k })}: {v}
              </Badge>
            ))}
          </Group>

          <Group gap={4}>
            <Text size="sm" c="dimmed">
              {t("registration.counters.byWeight")}:
            </Text>
            {Object.entries(stats.byWeight).map(([k, v]) => (
              <Badge key={k} variant="light" color="teal">
                {k}: {v}
              </Badge>
            ))}
          </Group>
        </Group>
      </Stack>
    </Card>
  );
}
