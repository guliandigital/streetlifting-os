/**
 * Athlete-registration form modal.
 *
 * Powered by react-hook-form + zod. Used for both "Add" and "Edit" — the
 * difference is whether the caller passed `initialValues`.
 */

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
  Modal,
  TextInput,
  Select,
  NumberInput,
  Switch,
  Button,
  Group,
  Stack,
  SimpleGrid,
  Textarea,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";

import { useAppSelector } from "@store/index";
import { ISF_V51_DISCIPLINES } from "@domain/presets";
import {
  entryFormSchema,
  EMPTY_FORM_VALUES,
  type EntryFormValues,
} from "./entry-form-schema";

export type EntryFormModalProps = {
  opened: boolean;
  initialValues?: EntryFormValues;
  onClose: () => void;
  onSubmit: (values: EntryFormValues) => void;
};

export function EntryFormModal(props: EntryFormModalProps) {
  const { opened, initialValues, onClose, onSubmit } = props;
  const { t, i18n } = useTranslation();
  const enabledDisciplines = useAppSelector(
    (s) => s.meet.current?.meet.enabledDisciplineCodes ?? [],
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: initialValues ?? EMPTY_FORM_VALUES,
  });

  useEffect(() => {
    if (opened) reset(initialValues ?? EMPTY_FORM_VALUES);
  }, [opened, initialValues, reset]);

  const isRu = i18n.language.startsWith("ru");

  const disciplineOptions = ISF_V51_DISCIPLINES
    .filter((d) =>
      enabledDisciplines.length === 0
        ? true
        : enabledDisciplines.includes(d.code),
    )
    .map((d) => ({
      value: d.code,
      label: isRu ? d.labelRu : d.labelEn,
    }));

  const submit = (vals: EntryFormValues) => {
    onSubmit(vals);
  };

  const errMsg = (key: string | undefined): string | undefined =>
    key ? t(`registration.${key}`, { defaultValue: key }) : undefined;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        initialValues ? t("registration.edit") : t("registration.add")
      }
      size="xl"
      centered
    >
      <form onSubmit={(e) => { void handleSubmit(submit)(e); }} noValidate>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label={t("registration.form.name")}
              placeholder={t("registration.form.namePlaceholder")}
              required
              {...register("name")}
              error={errMsg(errors.name?.message)}
            />
            <Controller
              name="sex"
              control={control}
              render={({ field }) => (
                <Select
                  label={t("registration.form.sex")}
                  data={[
                    { value: "M", label: t("registration.form.sexMale") },
                    { value: "F", label: t("registration.form.sexFemale") },
                  ]}
                  required
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? "M")}
                  error={errMsg(errors.sex?.message)}
                />
              )}
            />
            <Controller
              name="birthDate"
              control={control}
              render={({ field }) => (
                <DateInput
                  label={t("registration.form.birthDate")}
                  valueFormat="YYYY-MM-DD"
                  value={field.value ? new Date(field.value) : null}
                  onChange={(d) =>
                    field.onChange(
                      d ? new Date(d).toISOString().slice(0, 10) : null,
                    )
                  }
                  clearable
                  error={errMsg(errors.birthDate?.message)}
                />
              )}
            />
            <Controller
              name="ageOverride"
              control={control}
              render={({ field }) => (
                <NumberInput
                  label={t("registration.form.ageOverride")}
                  min={5}
                  max={120}
                  value={field.value ?? ""}
                  onChange={(v) =>
                    field.onChange(
                      typeof v === "number" && Number.isFinite(v) ? v : null,
                    )
                  }
                  error={errMsg(errors.ageOverride?.message)}
                />
              )}
            />
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <TextInput
                  label={t("registration.form.country")}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.currentTarget.value.trim() === ""
                        ? null
                        : e.currentTarget.value,
                    )
                  }
                />
              )}
            />
            <Controller
              name="division"
              control={control}
              render={({ field }) => (
                <Select
                  label={t("registration.form.division")}
                  data={[
                    {
                      value: "amateur",
                      label: t("registration.form.divisionAmateur"),
                    },
                    {
                      value: "pro",
                      label: t("registration.form.divisionPro"),
                    },
                    {
                      value: "adaptive",
                      label: t("registration.form.divisionAdaptive"),
                    },
                  ]}
                  required
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? "amateur")}
                  error={errMsg(errors.division?.message)}
                />
              )}
            />
            <Controller
              name="disciplineCode"
              control={control}
              render={({ field }) => (
                <Select
                  label={t("registration.form.discipline")}
                  data={disciplineOptions}
                  required
                  searchable
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? "")}
                  error={errMsg(errors.disciplineCode?.message)}
                />
              )}
            />
            <Controller
              name="day"
              control={control}
              render={({ field }) => (
                <NumberInput
                  label={t("registration.form.day")}
                  min={1}
                  value={field.value}
                  onChange={(v) =>
                    field.onChange(typeof v === "number" ? v : 1)
                  }
                  error={errMsg(errors.day?.message)}
                />
              )}
            />
            <Controller
              name="platform"
              control={control}
              render={({ field }) => (
                <NumberInput
                  label={t("registration.form.platform")}
                  min={1}
                  value={field.value}
                  onChange={(v) =>
                    field.onChange(typeof v === "number" ? v : 1)
                  }
                  error={errMsg(errors.platform?.message)}
                />
              )}
            />
            <TextInput
              label={t("registration.form.flight")}
              {...register("flight")}
            />
            <TextInput
              label={t("registration.form.team")}
              {...register("team")}
            />
            <TextInput
              label={t("registration.form.memberId")}
              {...register("memberId")}
            />
            <TextInput
              label={t("registration.form.isfPersonId")}
              description={t("registration.form.isfPersonIdHint")}
              {...register("isfPersonId")}
            />
            <TextInput
              label={t("registration.form.instagram")}
              {...register("instagram")}
            />
            <Controller
              name="bodyweightKg"
              control={control}
              render={({ field }) => (
                <NumberInput
                  label={t("registration.form.bodyweight")}
                  decimalScale={2}
                  step={0.1}
                  min={0}
                  value={field.value ?? ""}
                  onChange={(v) =>
                    field.onChange(typeof v === "number" ? v : null)
                  }
                  error={errMsg(errors.bodyweightKg?.message)}
                />
              )}
            />
            <Controller
              name="reweighKg"
              control={control}
              render={({ field }) => (
                <NumberInput
                  label={t("registration.form.reweigh")}
                  decimalScale={2}
                  step={0.1}
                  min={0}
                  value={field.value ?? ""}
                  onChange={(v) =>
                    field.onChange(typeof v === "number" ? v : null)
                  }
                  error={errMsg(errors.reweighKg?.message)}
                />
              )}
            />
          </SimpleGrid>

          <Controller
            name="guest"
            control={control}
            render={({ field }) => (
              <Switch
                label={t("registration.form.guest")}
                checked={field.value}
                onChange={(e) => field.onChange(e.currentTarget.checked)}
              />
            )}
          />

          <Textarea
            label={t("registration.form.notes")}
            {...register("notes")}
            autosize
            minRows={2}
            maxRows={6}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose} type="button">
              {t("registration.cancel")}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {t("registration.save")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
