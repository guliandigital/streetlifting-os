import type { Entry } from "@domain/models";
import type { ClassicResultGroup } from "@logic/isf/classic-placing";
import type { MultirepResultGroup } from "@logic/isf/multirep-placing";

export type ReportOutputFormat = "print" | "csv" | "view";
export type ReportStatus = "ready" | "empty" | "planned";

export type ReportDefinition = {
  id:
    | "official-protocol"
    | "athlete-cards"
    | "blank-sheet"
    | "diplomas"
    | "awards-ceremony"
    | "classic-csv"
    | "multirep-csv"
    | "openpowerlifting-export";
  labelKey: string;
  outputFormat: ReportOutputFormat;
  scope: "meet" | "entries" | "results" | "awards";
  printOnly: boolean;
  exportOnly: boolean;
  official: boolean;
};

export type ReportRegistryItem = ReportDefinition & {
  status: ReportStatus;
  itemCount: number;
};

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: "official-protocol",
    labelKey: "reports.officialProtocol",
    outputFormat: "print",
    scope: "results",
    printOnly: true,
    exportOnly: false,
    official: true,
  },
  {
    id: "athlete-cards",
    labelKey: "reports.athleteCards",
    outputFormat: "print",
    scope: "entries",
    printOnly: true,
    exportOnly: false,
    official: false,
  },
  {
    id: "blank-sheet",
    labelKey: "reports.blankSheet",
    outputFormat: "print",
    scope: "meet",
    printOnly: true,
    exportOnly: false,
    official: false,
  },
  {
    id: "diplomas",
    labelKey: "reports.diplomas",
    outputFormat: "print",
    scope: "awards",
    printOnly: true,
    exportOnly: false,
    official: false,
  },
  {
    id: "awards-ceremony",
    labelKey: "reports.awardsCeremony",
    outputFormat: "view",
    scope: "awards",
    printOnly: false,
    exportOnly: false,
    official: false,
  },
  {
    id: "classic-csv",
    labelKey: "reports.classicCsv",
    outputFormat: "csv",
    scope: "results",
    printOnly: false,
    exportOnly: true,
    official: true,
  },
  {
    id: "multirep-csv",
    labelKey: "reports.multirepCsv",
    outputFormat: "csv",
    scope: "results",
    printOnly: false,
    exportOnly: true,
    official: true,
  },
  {
    id: "openpowerlifting-export",
    labelKey: "reports.openPowerliftingExport",
    outputFormat: "csv",
    scope: "results",
    printOnly: false,
    exportOnly: true,
    official: false,
  },
];

export function countClassicAwardRows(groups: ClassicResultGroup[]): number {
  return groups
    .filter((group) => group.sex !== null || group.ageCategoryCode !== null)
    .reduce(
      (sum, group) =>
        sum + group.rows.filter((row) => row.place !== null && row.place <= 3).length,
      0,
    );
}

export function countMultirepAwardRows(groups: MultirepResultGroup[]): number {
  return groups.reduce(
    (sum, group) =>
      sum + group.rows.filter((row) => row.place !== null && row.place <= 3).length,
    0,
  );
}

export function buildReportRegistry({
  entries,
  classicGroups,
  multirepGroups,
}: {
  entries: ReadonlyArray<Entry>;
  classicGroups: ClassicResultGroup[];
  multirepGroups: MultirepResultGroup[];
}): ReportRegistryItem[] {
  const classicAwards = countClassicAwardRows(classicGroups);
  const multirepAwards = countMultirepAwardRows(multirepGroups);
  const awardCount = classicAwards + multirepAwards;
  const classicResultCount = classicGroups.reduce(
    (sum, group) =>
      group.sex === null && group.ageCategoryCode === null
        ? sum
        : sum + group.rows.length,
    0,
  );

  return REPORT_DEFINITIONS.map((definition) => {
    const itemCount =
      definition.id === "official-protocol" || definition.id === "classic-csv"
        ? classicGroups.reduce((sum, group) => sum + group.rows.length, 0)
        : definition.id === "multirep-csv"
          ? multirepGroups.reduce((sum, group) => sum + group.rows.length, 0)
          : definition.id === "openpowerlifting-export"
            ? classicResultCount
          : definition.id === "athlete-cards"
            ? entries.length
            : definition.id === "blank-sheet"
              ? 1
              : definition.id === "diplomas" || definition.id === "awards-ceremony"
                ? awardCount
                : 0;

    return {
      ...definition,
      itemCount,
      status: itemCount > 0 ? "ready" : "empty",
    };
  });
}
