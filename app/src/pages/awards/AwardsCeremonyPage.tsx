import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  Container,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useAppSelector } from "@store/index";
import { selectEntries } from "@store/registration-slice";
import { computeClassicResults } from "@logic/isf/classic-placing";
import type { ClassicResultGroup } from "@logic/isf/classic-placing";
import { computeMultirepResults } from "@logic/isf/multirep-placing";
import type { MultirepResultGroup } from "@logic/isf/multirep-placing";

type AwardOrder = "firstToThird" | "thirdToFirst";

type CeremonyAward = {
  id: string;
  format: "classic" | "multirep";
  place: 1 | 2 | 3;
  athleteName: string;
  team: string | null;
  category: string;
  disciplineCode: string;
  result: string;
};

function collectClassicAwards(groups: ClassicResultGroup[]): CeremonyAward[] {
  return groups
    .filter((group) => group.sex !== null || group.ageCategoryCode !== null)
    .flatMap((group) =>
      group.rows
        .filter((row) => row.place === 1 || row.place === 2 || row.place === 3)
        .map((row) => ({
          id: `classic:${group.label}:${row.entry.id}`,
          format: "classic" as const,
          place: row.place as 1 | 2 | 3,
          athleteName: row.entry.name,
          team: row.entry.team ?? null,
          category: group.label,
          disciplineCode: row.entry.disciplineCode,
          result: row.total > 0 ? `${row.total} kg` : "–",
        })),
    );
}

function collectMultirepAwards(groups: MultirepResultGroup[]): CeremonyAward[] {
  return groups.flatMap((group) =>
    group.rows
      .filter((row) => row.place === 1 || row.place === 2 || row.place === 3)
      .map((row) => ({
        id: `multirep:${group.label}:${row.entry.id}`,
        format: "multirep" as const,
        place: row.place as 1 | 2 | 3,
        athleteName: row.entry.name,
        team: row.entry.team ?? null,
        category: group.label,
        disciplineCode: row.entry.disciplineCode,
        result: row.totalReps > 0 ? `${row.totalReps} reps` : "–",
      })),
  );
}

function sortAwards(items: CeremonyAward[], order: AwardOrder): CeremonyAward[] {
  const placeDirection = order === "firstToThird" ? 1 : -1;

  return [...items].sort((a, b) => {
    const categoryDiff = a.category.localeCompare(b.category);
    if (categoryDiff !== 0) return categoryDiff;
    const placeDiff = (a.place - b.place) * placeDirection;
    if (placeDiff !== 0) return placeDiff;
    return a.athleteName.localeCompare(b.athleteName);
  });
}

export function AwardsCeremonyPage() {
  const { t } = useTranslation();
  const meet = useAppSelector((s) => s.meet.current);
  const entries = useAppSelector(selectEntries);
  const [order, setOrder] = useState<AwardOrder>("thirdToFirst");
  const [activeIndex, setActiveIndex] = useState(0);

  const meetDate = meet?.meet.date ?? new Date().toISOString().slice(0, 10);

  const awards = useMemo(() => {
    if (!meet) return [];
    const classicGroups = computeClassicResults(entries, meet.meet, meetDate);
    const multirepGroups = computeMultirepResults(entries, meet.meet, meetDate);
    return sortAwards(
      [...collectClassicAwards(classicGroups), ...collectMultirepAwards(multirepGroups)],
      order,
    );
  }, [entries, meet, meetDate, order]);

  const activeAward = awards[activeIndex] ?? null;

  useEffect(() => {
    setActiveIndex(0);
  }, [order, awards.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        setActiveIndex((idx) => Math.min(idx + 1, Math.max(awards.length - 1, 0)));
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((idx) => Math.max(idx - 1, 0));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [awards.length]);

  return (
    <Container size="lg" py="md">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Title order={2}>{t("awards.title")}</Title>
            <Text size="sm" c="dimmed">
              {meet?.meet.name ?? "Meet"} · {meetDate}
            </Text>
          </Stack>
          <SegmentedControl
            value={order}
            onChange={(value) => setOrder(value as AwardOrder)}
            data={[
              { value: "thirdToFirst", label: t("awards.thirdToFirst") },
              { value: "firstToThird", label: t("awards.firstToThird") },
            ]}
          />
        </Group>

        {!activeAward ? (
          <Text c="dimmed" ta="center" py="xl">
            {t("awards.empty")}
          </Text>
        ) : (
          <Stack gap="lg" align="center" py="xl">
            <Badge size="xl" color={activeAward.format === "classic" ? "red" : "blue"}>
              {activeAward.format === "classic" ? "Classic" : "Multirep"}
            </Badge>
            <Text size="xl" c="dimmed" ta="center">
              {activeAward.category}
            </Text>
            <Text size="48px" fw={900} ta="center">
              {t("awards.place", { place: activeAward.place })}
            </Text>
            <Text size="44px" fw={900} ta="center">
              {activeAward.athleteName}
            </Text>
            {activeAward.team && (
              <Text size="xl" c="dimmed" ta="center">
                {activeAward.team}
              </Text>
            )}
            <Text size="28px" fw={700} c="red" ta="center">
              {activeAward.disciplineCode} · {activeAward.result}
            </Text>
          </Stack>
        )}

        <Group justify="space-between">
          <Button
            variant="outline"
            onClick={() => setActiveIndex((idx) => Math.max(idx - 1, 0))}
            disabled={activeIndex === 0}
          >
            {t("awards.previous")}
          </Button>
          <Text size="sm" c="dimmed">
            {awards.length === 0 ? "0 / 0" : `${activeIndex + 1} / ${awards.length}`}
          </Text>
          <Button
            onClick={() =>
              setActiveIndex((idx) =>
                Math.min(idx + 1, Math.max(awards.length - 1, 0)),
              )
            }
            disabled={activeIndex >= awards.length - 1}
          >
            {t("awards.next")}
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
