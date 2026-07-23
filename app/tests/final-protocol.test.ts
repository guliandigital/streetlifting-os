import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import { aggregateVote } from "@logic/isf/judge-votes";
import {
  buildFinalProtocol,
  signFinalProtocol,
  verifySignedFinalProtocol,
} from "@logic/isf/final-protocol";
import { buildEmptyV2SaveFile } from "./fixtures/save-file";

const cryptoApi = webcrypto as unknown as Pick<Crypto, "subtle">;

function finalSaveFile() {
  const saveFile = buildEmptyV2SaveFile();
  saveFile.registration.entries = [
    {
      id: "entry-1",
      competitionFormat: "classic",
      disciplineCode: "classic_2lift",
      event: "PUDI",
      day: 1,
      platform: 1,
      flight: "A",
      name: "Иванов Иван",
      sex: "M",
      birthDate: "1990-01-01",
      ageOverride: null,
      division: "amateur",
      memberId: "legacy-42",
      isfPersonId: "isf-person-42",
      guest: false,
      country: "RU",
      bodyweightKg: 80,
      reweighKg: null,
      assignedAgeCategoryCode: "open",
      assignedWeightCategoryCode: "M_80",
      exercises: {
        PU: {
          format: "classic",
          exercise: "PU",
          attempts: [
            {
              sequence: 1,
              declaredLoadKg: 100,
              judgeVotes: aggregateVote(true),
              lastDeclarationAt: null,
              changesUsedInRound: 0,
            },
          ],
        },
        DI: {
          format: "classic",
          exercise: "DI",
          attempts: [
            {
              sequence: 1,
              declaredLoadKg: 80,
              judgeVotes: aggregateVote(true),
              lastDeclarationAt: null,
              changesUsedInRound: 0,
            },
          ],
        },
      },
    },
  ];
  return saveFile;
}

const input = {
  competitionId: "aefb4db4-88ed-4a4b-8ac3-76f37d9dd55e",
  protocolId: "1dc86e04-52fd-4f43-bd4e-3c8fc98c0885",
  revision: 1,
  issuedAt: "2026-07-23T10:00:00.000Z",
};

describe("final protocol", () => {
  it("preserves confirmed ids and produces deterministic final results", () => {
    const protocol = buildFinalProtocol(finalSaveFile(), input);
    expect(protocol.results).toEqual([
      expect.objectContaining({
        sourceEntryId: "entry-1",
        isfPersonId: "isf-person-42",
        externalAthleteId: "legacy-42",
        result: expect.objectContaining({ total: 180, unit: "kg" }),
      }),
    ]);
    expect(buildFinalProtocol(finalSaveFile(), input)).toEqual(protocol);
  });

  it("rejects a protocol with an unresolved judge decision", () => {
    const saveFile = finalSaveFile();
    saveFile.registration.entries[0]!.exercises.PU!.attempts[0]!.judgeVotes = {
      left: true,
      center: null,
      right: null,
    };
    expect(() => buildFinalProtocol(saveFile, input)).toThrow("Unresolved judge decision");
  });

  it("requires a predecessor for correction revisions", () => {
    expect(() => buildFinalProtocol(finalSaveFile(), { ...input, revision: 2 })).toThrow(
      "must identify the protocol it supersedes",
    );
  });

  it("signs and verifies an untampered protocol", async () => {
    const keys = await cryptoApi.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
    if (!("privateKey" in keys) || !("publicKey" in keys)) throw new Error("Expected key pair");
    const signed = await signFinalProtocol(
      buildFinalProtocol(finalSaveFile(), input),
      {
        federationKeyId: "isf-ru-2026-01",
        sanctioningCertId: "sanction-42",
        privateKey: keys.privateKey,
      },
      cryptoApi,
    );
    expect(await verifySignedFinalProtocol(signed, keys.publicKey, cryptoApi)).toBe(true);
    signed.protocol.meet.name = "Tampered";
    expect(await verifySignedFinalProtocol(signed, keys.publicKey, cryptoApi)).toBe(false);
  });
});
