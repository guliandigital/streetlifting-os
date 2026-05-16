#!/usr/bin/env node
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const appDir = path.resolve(path.dirname(scriptPath), "..");
const repoRoot = path.resolve(appDir, "..");

const DEFAULT_OUT_DIR = path.join(repoRoot, "migration-output", "powergage");
const DEFAULT_INPUT_DB_DIR = path.join(
  repoRoot,
  "migration-input",
  "powergage",
  "database",
);

const SYSTEM_DIR_SKIP = new Set([
  "$recycle.bin",
  ".git",
  ".svn",
  "node_modules",
  "windows",
  "program files",
  "program files (x86)",
  "programdata",
  "system volume information",
]);

const KNOWN_TABLES = [
  {
    key: "athletes",
    table: "lifter",
    orderBy: "id_lifter",
    fields: [
      "id_lifter",
      "name",
      "aname",
      "sex",
      "dat_bith",
      "phone",
      "email",
      "adress",
      "town",
      "id_razr",
      "club",
      "trener",
      "regards",
      "createtime",
      "edittime",
    ],
  },
  {
    key: "competitions",
    table: "competit",
    orderBy: "id_compet",
    fields: [
      "id_compet",
      "id_range",
      "name",
      "town",
      "description",
      "date_begin",
      "date_end",
      "level",
      "grp",
      "createtime",
      "edittime",
    ],
  },
  {
    key: "nominations",
    table: "lifter_on_competition",
    orderBy: "id_lifter_compet",
    fields: [
      "id_lifter_compet",
      "id_lifter",
      "id_compet",
      "id_wilks",
      "id_category",
      "id_agecl",
      "id_team",
      "id_stream",
      "zr",
      "club",
      "trener",
      "inzach",
      "id_parent",
      "createtime",
      "edittime",
    ],
  },
  {
    key: "attempts",
    table: "lifter_exersis",
    orderBy: "id_lifter_compet",
    fields: [
      "id_lifter_compet",
      "squat1",
      "oc1",
      "squat2",
      "oc2",
      "squat3",
      "oc3",
      "squat4",
      "oc10",
      "bench1",
      "oc4",
      "bench2",
      "oc5",
      "bench3",
      "oc6",
      "bench4",
      "oc11",
      "dl1",
      "oc7",
      "dl2",
      "oc8",
      "dl3",
      "oc9",
      "dl4",
      "oc12",
      "mrpt1",
      "mrpt1_oc",
      "mrpt2",
      "mrpt2_oc",
      "summaall",
      "place",
      "points",
      "stoy",
      "createtime",
      "edittime",
    ],
  },
  {
    key: "teams",
    table: "team",
    orderBy: "id_team",
    fields: ["id_team", "name", "fixrecord", "createtime", "edittime"],
  },
  {
    key: "ranges",
    table: "range",
    orderBy: "id_range",
    fields: [
      "id_range",
      "id_federation",
      "kind",
      "name",
      "engname",
      "description",
      "createtime",
      "edittime",
    ],
  },
  {
    key: "federations",
    table: "federation",
    orderBy: "id_federation",
    fields: [
      "id_federation",
      "name",
      "engname",
      "description",
      "createtime",
      "edittime",
    ],
  },
  {
    key: "weight_categories",
    table: "weigth_category",
    orderBy: "id_category",
    fields: [
      "id_category",
      "id_federation",
      "name",
      "engname",
      "we",
      "sex",
      "createtime",
      "edittime",
    ],
  },
  {
    key: "weigh_ins",
    table: "wilks",
    orderBy: "id_wilks",
    fields: ["id_wilks", "self_weight", "coef", "sex", "createtime", "edittime"],
  },
];

function printHelp() {
  console.log(`PowerGage migration exporter

Usage:
  npm run powergage:migrate -- [options]

Options:
  --db <path>          Path to a PowerGage Firebird .fdb/.gdb database.
  --isql <path>        Path to Firebird 2.5 isql.exe.
  --out <dir>          Output directory. Default: ${DEFAULT_OUT_DIR}
  --user <name>        Firebird user. Default: SYSDBA
  --password <pass>    Firebird password. Default: masterkey
  --scan-root <dir>    Extra root to scan for .fdb/.gdb/.fbk/.gbk and dblink.ini.
  --deep-scan          Scan fixed drive roots with system directories skipped.
  --help              Show this message.

Outputs:
  manifest.json
  schema-columns.csv/json
  powergage-*.csv/json
  streetlifting-registration-draft.csv
  streetlifting-registration-unmapped.csv

The script is read-only. It never writes to the PowerGage database.
`);
}

function parseArgs(argv) {
  const args = {
    db: null,
    isql: null,
    out: DEFAULT_OUT_DIR,
    user: "SYSDBA",
    password: "masterkey",
    scanRoots: [],
    deepScan: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--db":
        args.db = requireValue(arg, next);
        i += 1;
        break;
      case "--isql":
        args.isql = requireValue(arg, next);
        i += 1;
        break;
      case "--out":
        args.out = requireValue(arg, next);
        i += 1;
        break;
      case "--user":
        args.user = requireValue(arg, next);
        i += 1;
        break;
      case "--password":
        args.password = requireValue(arg, next);
        i += 1;
        break;
      case "--scan-root":
        args.scanRoots.push(requireValue(arg, next));
        i += 1;
        break;
      case "--deep-scan":
        args.deepScan = true;
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return args;
}

function requireValue(arg, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${arg} requires a value`);
  }
  return value;
}

function expandEnv(input) {
  return input.replace(/%([^%]+)%/g, (_, name) => process.env[name] ?? "");
}

function normalizeFsPath(input) {
  return path.resolve(expandEnv(input.trim().replace(/^"|"$/g, "")));
}

async function discoverDbCandidates(args) {
  const candidates = [];
  const addCandidate = (filePath, source) => {
    if (!filePath) return;
    const normalized = normalizeFsPath(filePath);
    const ext = path.extname(normalized).toLowerCase();
    if (![".fdb", ".gdb", ".fbk", ".gbk"].includes(ext)) return;
    const exists = existsSync(normalized);
    candidates.push({ path: normalized, source, exists, extension: ext });
  };

  if (args.db) addCandidate(args.db, "cli");

  const appData = process.env.APPDATA;
  const localAppData = process.env.LOCALAPPDATA;
  const programData = process.env.ProgramData;
  const userProfile = process.env.USERPROFILE;
  const knownDirs = [
    DEFAULT_INPUT_DB_DIR,
    appData && path.join(appData, "Power Gage", "database"),
    localAppData && path.join(localAppData, "Power Gage", "database"),
    programData && path.join(programData, "Power Gage", "database"),
    userProfile && path.join(userProfile, "Documents"),
    userProfile && path.join(userProfile, "Desktop"),
    userProfile && path.join(userProfile, "Downloads"),
    userProfile && path.join(userProfile, "OneDrive"),
  ].filter(Boolean);

  const dblinkPaths = [
    appData && path.join(appData, "Power Gage", "dblink.ini"),
    localAppData && path.join(localAppData, "Power Gage", "dblink.ini"),
    path.join(process.env.TEMP ?? tmpdir(), "dblink.ini"),
  ].filter(Boolean);

  for (const iniPath of dblinkPaths) {
    const basename = await readDblinkBasename(iniPath);
    if (basename) addCandidate(basename, `dblink:${iniPath}`);
  }

  for (const dir of knownDirs) {
    await scanForDbFiles(dir, candidates, `known-dir:${dir}`, 3);
  }

  for (const root of args.scanRoots) {
    await scanForDbFiles(root, candidates, `scan-root:${root}`, 6);
  }

  if (args.deepScan) {
    for (const root of fixedDriveRoots()) {
      await scanForDbFiles(root, candidates, `deep-scan:${root}`, 10);
    }
  }

  const seen = new Set();
  return candidates.map((candidate) => ({
    ...candidate,
    score: scoreDbCandidate(candidate),
  })).filter((candidate) => {
    const key = candidate.path.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function selectDbCandidate(candidates) {
  return [...candidates]
    .filter((candidate) => candidate.exists && candidate.score > 0)
    .sort((a, b) => b.score - a.score)[0] ?? null;
}

function scoreDbCandidate(candidate) {
  const filePath = candidate.path.toLowerCase();
  const fileName = path.basename(filePath);
  let score = 0;

  if (candidate.source === "cli") score += 100;
  if (candidate.source.startsWith("dblink:")) score += 90;
  if (filePath.includes("power gage") || filePath.includes("powergage")) score += 80;
  if (filePath.includes("migration-input\\powergage")) score += 70;
  if (filePath.includes("\\database\\")) score += 35;
  if (fileName === "test.fdb") score += 25;
  if (candidate.extension === ".fdb" || candidate.extension === ".gdb") score += 5;
  if (candidate.extension === ".fbk" || candidate.extension === ".gbk") score += 3;

  if (/\\xampp\\|\\php\\|\\contrib\\|babel|font/i.test(filePath)) score -= 60;

  return score;
}

async function readDblinkBasename(iniPath) {
  if (!existsSync(iniPath)) return null;
  const raw = await readFile(iniPath, "utf8");
  const line = raw
    .split(/\r?\n/)
    .find((item) => item.trim().toLowerCase().startsWith("basename="));
  if (!line) return null;
  return line.slice(line.indexOf("=") + 1).trim();
}

async function scanForDbFiles(root, candidates, source, maxDepth) {
  if (!root || !existsSync(root)) return;
  const queue = [{ dir: normalizeFsPath(root), depth: 0 }];
  const dbExtensions = new Set([".fdb", ".gdb", ".fbk", ".gbk"]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth > maxDepth) continue;

    let entries;
    try {
      entries = await import("node:fs/promises").then((fs) =>
        fs.readdir(current.dir, { withFileTypes: true }),
      );
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current.dir, entry.name);
      if (entry.isDirectory()) {
        if (SYSTEM_DIR_SKIP.has(entry.name.toLowerCase())) continue;
        queue.push({ dir: fullPath, depth: current.depth + 1 });
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!dbExtensions.has(ext)) continue;
      candidates.push({ path: fullPath, source, exists: true, extension: ext });
    }
  }
}

function fixedDriveRoots() {
  const roots = [];
  for (let code = 67; code <= 90; code += 1) {
    const root = `${String.fromCharCode(code)}:\\`;
    if (existsSync(root)) roots.push(root);
  }
  return roots;
}

async function findIsql(args) {
  const candidates = [
    args.isql,
    process.env.POWERGAGE_ISQL,
    "C:\\Program Files\\Firebird\\Firebird_2_5\\bin\\isql.exe",
    "C:\\Program Files (x86)\\Firebird\\Firebird_2_5\\bin\\isql.exe",
    "C:\\Program Files\\Firebird\\Firebird_3_0\\isql.exe",
    "C:\\Program Files\\Firebird\\Firebird_4_0\\isql.exe",
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalizeFsPath(candidate);
    if (existsSync(normalized)) return normalized;
  }

  try {
    const { stdout } = await execFileAsync("where.exe", ["isql.exe"], {
      windowsHide: true,
    });
    const found = stdout.split(/\r?\n/).find((line) => line.trim());
    return found ? normalizeFsPath(found) : null;
  } catch {
    return null;
  }
}

function execFileAsync(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function runIsql(isqlPath, dbPath, user, password, sqlText) {
  const workDir = await import("node:fs/promises").then((fs) =>
    fs.mkdtemp(path.join(tmpdir(), "powergage-migrate-")),
  );
  const inputPath = path.join(workDir, "input.sql");
  const outputPath = path.join(workDir, "output.txt");

  try {
    await writeFile(inputPath, sqlText, "utf8");
    await execFileAsync(
      isqlPath,
      [
        "-user",
        user,
        "-password",
        password,
        "-ch",
        "WIN1251",
        dbPath,
        "-i",
        inputPath,
        "-o",
        outputPath,
      ],
      {
        windowsHide: true,
        timeout: 120000,
      },
    );
    return await readFile(outputPath, "utf8");
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

function schemaSql() {
  return `
set list off;
set heading off;
set echo off;
set bail off;
select 'COLUMN|' || trim(rf.rdb$relation_name) || '|' || trim(rf.rdb$field_name) || '|' || cast(rf.rdb$field_position as varchar(12))
from rdb$relation_fields rf
join rdb$relations r on r.rdb$relation_name = rf.rdb$relation_name
where coalesce(r.rdb$system_flag, 0) = 0
order by rf.rdb$relation_name, rf.rdb$field_position;
commit;
quit;
`;
}

function dataSql(exports) {
  const queries = [
    "set list off;",
    "set heading off;",
    "set echo off;",
    "set bail off;",
  ];

  for (const item of exports) {
    const parts = [`'${item.key.toUpperCase()}|' || ${safeSqlValue(item.fields[0])}`];
    for (const field of item.fields.slice(1)) {
      parts.push("'|'");
      parts.push(safeSqlValue(field));
    }
    const orderBy = item.fields.includes(item.orderBy)
      ? ` order by ${quoteIdent(item.orderBy)}`
      : "";
    queries.push(
      `select ${parts.join(" || ")} from ${quoteIdent(item.table)}${orderBy};`,
    );
  }

  queries.push("commit;");
  queries.push("quit;");
  return `${queries.join("\n")}\n`;
}

function safeSqlValue(field) {
  return `coalesce(replace(replace(replace(cast(${quoteIdent(field)} as varchar(8191)), '|', '/'), ascii_char(13), ' '), ascii_char(10), ' '), '')`;
}

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""').toUpperCase()}"`;
}

function parseSchema(raw) {
  const columns = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("COLUMN|")) continue;
    const [, table, field, position] = line.split("|");
    columns.push({
      table: table.toLowerCase(),
      field: field.toLowerCase(),
      position: Number(position),
    });
  }
  return columns;
}

function planExports(columns) {
  const columnsByTable = new Map();
  for (const column of columns) {
    if (!columnsByTable.has(column.table)) columnsByTable.set(column.table, []);
    columnsByTable.get(column.table).push(column.field);
  }

  const planned = [];
  for (const tableDef of KNOWN_TABLES) {
    const available = columnsByTable.get(tableDef.table) ?? [];
    const fields = tableDef.fields.filter((field) => available.includes(field));
    if (fields.length === 0) continue;
    planned.push({ ...tableDef, fields });
  }

  for (const [table, fields] of columnsByTable.entries()) {
    const alreadyPlanned = planned.some((item) => item.table === table);
    const maybeJudgeOrFederation =
      /judge|judg|referee|sud|sudya|feder|federation/i.test(table) &&
      fields.length > 0;
    if (!alreadyPlanned && maybeJudgeOrFederation) {
      planned.push({
        key: `extra_${table}`,
        table,
        orderBy: fields[0],
        fields,
      });
    }
  }

  return planned;
}

function parseRows(raw, exports) {
  const byKey = new Map(exports.map((item) => [item.key.toUpperCase(), item]));
  const rowsByKey = new Map(exports.map((item) => [item.key, []]));

  for (const line of raw.split(/\r?\n/)) {
    const prefix = line.slice(0, line.indexOf("|"));
    const exportDef = byKey.get(prefix);
    if (!exportDef) continue;
    const values = line.split("|").slice(1);
    const row = {};
    exportDef.fields.forEach((field, index) => {
      row[field] = values[index] ?? "";
    });
    rowsByKey.get(exportDef.key).push(row);
  }

  return rowsByKey;
}

async function writeOutputs(outDir, manifest, columns, rowsByKey) {
  await mkdir(outDir, { recursive: true });
  await writeJson(path.join(outDir, "manifest.json"), manifest);
  await writeJson(path.join(outDir, "schema-columns.json"), columns);
  await writeCsv(path.join(outDir, "schema-columns.csv"), columns, [
    "table",
    "field",
    "position",
  ]);

  for (const [key, rows] of rowsByKey.entries()) {
    if (rows.length === 0) continue;
    const headers = Object.keys(rows[0]);
    await writeJson(path.join(outDir, `powergage-${key}.json`), rows);
    await writeCsv(path.join(outDir, `powergage-${key}.csv`), rows, headers);
  }

  const draft = buildStreetliftingDraft(rowsByKey);
  await writeCsv(
    path.join(outDir, "streetlifting-registration-draft.csv"),
    draft.mapped,
    REGISTRATION_HEADERS,
  );
  await writeCsv(
    path.join(outDir, "streetlifting-registration-unmapped.csv"),
    draft.unmapped,
    UNMAPPED_HEADERS,
  );
  await writeJson(path.join(outDir, "streetlifting-registration-summary.json"), {
    mapped: draft.mapped.length,
    unmapped: draft.unmapped.length,
    notes: draft.notes,
  });
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeCsv(filePath, rows, headers) {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header] ?? "")).join(","));
  }
  await writeFile(filePath, `\uFEFF${lines.join("\n")}\n`, "utf8");
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

const REGISTRATION_HEADERS = [
  "name",
  "sex",
  "birthDate",
  "country",
  "division",
  "disciplineCode",
  "team",
  "memberId",
  "guest",
  "instagram",
  "notes",
  "day",
  "platform",
  "flight",
  "bodyweightKg",
  "reweighKg",
];

const UNMAPPED_HEADERS = [
  ...REGISTRATION_HEADERS,
  "reason",
  "legacyIdLifter",
  "legacyIdLifterCompet",
  "legacyIdCompet",
  "legacyIdRange",
  "rangeName",
];

function buildStreetliftingDraft(rowsByKey) {
  const athletes = indexBy(rowsByKey.get("athletes") ?? [], "id_lifter");
  const competitions = indexBy(rowsByKey.get("competitions") ?? [], "id_compet");
  const teams = indexBy(rowsByKey.get("teams") ?? [], "id_team");
  const ranges = indexBy(rowsByKey.get("ranges") ?? [], "id_range");
  const attempts = indexBy(rowsByKey.get("attempts") ?? [], "id_lifter_compet");
  const weighIns = indexBy(rowsByKey.get("weigh_ins") ?? [], "id_wilks");
  const nominations = rowsByKey.get("nominations") ?? [];

  const mapped = [];
  const unmapped = [];
  const notes = [
    "This CSV is a best-effort draft for Streetlifting OS registration import.",
    "Phone, email, address, judge catalog and federation authority fields remain in the raw PowerGage CSV/JSON files.",
  ];

  for (const nomination of nominations) {
    const athlete = athletes.get(nomination.id_lifter) ?? {};
    const competition = competitions.get(nomination.id_compet) ?? {};
    const range = ranges.get(competition.id_range) ?? {};
    const team = teams.get(nomination.id_team) ?? {};
    const attempt = attempts.get(nomination.id_lifter_compet) ?? {};
    const weighIn = weighIns.get(nomination.id_wilks) ?? {};
    const disciplineCode = inferDisciplineCode(range, attempt);
    const baseRow = {
      name: athlete.name ?? "",
      sex: normalizeSex(athlete.sex),
      birthDate: normalizeDate(athlete.dat_bith),
      country: "",
      division: "amateur",
      disciplineCode,
      team: team.name || nomination.club || athlete.club || "",
      memberId: athlete.id_lifter ?? "",
      guest: "false",
      instagram: "",
      notes: `PowerGage loc=${nomination.id_lifter_compet || ""}; compet=${nomination.id_compet || ""}; range=${competition.id_range || ""}`,
      day: "1",
      platform: "1",
      flight: nomination.id_stream || "A",
      bodyweightKg: normalizeNumber(weighIn.self_weight),
      reweighKg: "",
    };

    if (baseRow.name && baseRow.sex && disciplineCode) {
      mapped.push(baseRow);
      continue;
    }

    unmapped.push({
      ...baseRow,
      reason: unmappedReason(baseRow, range, attempt),
      legacyIdLifter: nomination.id_lifter ?? "",
      legacyIdLifterCompet: nomination.id_lifter_compet ?? "",
      legacyIdCompet: nomination.id_compet ?? "",
      legacyIdRange: competition.id_range ?? "",
      rangeName: range.name ?? "",
    });
  }

  return { mapped, unmapped, notes };
}

function indexBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    if (row[key]) map.set(row[key], row);
  }
  return map;
}

function normalizeSex(value) {
  if (value === "1") return "M";
  if (value === "0") return "F";
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "M" || normalized === "F") return normalized;
  return "";
}

function normalizeDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const ru = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (ru) return `${ru[3]}-${ru[2]}-${ru[1]}`;
  return raw;
}

function normalizeNumber(value) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return "";
  const number = Number(raw);
  return Number.isFinite(number) ? String(number) : raw;
}

function inferDisciplineCode(range, attempt) {
  const idRange = Number(range.id_range);
  const kind = Number(range.kind);
  const bench1 = toNumber(attempt.bench1);
  const dl1 = toNumber(attempt.dl1);
  const mrpt1 = toNumber(attempt.mrpt1);
  const mrpt2 = toNumber(attempt.mrpt2);

  if (idRange >= 20041904 && idRange <= 20041919) {
    if (kind === 5 || bench1 !== null || dl1 !== null) {
      if (bench1 !== null && dl1 !== null) return "classic_2lift";
      if (bench1 !== null) return "classic_pu";
      if (dl1 !== null) return "classic_di";
    }
  }

  if (idRange >= 20041923 && idRange <= 20041999) {
    if (mrpt1 !== null && mrpt2 !== null) {
      const key = `multirep_2lift_${stripDecimal(mrpt1)}_${stripDecimal(mrpt2)}`;
      if (VALID_DISCIPLINES.has(key)) return key;
    }
    if (mrpt1 !== null) {
      const key = `multirep_pu_${stripDecimal(mrpt1)}`;
      if (VALID_DISCIPLINES.has(key)) return key;
    }
    if (mrpt2 !== null) {
      const key = `multirep_di_${stripDecimal(mrpt2)}`;
      if (VALID_DISCIPLINES.has(key)) return key;
    }
  }

  return "";
}

const VALID_DISCIPLINES = new Set([
  "classic_2lift",
  "classic_pu",
  "classic_di",
  "multirep_2lift_8_12",
  "multirep_2lift_8_16",
  "multirep_2lift_12_16",
  "multirep_2lift_16_24",
  "multirep_2lift_24_32",
  "multirep_2lift_32_48",
  "multirep_pu_8",
  "multirep_pu_12",
  "multirep_pu_16",
  "multirep_pu_24",
  "multirep_pu_32",
  "multirep_di_12",
  "multirep_di_16",
  "multirep_di_24",
  "multirep_di_32",
  "multirep_di_48",
]);

function toNumber(value) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

function stripDecimal(value) {
  return String(value).replace(/\.0+$/, "");
}

function unmappedReason(row, range, attempt) {
  const reasons = [];
  if (!row.name) reasons.push("missing athlete name");
  if (!row.sex) reasons.push("missing or unsupported sex");
  if (!row.disciplineCode) {
    reasons.push(
      `unmapped PowerGage range/attempt model id_range=${range.id_range || ""}, kind=${range.kind || ""}, bench1=${attempt.bench1 || ""}, dl1=${attempt.dl1 || ""}, mrpt1=${attempt.mrpt1 || ""}, mrpt2=${attempt.mrpt2 || ""}`,
    );
  }
  return reasons.join("; ");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const outDir = normalizeFsPath(args.out);
  await mkdir(outDir, { recursive: true });

  const dbCandidates = await discoverDbCandidates(args);
  const db = selectDbCandidate(dbCandidates);
  const isql = await findIsql(args);
  const manifestBase = {
    generatedAt: new Date().toISOString(),
    dbCandidates,
    selectedDb: db?.path ?? null,
    isql,
  };

  if (!db) {
    await writeJson(path.join(outDir, "manifest.json"), {
      ...manifestBase,
      status: "no_database_found",
      nextStep:
        "Run again with --db <path-to-PowerGage.fdb> or place .fdb files under migration-input/powergage/database.",
    });
    console.error(`No PowerGage Firebird database found. Report: ${outDir}`);
    process.exitCode = 2;
    return;
  }

  if ([".fbk", ".gbk"].includes(db.extension)) {
    await writeJson(path.join(outDir, "manifest.json"), {
      ...manifestBase,
      status: "backup_file_found",
      nextStep:
        "Restore the Firebird backup to .fdb first, then run this script with --db <restored.fdb>.",
    });
    console.error(`Found a backup file, not a queryable database: ${db.path}`);
    process.exitCode = 3;
    return;
  }

  if (!isql) {
    await writeJson(path.join(outDir, "manifest.json"), {
      ...manifestBase,
      status: "no_isql_found",
      nextStep:
        "Install Firebird 2.5 client tools or pass --isql <path-to-isql.exe>.",
    });
    console.error("Firebird isql.exe was not found.");
    process.exitCode = 4;
    return;
  }

  const rawSchema = await runIsql(isql, db.path, args.user, args.password, schemaSql());
  const columns = parseSchema(rawSchema);
  const exports = planExports(columns);
  const rawData = await runIsql(
    isql,
    db.path,
    args.user,
    args.password,
    dataSql(exports),
  );
  const rowsByKey = parseRows(rawData, exports);

  await writeOutputs(
    outDir,
    {
      ...manifestBase,
      status: "exported",
      exportedTables: exports.map((item) => ({
        key: item.key,
        table: item.table,
        fields: item.fields,
        rows: rowsByKey.get(item.key)?.length ?? 0,
      })),
    },
    columns,
    rowsByKey,
  );

  console.log(`PowerGage export written to ${outDir}`);
}

main().catch(async (error) => {
  const outDir = DEFAULT_OUT_DIR;
  await mkdir(outDir, { recursive: true }).catch(() => undefined);
  await writeJson(path.join(outDir, "manifest.json"), {
    generatedAt: new Date().toISOString(),
    status: "failed",
    error: error instanceof Error ? error.message : String(error),
  }).catch(() => undefined);
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
