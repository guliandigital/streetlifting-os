# ISF Final Protocol v1

Streetlifting OS sends this payload only after a tournament has final results.
It is a source protocol, not an identity or credential authority.

## Envelope

`SignedFinalProtocol` contains a canonical `protocol` object, a SHA-256
`payloadHash`, and an Ed25519 detached signature. The signature covers the
canonical JSON of `protocol` only; `payloadHash` is a verification aid and is
recomputed by the receiver.

The receiver accepts an envelope only when all conditions hold:

1. `schemaVersion` is `isf.final-protocol/v1`.
2. `(protocolId, revision)` has not been accepted with another hash.
3. The declared federation key is active, trusted and allowed for the stated
   federation and sanctioning certificate.
4. The Ed25519 signature and SHA-256 hash verify.
5. A correction has a higher revision and explicitly identifies the protocol it
   replaces; historical accepted revisions remain immutable.

## Identity and provenance

Each result carries `isfPersonId` and `externalAthleteId` only when supplied by
the operator. The receiver may link history only by these identifiers or a
separate manual-review workflow. `athleteName` is evidence for review, never a
matching key. The payload contains no contact details, account credentials,
attestation or consent data.

`sourceEntryId`, `protocolId`, `revision`, `payloadHash`, `federationKeyId` and
`sanctioningCertId` must be persisted as provenance by the receiving service.

## Key custody

Streetlifting OS receives a `CryptoKey` only for the immediate signing action
and never serializes it into a save file, IndexedDB, CSV or log. Key issuance,
rotation, revocation and trust decisions belong to the federation service.
