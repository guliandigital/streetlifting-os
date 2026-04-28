/**
 * MeetSetupPage — /meet-setup.
 *
 * Runtime editor for V1 meet-level settings. It deliberately works inside the
 * existing SaveFile v2 shape: ISF v5.1 presets stay hardcoded and no RulesPack
 * or save-file schema migration is introduced here.
 */

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Container,
  Group,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  addPlate,
  removePlate,
  setAgeCategories,
  setEnabledDisciplineCodes,
  setWeightCategories,
  updateMeetBasics,
  updatePlate,
} from "@store/meet-slice";
import { useAppDispatch, useAppSelector } from "@store/index";
import {
  ISF_V51_AGE_CATEGORIES,
  ISF_V51_DEFAULT_PLATES,
  ISF_V51_DISCIPLINES,
  ISF_V51_WEIGHT_CATEGORIES,
} from "@domain/presets";
import type {
  AgeCategory,
  Discipline,
  DisciplineCode,
  WeightCategory,
} from "@domain/models";

type CategoryMode = "all" | "enabled";

function SectionPaper({ children }: { children: React.ReactNode }) {
  return (
    <Paper withBorder radius="md" p="md">
      {children}
    </Paper>
  );
}

function useLocalizedDisciplineLabel() {
  const { i18n } = useTranslation();
  const isRussian = i18n.language === "ru-RU";

  return (discipline: Discipline) =>
    isRussian ? discipline.labelRu : discipline.labelEn;
}

function formatWeightCategory(cat: WeightCategory) {
  if (cat.maxKg === null) return `${cat.minKg}+ kg`;
  if (cat.minKg === null) return `≤ ${cat.maxKg} kg`;
  return `>${cat.minKg} / ≤ ${cat.maxKg} kg`;
}

function formatAgeCategory(cat: AgeCategory) {
  if (cat.minAge === null && cat.maxAge === null) return "all";
  if (cat.maxAge === null) return `${cat.minAge}+`;
  if (cat.minAge === null) return `≤ ${cat.maxAge}`;
  return `${cat.minAge}-${cat.maxAge}`;
}

function currentEnabledCodes(enabledCodes: DisciplineCode[]): DisciplineCode[] {
  return enabledCodes.length > 0
    ? enabledCodes
    : ISF_V51_DISCIPLINES.map((discipline) => discipline.code);
}

function SummaryHeader() {
  const { t } = useTranslation();
  const meet = useAppSelector((s) => s.meet.current?.meet);

  if (!meet) return null;

  const enabledCodes = currentEnabledCodes(meet.enabledDisciplineCodes);
  const standardPlates =
    meet.classicLoadConfig?.plates.filter((plate) => !plate.recordOnly).length ?? 0;
  const recordPlates =
    meet.classicLoadConfig?.plates.filter((plate) => plate.recordOnly).length ?? 0;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm" mb="md">
      <SectionPaper>
        <Text size="xs" c="dimmed">
          {t("meetSetup.summary.rulePreset")}
        </Text>
        <Group gap="xs" mt={4}>
          <Badge color="red" variant="light">
            ISF v5.1
          </Badge>
          <Badge color="gray" variant="outline">
            {t("meetSetup.summary.hardcoded")}
          </Badge>
        </Group>
      </SectionPaper>
      <SectionPaper>
        <Text size="xs" c="dimmed">
          {t("meetSetup.summary.disciplines")}
        </Text>
        <Text fw={700}>{enabledCodes.length}</Text>
      </SectionPaper>
      <SectionPaper>
        <Text size="xs" c="dimmed">
          {t("meetSetup.summary.categories")}
        </Text>
        <Text fw={700}>
          {meet.weightCategories.length} / {meet.ageCategories.length}
        </Text>
      </SectionPaper>
      <SectionPaper>
        <Text size="xs" c="dimmed">
          {t("meetSetup.summary.equipment")}
        </Text>
        <Text fw={700}>
          {standardPlates} + {recordPlates}
        </Text>
      </SectionPaper>
    </SimpleGrid>
  );
}

function BasicTab() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const meet = useAppSelector((s) => s.meet.current?.meet);

  if (!meet) return null;

  const dateValue = meet.date ? new Date(`${meet.date}T00:00:00`) : null;

  return (
    <Stack gap="md" pt="md">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <SectionPaper>
          <Stack gap="sm">
            <Text fw={700}>{t("meetSetup.basic.meetIdentity")}</Text>
            <TextInput
              label={t("meetSetup.basic.name")}
              value={meet.name}
              onChange={(event) =>
                dispatch(updateMeetBasics({ name: event.currentTarget.value }))
              }
            />
            <TextInput
              label={t("meetSetup.basic.federation")}
              value={meet.federation}
              onChange={(event) =>
                dispatch(updateMeetBasics({ federation: event.currentTarget.value }))
              }
            />
            <DateInput
              label={t("meetSetup.basic.date")}
              value={dateValue}
              valueFormat="YYYY-MM-DD"
              onChange={(value) => {
                if (value) {
                  dispatch(updateMeetBasics({ date: value.toISOString().slice(0, 10) }));
                }
              }}
            />
          </Stack>
        </SectionPaper>

        <SectionPaper>
          <Stack gap="sm">
            <Text fw={700}>{t("meetSetup.basic.location")}</Text>
            <TextInput
              label={t("meetSetup.basic.country")}
              value={meet.country}
              onChange={(event) =>
                dispatch(updateMeetBasics({ country: event.currentTarget.value }))
              }
            />
            <TextInput
              label={t("meetSetup.basic.state")}
              value={meet.state}
              onChange={(event) =>
                dispatch(updateMeetBasics({ state: event.currentTarget.value }))
              }
            />
            <TextInput
              label={t("meetSetup.basic.city")}
              value={meet.city}
              onChange={(event) =>
                dispatch(updateMeetBasics({ city: event.currentTarget.value }))
              }
            />
          </Stack>
        </SectionPaper>
      </SimpleGrid>

      <SectionPaper>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Stack gap="sm">
            <Text size="sm" fw={500}>
              {t("meetSetup.basic.format")}
            </Text>
            <SegmentedControl
              value={meet.competitionFormat}
              onChange={(value) =>
                dispatch(
                  updateMeetBasics({
                    competitionFormat: value as "classic" | "multirep",
                  }),
                )
              }
              data={[
                { label: "Classic", value: "classic" },
                { label: "Multirep", value: "multirep" },
              ]}
            />
            <Select
              label={t("meetSetup.basic.formula")}
              value={meet.formula}
              onChange={(value) => {
                if (value) {
                  dispatch(
                    updateMeetBasics({
                      formula: value as
                        | "ISF_POINTS"
                        | "RESULT"
                        | "RESULT_X_COEFFICIENT",
                    }),
                  );
                }
              }}
              data={[
                { label: "ISF Points", value: "ISF_POINTS" },
                { label: "Result x Coefficient", value: "RESULT_X_COEFFICIENT" },
                { label: "Result", value: "RESULT" },
              ]}
            />
          </Stack>

          <Stack gap="sm">
            <Text fw={700}>{t("meetSetup.basic.meetLevel")}</Text>
            <Switch
              label={t("meetSetup.basic.mastersAdj")}
              checked={meet.useMastersAdjustment}
              onChange={(event) =>
                dispatch(
                  updateMeetBasics({
                    useMastersAdjustment: event.currentTarget.checked,
                  }),
                )
              }
            />
            <Switch
              label={t("meetSetup.basic.lowerBWFirst")}
              checked={meet.lowerBodyweightFirstTiebreak}
              onChange={(event) =>
                dispatch(
                  updateMeetBasics({
                    lowerBodyweightFirstTiebreak: event.currentTarget.checked,
                  }),
                )
              }
            />
            <Alert color="gray" variant="light">
              {t("meetSetup.basic.schemaNote")}
            </Alert>
          </Stack>
        </SimpleGrid>
      </SectionPaper>
    </Stack>
  );
}

function DisciplineRows({
  title,
  disciplines,
}: {
  title: string;
  disciplines: Discipline[];
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const label = useLocalizedDisciplineLabel();
  const enabledCodes = useAppSelector(
    (s) => s.meet.current?.meet.enabledDisciplineCodes ?? [],
  );
  const effectiveEnabledCodes = currentEnabledCodes(enabledCodes);
  const codes = disciplines.map((discipline) => discipline.code);
  const allSelected = codes.every((code) => effectiveEnabledCodes.includes(code));

  function setDisciplineEnabled(code: DisciplineCode, enabled: boolean) {
    dispatch(
      setEnabledDisciplineCodes(
        enabled
          ? Array.from(new Set([...effectiveEnabledCodes, code]))
          : effectiveEnabledCodes.filter((enabledCode) => enabledCode !== code),
      ),
    );
  }

  return (
    <SectionPaper>
      <Group justify="space-between" align="center" mb="sm">
        <Group gap="xs">
          <Text fw={700}>{title}</Text>
          <Badge variant="light">{disciplines.length}</Badge>
        </Group>
        <Button
          size="xs"
          variant="light"
          onClick={() => {
            const otherCodes = effectiveEnabledCodes.filter(
              (code) => !codes.includes(code),
            );
            dispatch(
              setEnabledDisciplineCodes(allSelected ? otherCodes : [...otherCodes, ...codes]),
            );
          }}
        >
          {allSelected
            ? t("meetSetup.disciplines.clearGroup")
            : t("meetSetup.disciplines.selectGroup")}
        </Button>
      </Group>

      <Table withTableBorder withColumnBorders fz="sm" verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: 52 }}>{t("meetSetup.common.on")}</Table.Th>
            <Table.Th>{t("meetSetup.disciplines.discipline")}</Table.Th>
            <Table.Th>{t("meetSetup.disciplines.event")}</Table.Th>
            <Table.Th>{t("meetSetup.disciplines.load")}</Table.Th>
            <Table.Th>{t("meetSetup.disciplines.formula")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {disciplines.map((discipline) => (
            <Table.Tr key={discipline.code}>
              <Table.Td>
                <Checkbox
                  checked={effectiveEnabledCodes.includes(discipline.code)}
                  onChange={(event) =>
                    setDisciplineEnabled(
                      discipline.code,
                      event.currentTarget.checked,
                    )
                  }
                  aria-label={label(discipline)}
                />
              </Table.Td>
              <Table.Td>
                <Text fw={500}>{label(discipline)}</Text>
                <Text size="xs" c="dimmed">
                  {discipline.code}
                </Text>
              </Table.Td>
              <Table.Td>{discipline.event}</Table.Td>
              <Table.Td>
                {discipline.presetLoadKg
                  ? [
                      discipline.presetLoadKg.PU
                        ? `PU ${discipline.presetLoadKg.PU} kg`
                        : null,
                      discipline.presetLoadKg.DI
                        ? `DI ${discipline.presetLoadKg.DI} kg`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" / ")
                  : t("meetSetup.disciplines.freeLoad")}
              </Table.Td>
              <Table.Td>
                <Badge variant="outline">{discipline.formula}</Badge>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </SectionPaper>
  );
}

function DisciplinesTab() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const classicDisciplines = ISF_V51_DISCIPLINES.filter(
    (discipline) => discipline.competitionFormat === "classic",
  );
  const multirepDisciplines = ISF_V51_DISCIPLINES.filter(
    (discipline) => discipline.competitionFormat === "multirep",
  );

  return (
    <Stack gap="md" pt="md">
      <Group justify="flex-end">
        <Button
          size="xs"
          variant="outline"
          onClick={() =>
            dispatch(
              setEnabledDisciplineCodes(
                ISF_V51_DISCIPLINES.map((discipline) => discipline.code),
              ),
            )
          }
        >
          {t("meetSetup.disciplines.selectAll")}
        </Button>
      </Group>
      <DisciplineRows
        title={t("meetSetup.disciplines.classic")}
        disciplines={classicDisciplines}
      />
      <DisciplineRows
        title={t("meetSetup.disciplines.multirep")}
        disciplines={multirepDisciplines}
      />
    </Stack>
  );
}

function WeightCatsTab() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [mode, setMode] = React.useState<CategoryMode>("all");
  const weightCategories = useAppSelector(
    (s) => s.meet.current?.meet.weightCategories ?? [],
  );

  function isEnabled(cat: WeightCategory) {
    return weightCategories.some((weightCategory) => weightCategory.code === cat.code);
  }

  function toggle(cat: WeightCategory) {
    dispatch(
      setWeightCategories(
        isEnabled(cat)
          ? weightCategories.filter((weightCategory) => weightCategory.code !== cat.code)
          : [...weightCategories, cat],
      ),
    );
  }

  const rows = ISF_V51_WEIGHT_CATEGORIES.filter(
    (category) => mode === "all" || isEnabled(category),
  );

  return (
    <Stack gap="md" pt="md">
      <Group justify="space-between">
        <SegmentedControl
          size="xs"
          value={mode}
          onChange={(value) => setMode(value as CategoryMode)}
          data={[
            { label: t("meetSetup.common.all"), value: "all" },
            { label: t("meetSetup.common.enabled"), value: "enabled" },
          ]}
        />
        <Button
          size="xs"
          variant="outline"
          onClick={() => dispatch(setWeightCategories([...ISF_V51_WEIGHT_CATEGORIES]))}
        >
          {t("meetSetup.weightCats.resetToDefault")}
        </Button>
      </Group>
      <SectionPaper>
        <ScrollArea>
          <Table withTableBorder withColumnBorders fz="sm" verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 52 }}>{t("meetSetup.common.on")}</Table.Th>
                <Table.Th>{t("meetSetup.common.sex")}</Table.Th>
                <Table.Th>{t("meetSetup.weightCats.category")}</Table.Th>
                <Table.Th>{t("meetSetup.weightCats.boundary")}</Table.Th>
                <Table.Th>{t("meetSetup.weightCats.restriction")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((category) => (
                <Table.Tr key={category.code}>
                  <Table.Td>
                    <Checkbox
                      checked={isEnabled(category)}
                      onChange={() => toggle(category)}
                      aria-label={category.code}
                    />
                  </Table.Td>
                  <Table.Td>{category.sex}</Table.Td>
                  <Table.Td>
                    <Text fw={500}>{category.code}</Text>
                  </Table.Td>
                  <Table.Td>{formatWeightCategory(category)}</Table.Td>
                  <Table.Td>
                    {category.ageCategoryCodes?.length ? (
                      <Badge variant="light">
                        {category.ageCategoryCodes.join(", ")}
                      </Badge>
                    ) : (
                      <Text c="dimmed" size="sm">
                        {t("meetSetup.common.none")}
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </SectionPaper>
    </Stack>
  );
}

function AgeCatsTab() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const [mode, setMode] = React.useState<CategoryMode>("all");
  const ageCategories = useAppSelector(
    (s) => s.meet.current?.meet.ageCategories ?? [],
  );
  const isRussian = i18n.language === "ru-RU";

  function isEnabled(cat: AgeCategory) {
    return ageCategories.some((ageCategory) => ageCategory.code === cat.code);
  }

  function toggle(cat: AgeCategory) {
    dispatch(
      setAgeCategories(
        isEnabled(cat)
          ? ageCategories.filter((ageCategory) => ageCategory.code !== cat.code)
          : [...ageCategories, cat],
      ),
    );
  }

  const rows = ISF_V51_AGE_CATEGORIES.filter(
    (category) => mode === "all" || isEnabled(category),
  );

  return (
    <Stack gap="md" pt="md">
      <Group justify="space-between">
        <SegmentedControl
          size="xs"
          value={mode}
          onChange={(value) => setMode(value as CategoryMode)}
          data={[
            { label: t("meetSetup.common.all"), value: "all" },
            { label: t("meetSetup.common.enabled"), value: "enabled" },
          ]}
        />
        <Button
          size="xs"
          variant="outline"
          onClick={() => dispatch(setAgeCategories([...ISF_V51_AGE_CATEGORIES]))}
        >
          {t("meetSetup.ageCats.resetToDefault")}
        </Button>
      </Group>
      <SectionPaper>
        <Table withTableBorder withColumnBorders fz="sm" verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 52 }}>{t("meetSetup.common.on")}</Table.Th>
              <Table.Th>{t("meetSetup.ageCats.category")}</Table.Th>
              <Table.Th>{t("meetSetup.ageCats.range")}</Table.Th>
              <Table.Th>{t("meetSetup.ageCats.ratingEligible")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((category) => (
              <Table.Tr key={category.code}>
                <Table.Td>
                  <Checkbox
                    checked={isEnabled(category)}
                    onChange={() => toggle(category)}
                    aria-label={category.code}
                  />
                </Table.Td>
                <Table.Td>
                  <Text fw={500}>{isRussian ? category.labelRu : category.label}</Text>
                  <Text size="xs" c="dimmed">
                    {category.code}
                  </Text>
                </Table.Td>
                <Table.Td>{formatAgeCategory(category)}</Table.Td>
                <Table.Td>
                  <Badge color={category.ratingEligible ? "green" : "gray"} variant="light">
                    {category.ratingEligible
                      ? t("meetSetup.common.yes")
                      : t("meetSetup.common.no")}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </SectionPaper>
    </Stack>
  );
}

function PlatesTab() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const classicLoadConfig = useAppSelector(
    (s) => s.meet.current?.meet.classicLoadConfig,
  );

  if (!classicLoadConfig) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t("meetSetup.plates.noConfig")}
      </Text>
    );
  }

  return (
    <Stack gap="md" pt="md">
      <Group justify="space-between">
        <Alert color="gray" variant="light" style={{ flex: 1 }}>
          {t("meetSetup.plates.incrementNote")}
        </Alert>
        <Button
          size="xs"
          variant="outline"
          onClick={() => {
            for (let index = classicLoadConfig.plates.length - 1; index >= 0; index -= 1) {
              dispatch(removePlate(index));
            }
            for (const plate of ISF_V51_DEFAULT_PLATES) {
              dispatch(addPlate({ ...plate }));
            }
          }}
        >
          {t("meetSetup.plates.resetToDefault")}
        </Button>
      </Group>
      <SectionPaper>
        <ScrollArea>
          <Table withTableBorder withColumnBorders fz="sm" verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("meetSetup.plates.weight")}</Table.Th>
                <Table.Th>{t("meetSetup.plates.pairs")}</Table.Th>
                <Table.Th>{t("meetSetup.plates.color")}</Table.Th>
                <Table.Th>{t("meetSetup.plates.recordOnly")}</Table.Th>
                <Table.Th style={{ width: 48 }} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {classicLoadConfig.plates.map((plate, index) => (
                <Table.Tr key={`${plate.weightKg}-${index}`}>
                  <Table.Td>
                    <NumberInput
                      size="xs"
                      value={plate.weightKg}
                      min={0.25}
                      step={0.25}
                      decimalScale={2}
                      onChange={(value) => {
                        if (typeof value === "number") {
                          dispatch(
                            updatePlate({ index, patch: { weightKg: value } }),
                          );
                        }
                      }}
                      styles={{ input: { width: 90 } }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      size="xs"
                      value={plate.pairCount}
                      min={0}
                      step={1}
                      onChange={(value) => {
                        if (typeof value === "number") {
                          dispatch(
                            updatePlate({ index, patch: { pairCount: value } }),
                          );
                        }
                      }}
                      styles={{ input: { width: 72 } }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <TextInput
                      size="xs"
                      value={plate.color}
                      onChange={(event) =>
                        dispatch(
                          updatePlate({
                            index,
                            patch: { color: event.currentTarget.value },
                          }),
                        )
                      }
                      styles={{ input: { width: 110 } }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Checkbox
                      checked={!!plate.recordOnly}
                      onChange={(event) =>
                        dispatch(
                          updatePlate({
                            index,
                            patch: { recordOnly: event.currentTarget.checked },
                          }),
                        )
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label={t("meetSetup.plates.remove")}>
                      <ActionIcon
                        size="sm"
                        color="red"
                        variant="subtle"
                        onClick={() => dispatch(removePlate(index))}
                        aria-label={t("meetSetup.plates.remove")}
                      >
                        x
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </SectionPaper>
      <Button
        size="xs"
        variant="light"
        onClick={() =>
          dispatch(addPlate({ weightKg: 1.25, pairCount: 1, color: "gray" }))
        }
      >
        {t("meetSetup.plates.add")}
      </Button>
    </Stack>
  );
}

function BarsTab() {
  const { t } = useTranslation();

  return (
    <Stack gap="md" pt="md">
      <Alert color="yellow" variant="light" title={t("meetSetup.bars.contractTitle")}>
        {t("meetSetup.bars.contractBody")}
      </Alert>
      <SectionPaper>
        <Table withTableBorder withColumnBorders fz="sm" verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("meetSetup.bars.surface")}</Table.Th>
              <Table.Th>{t("meetSetup.bars.barWeight")}</Table.Th>
              <Table.Th>{t("meetSetup.bars.collarWeight")}</Table.Th>
              <Table.Th>{t("meetSetup.bars.status")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>{t("meetSetup.bars.streetliftingBelt")}</Table.Td>
              <Table.Td>0 kg</Table.Td>
              <Table.Td>0 kg</Table.Td>
              <Table.Td>
                <Badge color="green" variant="light">
                  {t("meetSetup.bars.active")}
                </Badge>
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>{t("meetSetup.bars.weightedCalisthenicsBar")}</Table.Td>
              <Table.Td>20 kg</Table.Td>
              <Table.Td>2.5 kg</Table.Td>
              <Table.Td>
                <Badge color="gray" variant="light">
                  {t("meetSetup.bars.needsMigration")}
                </Badge>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </SectionPaper>
    </Stack>
  );
}

export function MeetSetupPage() {
  const { t } = useTranslation();

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" align="flex-end" mb="md">
        <div>
          <Title order={2}>{t("meetSetup.title")}</Title>
          <Text size="sm" c="dimmed">
            {t("meetSetup.subtitle")}
          </Text>
        </div>
      </Group>

      <SummaryHeader />

      <Tabs defaultValue="basic" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="basic">{t("meetSetup.tabs.basic")}</Tabs.Tab>
          <Tabs.Tab value="disciplines">{t("meetSetup.tabs.disciplines")}</Tabs.Tab>
          <Tabs.Tab value="weightCats">{t("meetSetup.tabs.weightCats")}</Tabs.Tab>
          <Tabs.Tab value="ageCats">{t("meetSetup.tabs.ageCats")}</Tabs.Tab>
          <Tabs.Tab value="plates">{t("meetSetup.tabs.plates")}</Tabs.Tab>
          <Tabs.Tab value="bars">{t("meetSetup.tabs.bars")}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="basic">
          <BasicTab />
        </Tabs.Panel>
        <Tabs.Panel value="disciplines">
          <DisciplinesTab />
        </Tabs.Panel>
        <Tabs.Panel value="weightCats">
          <WeightCatsTab />
        </Tabs.Panel>
        <Tabs.Panel value="ageCats">
          <AgeCatsTab />
        </Tabs.Panel>
        <Tabs.Panel value="plates">
          <PlatesTab />
        </Tabs.Panel>
        <Tabs.Panel value="bars">
          <BarsTab />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
