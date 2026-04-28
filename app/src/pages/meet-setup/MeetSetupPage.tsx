/**
 * MeetSetupPage — /meet-setup
 *
 * Five-tab layout for configuring every aspect of a meet:
 *   1. Basic settings (name, location, date, format, formula, toggles)
 *   2. Disciplines (select which of the 19 ISF disciplines are active)
 *   3. Weight categories (check/uncheck per sex)
 *   4. Age categories (check/uncheck)
 *   5. Plates (inline-editable Classic plate set)
 */

import {
  Container,
  Title,
  Tabs,
  TextInput,
  Select,
  Switch,
  Group,
  Stack,
  Checkbox,
  Table,
  NumberInput,
  Button,
  Text,
  SegmentedControl,
  ActionIcon,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "@store/index";
import {
  updateMeetBasics,
  toggleDisciplineCode,
  setEnabledDisciplineCodes,
  updatePlate,
  addPlate,
  removePlate,
  setWeightCategories,
  setAgeCategories,
} from "@store/meet-slice";
import {
  ISF_V51_DISCIPLINES,
  ISF_V51_WEIGHT_CATEGORIES,
  ISF_V51_AGE_CATEGORIES,
  ISF_V51_DEFAULT_PLATES,
} from "@domain/presets";
import type { WeightCategory, AgeCategory } from "@domain/models";

// ─── Tab 1: Basic Settings ───────────────────────────────────────────────────

function BasicTab() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const meet = useAppSelector((s) => s.meet.current?.meet);
  if (!meet) return null;

  const dateValue = meet.date ? new Date(meet.date + "T00:00:00") : null;

  return (
    <Stack gap="md" pt="md">
      <TextInput
        label={t("meetSetup.basic.name")}
        value={meet.name}
        onChange={(e) => dispatch(updateMeetBasics({ name: e.currentTarget.value }))}
      />
      <TextInput
        label={t("meetSetup.basic.federation")}
        value={meet.federation}
        onChange={(e) => dispatch(updateMeetBasics({ federation: e.currentTarget.value }))}
      />
      <Group grow>
        <TextInput
          label={t("meetSetup.basic.country")}
          value={meet.country}
          onChange={(e) => dispatch(updateMeetBasics({ country: e.currentTarget.value }))}
        />
        <TextInput
          label={t("meetSetup.basic.state")}
          value={meet.state}
          onChange={(e) => dispatch(updateMeetBasics({ state: e.currentTarget.value }))}
        />
        <TextInput
          label={t("meetSetup.basic.city")}
          value={meet.city}
          onChange={(e) => dispatch(updateMeetBasics({ city: e.currentTarget.value }))}
        />
      </Group>
      <DateInput
        label={t("meetSetup.basic.date")}
        value={dateValue}
        valueFormat="YYYY-MM-DD"
        onChange={(val) => {
          if (val) {
            const iso = val.toISOString().slice(0, 10);
            dispatch(updateMeetBasics({ date: iso }));
          }
        }}
      />
      <Stack gap="xs">
        <Text size="sm" fw={500}>{t("meetSetup.basic.format")}</Text>
        <SegmentedControl
          value={meet.competitionFormat}
          onChange={(val) =>
            dispatch(updateMeetBasics({ competitionFormat: val as "classic" | "multirep" }))
          }
          data={[
            { label: "Classic", value: "classic" },
            { label: "Multirep", value: "multirep" },
          ]}
        />
      </Stack>
      <Select
        label={t("meetSetup.basic.formula")}
        value={meet.formula}
        onChange={(val) => {
          if (val) dispatch(updateMeetBasics({ formula: val as "ISF_POINTS" | "RESULT" | "RESULT_X_COEFFICIENT" }));
        }}
        data={[
          { label: "ISF Points", value: "ISF_POINTS" },
          { label: "Result × Coefficient", value: "RESULT_X_COEFFICIENT" },
          { label: "Result", value: "RESULT" },
        ]}
      />
      <Switch
        label={t("meetSetup.basic.mastersAdj")}
        checked={meet.useMastersAdjustment}
        onChange={(e) =>
          dispatch(updateMeetBasics({ useMastersAdjustment: e.currentTarget.checked }))
        }
      />
      <Switch
        label={t("meetSetup.basic.lowerBWFirst")}
        checked={meet.lowerBodyweightFirstTiebreak}
        onChange={(e) =>
          dispatch(updateMeetBasics({ lowerBodyweightFirstTiebreak: e.currentTarget.checked }))
        }
      />
    </Stack>
  );
}

// ─── Tab 2: Disciplines ──────────────────────────────────────────────────────

function DisciplinesTab() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const enabledCodes = useAppSelector(
    (s) => s.meet.current?.meet.enabledDisciplineCodes ?? [],
  );

  const classicDiscs = ISF_V51_DISCIPLINES.filter((d) => d.competitionFormat === "classic");
  const multirepDiscs = ISF_V51_DISCIPLINES.filter((d) => d.competitionFormat === "multirep");

  function handleSelectAllClassic() {
    const classicCodes = classicDiscs.map((d) => d.code);
    const others = enabledCodes.filter((c) => !classicCodes.includes(c));
    dispatch(setEnabledDisciplineCodes([...others, ...classicCodes]));
  }

  function handleSelectAllMultirep() {
    const multirepCodes = multirepDiscs.map((d) => d.code);
    const others = enabledCodes.filter((c) => !multirepCodes.includes(c));
    dispatch(setEnabledDisciplineCodes([...others, ...multirepCodes]));
  }

  return (
    <Stack gap="lg" pt="md">
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text fw={600}>{t("meetSetup.disciplines.classic")}</Text>
          <Button size="xs" variant="light" onClick={handleSelectAllClassic}>
            {t("meetSetup.disciplines.selectAllClassic")}
          </Button>
        </Group>
        {classicDiscs.map((d) => (
          <Checkbox
            key={d.code}
            label={d.labelRu}
            checked={enabledCodes.includes(d.code)}
            onChange={() => dispatch(toggleDisciplineCode(d.code))}
          />
        ))}
      </Stack>
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text fw={600}>{t("meetSetup.disciplines.multirep")}</Text>
          <Button size="xs" variant="light" onClick={handleSelectAllMultirep}>
            {t("meetSetup.disciplines.selectAllMultirep")}
          </Button>
        </Group>
        {multirepDiscs.map((d) => (
          <Checkbox
            key={d.code}
            label={d.labelRu}
            checked={enabledCodes.includes(d.code)}
            onChange={() => dispatch(toggleDisciplineCode(d.code))}
          />
        ))}
      </Stack>
    </Stack>
  );
}

// ─── Tab 3: Weight Categories ────────────────────────────────────────────────

function WeightCatsTab() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const weightCategories = useAppSelector(
    (s) => s.meet.current?.meet.weightCategories ?? [],
  );

  const womenCats = ISF_V51_WEIGHT_CATEGORIES.filter((wc) => wc.sex === "F");
  const menCats = ISF_V51_WEIGHT_CATEGORIES.filter((wc) => wc.sex === "M");

  function isEnabled(cat: WeightCategory) {
    return weightCategories.some((wc) => wc.code === cat.code);
  }

  function toggle(cat: WeightCategory) {
    if (isEnabled(cat)) {
      dispatch(setWeightCategories(weightCategories.filter((wc) => wc.code !== cat.code)));
    } else {
      dispatch(setWeightCategories([...weightCategories, cat]));
    }
  }

  function formatLabel(cat: WeightCategory) {
    if (cat.maxKg === null) return `${cat.minKg}+ kg`;
    if (cat.minKg === null) return `≤${cat.maxKg} kg`;
    return `${cat.minKg}–${cat.maxKg} kg`;
  }

  return (
    <Stack gap="lg" pt="md">
      <Group justify="flex-end">
        <Button
          size="xs"
          variant="outline"
          onClick={() => dispatch(setWeightCategories([...ISF_V51_WEIGHT_CATEGORIES]))}
        >
          {t("meetSetup.weightCats.resetToDefault")}
        </Button>
      </Group>
      <Group align="flex-start" gap="xl">
        <Stack gap="xs" style={{ flex: 1 }}>
          <Text fw={600}>{t("meetSetup.weightCats.women")}</Text>
          {womenCats.map((cat) => (
            <Checkbox
              key={cat.code}
              label={`${cat.code} (${formatLabel(cat)})`}
              checked={isEnabled(cat)}
              onChange={() => toggle(cat)}
            />
          ))}
        </Stack>
        <Stack gap="xs" style={{ flex: 1 }}>
          <Text fw={600}>{t("meetSetup.weightCats.men")}</Text>
          {menCats.map((cat) => (
            <Checkbox
              key={cat.code}
              label={`${cat.code} (${formatLabel(cat)})`}
              checked={isEnabled(cat)}
              onChange={() => toggle(cat)}
            />
          ))}
        </Stack>
      </Group>
    </Stack>
  );
}

// ─── Tab 4: Age Categories ───────────────────────────────────────────────────

function AgeCatsTab() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const ageCategories = useAppSelector(
    (s) => s.meet.current?.meet.ageCategories ?? [],
  );

  function isEnabled(cat: AgeCategory) {
    return ageCategories.some((ac) => ac.code === cat.code);
  }

  function toggle(cat: AgeCategory) {
    if (isEnabled(cat)) {
      dispatch(setAgeCategories(ageCategories.filter((ac) => ac.code !== cat.code)));
    } else {
      dispatch(setAgeCategories([...ageCategories, cat]));
    }
  }

  function formatLabel(cat: AgeCategory) {
    if (cat.minAge === null && cat.maxAge === null) return cat.label;
    if (cat.maxAge === null) return `${cat.label} (${cat.minAge}+)`;
    if (cat.minAge === null) return `${cat.label} (≤${cat.maxAge})`;
    return `${cat.label} (${cat.minAge}–${cat.maxAge})`;
  }

  return (
    <Stack gap="md" pt="md">
      <Group justify="flex-end">
        <Button
          size="xs"
          variant="outline"
          onClick={() => dispatch(setAgeCategories([...ISF_V51_AGE_CATEGORIES]))}
        >
          {t("meetSetup.ageCats.resetToDefault")}
        </Button>
      </Group>
      {ISF_V51_AGE_CATEGORIES.map((cat) => (
        <Checkbox
          key={cat.code}
          label={formatLabel(cat)}
          checked={isEnabled(cat)}
          onChange={() => toggle(cat)}
        />
      ))}
    </Stack>
  );
}

// ─── Tab 5: Plates ───────────────────────────────────────────────────────────

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

  const { plates } = classicLoadConfig;

  function handleReset() {
    // Remove all plates then add ISF defaults
    // Dispatch removePlate from end to avoid index shifting issues
    for (let i = plates.length - 1; i >= 0; i--) {
      dispatch(removePlate(i));
    }
    for (const plate of ISF_V51_DEFAULT_PLATES) {
      dispatch(addPlate({ ...plate }));
    }
  }

  return (
    <Stack gap="md" pt="md">
      <Group justify="flex-end">
        <Button size="xs" variant="outline" onClick={handleReset}>
          {t("meetSetup.plates.resetToDefault")}
        </Button>
      </Group>
      <Table withTableBorder withColumnBorders fz="sm">
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
          {plates.map((plate, idx) => (
            <Table.Tr key={idx}>
              <Table.Td>
                <NumberInput
                  size="xs"
                  value={plate.weightKg}
                  min={0.25}
                  step={0.25}
                  decimalScale={2}
                  onChange={(val) => {
                    if (typeof val === "number")
                      dispatch(updatePlate({ index: idx, patch: { weightKg: val } }));
                  }}
                  styles={{ input: { width: 80 } }}
                />
              </Table.Td>
              <Table.Td>
                <NumberInput
                  size="xs"
                  value={plate.pairCount}
                  min={0}
                  step={1}
                  onChange={(val) => {
                    if (typeof val === "number")
                      dispatch(updatePlate({ index: idx, patch: { pairCount: val } }));
                  }}
                  styles={{ input: { width: 60 } }}
                />
              </Table.Td>
              <Table.Td>
                <TextInput
                  size="xs"
                  value={plate.color}
                  onChange={(e) =>
                    dispatch(updatePlate({ index: idx, patch: { color: e.currentTarget.value } }))
                  }
                  styles={{ input: { width: 90 } }}
                />
              </Table.Td>
              <Table.Td>
                <Checkbox
                  checked={!!plate.recordOnly}
                  onChange={(e) =>
                    dispatch(updatePlate({ index: idx, patch: { recordOnly: e.currentTarget.checked } }))
                  }
                />
              </Table.Td>
              <Table.Td>
                <ActionIcon
                  size="xs"
                  color="red"
                  variant="subtle"
                  onClick={() => dispatch(removePlate(idx))}
                  aria-label="Remove plate"
                >
                  ×
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Button
        size="xs"
        variant="light"
        onClick={() => dispatch(addPlate({ weightKg: 1.25, pairCount: 1, color: "gray" }))}
      >
        + {t("meetSetup.plates.add")}
      </Button>
    </Stack>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function MeetSetupPage() {
  const { t } = useTranslation();

  return (
    <Container size="lg" py="md">
      <Title order={2} mb="lg">
        {t("meetSetup.title")}
      </Title>
      <Tabs defaultValue="basic">
        <Tabs.List>
          <Tabs.Tab value="basic">{t("meetSetup.tabs.basic")}</Tabs.Tab>
          <Tabs.Tab value="disciplines">{t("meetSetup.tabs.disciplines")}</Tabs.Tab>
          <Tabs.Tab value="weightCats">{t("meetSetup.tabs.weightCats")}</Tabs.Tab>
          <Tabs.Tab value="ageCats">{t("meetSetup.tabs.ageCats")}</Tabs.Tab>
          <Tabs.Tab value="plates">{t("meetSetup.tabs.plates")}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="basic"><BasicTab /></Tabs.Panel>
        <Tabs.Panel value="disciplines"><DisciplinesTab /></Tabs.Panel>
        <Tabs.Panel value="weightCats"><WeightCatsTab /></Tabs.Panel>
        <Tabs.Panel value="ageCats"><AgeCatsTab /></Tabs.Panel>
        <Tabs.Panel value="plates"><PlatesTab /></Tabs.Panel>
      </Tabs>
    </Container>
  );
}
