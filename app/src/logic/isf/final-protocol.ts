/**
 * Signed final-protocol contract for the federation sync boundary.
 *
 * The client only builds and signs a deterministic protocol. It neither stores
 * private keys nor decides whether a federation key is trusted; those are
 * responsibilities of the receiving federation service.
 */

import type { Entry, SaveFile } from "@domain/models";
import { computeClassicResults } from "./classic-placing";
import { computeMultirepResults } from "./multirep-placing";
import { attemptStatusFromVotes } from "./judge-votes";

export const FINAL_PROTOCOL_SCHEMA_VERSION = "isf.final-protocol/v1";

type FinalProtocolResult = {
  sourceEntryId: string;
  isfPersonId: string | null;
  externalAthleteId: string | null;
  athleteName: string;
  sex: "M" | "F" | "OPEN";
  country: string | null;
  disciplineCode: string;
  event: string;
  competitionFormat: "classic" | "multirep" | "weighted_calisthenics";
  division: "amateur" | "pro" | "adaptive";
  guest: boolean;
  bodyweightKg: number | null;
  ageCategoryCode: string | null;
  weightCategoryCode: string | null;
  place: number | null;
  result: {
    pu: number;
    di: number;
    total: number;
    unit: "kg" | "reps";
    isfCoefficient: number;
    isfFinalPoints: number;
    noRepCount: number | null;
  };
};

export type FinalProtocolPayload = {
  schemaVersion: typeof FINAL_PROTOCOL_SCHEMA_VERSION;
  protocolId: string;
  revision: number;
  supersedesProtocolId: string | null;
  competitionId: string;
  federationCode: string;
  issuedAt: string;
  rulesPack: {
    id: string;
    federation: string;
    version: string;
    sha256: string | null;
  };
  meet: {
    name: string;
    date: string;
    country: string;
    state: string;
    city: string;
  };
  results: FinalProtocolResult[];
};

export type FinalProtocolSignature = {
  algorithm: "ed25519";
  federationKeyId: string;
  sanctioningCertId: string;
  value: string;
};

export type SignedFinalProtocol = {
  protocol: FinalProtocolPayload;
  payloadHash: string;
  signature: FinalProtocolSignature;
};

export type BuildFinalProtocolInput = {
  competitionId: string;
  protocolId: string;
  revision: number;
  supersedesProtocolId?: string | null;
  issuedAt: string;
};

export type FinalProtocolSigner = {
  federationKeyId: string;
  sanctioningCertId: string;
  privateKey: CryptoKey;
};

type WebCrypto = Pick<Crypto, "subtle">;

/** Build a compact, source-provenance preserving final protocol. */
export function buildFinalProtocol(
  saveFile: SaveFile,
  input: BuildFinalProtocolInput,
): FinalProtocolPayload {
  assertFinalProtocolInput(input);
  assertNoPendingDecisions(saveFile.registration.entries);
  if (saveFile.registration.entries.some((entry) => entry.competitionFormat === "weighted_calisthenics")) {
    throw new Error("weighted_calisthenics final protocol export is not supported yet");
  }
  if (!saveFile.meet.federation.trim()) {
    throw new Error("federation code is required");
  }

  const classic = computeClassicResults(
    saveFile.registration.entries,
    saveFile.meet,
    saveFile.meet.date,
  ).filter((group) => group.sex !== null).flatMap((group) =>
    group.rows.map((row): FinalProtocolResult => ({
      ...baseResult(row.entry, row.resolvedAgeCategoryCode, row.resolvedWeightCategoryCode, row.place),
      result: {
        pu: row.puBest,
        di: row.diBest,
        total: row.total,
        unit: "kg",
        isfCoefficient: row.isfCoefficient,
        isfFinalPoints: row.isfFinalPoints,
        noRepCount: null,
      },
    })),
  );

  const multirep = computeMultirepResults(
    saveFile.registration.entries,
    saveFile.meet,
    saveFile.meet.date,
  ).flatMap((group) =>
    group.rows.map((row): FinalProtocolResult => ({
      ...baseResult(row.entry, row.resolvedAgeCategoryCode, row.resolvedWeightCategoryCode, row.place),
      result: {
        pu: row.puReps,
        di: row.diReps,
        total: row.totalReps,
        unit: "reps",
        isfCoefficient: row.isfCoefficient,
        isfFinalPoints: row.isfFinalPoints,
        noRepCount: row.noRepCount,
      },
    })),
  );

  return {
    schemaVersion: FINAL_PROTOCOL_SCHEMA_VERSION,
    protocolId: input.protocolId,
    revision: input.revision,
    supersedesProtocolId: input.supersedesProtocolId ?? null,
    competitionId: input.competitionId,
    federationCode: saveFile.meet.federation,
    issuedAt: input.issuedAt,
    rulesPack: {
      id: saveFile.meet.rulesPackRef.id,
      federation: saveFile.meet.rulesPackRef.federation,
      version: saveFile.meet.rulesPackRef.version,
      sha256: saveFile.meet.rulesPackRef.sha256,
    },
    meet: {
      name: saveFile.meet.name,
      date: saveFile.meet.date,
      country: saveFile.meet.country,
      state: saveFile.meet.state,
      city: saveFile.meet.city,
    },
    results: [...classic, ...multirep].sort((left, right) =>
      left.sourceEntryId.localeCompare(right.sourceEntryId),
    ),
  };
}

/** Sign a protocol without persisting the key material in the client. */
export async function signFinalProtocol(
  protocol: FinalProtocolPayload,
  signer: FinalProtocolSigner,
  cryptoApi: WebCrypto = globalThis.crypto,
): Promise<SignedFinalProtocol> {
  if (!signer.federationKeyId.trim() || !signer.sanctioningCertId.trim()) {
    throw new Error("Federation key and sanctioning certificate identifiers are required");
  }

  const bytes = utf8(canonicalJson(protocol));
  const [payloadHash, signature] = await Promise.all([
    sha256(bytes, cryptoApi),
    cryptoApi.subtle.sign("Ed25519", signer.privateKey, bytes),
  ]);

  return {
    protocol,
    payloadHash,
    signature: {
      algorithm: "ed25519",
      federationKeyId: signer.federationKeyId,
      sanctioningCertId: signer.sanctioningCertId,
      value: base64(new Uint8Array(signature)),
    },
  };
}

/** Import a federation PKCS#8 Ed25519 signing key held only in current memory. */
export async function importEd25519PrivateKeyPem(
  pem: string,
  cryptoApi: WebCrypto = globalThis.crypto,
): Promise<CryptoKey> {
  const normalized = pem.trim();
  const match = normalized.match(
    /^-----BEGIN PRIVATE KEY-----\s*([A-Za-z0-9+/=\s]+)\s*-----END PRIVATE KEY-----$/,
  );
  if (!match) throw new Error("An Ed25519 PKCS#8 private key PEM is required");
  return cryptoApi.subtle.importKey(
    "pkcs8",
    fromBase64(match[1].replace(/\s+/g, "")),
    { name: "Ed25519" },
    false,
    ["sign"],
  );
}

/** Verify the envelope before it is accepted by an import endpoint. */
export async function verifySignedFinalProtocol(
  envelope: SignedFinalProtocol,
  trustedPublicKey: CryptoKey,
  cryptoApi: WebCrypto = globalThis.crypto,
): Promise<boolean> {
  if (envelope.signature.algorithm !== "ed25519") return false;
  const bytes = utf8(canonicalJson(envelope.protocol));
  const actualHash = await sha256(bytes, cryptoApi);
  if (actualHash !== envelope.payloadHash) return false;
  return cryptoApi.subtle.verify(
    "Ed25519",
    trustedPublicKey,
    fromBase64(envelope.signature.value),
    bytes,
  );
}

/** Stable JSON is part of the wire contract, so signatures are cross-runtime. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  throw new Error(`Unsupported final protocol value: ${typeof value}`);
}

function baseResult(
  entry: Entry,
  ageCategoryCode: string | null,
  weightCategoryCode: string | null,
  place: number | null,
): Omit<FinalProtocolResult, "result"> {
  return {
    sourceEntryId: entry.id,
    isfPersonId: entry.isfPersonId ?? null,
    externalAthleteId: entry.memberId ?? null,
    athleteName: entry.name,
    sex: entry.sex,
    country: entry.country,
    disciplineCode: entry.disciplineCode,
    event: entry.event,
    competitionFormat: entry.competitionFormat,
    division: entry.division,
    guest: entry.guest,
    bodyweightKg: entry.bodyweightKg,
    ageCategoryCode,
    weightCategoryCode,
    place,
  };
}

function assertFinalProtocolInput(input: BuildFinalProtocolInput) {
  if (!input.competitionId.trim() || !input.protocolId.trim()) {
    throw new Error("competitionId and protocolId are required");
  }
  if (!Number.isInteger(input.revision) || input.revision < 1) {
    throw new Error("revision must be a positive integer");
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(input.issuedAt)) {
    throw new Error("issuedAt must be an ISO-8601 date-time");
  }
  const supersedesProtocolId = input.supersedesProtocolId?.trim() ?? "";
  if (input.revision === 1 && supersedesProtocolId) {
    throw new Error("revision 1 cannot supersede another protocol");
  }
  if (input.revision > 1 && !supersedesProtocolId) {
    throw new Error("a correction revision must identify the protocol it supersedes");
  }
}

function assertNoPendingDecisions(entries: ReadonlyArray<Entry>) {
  for (const entry of entries) {
    for (const exercise of Object.values(entry.exercises)) {
      if (!exercise) continue;
      if (exercise.format === "classic") {
        for (const attempt of exercise.attempts) {
          if (attempt.declaredLoadKg !== null && attemptStatusFromVotes(attempt.judgeVotes) === "pending") {
            throw new Error(`Unresolved judge decision for entry ${entry.id}`);
          }
        }
      } else {
        for (const attempt of exercise.attempts) {
          const hasAttempt = attempt.presetLoadKg !== null || attempt.reps !== null;
          if (hasAttempt && attemptStatusFromVotes(attempt.judgeVotes) === "pending") {
            throw new Error(`Unresolved judge decision for entry ${entry.id}`);
          }
        }
      }
    }
  }
}

function utf8(value: string) {
  return new TextEncoder().encode(value);
}

async function sha256(bytes: Uint8Array, cryptoApi: WebCrypto) {
  const digest = await cryptoApi.subtle.digest("SHA-256", asArrayBuffer(bytes));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function asArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function base64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
