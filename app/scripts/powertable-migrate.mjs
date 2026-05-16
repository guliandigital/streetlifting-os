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
  const response = await fetch(url, {
    headers: {
      "User-Agent": "StreetliftingOS-Migration/1.0 read-only",
      Accept: "*/*",
    },
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    url,
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get("content-type") ?? "",
    buffer,
  };
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
  const text = String(value ?? "");
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
  const rawPath = await saveText(path.join(outDir, "raw"), key, response.text);
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
  await saveText(path.join(outDir, "raw"), key, response.text);
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

async function collectMeetPublic(outDir, meetId) {
  const meetDir = path.join(outDir, "meets", String(meetId));
  const result = { meetId, endpoints: [], athleteMentions: [] };

  const sorevUrl = `${BASE_URL}/sorev?nom=${encodeURIComponent(meetId)}`;
  const sorev = await fetchText(sorevUrl);
  await saveText(path.join(meetDir, "raw"), "sorev", sorev.text);
  const sorevTables = extractTables(sorev.text);
  await writeJson(path.join(meetDir, "sorev-tables.json"), sorevTables);
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
  await saveText(path.join(meetDir, "raw"), "wt-en", wt.text);
  const wtTables = extractTables(wt.text);
  const wtRows = maybeRowsFromTables(wtTables, `meet-${meetId}-wt`);
  result.athleteMentions = extractAthleteMentionsFromWtHtml(meetId, wt.text);
  if (result.athleteMentions.length === 0) {
    result.athleteMentions = extractAthleteMentionsFromWt(meetId, wtTables);
  }
  await writeJson(path.join(meetDir, "wt-tables.json"), wtTables);
  await writeCsv(path.join(meetDir, "wt-tables.csv"), wtRows, unionHeaders(wtRows));
  await writeCsv(
    path.join(meetDir, "athlete-mentions.csv"),
    result.athleteMentions,
    unionHeaders(result.athleteMentions),
  );
  result.endpoints.push({
    key: "wt-en",
    url: wtUrl,
    status: wt.status,
    tableCount: wtTables.length,
    athleteMentions: result.athleteMentions.length,
  });

  return result;
}

async function collectAuthenticated(outDir, args) {
  const results = [];
  if (!args.sk) return results;

  if (args.sportsmen) {
    const url = `${BASE_URL}/nomination?sportsman=true&sk=${encodeURIComponent(args.sk)}`;
    const response = await fetchText(url);
    const redactedUrl = `${BASE_URL}/nomination?sportsman=true&sk=<redacted>`;
    await saveText(path.join(outDir, "raw-auth"), "sportsmen", response.text, guessTextExtension(response));
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
        await saveText(
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
      await saveText(path.join(outDir, "raw-auth"), endpoint.key, response.text, guessTextExtension(response));
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

  const outDir = normalizeFsPath(args.out);
  await mkdir(outDir, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    mode: args.sk ? "authenticated-plus-public" : "public",
    hasSk: Boolean(args.sk),
    hasUser: Boolean(args.user),
    feds: args.feds,
    explicitMeets: args.meets,
    publicEndpoints: [],
    federationMeetLists: [],
    publicMeetDetails: [],
    authenticatedEndpoints: [],
    notes: [
      "PowerTable is an online 1C-backed service; local installer files do not contain the full database.",
      "Public mode collects only public website/API data.",
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
  for (const meetId of meetIdsForDetail) {
    try {
      const meetResult = await collectMeetPublic(outDir, meetId);
      manifest.publicMeetDetails.push({
        meetId,
        title: meetResult.title,
        endpoints: meetResult.endpoints,
        athleteMentions: meetResult.athleteMentions.length,
      });
      allAthleteMentions.push(...meetResult.athleteMentions);
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

  manifest.authenticatedEndpoints = await collectAuthenticated(outDir, args);
  manifest.summary = {
    discoveredMeetCount: allMeetIds.length,
    downloadedMeetDetailCount: meetIdsForDetail.length,
    publicAthleteMentionCount: allAthleteMentions.length,
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
