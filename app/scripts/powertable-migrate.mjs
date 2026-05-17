#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const appDir = path.resolve(path.dirname(scriptPath), "..");
const repoRoot = path.resolve(appDir, "..");

const DEFAULT_OUT_DIR = path.join(repoRoot, "migration-output", "powertable");
const BASE_URL = "https://powertable.ru/api/hs/p";
const DEFAULT_FEDS = ["0010"];
const REQUEST_DELAY_MS = 350;

const PUBLIC_ENDPOINTS = [
  { key: "federations", url: `${BASE_URL}/federation` },
  { key: "clubs", url: `${BASE_URL}/clubs` },
  { key: "cities", url: `${BASE_URL}/city` },
  { key: "history", url: `${BASE_URL}/history` },
];

const DISCIPLINE_META_BY_DSP = {
  "0101": { code: "classic_pu", component: "pu", label: "Weighted Pull-up", type: "classic-single" },
  "0102": { code: "classic_di", component: "di", label: "Weighted Dip", type: "classic-single" },
  "0103": { code: "classic_total", label: "Total Classic", type: "classic-total" },
  "0104": { code: "multirep_pu_8", component: "pu", weightKg: 8, label: "Pull-ups with 8 kg", type: "multirep-single" },
  "0105": { code: "multirep_pu_16", component: "pu", weightKg: 16, label: "Pull-ups with 16 kg", type: "multirep-single" },
  "0106": { code: "multirep_pu_24", component: "pu", weightKg: 24, label: "Pull-ups with 24 kg", type: "multirep-single" },
  "0107": { code: "multirep_pu_32", component: "pu", weightKg: 32, label: "Pull-ups with 32 kg", type: "multirep-single" },
  "0108": { code: "multirep_di_16", component: "di", weightKg: 16, label: "Dips with 16 kg", type: "multirep-single" },
  "0109": { code: "multirep_di_24", component: "di", weightKg: 24, label: "Dips with 24 kg", type: "multirep-single" },
  "0110": { code: "multirep_di_32", component: "di", weightKg: 32, label: "Dips with 32 kg", type: "multirep-single" },
  "0111": { code: "multirep_di_48", component: "di", weightKg: 48, label: "Dips with 48 kg", type: "multirep-single" },
  "0112": { code: "multirep_total_8_16", pullUpWeightKg: 8, dipWeightKg: 16, label: "Multirep 8/16 (total)", type: "multirep-total" },
  "0113": { code: "multirep_total_16_24", pullUpWeightKg: 16, dipWeightKg: 24, label: "Multirep 16/24 (total)", type: "multirep-total" },
  "0114": { code: "multirep_total_24_32", pullUpWeightKg: 24, dipWeightKg: 32, label: "Multirep 24/32 (total)", type: "multirep-total" },
  "0115": { code: "multirep_total_32_48", pullUpWeightKg: 32, dipWeightKg: 48, label: "Multirep 32/48 (total)", type: "multirep-total" },
  "0116": { code: "multirep_pu_12", component: "pu", weightKg: 12, label: "Pull-ups with 12 kg", type: "multirep-single" },
  "0118": { code: "multirep_di_12", component: "di", weightKg: 12, label: "Dips with 12 kg", type: "multirep-single" },
  "0119": { code: "multirep_total_8_12", pullUpWeightKg: 8, dipWeightKg: 12, label: "Multirep 8/12 (total)", type: "multirep-total" },
  "0120": { code: "multirep_total_12_16", pullUpWeightKg: 12, dipWeightKg: 16, label: "Multirep 12/16 (total)", type: "multirep-total" },
  "1298": { code: "wc_mu_bar", component: "mu", label: "Classic muscle-up", type: "multirep-single" },
  "1299": { code: "classic_squat", component: "sq", label: "Classic barbell squat", type: "classic-single" },
  "4525": { code: "calisthenics_total", label: "Power calisthenics total", type: "generic" },
};

const RECORD_LEVEL_GLOBAL_CODES = new Set(["000000008", "000000004", "000000003"]);
const RECORD_LEVEL_COUNTRY_CODE = "000000002";
const RECORD_LEVEL_REGION_CODE = "000000001";
let saveRawPayloads = true;

function printHelp() {
  console.log(`PowerTable migration collector

Usage:
  npm run powertable:migrate -- [options]

Public mode, no token:
  npm run powertable:migrate
  npm run powertable:migrate -- --fed 0010 --limit-meets 50

Authenticated mode:
  $env:POWERTABLE_SK="..."
  npm run powertable:migrate -- --sk $env:POWERTABLE_SK --meet 4093 --sportsmen

Options:
  --out <dir>          Output directory. Default: ${DEFAULT_OUT_DIR}
  --fed <code>         Federation code for all_sorev. Repeatable. Default: ${DEFAULT_FEDS.join(", ")}
  --meet <id>          Meet/competition id. Repeatable.
  --limit-meets <n>    Limit meet detail downloads per federation. Default: 25.
  --all-meets          Download details for all discovered meets.
  --skip-meet-details  Only collect directories and event lists.
  --single-wt-page     Fetch only the default working protocol page per meet.
  --skip-public-references
                       Skip norm/record/rating public AJAX endpoints.
  --include-regional-records
                       Also fetch record endpoints for every public region option.
  --rating-breakdowns  Also fetch rating endpoints per public year/federation filter.
  --no-raw            Do not save raw HTML/JSON payloads, only structured outputs.
  --sk <token>         PowerTable security key. Prefer env POWERTABLE_SK.
  --user <id>          PowerTable user id for live endpoints. Prefer env POWERTABLE_USER.
  --sportsmen          With --sk: fetch all federation athletes.
  --auth-meet-data     With --sk and --meet: fetch nomination JSON/CSV and schedule JSON.
  --help              Show this message.

Outputs are written under migration-output/ and ignored by git because they may contain PII.
`);
}

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUT_DIR,
    feds: [],
    meets: [],
    limitMeets: 25,
    allMeets: false,
    skipMeetDetails: false,
    singleWtPage: false,
    skipPublicReferences: false,
    includeRegionalRecords: false,
    ratingBreakdowns: false,
    noRaw: false,
    sk: process.env.POWERTABLE_SK ?? "",
    user: process.env.POWERTABLE_USER ?? "",
    sportsmen: false,
    authMeetData: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case "--out":
        args.out = requireValue(arg, next);
        i += 1;
        break;
      case "--fed":
        args.feds.push(requireValue(arg, next));
        i += 1;
        break;
      case "--meet":
        args.meets.push(requireValue(arg, next));
        i += 1;
        break;
      case "--limit-meets":
        args.limitMeets = Number(requireValue(arg, next));
        if (!Number.isInteger(args.limitMeets) || args.limitMeets < 0) {
          throw new Error("--limit-meets must be a non-negative integer");
        }
        i += 1;
        break;
      case "--all-meets":
        args.allMeets = true;
        break;
      case "--skip-meet-details":
        args.skipMeetDetails = true;
        break;
      case "--single-wt-page":
        args.singleWtPage = true;
        break;
      case "--skip-public-references":
        args.skipPublicReferences = true;
        break;
      case "--include-regional-records":
        args.includeRegionalRecords = true;
        break;
      case "--rating-breakdowns":
        args.ratingBreakdowns = true;
        break;
      case "--no-raw":
        args.noRaw = true;
        break;
      case "--sk":
        args.sk = requireValue(arg, next);
        i += 1;
        break;
      case "--user":
        args.user = requireValue(arg, next);
        i += 1;
        break;
      case "--sportsmen":
        args.sportsmen = true;
        break;
      case "--auth-meet-data":
        args.authMeetData = true;
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (args.feds.length === 0) args.feds = DEFAULT_FEDS;
  return args;
}

function requireValue(arg, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${arg} requires a value`);
  }
  return value;
}

function normalizeFsPath(input) {
  return path.resolve(input.trim().replace(/^"|"$/g, ""));
}

async function fetchBuffer(url) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "StreetliftingOS-Migration/1.0 read-only",
          Accept: "*/*",
        },
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
        await delay(REQUEST_DELAY_MS * attempt * 3);
        continue;
      }
      return {
        url,
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get("content-type") ?? "",
        buffer,
      };
    } catch (error) {
      if (attempt >= maxAttempts) throw error;
      await delay(REQUEST_DELAY_MS * attempt * 3);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}

async function fetchText(url) {
  const result = await fetchBuffer(url);
  const text = decodeResponseText(result.buffer, result.contentType);
  return { ...result, text };
}

function decodeResponseText(buffer, contentType) {
  const lower = contentType.toLowerCase();
  if (lower.includes("charset=windows-1251")) {
    return new TextDecoder("windows-1251").decode(buffer);
  }
  if (lower.includes("charset=utf-16")) {
    return new TextDecoder("utf-16le").decode(buffer);
  }
  return new TextDecoder("utf-8").decode(buffer);
}

function endpointFileName(key, extension) {
  return `${key.replace(/[^a-z0-9_-]+/gi, "_")}.${extension}`;
}

async function saveText(outDir, key, text, extension = "html") {
  await mkdir(outDir, { recursive: true });
  const filePath = path.join(outDir, endpointFileName(key, extension));
  await writeFile(filePath, text, "utf8");
  return filePath;
}

async function saveRawText(outDir, key, text, extension = "html") {
  if (!saveRawPayloads) return "";
  return saveText(outDir, key, text, extension);
}

async function saveBuffer(outDir, key, buffer, extension) {
  await mkdir(outDir, { recursive: true });
  const filePath = path.join(outDir, endpointFileName(key, extension));
  await writeFile(filePath, buffer);
  return filePath;
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeCsv(filePath, rows, headers) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header] ?? "")).join(","));
  }
  await writeFile(filePath, `\uFEFF${lines.join("\n")}\n`, "utf8");
}

function csvCell(value) {
  const text = value && typeof value === "object"
    ? JSON.stringify(value)
    : String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function stripTags(html) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(Number.parseInt(dec, 10)),
    );
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripTags(match[1]) : "";
}

function extractTables(html) {
  const tables = [];
  const tableMatches = html.matchAll(/<table\b[\s\S]*?<\/table>/gi);
  for (const tableMatch of tableMatches) {
    const tableHtml = tableMatch[0];
    const rows = [];
    const rowMatches = tableHtml.matchAll(/<tr\b[\s\S]*?<\/tr>/gi);
    for (const rowMatch of rowMatches) {
      const rowHtml = rowMatch[0];
      const cells = [];
      const cellMatches = rowHtml.matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi);
      for (const cellMatch of cellMatches) {
        cells.push(stripTags(cellMatch[2]));
      }
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 0) {
      tables.push({ rows, rowCount: rows.length, columnCount: maxColumns(rows) });
    }
  }
  return tables;
}

function maxColumns(rows) {
  return rows.reduce((max, row) => Math.max(max, row.length), 0);
}

function tableToObjects(table) {
  if (!table || table.rows.length === 0) return [];
  const [header, ...body] = table.rows;
  const normalizedHeaders = header.map((value, index) =>
    normalizeHeader(value, index),
  );
  return body
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => {
      const object = {};
      normalizedHeaders.forEach((headerName, index) => {
        object[headerName] = row[index] ?? "";
      });
      return object;
    });
}

function normalizeHeader(value, index) {
  const base = decodeHtml(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "");
  return base || `col_${index + 1}`;
}

function extractLinks(html) {
  const links = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    links.push({
      href: decodeHtml(match[1]),
      text: stripTags(match[2]),
    });
  }
  return links;
}

function publicUrl(href) {
  const decoded = decodeHtml(String(href ?? ""));
  if (/^https?:\/\//i.test(decoded)) return decoded;
  if (decoded.startsWith("/")) return `https://powertable.ru${decoded}`;
  return `${BASE_URL}/${decoded.replace(/^\/+/, "")}`;
}

function extractFederationLikeDirectoryRows(html, source) {
  const rows = [];
  const linkPattern =
    /<a\b[^>]*href=["']([^"']*all_sorev\?fed=([^"'&]+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const href = decodeHtml(match[1]);
    const code = decodeHtml(match[2]);
    const innerHtml = match[3];
    const text = stripTags(innerHtml);
    const countMatch = text.match(/^\((\d+)\)\s*/);
    const shortName = extractBoldText(innerHtml);
    let name = text.replace(/^\(\d+\)\s*/, "").trim();
    if (shortName && name.startsWith(shortName)) {
      name = name.slice(shortName.length).trim();
    }
    rows.push({
      source,
      code,
      shortName,
      name,
      eventCount: countMatch ? countMatch[1] : "",
      href,
    });
  }
  return rows;
}

function extractCityRows(html) {
  const rows = [];
  let countryCode = "";
  let countryName = "";
  const tokenPattern =
    /<h4>\s*<img[\s\S]*?<b>\s*([^<]+?)\s*<\/b>\s*([^<]+?)<\/h4>|<a\b[^>]*href=["']([^"']*city\?city=([^"'&]*)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(tokenPattern)) {
    if (match[1] !== undefined) {
      countryCode = stripTags(match[1]);
      countryName = stripTags(match[2]);
      continue;
    }

    const href = decodeHtml(match[3]);
    const cityParam = decodeQueryValue(match[4]);
    const text = stripTags(match[5]);
    const countMatch = text.match(/\((\d+)\)\s*$/);
    const city = cityParam || text.replace(/\s*\(\d+\)\s*$/, "").trim();
    if (!city) continue;
    rows.push({
      source: "cities",
      countryCode,
      countryName,
      city,
      eventCount: countMatch ? countMatch[1] : "",
      href,
    });
  }
  return rows;
}

function extractHistoryRows(html) {
  return extractLinks(html)
    .filter((link) => isMeaningfulPublicLink(link.href, link.text))
    .map((link) => ({
      source: "history",
      href: link.href,
      text: link.text,
    }));
}

function extractDirectoryRows(endpointKey, html) {
  if (endpointKey === "federations" || endpointKey === "clubs") {
    return extractFederationLikeDirectoryRows(html, endpointKey);
  }
  if (endpointKey === "cities") return extractCityRows(html);
  if (endpointKey === "history") return extractHistoryRows(html);
  return [];
}

function isMeaningfulPublicLink(href, text) {
  if (!text || text.toLowerCase() === "english") return false;
  if (href === "/" || href.startsWith("#")) return false;
  return /(sorev|all_sorev|fed|city|rec|rating|norm|clubs|federation)/i.test(href);
}

function extractFederationMeetRows(html, fed) {
  const rows = [];
  let regionId = "";
  let regionName = "";
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const href = decodeHtml(match[1]);
    const text = stripTags(match[2]);
    const regionMatch = href.match(/(?:^|[?&])fed=(\d+)/i);
    if (/^fed\?/i.test(href) && regionMatch) {
      regionId = regionMatch[1];
      regionName = text;
      continue;
    }

    const meetMatch = href.match(/(?:^|[?&])nom=(\d+)/i);
    if (!/^sorev\?/i.test(href) || !meetMatch) continue;
    rows.push({
      fed,
      regionId,
      regionName,
      meetId: meetMatch[1],
      name: text,
      leadingDate: extractLeadingDate(text),
      href,
    });
  }
  return rows;
}

function extractLeadingDate(text) {
  const match = String(text ?? "")
    .trim()
    .match(/^(\d{1,2}(?:[.\-/]\d{1,2})?(?:[.\-/]\d{2,4})?(?:\s*[-–—]\s*\d{1,2}(?:[.\-/]\d{1,2})?(?:[.\-/]\d{2,4})?)?)/);
  return match ? match[1] : "";
}

function extractMeetIdsFromHtml(html) {
  const ids = new Set();
  for (const match of html.matchAll(/[?&](?:nom|cm)=(\d+)/gi)) {
    ids.add(match[1]);
  }
  for (const match of html.matchAll(/\/api\/hs\/p\/(?:sorev|wt)\?nom=(\d+)/gi)) {
    ids.add(match[1]);
  }
  return [...ids];
}

function maybeRowsFromTables(tables, source) {
  const rows = [];
  tables.forEach((table, tableIndex) => {
    const objects = tableToObjects(table);
    for (const object of objects) {
      rows.push({ source, tableIndex, ...object });
    }
  });
  return rows;
}

function extractAthleteMentionsFromWt(meetId, tables) {
  const rows = [];
  tables.forEach((table, tableIndex) => {
    if (table.rows.length < 2) return;
    const header = table.rows[0].map((cell) => cell.toLowerCase());
    const nameIndex = findHeaderIndex(header, [
      "спортсмен",
      "sportsman",
      "athlete",
      "name",
      "фио",
    ]);
    const teamIndex = findHeaderIndex(header, ["команда", "team"]);
    const birthIndex = findHeaderIndex(header, ["рожд", "birth", "год"]);
    const bwIndex = findHeaderIndex(header, ["собственный вес", "bw", "вес"]);
    const categoryIndex = findHeaderIndex(header, ["вк", "weight"]);
    const disciplineIndex = findHeaderIndex(header, ["дисц", "discipline"]);

    for (const bodyRow of table.rows.slice(1)) {
      const name = pickCell(bodyRow, nameIndex);
      if (!looksLikeAthleteName(name)) continue;
      rows.push({
        meetId,
        tableIndex,
        name,
        team: pickCell(bodyRow, teamIndex),
        birth: pickCell(bodyRow, birthIndex),
        bodyweightKg: normalizeNumber(pickCell(bodyRow, bwIndex)),
        weightCategory: pickCell(bodyRow, categoryIndex),
        discipline: pickCell(bodyRow, disciplineIndex),
        raw: bodyRow.join(" | "),
      });
    }
  });
  return rows;
}

function extractAthleteMentionsFromWtHtml(meetId, html) {
  const rows = [];
  let division = "";
  let gender = "";
  let category = "";
  let tableIndex = -1;
  const rowMatches = html.matchAll(/<tr\b[\s\S]*?<\/tr>/gi);
  for (const rowMatch of rowMatches) {
    const rowHtml = rowMatch[0];
    if (/<table\b/i.test(rowHtml)) tableIndex += 1;

    const rowText = stripTags(rowHtml);
    if (/class=["'][^"']*\bdivision\b/i.test(rowHtml)) {
      division = rowText;
      gender = "";
      category = "";
      continue;
    }

    const colspanMatch = rowHtml.match(/<td\b[^>]*colspan=["']?50["']?[^>]*>([\s\S]*?)<\/td>/i);
    if (colspanMatch) {
      const contextText = stripTags(colspanMatch[1]).replace(/^-$/, "").trim();
      if (/^(man|woman|муж|жен)/i.test(contextText)) {
        gender = contextText;
      } else if (contextText) {
        category = contextText;
      }
    }

    const athleteLink = rowHtml.match(
      /<a\b[^>]*href=["']([^"']*noms\?[^"']*\bsp=(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!athleteLink) continue;

    const href = decodeHtml(athleteLink[1]);
    const sportsmanId = athleteLink[2];
    const nameParts = splitNameAndBirth(stripTags(athleteLink[3]));
    const cells = extractRowCells(rowHtml);
    rows.push({
      meetId,
      tableIndex: Math.max(tableIndex, 0),
      sportsmanId,
      name: nameParts.name,
      birthYear: nameParts.birthYear,
      team: cells[1] ?? "",
      division,
      gender,
      category,
      href,
      raw: cells.join(" | "),
    });
  }
  return rows;
}

function extractWtDisciplineLinks(html, meetId) {
  const links = [];
  const seen = new Set();
  for (const link of extractLinks(html)) {
    if (!/^wt\?/i.test(link.href) && !/\/api\/hs\/p\/wt\?/i.test(link.href)) continue;
    const url = new URL(publicUrl(link.href));
    const nom = url.searchParams.get("nom");
    const dsp = url.searchParams.get("dsp") ?? "";
    if (nom !== String(meetId) || !dsp) continue;
    const key = `${nom}:${dsp}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const badgeMatch = link.text.match(/^(.*?)(\d+)\s*$/);
    const label = (badgeMatch ? badgeMatch[1] : link.text).trim();
    links.push({
      meetId: String(meetId),
      dsp,
      url: `${BASE_URL}/wt?nom=${encodeURIComponent(meetId)}&dsp=${encodeURIComponent(dsp)}&lg=en`,
      label: label || disciplineMeta(dsp).label,
      advertisedRowCount: badgeMatch ? Number.parseInt(badgeMatch[2], 10) : null,
    });
  }
  return links;
}

function extractCompetitionMetaFromSorev(meetId, html) {
  const title = extractTitle(html).replace(/^PowerTable\s*\/\s*/i, "").trim();
  const links = extractLinks(html);
  const federationLink = links.find((link) => /(?:^|\/)fed\?fed=/i.test(link.href));
  return {
    meetId: String(meetId),
    title,
    federationName: federationLink?.text ?? "",
    federationHref: federationLink?.href ?? "",
  };
}

function extractPublicResultsFromWtHtml(meetId, disciplineLink, html) {
  const meta = disciplineMeta(disciplineLink.dsp, disciplineLink.label);
  const rows = [];
  const attempts = [];
  let division = "";
  let gender = "";
  let category = "";
  let tableIndex = 0;

  for (const rowMatch of html.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)) {
    const rowHtml = rowMatch[0];
    const rowText = stripTags(rowHtml);

    if (/<tr\b[^>]*class=["'][^"']*\bcomp\b/i.test(rowHtml)) {
      tableIndex += 1;
      continue;
    }
    if (/class=["'][^"']*\bdivision\b/i.test(rowHtml)) {
      division = rowText;
      gender = "";
      category = "";
      continue;
    }

    const colspanMatch = rowHtml.match(/<td\b[^>]*colspan=["']?50["']?[^>]*>([\s\S]*?)<\/td>/i);
    if (colspanMatch) {
      const contextText = stripTags(colspanMatch[1]).replace(/^-$/, "").trim();
      if (/^(man|woman|муж|жен)/i.test(contextText)) {
        gender = contextText;
      } else if (contextText) {
        category = contextText;
      }
    }

    const athleteLink = rowHtml.match(
      /<a\b[^>]*href=["']([^"']*noms\?[^"']*\bsp=(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!athleteLink) continue;

    const cells = extractHtmlCells(rowHtml);
    const nameParts = splitNameAndBirth(stripTags(athleteLink[3]));
    const resultRow = {
      meetId: String(meetId),
      tableIndex: Math.max(tableIndex - 1, 0),
      dsp: disciplineLink.dsp,
      disciplineCode: meta.code,
      disciplineLabel: disciplineLink.label || meta.label,
      sportsmanId: athleteLink[2],
      name: nameParts.name,
      birthYear: nameParts.birthYear,
      team: cells[1]?.text ?? "",
      className: cells[2]?.text ?? "",
      division,
      gender,
      category,
      href: decodeHtml(athleteLink[1]),
      bodyWeightKg: numberOrNull(cells[3]?.text),
      raw: cells.map((cell) => cell.text).join(" | "),
    };

    applyDisciplineCells(resultRow, attempts, cells, meta);
    rows.push(resultRow);
  }

  return { rows, attempts };
}

function extractHtmlCells(rowHtml) {
  const cells = [];
  for (const cellMatch of rowHtml.matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    const attrs = cellMatch[2] ?? "";
    cells.push({
      text: stripTags(cellMatch[3]),
      attrs,
      noLift: /background-color:\s*#?ffb3ba/i.test(attrs),
      skipped: /background-color:\s*#?9d9d9d/i.test(attrs),
    });
  }
  return cells;
}

function disciplineMeta(dsp, label = "") {
  const known = DISCIPLINE_META_BY_DSP[dsp];
  if (known) return known;
  return {
    code: `powertable_${dsp || "unknown"}`,
    label: label || `PowerTable ${dsp || "unknown"}`,
    type: "generic",
  };
}

function applyDisciplineCells(row, attempts, cells, meta) {
  row.resultValue = null;
  row.coefficient = null;
  row.placeInClass = null;
  row.placeOverall = null;

  if (meta.type === "classic-total") {
    row.bestPullUpKg = numberOrNull(cells[8]?.text);
    row.bestDipKg = numberOrNull(cells[13]?.text);
    row.resultValue = numberOrNull(cells[14]?.text);
    row.placeInClass = numberOrNull(cells[15]?.text);
    row.coefficient = numberOrNull(cells[16]?.text);
    row.placeOverall = numberOrNull(cells[17]?.text);
    addClassicAttempts(row, attempts, cells, "pu", [4, 5, 6]);
    addClassicAttempts(row, attempts, cells, "di", [9, 10, 11]);
    return;
  }

  if (meta.type === "classic-single") {
    const bestKey = meta.component === "di" ? "bestDipKg" : meta.component === "pu" ? "bestPullUpKg" : "bestLiftKg";
    row[bestKey] = numberOrNull(cells[8]?.text);
    row.resultValue = numberOrNull(cells[9]?.text);
    row.placeInClass = numberOrNull(cells[10]?.text);
    row.coefficient = numberOrNull(cells[11]?.text);
    row.placeOverall = numberOrNull(cells[12]?.text);
    addClassicAttempts(row, attempts, cells, meta.component, [4, 5, 6]);
    return;
  }

  if (meta.type === "multirep-total") {
    row.pullUpReps = numberOrNull(cells[5]?.text);
    row.dipReps = numberOrNull(cells[7]?.text);
    row.resultValue = numberOrNull(cells[9]?.text);
    row.placeInClass = numberOrNull(cells[10]?.text);
    row.coefficient = numberOrNull(cells[11]?.text);
    row.placeOverall = numberOrNull(cells[12]?.text);
    addMultirepAttempt(row, attempts, cells[5], "pu", meta.pullUpWeightKg);
    addMultirepAttempt(row, attempts, cells[7], "di", meta.dipWeightKg);
    return;
  }

  if (meta.type === "multirep-single") {
    row.reps = numberOrNull(cells[4]?.text);
    row.resultValue = numberOrNull(cells[6]?.text);
    row.placeInClass = numberOrNull(cells[7]?.text);
    row.coefficient = numberOrNull(cells[8]?.text);
    row.placeOverall = numberOrNull(cells[9]?.text);
    addMultirepAttempt(row, attempts, cells[4], meta.component, meta.weightKg);
    return;
  }

  row.resultValue = firstNumberAfter(cells, 4);
}

function addClassicAttempts(row, attempts, cells, componentCode, indexes) {
  indexes.forEach((cellIndex, index) => {
    const cell = cells[cellIndex];
    const weightKg = numberOrNull(cell?.text);
    if (weightKg === null) return;
    const attempt = {
      meetId: row.meetId,
      sportsmanId: row.sportsmanId,
      dsp: row.dsp,
      disciplineCode: row.disciplineCode,
      componentCode,
      attemptNumber: index + 1,
      weightKg,
      result: cell?.noLift ? "no_lift" : "good_lift",
    };
    attempts.push(attempt);
    row.attempts = [...(row.attempts ?? []), omitMeetAttemptKeys(attempt)];
  });
}

function addMultirepAttempt(row, attempts, cell, componentCode, weightKg) {
  const repsCount = numberOrNull(cell?.text);
  if (repsCount === null) return;
  const attempt = {
    meetId: row.meetId,
    sportsmanId: row.sportsmanId,
    dsp: row.dsp,
    disciplineCode: row.disciplineCode,
    componentCode,
    attemptNumber: 1,
    weightKg: weightKg ?? null,
    repsCount,
    result: cell?.noLift ? "no_lift" : "good_lift",
  };
  attempts.push(attempt);
  row.attempts = [...(row.attempts ?? []), omitMeetAttemptKeys(attempt)];
}

function omitMeetAttemptKeys(attempt) {
  const { meetId: _meetId, sportsmanId: _sportsmanId, dsp: _dsp, disciplineCode: _disciplineCode, ...rest } = attempt;
  return rest;
}

function numberOrNull(value) {
  const normalized = normalizeNumber(value);
  return normalized === "" ? null : Number(normalized);
}

function firstNumberAfter(cells, startIndex) {
  for (const cell of cells.slice(startIndex)) {
    const value = numberOrNull(cell.text);
    if (value !== null) return value;
  }
  return null;
}

function hasMeaningfulResult(row) {
  return row.resultValue !== null
    || row.coefficient !== null
    || (row.attempts?.length ?? 0) > 0;
}

function extractRowCells(rowHtml) {
  const cells = [];
  for (const cellMatch of rowHtml.matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    cells.push(stripTags(cellMatch[2]));
  }
  return cells;
}

function splitNameAndBirth(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(.*?)\s*,\s*(\d{2,4})$/);
  if (!match) return { name: text, birthYear: "" };
  const rawYear = match[2];
  return {
    name: match[1].trim(),
    birthYear: rawYear.length === 2 ? rawYear : rawYear,
  };
}

function findHeaderIndex(header, candidates) {
  for (const candidate of candidates) {
    const index = header.findIndex((cell) => cell.includes(candidate));
    if (index >= 0) return index;
  }
  return -1;
}

function pickCell(row, index) {
  if (index < 0) return "";
  return row[index] ?? "";
}

function looksLikeAthleteName(value) {
  const text = String(value ?? "").trim();
  if (text.length < 5) return false;
  if (/\d{2,}/.test(text)) return false;
  return /[A-Za-zА-Яа-яЁё]/.test(text) && text.split(/\s+/).length >= 2;
}

function normalizeNumber(value) {
  const raw = String(value ?? "").trim().replace(",", ".");
  const match = raw.match(/-?\d+(?:\.\d+)?/);
  return match ? match[0] : "";
}

function extractBoldText(html) {
  const match = html.match(/<b\b[^>]*>([\s\S]*?)<\/b>/i);
  return match ? stripTags(match[1]) : "";
}

function decodeQueryValue(value) {
  const decoded = decodeHtml(value ?? "");
  try {
    return decodeURIComponent(decoded.replace(/\+/g, "%20"));
  } catch {
    return decoded;
  }
}

async function collectPublicEndpoint(outDir, endpoint) {
  const response = await fetchText(endpoint.url);
  const key = `public-${endpoint.key}`;
  const rawPath = await saveRawText(path.join(outDir, "raw"), key, response.text);
  const tables = extractTables(response.text);
  const directoryRows = extractDirectoryRows(endpoint.key, response.text);
  const rows = directoryRows.length > 0
    ? directoryRows
    : maybeRowsFromTables(tables, endpoint.key);
  await writeJson(path.join(outDir, `${key}-tables.json`), tables);
  if (rows.length > 0) {
    await writeCsv(
      path.join(outDir, `${key}.csv`),
      rows,
      unionHeaders(rows),
    );
  }
  return {
    key: endpoint.key,
    url: endpoint.url,
    status: response.status,
    contentType: response.contentType,
    rawPath,
    tableCount: tables.length,
    parsedKind: directoryRows.length > 0 ? "directory-links" : "tables",
    rowCount: rows.length,
  };
}

async function collectPublicReferences(outDir, fed, args) {
  const pageSpecs = [
    { key: "norm", url: `${BASE_URL}/norm?fed=${encodeURIComponent(fed)}` },
    { key: "rec", url: `${BASE_URL}/rec?fed=${encodeURIComponent(fed)}` },
    { key: "rating", url: `${BASE_URL}/rating?fed=${encodeURIComponent(fed)}` },
    { key: "rating_coach", url: `${BASE_URL}/rating_coach?fed=${encodeURIComponent(fed)}` },
  ];
  const result = {
    generatedAt: new Date().toISOString(),
    federationCode: fed,
    pages: [],
    endpoints: [],
    options: {},
    normRows: [],
    recordRows: [],
    athleteRatingRows: [],
    coachRatingRows: [],
  };

  const pages = {};
  for (const pageSpec of pageSpecs) {
    const response = await fetchText(pageSpec.url);
    pages[pageSpec.key] = response.text;
    await saveRawText(path.join(outDir, "raw"), `reference-${pageSpec.key}`, response.text);
    result.pages.push({
      key: pageSpec.key,
      url: pageSpec.url,
      status: response.status,
      contentType: response.contentType,
      title: extractTitle(response.text),
    });
    await delay(REQUEST_DELAY_MS);
  }

  const normDisciplines = extractSelectOptions(pages.norm, "mydisc");
  const recordDisciplines = extractSelectOptions(pages.rec, "mydisc");
  const ratingDisciplines = extractSelectOptions(pages.rating, "mydisc");
  const recordLevels = extractSelectOptions(pages.rec, "mytyperec");
  const countries = extractSelectOptions(pages.rec, "mycountry").filter((option) => option.value);
  const regions = extractSelectOptions(pages.rec, "myregion").filter((option) => option.value);
  const ratingYears = extractSelectOptions(pages.rating, "myyear");
  const ratingFeds = extractSelectOptions(pages.rating, "myfed");
  const coachYears = extractSelectOptions(pages.rating_coach, "myyear");
  const coachFeds = extractSelectOptions(pages.rating_coach, "myfed");
  result.options = {
    normDisciplines,
    recordDisciplines,
    ratingDisciplines,
    recordLevels,
    countries,
    regions,
    ratingYears,
    ratingFeds,
    coachYears,
    coachFeds,
  };

  for (const discipline of normDisciplines) {
    const url = `${BASE_URL}/norm_in?fed=${encodeURIComponent(fed)}&md=${encodeURIComponent(discipline.value)}`;
    const response = await fetchText(url);
    const rows = referenceRowsFromHtml(response.text, {
      dsp: discipline.value,
      disciplineCode: disciplineMeta(discipline.value, discipline.label).code,
      disciplineLabel: discipline.label,
    });
    result.normRows.push(...rows);
    result.endpoints.push(referenceEndpointSummary(`norm_in:${discipline.value}`, url, response, rows));
    await delay(REQUEST_DELAY_MS);
  }

  for (const discipline of recordDisciplines) {
    const meta = disciplineMeta(discipline.value, discipline.label);
    for (const level of recordLevels) {
      const targets = recordTargetsForLevel(level, countries, regions, args.includeRegionalRecords);
      for (const target of targets) {
        const url = `${BASE_URL}/rec_in?fed=${encodeURIComponent(fed)}&mtr=${encodeURIComponent(level.value)}&mct=&mc=${encodeURIComponent(target.countryCode)}&mr=${encodeURIComponent(target.regionCode)}&md=${encodeURIComponent(discipline.value)}&lg=`;
        const response = await fetchText(url);
        const rows = referenceRowsFromHtml(response.text, {
          dsp: discipline.value,
          disciplineCode: meta.code,
          disciplineLabel: discipline.label,
          levelCode: level.value,
          levelLabel: level.label,
          countryCode: target.countryCode,
          countryLabel: target.countryLabel,
          regionCode: target.regionCode,
          regionLabel: target.regionLabel,
        });
        result.recordRows.push(...rows);
        result.endpoints.push(referenceEndpointSummary(`rec_in:${discipline.value}:${level.value}:${target.key}`, url, response, rows));
        await delay(REQUEST_DELAY_MS);
      }
    }
  }

  const ratingYearTargets = args.ratingBreakdowns ? ratingYears : ratingYears.filter((option) => option.value === "all");
  const ratingFedTargets = args.ratingBreakdowns ? ratingFeds : ratingFeds.filter((option) => option.value === "all");
  for (const discipline of ratingDisciplines) {
    const meta = disciplineMeta(discipline.value, discipline.label);
    for (const year of ratingYearTargets) {
      for (const fedFilter of ratingFedTargets) {
        const url = `${BASE_URL}/rating_in?fed=${encodeURIComponent(fed)}&md=${encodeURIComponent(discipline.value)}&y=${encodeURIComponent(year.value)}&fd=${encodeURIComponent(fedFilter.value)}`;
        const response = await fetchText(url);
        const rows = referenceRowsFromHtml(response.text, {
          dsp: discipline.value,
          disciplineCode: meta.code,
          disciplineLabel: discipline.label,
          year: year.value,
          federationFilter: fedFilter.value,
          federationFilterLabel: fedFilter.label,
        });
        result.athleteRatingRows.push(...rows);
        result.endpoints.push(referenceEndpointSummary(`rating_in:${discipline.value}:${year.value}:${fedFilter.value}`, url, response, rows));
        await delay(REQUEST_DELAY_MS);
      }
    }
  }

  const coachYearTargets = args.ratingBreakdowns ? coachYears : coachYears.filter((option) => option.value === "all");
  const coachFedTargets = args.ratingBreakdowns ? coachFeds : coachFeds.filter((option) => option.value === "all");
  for (const year of coachYearTargets) {
    for (const fedFilter of coachFedTargets) {
      const url = `${BASE_URL}/rating_coach_in?fed=${encodeURIComponent(fed)}&y=${encodeURIComponent(year.value)}&fd=${encodeURIComponent(fedFilter.value)}`;
      const response = await fetchText(url);
      const rows = referenceRowsFromHtml(response.text, {
        year: year.value,
        federationFilter: fedFilter.value,
        federationFilterLabel: fedFilter.label,
      });
      result.coachRatingRows.push(...rows);
      result.endpoints.push(referenceEndpointSummary(`rating_coach_in:${year.value}:${fedFilter.value}`, url, response, rows));
      await delay(REQUEST_DELAY_MS);
    }
  }

  await writeJson(path.join(outDir, `fed-${fed}-public-references.json`), result);
  await writeJson(path.join(outDir, `fed-${fed}-public-api-catalog.json`), {
    generatedAt: result.generatedAt,
    federationCode: fed,
    baseUrl: BASE_URL,
    pages: result.pages,
    options: result.options,
    endpoints: result.endpoints,
    notes: [
      "PowerTable public pages are HTML; norm/record/rating bodies are loaded by XHR *_in endpoints.",
      "ratingBreakdowns=false collects all-time/all-federations ratings only to keep the default run bounded.",
      "includeRegionalRecords=false skips region-level record endpoints by default because the public page exposes many region filters.",
    ],
  });

  return result;
}

function extractSelectOptions(html, selectId) {
  const selectPattern = new RegExp(`<select\\b[^>]*id=["']${escapeRegExp(selectId)}["'][^>]*>([\\s\\S]*?)<\\/select>`, "i");
  const selectMatch = html.match(selectPattern);
  if (!selectMatch) return [];
  const options = [];
  for (const optionMatch of selectMatch[1].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)) {
    const attrs = optionMatch[1] ?? "";
    const valueMatch = attrs.match(/\bvalue=["']([^"']*)["']/i);
    const value = valueMatch ? decodeHtml(valueMatch[1]) : stripTags(optionMatch[2]);
    const label = stripTags(optionMatch[2]);
    options.push({
      value,
      label,
      selected: /\bselected\b/i.test(attrs),
    });
  }
  return options;
}

function recordTargetsForLevel(level, countries, regions, includeRegionalRecords) {
  if (RECORD_LEVEL_GLOBAL_CODES.has(level.value)) {
    return [{ key: "global", countryCode: "", countryLabel: "", regionCode: "", regionLabel: "" }];
  }
  if (level.value === RECORD_LEVEL_COUNTRY_CODE) {
    return countries.map((country) => ({
      key: `country-${country.value}`,
      countryCode: country.value,
      countryLabel: country.label,
      regionCode: "",
      regionLabel: "",
    }));
  }
  if (level.value === RECORD_LEVEL_REGION_CODE && includeRegionalRecords) {
    return regions.map((region) => ({
      key: `region-${region.value}`,
      countryCode: "",
      countryLabel: "",
      regionCode: region.value,
      regionLabel: region.label,
    }));
  }
  return [];
}

function referenceRowsFromHtml(html, metadata) {
  const dataDate = extractDataDate(html);
  const rows = [];
  extractTables(html).forEach((table, tableIndex) => {
    table.rows.forEach((cells, rowIndex) => {
      const cleanedCells = cells.map((cell) => cell.trim()).filter((cell) => cell.length > 0);
      if (cleanedCells.length === 0) return;
      if (cleanedCells.length === 1 && /данные по состоянию|data on date/i.test(cleanedCells[0])) return;
      rows.push({
        ...metadata,
        dataDate,
        tableIndex,
        rowIndex,
        cells: cleanedCells,
      });
    });
  });
  return rows;
}

function extractDataDate(html) {
  const text = stripTags(html);
  const match = text.match(/(?:Данные по состоянию на|Data on date)\s*\/?\s*(?:Data on date)?\s*([0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4}\s+[0-9:]+(?:\s*\(UTC[+-]\d+\))?)/i);
  return match ? match[1].trim() : "";
}

function referenceEndpointSummary(key, url, response, rows) {
  return {
    key,
    url,
    status: response.status,
    contentType: response.contentType,
    bytes: response.buffer.length,
    rowCount: rows.length,
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unionHeaders(rows) {
  const headers = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!headers.includes(key)) headers.push(key);
    }
  }
  return headers;
}

async function collectFederationMeetList(outDir, fed) {
  const url = `${BASE_URL}/all_sorev?fed=${encodeURIComponent(fed)}`;
  const response = await fetchText(url);
  const key = `fed-${fed}-all_sorev`;
  await saveRawText(path.join(outDir, "raw"), key, response.text);
  const tables = extractTables(response.text);
  const rows = extractFederationMeetRows(response.text, fed);
  const links = extractLinks(response.text);
  const meetIds = extractMeetIdsFromHtml(response.text);
  await writeJson(path.join(outDir, `${key}-tables.json`), tables);
  await writeJson(path.join(outDir, `${key}-links.json`), links);
  await writeCsv(path.join(outDir, `${key}.csv`), rows, unionHeaders(rows));
  return {
    fed,
    url,
    status: response.status,
    title: extractTitle(response.text),
    meetIds,
    rowCount: rows.length,
    tableCount: tables.length,
  };
}

async function collectMeetPublic(outDir, meetId, args) {
  const meetDir = path.join(outDir, "meets", String(meetId));
  const result = {
    meetId,
    endpoints: [],
    competition: null,
    athleteMentions: [],
    resultRows: [],
    attemptRows: [],
    disciplineLinks: [],
  };

  const sorevUrl = `${BASE_URL}/sorev?nom=${encodeURIComponent(meetId)}`;
  const sorev = await fetchText(sorevUrl);
  await saveRawText(path.join(meetDir, "raw"), "sorev", sorev.text);
  const sorevTables = extractTables(sorev.text);
  await writeJson(path.join(meetDir, "sorev-tables.json"), sorevTables);
  result.competition = extractCompetitionMetaFromSorev(meetId, sorev.text);
  result.title = extractTitle(sorev.text);
  result.endpoints.push({
    key: "sorev",
    url: sorevUrl,
    status: sorev.status,
    tableCount: sorevTables.length,
  });

  await delay(REQUEST_DELAY_MS);

  const wtUrl = `${BASE_URL}/wt?nom=${encodeURIComponent(meetId)}&lg=en`;
  const wt = await fetchText(wtUrl);
  await saveRawText(path.join(meetDir, "raw"), "wt-en", wt.text);
  const wtTables = extractTables(wt.text);
  const wtRows = maybeRowsFromTables(wtTables, `meet-${meetId}-wt`);
  result.disciplineLinks = extractWtDisciplineLinks(wt.text, meetId);
  await writeJson(path.join(meetDir, "wt-tables.json"), wtTables);
  await writeCsv(path.join(meetDir, "wt-tables.csv"), wtRows, unionHeaders(wtRows));
  result.endpoints.push({
    key: "wt-en",
    url: wtUrl,
    status: wt.status,
    tableCount: wtTables.length,
    disciplineLinks: result.disciplineLinks.length,
  });

  const pagesToParse = args.singleWtPage || result.disciplineLinks.length === 0
    ? [{ dsp: "", url: wtUrl, label: "default", advertisedRowCount: null, html: wt.text, status: wt.status }]
    : result.disciplineLinks;

  for (const disciplineLink of pagesToParse) {
    let html = disciplineLink.html;
    let status = disciplineLink.status;
    let tableCount = wtTables.length;
    if (!html) {
      const page = await fetchText(disciplineLink.url);
      html = page.text;
      status = page.status;
      tableCount = extractTables(page.text).length;
      await saveRawText(
        path.join(meetDir, "raw"),
        `wt-${disciplineLink.dsp || "default"}-en`,
        page.text,
      );
      await delay(REQUEST_DELAY_MS);
    }

    const parsed = extractPublicResultsFromWtHtml(meetId, disciplineLink, html);
    result.resultRows.push(...parsed.rows);
    result.attemptRows.push(...parsed.attempts);
    result.endpoints.push({
      key: `wt-${disciplineLink.dsp || "default"}-en`,
      url: disciplineLink.url,
      status,
      tableCount,
      resultRows: parsed.rows.length,
      attemptRows: parsed.attempts.length,
    });
  }

  result.athleteMentions = result.resultRows.length > 0
    ? result.resultRows
    : extractAthleteMentionsFromWtHtml(meetId, wt.text);
  if (result.athleteMentions.length === 0) {
    result.athleteMentions = extractAthleteMentionsFromWt(meetId, wtTables);
  }

  await writeJson(path.join(meetDir, "discipline-links.json"), result.disciplineLinks);
  await writeJson(path.join(meetDir, "discipline-results.json"), result.resultRows);
  await writeJson(path.join(meetDir, "attempts.json"), result.attemptRows);
  await writeCsv(path.join(meetDir, "discipline-results.csv"), result.resultRows, unionHeaders(result.resultRows));
  await writeCsv(path.join(meetDir, "attempts.csv"), result.attemptRows, unionHeaders(result.attemptRows));
  await writeCsv(path.join(meetDir, "athlete-mentions.csv"), result.athleteMentions, unionHeaders(result.athleteMentions));

  return result;
}

async function collectAuthenticated(outDir, args) {
  const results = [];
  if (!args.sk) return results;

  if (args.sportsmen) {
    const url = `${BASE_URL}/nomination?sportsman=true&sk=${encodeURIComponent(args.sk)}`;
    const response = await fetchText(url);
    const redactedUrl = `${BASE_URL}/nomination?sportsman=true&sk=<redacted>`;
    await saveRawText(path.join(outDir, "raw-auth"), "sportsmen", response.text, guessTextExtension(response));
    await writeJson(path.join(outDir, "auth-sportsmen-parsed.json"), tryParseJson(response.text));
    results.push({
      key: "sportsmen",
      url: redactedUrl,
      status: response.status,
      contentType: response.contentType,
      bytes: response.buffer.length,
    });
    await delay(REQUEST_DELAY_MS);
  }

  if (args.authMeetData) {
    for (const meetId of args.meets) {
      const endpoints = [
        {
          key: `meet-${meetId}-nomination-json`,
          url: `${BASE_URL}/nomination?nom=${encodeURIComponent(meetId)}&json=true&sk=${encodeURIComponent(args.sk)}`,
          redactedUrl: `${BASE_URL}/nomination?nom=${encodeURIComponent(meetId)}&json=true&sk=<redacted>`,
        },
        {
          key: `meet-${meetId}-nomination-csv-utf8`,
          url: `${BASE_URL}/nomination?nom=${encodeURIComponent(meetId)}&csv=true&code=UTF8&sk=${encodeURIComponent(args.sk)}`,
          redactedUrl: `${BASE_URL}/nomination?nom=${encodeURIComponent(meetId)}&csv=true&code=UTF8&sk=<redacted>`,
        },
        {
          key: `meet-${meetId}-schedule-json`,
          url: `${BASE_URL}/schedule?nom=${encodeURIComponent(meetId)}&json=true&sk=${encodeURIComponent(args.sk)}`,
          redactedUrl: `${BASE_URL}/schedule?nom=${encodeURIComponent(meetId)}&json=true&sk=<redacted>`,
        },
      ];

      for (const endpoint of endpoints) {
        const response = await fetchText(endpoint.url);
        await saveRawText(
          path.join(outDir, "raw-auth"),
          endpoint.key,
          response.text,
          guessTextExtension(response),
        );
        if (endpoint.key.endsWith("json")) {
          await writeJson(
            path.join(outDir, `${endpoint.key}-parsed.json`),
            tryParseJson(response.text),
          );
        }
        results.push({
          key: endpoint.key,
          url: endpoint.redactedUrl,
          status: response.status,
          contentType: response.contentType,
          bytes: response.buffer.length,
        });
        await delay(REQUEST_DELAY_MS);
      }
    }
  }

  if (args.user && args.sk) {
    const liveEndpoints = [
      {
        key: "live-online-json-v2",
        url: `${BASE_URL}/online?user=${encodeURIComponent(args.user)}&v=json_v2&pomost=1&sk=${encodeURIComponent(args.sk)}`,
        redactedUrl: `${BASE_URL}/online?user=${encodeURIComponent(args.user)}&v=json_v2&pomost=1&sk=<redacted>`,
      },
      {
        key: "live-work-table-json",
        url: `${BASE_URL}/work_table?user=${encodeURIComponent(args.user)}&type=json&pomost=1&sk=${encodeURIComponent(args.sk)}`,
        redactedUrl: `${BASE_URL}/work_table?user=${encodeURIComponent(args.user)}&type=json&pomost=1&sk=<redacted>`,
      },
    ];

    for (const endpoint of liveEndpoints) {
      const response = await fetchText(endpoint.url);
      await saveRawText(path.join(outDir, "raw-auth"), endpoint.key, response.text, guessTextExtension(response));
      await writeJson(path.join(outDir, `${endpoint.key}-parsed.json`), tryParseJson(response.text));
      results.push({
        key: endpoint.key,
        url: endpoint.redactedUrl,
        status: response.status,
        contentType: response.contentType,
        bytes: response.buffer.length,
      });
      await delay(REQUEST_DELAY_MS);
    }
  }

  return results;
}

function guessTextExtension(response) {
  const type = response.contentType.toLowerCase();
  if (type.includes("json")) return "json";
  if (type.includes("csv")) return "csv";
  if (type.includes("xml")) return "xml";
  return "txt";
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      parseError: error instanceof Error ? error.message : String(error),
      preview: text.slice(0, 1000),
    };
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  saveRawPayloads = !args.noRaw;

  const outDir = normalizeFsPath(args.out);
  await mkdir(outDir, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    mode: args.sk ? "authenticated-plus-public" : "public",
    hasSk: Boolean(args.sk),
    hasUser: Boolean(args.user),
    savesRawPayloads: saveRawPayloads,
    feds: args.feds,
    explicitMeets: args.meets,
    publicEndpoints: [],
    federationMeetLists: [],
    publicMeetDetails: [],
    publicReferences: [],
    authenticatedEndpoints: [],
    notes: [
      "PowerTable is an online 1C-backed service; local installer files do not contain the full database.",
      "Public mode collects only public website/API data.",
      "Public wt pages expose competition result rows and attempt values; judge catalog still requires authenticated data/export.",
      "PowerTable norm/record/rating pages use public XHR endpoints named norm_in, rec_in, rating_in, and rating_coach_in.",
      "Authenticated endpoints require a federation-owned sk token and may contain PII.",
    ],
  };

  for (const endpoint of PUBLIC_ENDPOINTS) {
    try {
      manifest.publicEndpoints.push(await collectPublicEndpoint(outDir, endpoint));
      await delay(REQUEST_DELAY_MS);
    } catch (error) {
      manifest.publicEndpoints.push({
        key: endpoint.key,
        url: endpoint.url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const discoveredMeetIds = new Set(args.meets.map(String));
  for (const fed of args.feds) {
    try {
      const fedResult = await collectFederationMeetList(outDir, fed);
      manifest.federationMeetLists.push(fedResult);
      fedResult.meetIds.forEach((id) => discoveredMeetIds.add(id));
      await delay(REQUEST_DELAY_MS);
    } catch (error) {
      manifest.federationMeetLists.push({
        fed,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const allMeetIds = [...discoveredMeetIds];
  const meetIdsForDetail = args.skipMeetDetails
    ? []
    : args.allMeets
      ? allMeetIds
      : allMeetIds.slice(0, args.limitMeets);

  const allAthleteMentions = [];
  const allResultRows = [];
  const allAttemptRows = [];
  const allCompetitionRows = [];
  for (const meetId of meetIdsForDetail) {
    try {
      const meetResult = await collectMeetPublic(outDir, meetId, args);
      manifest.publicMeetDetails.push({
        meetId,
        title: meetResult.title,
        competition: meetResult.competition,
        endpoints: meetResult.endpoints,
        disciplineLinks: meetResult.disciplineLinks.length,
        athleteMentions: meetResult.athleteMentions.length,
        resultRows: meetResult.resultRows.length,
        attemptRows: meetResult.attemptRows.length,
      });
      if (meetResult.competition) allCompetitionRows.push(meetResult.competition);
      allAthleteMentions.push(...meetResult.athleteMentions);
      allResultRows.push(...meetResult.resultRows);
      allAttemptRows.push(...meetResult.attemptRows);
      await delay(REQUEST_DELAY_MS);
    } catch (error) {
      manifest.publicMeetDetails.push({
        meetId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await writeCsv(
    path.join(outDir, "powertable-public-athlete-mentions.csv"),
    allAthleteMentions,
    unionHeaders(allAthleteMentions),
  );
  await writeJson(
    path.join(outDir, "powertable-public-athlete-mentions.json"),
    allAthleteMentions,
  );
  await writeCsv(
    path.join(outDir, "powertable-public-competitions.csv"),
    allCompetitionRows,
    unionHeaders(allCompetitionRows),
  );
  await writeJson(
    path.join(outDir, "powertable-public-competitions.json"),
    allCompetitionRows,
  );
  await writeCsv(
    path.join(outDir, "powertable-public-results.csv"),
    allResultRows,
    unionHeaders(allResultRows),
  );
  await writeJson(
    path.join(outDir, "powertable-public-results.json"),
    allResultRows,
  );
  await writeCsv(
    path.join(outDir, "powertable-public-attempts.csv"),
    allAttemptRows,
    unionHeaders(allAttemptRows),
  );
  await writeJson(
    path.join(outDir, "powertable-public-attempts.json"),
    allAttemptRows,
  );

  if (!args.skipPublicReferences) {
    for (const fed of args.feds) {
      try {
        const references = await collectPublicReferences(outDir, fed, args);
        manifest.publicReferences.push({
          fed,
          pages: references.pages.length,
          endpoints: references.endpoints.length,
          normRows: references.normRows.length,
          recordRows: references.recordRows.length,
          athleteRatingRows: references.athleteRatingRows.length,
          coachRatingRows: references.coachRatingRows.length,
          includeRegionalRecords: args.includeRegionalRecords,
          ratingBreakdowns: args.ratingBreakdowns,
        });
      } catch (error) {
        manifest.publicReferences.push({
          fed,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  manifest.authenticatedEndpoints = await collectAuthenticated(outDir, args);
  manifest.summary = {
    discoveredMeetCount: allMeetIds.length,
    downloadedMeetDetailCount: meetIdsForDetail.length,
    publicAthleteMentionCount: allAthleteMentions.length,
    publicCompetitionCount: allCompetitionRows.length,
    publicResultRowCount: allResultRows.length,
    publicResultRowsWithResultCount: allResultRows.filter(hasMeaningfulResult).length,
    publicAttemptRowCount: allAttemptRows.length,
    uniquePublicAthleteCount: new Set(
      allResultRows.map((row) => row.sportsmanId).filter(Boolean),
    ).size,
    publicDisciplinePageCount: manifest.publicMeetDetails.reduce(
      (sum, detail) => sum + (detail.disciplineLinks ?? 0),
      0,
    ),
  };

  await writeJson(path.join(outDir, "manifest.json"), manifest);
  console.log(`PowerTable collection written to ${outDir}`);
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
