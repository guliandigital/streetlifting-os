# Streetlifting OS - Backend V2 Plan

Date: 2026-04-29
Status: V2 architecture/specification draft. No V1 runtime implementation.

Anchors:
- [current-implementation-plan.md](current-implementation-plan.md)
- [architecture-v1.md](architecture-v1.md)
- [rules-pack-spec-v1.md](rules-pack-spec-v1.md)
- [powertable-findings-v4.md](powertable-findings-v4.md)
- [powergage-findings-v1.md](powergage-findings-v1.md)

This document defines the V2 backend boundary, billing and reconciliation model,
RulesPack lifecycle, federation onboarding contract, and security model. It is a
planning artifact only: it does not introduce backend code and does not require
RulesPack runtime integration into the V1 client.

## 1. Goal

V2 adds the commercial and federation services that cannot live only in a local
meet file:

- federation accounts, operator access, billing, quota allocation, and receipts;
- post-meet reconciliation of nominations, sanctioning, save-files, and records;
- RulesPack distribution, validation, signing, and immutable version pinning;
- federation onboarding for ISF first, then WSF, NAP, FinalRep, and national bodies;
- security controls for signatures, audit, key custody, and secrets.

The V2 backend must not become a tournament-day dependency. A meet that has a
valid local entitlement and cached rules must remain runnable with the network
unplugged.

## 2. Backend Boundary

### 2.1 Local-first responsibilities

The client remains authoritative for live meet operation:

| Area | Local responsibility |
|---|---|
| Meet setup | Create/edit local meet, choose cached RulesPack, configure local overrides allowed by the pack |
| Registration | Import, validate, deduplicate, and edit athletes/nominations before the meet |
| Weigh-in | Record bodyweight, reweighs, category resolution, local audit notes |
| Stream/group planning | Build platform/day/group schedules and duration estimates |
| Judging | Timers, attempts, 3-judge votes, pass/refusal/no-show/corrections |
| Results | Category placing, absolute points, team scoring, records candidates, print/export outputs |
| Save-files | Versioned JSON save-file, autosave, local backup, migration pipeline |
| Display/audio/awards | Local projector, scoreboard, awards ceremony, cues, and media |
| Entitlement use | Decrement cached quota locally while offline and store usage events for reconciliation |

Local state must include enough provenance to replay and audit a meet later:

- `rulesPackId`, `rulesPackVersion`, and `rulesPackHash`;
- entitlement token ID and local usage counter;
- nomination billing fingerprints;
- operator actions that affect billing, results, records, or sanctioning;
- local correction history for attempts, nominations, and weigh-ins.

### 2.2 Cloud responsibilities

The backend is authoritative for commercial, trust, and cross-meet services:

| Area | Cloud responsibility |
|---|---|
| Federation accounts | Federation profile, billing region, supported payment rails, data residency |
| Operators | Login, roles, federation membership, token revocation |
| Billing | Balance, invoices, payment provider events, quota allocations |
| Entitlements | Signed offline tokens with meet scope, quota, expiry, and revocation status |
| Reconciliation | Verify save-file signatures, count billable nominations, settle quota usage |
| Rules CDN | Registry, immutable pack assets, signatures, trust store, private pack visibility |
| Sanctioning | Requests, approvals, certificates, record eligibility, federation review state |
| Records archive | Cross-competition record extraction, publication, and dispute workflow |
| Audit | Append-only backend events for payments, sanctioning, uploads, pack publication, key changes |
| Federation onboarding | Account provisioning, keys, pack publication, pilot meet readiness |

### 2.3 Explicit non-goals for V2 backend

- No server call may be required to start an attempt, record a vote, advance a timer,
  print a protocol, or finish a meet.
- No live cloud sync of working state during judging.
- No RulesPack executable code loaded from the network.
- No general federation CRM/ERP/accounting suite.
- No plaintext production credentials in distributable client files, import plugins,
  or generated config.

## 3. Billing and Reconciliation Model

V2 uses a prepaid per-nomination model. Federations top up balance or receive an
invoice, operators allocate quota for an upcoming meet before tournament day,
the client consumes quota offline, and the backend reconciles actual usage after
the meet.

### 3.1 Core entities

| Entity | Purpose | Key fields |
|---|---|---|
| `Federation` | Commercial and governance account | `id`, `name`, `country`, `billingRegion`, `billingCurrency`, `dataResidency`, `status`, `rootKeyIds[]` |
| `FederationOperator` | Human user with federation access | `id`, `federationId`, `email`, `role`, `locale`, `mfaEnabled`, `status` |
| `MeetAccount` | Cloud-side shell for a planned meet | `id`, `federationId`, `localMeetId`, `name`, `date`, `rulesPackId`, `sanctioningTier`, `status` |
| `PaymentAccount` | Billing settings and provider mapping | `id`, `federationId`, `provider`, `customerRef`, `taxProfile`, `defaultCurrency` |
| `Invoice` | Manual or provider-issued invoice | `id`, `federationId`, `amountCents`, `currency`, `status`, `dueAt`, `providerRef` |
| `PaymentEvent` | Webhook-normalized payment event | `id`, `provider`, `providerEventId`, `type`, `amountCents`, `currency`, `status`, `rawHash` |
| `BalanceTransaction` | Ledger row | `id`, `federationId`, `type`, `amountCents`, `currency`, `sourceId`, `idempotencyKey` |
| `QuotaAllocation` | Pre-meet purchased/assigned quota | `id`, `federationId`, `meetAccountId`, `maxCount`, `usedCount`, `expiresAt`, `status` |
| `EntitlementToken` | Offline signed client grant | `id`, `quotaAllocationId`, `jti`, `issuedAt`, `expiresAt`, `revokedAt`, `signatureKeyId` |
| `NominationCharge` | One billable nomination after reconciliation | `id`, `meetAccountId`, `nominationFingerprint`, `athleteFingerprint`, `amountCents`, `currency`, `status` |
| `ReconciliationRun` | Post-meet settlement job | `id`, `meetAccountId`, `saveFileVersionId`, `status`, `startedAt`, `finishedAt`, `summary` |
| `ReconciliationFinding` | Non-blocking or blocking discrepancy | `id`, `runId`, `severity`, `code`, `message`, `localRef`, `resolutionStatus` |
| `SaveFileVersion` | Uploaded immutable meet artifact | `id`, `meetAccountId`, `version`, `r2Key`, `sha256`, `uploadedBy`, `signatureStatus` |
| `Receipt` | Operator/federation proof of settlement | `id`, `runId`, `billedCount`, `amountCents`, `currency`, `issuedAt`, `receiptHash` |

### 3.2 Billing lifecycle

1. Federation tops up balance or receives a B2B invoice.
2. Payment provider webhooks create idempotent `PaymentEvent` rows.
3. Settled payment events create credit `BalanceTransaction` rows.
4. Operator creates or links a `MeetAccount`.
5. Operator requests `QuotaAllocation` for the meet.
6. Backend checks balance, reserves quota, and issues an `EntitlementToken`.
7. Client caches the token and quota locally before the meet.
8. During the meet, client records local quota usage events without network calls.
9. After the meet, client uploads signed save-file and local usage summary.
10. Backend reconciles billable nominations and creates debit ledger rows.
11. Backend returns a signed receipt and remaining quota/balance summary.

### 3.3 Reconciliation rules

Billable unit: one accepted meet nomination, defined as `athlete x meet x
discipline x weight category x age category`, matching the PowerTable evidence
that one athlete can hold multiple nominations in one meet.

The backend must count from the final save-file, not only from client-reported
counters. Local usage events are evidence, but reconciliation is derived from the
signed meet artifact.

Deduplication keys:

- `nominationFingerprint`: stable hash of local nomination ID, discipline, declared
  category, age category, athlete snapshot, and meet ID;
- `athleteFingerprint`: privacy-preserving hash of normalized identity fields and
  federation salt;
- `saveFileHash`: SHA-256 of canonical save-file bytes;
- payment and webhook `idempotencyKey`: provider event ID plus federation ID.

Reconciliation outcomes:

| Outcome | Behavior |
|---|---|
| Exact match | Mark allocation settled, issue receipt |
| Under quota | Debit actual count, keep unused reserved quota according to commercial policy |
| Over quota | Create deficit transaction or invoice; do not invalidate completed meet |
| Duplicate upload | Return existing receipt by idempotency key |
| Tampered file | Reject reconciliation, create high-severity audit event |
| Rule-pack mismatch | Block sanctioning/records extraction until reviewed |
| Test meet | No billing, no records, no ratings; still auditable |

### 3.4 Corrections after reconciliation

Post-meet corrections must create a new `SaveFileVersion` and a new
`ReconciliationRun`. The backend never mutates old receipts or save-file objects.
If the correction changes billable nominations, create compensating ledger rows
instead of editing historical rows.

## 4. RulesPack Loading, Validation, and Pinning

V2 prepares the client and backend around the existing RulesPack spec, but V1
runtime remains unchanged until a separate implementation decision.

### 4.1 Backend-owned pack lifecycle

1. Federation drafts pack data against the published schema.
2. Pack is normalized into canonical CBOR and human-readable JSON.
3. Federation signs canonical bytes with its root or delegated signing key.
4. Platform verifies federation authorization and signature.
5. Pack assets are uploaded to immutable storage.
6. Registry is updated append-only and signed by the platform key.
7. Clients discover the new pack on next online startup.

Published pack objects are immutable. Errata require a new version, for example
`isf-v5.1-2026-r1`. The original version remains readable forever.

### 4.2 Client loading sequence

On startup when online:

1. Fetch signed `registry.json`.
2. Verify platform registry signature against embedded platform public key.
3. Compare registry version with cached registry.
4. For selected or default packs, fetch `manifest.json`, `pack.cbor`,
   `signature.bin`, locales, and declared assets.
5. Verify manifest hashes and federation signature.
6. Validate schema and internal consistency.
7. Cache verified assets locally.

When offline:

- use the last verified cached pack;
- if no cached pack exists, use the embedded V1 ISF preset until V2 runtime work
  replaces it with an embedded `ISF_V51_PACK`;
- never accept an unsigned or partially downloaded pack.

### 4.3 Validation gates

Pack acceptance requires all of these gates:

| Gate | Validation |
|---|---|
| Registry signature | Platform signature valid and registry version monotonic |
| Federation key | Pack signing key is active or valid for the pack publication time |
| Hash integrity | SHA-256 of canonical pack and assets matches manifest |
| Schema | JSON/CBOR content matches RulesPack schema version |
| Domain consistency | Referenced disciplines, formulas, categories, attempts, and locales exist |
| Effective dates | Meet date is covered by pack effective interval |
| Safety bounds | Timer, judge count, plate increments, precision, and category boundaries sane |
| Capability | Pack declares the sport/format the meet is trying to run |

Validation failure rejects the pack and preserves the previous cached good version.

### 4.4 Per-meet pinning

When a meet is created, the save-file records:

- `rulesPackId`;
- `rulesPackVersion`;
- `rulesPackHash`;
- `registryVersion`;
- `publisherKeyId`;
- `validatedAt`;
- `packSpecVersion`.

The pack reference becomes immutable once the first nomination is added. If a
federation publishes a correction while a meet is in progress, the operator may
only migrate through an explicit audited action and only if the migration is
declared non-breaking by the pack metadata.

Reading old save-files must use the pinned pack hash even if a newer registry
version exists.

## 5. Federation Onboarding Contract

Federation onboarding is a business, legal, technical, and operational process.
The backend contract must be explicit before the first pilot meet.

### 5.1 Required inputs

| Input | Contract |
|---|---|
| Legal entity | Registered name, jurisdiction, tax profile, billing contact |
| Brand rights | Logo, display names, trademark usage, support contact |
| Data residency | Allowed storage regions, processor agreements, retention rules |
| Rulebook | Source documents, effective dates, sanctioning tiers, record rules |
| Operators | Initial admin users, roles, MFA requirement |
| Payment setup | Provider, invoice terms, currency, prepaid quota policy |
| Key custody | Federation root key generation, signer roles, rotation policy |
| Pilot scope | Test meet date, expected nominations, sanctioning level, rollback plan |

### 5.2 Provisioning outputs

| Output | Produced by platform |
|---|---|
| `Federation` account | Unique `federationId`, billing region, default locale |
| Operator tenant | Admin users, roles, access policy |
| RulesPack draft | Initial pack JSON/CBOR, locales, assets, schema validation report |
| Trust registration | Federation public keys in signed registry |
| Quota policy | Default price per nomination, test-meet allowance, overage behavior |
| Sanctioning workflow | Tier names, reviewer roles, certificate template |
| Storage namespace | Per-federation R2 bucket or self-hosted storage mapping |
| Audit baseline | Initial onboarding event, key registration event, pack publication event |

### 5.3 API-facing onboarding contract

Initial V2/V3 backend APIs should treat onboarding as an internal admin workflow,
but the data contract should be stable:

```json
{
  "federationId": "isf",
  "displayName": {
    "en": "International Streetlifting Federation",
    "ru": "International Streetlifting Federation"
  },
  "billing": {
    "currency": "USD",
    "mode": "prepaid_quota",
    "pricePerNominationCents": 100,
    "paymentProviders": ["stripe", "invoice"]
  },
  "dataResidency": {
    "primaryRegion": "eu",
    "allowedRegions": ["eu"],
    "selfHosted": false
  },
  "rules": {
    "defaultRulesPackId": "isf-v5.1-2026",
    "allowedSports": ["streetlifting"],
    "sanctioningTiers": ["test", "national", "international"]
  },
  "security": {
    "rootKeyIds": ["isf-root-2026"],
    "operatorMfaRequired": true,
    "packSigningRequiresDualControl": true
  }
}
```

### 5.4 Pilot readiness checklist

A federation is ready for pilot only when:

- first RulesPack passes schema, signature, and domain validation;
- at least two operator admins have MFA enabled;
- test quota allocation and entitlement refresh succeed;
- client can start a meet offline with cached entitlement and pack;
- save-file upload creates a `SaveFileVersion`;
- reconciliation creates a receipt for a test meet without billing;
- sanctioning and records extraction are either configured or explicitly disabled;
- data residency and retention settings are documented.

## 6. Security Model

### 6.1 Trust boundaries

| Boundary | Trust rule |
|---|---|
| Client local state | Trusted for live operation, verified later for cloud consequences |
| Rules CDN | Public-readable, cryptographically verified before use |
| Backend API | HTTPS only, authenticated, role-scoped, audited |
| Payment providers | Webhook events accepted only with provider signature and idempotency |
| Federation signer | Can sign federation packs/certs only for its federation scope |
| Platform signer | Can sign registry and platform receipts, not federation rule content |

### 6.2 Signatures

Required signatures:

- platform signs `registry.json`;
- federation signs RulesPack canonical bytes;
- backend signs entitlement tokens;
- client/operator signs save-file uploads where local key material exists;
- federation authority signs sanctioning certificates;
- backend signs reconciliation receipts.

Signature algorithms should use Ed25519 for packs, save-files, and certificates.
JWTs for web sessions may use ES256 or EdDSA depending on platform support, but
entitlement tokens must be verifiable offline by the client.

### 6.3 Audit

Backend audit is append-only. Audit events are required for:

- login, failed login, MFA changes, role changes;
- payment webhook acceptance/rejection;
- balance and quota ledger mutations;
- entitlement issuance, refresh, revocation;
- RulesPack draft approval, signature, publication, revocation marker;
- federation key creation, rotation, expiration, revocation;
- save-file upload, signature verification, reconciliation run;
- sanctioning approval/rejection and certificate issuance;
- post-meet corrections and receipt adjustments.

Audit event shape:

```json
{
  "id": "audit_...",
  "occurredAt": "2026-04-29T12:00:00Z",
  "actorType": "operator|federation_admin|platform_admin|system|provider",
  "actorId": "user_...",
  "federationId": "isf",
  "action": "quota.allocate",
  "resourceType": "QuotaAllocation",
  "resourceId": "quota_...",
  "requestId": "req_...",
  "ipHash": "sha256:...",
  "userAgentHash": "sha256:...",
  "beforeHash": "sha256:...",
  "afterHash": "sha256:..."
}
```

Audit logs should avoid raw PII where a hash or scoped reference is sufficient.

### 6.4 No plaintext secrets

Forbidden:

- production API keys in repository files;
- payment provider secrets in client bundles;
- database credentials in import/export plugin config;
- long-lived shared federation `sk` style URLs;
- private federation signing keys stored by the platform unless explicitly under a
  managed custody product with documented HSM/KMS controls.

Required:

- backend secrets stored in provider secret storage or KMS;
- client refresh/session tokens stored in OS credential storage where available;
- short-lived role-scoped display/judge tokens for V3 local publisher;
- webhook secrets rotated and environment-scoped;
- encrypted backups for sensitive backend data;
- separate dev/staging/prod credentials.

### 6.5 Privacy and data residency

The backend should classify data before storage:

| Data class | Storage rule |
|---|---|
| Full operational save-file | Federation regional storage, restricted access |
| Billing ledger | Platform billing region plus accounting retention |
| Public protocol | Published only if federation/meet opts in |
| Records | Public or federation-visible depending on sanctioning tier |
| Athlete identity | Federation-scoped until athlete passport consent exists |
| Audit hashes | Platform-wide allowed when they contain no raw PII |

## 7. V2 API Surface Draft

The first backend surface can be small:

```http
POST /v2/auth/login
POST /v2/auth/refresh
GET  /v2/federations/current

GET  /v2/rules/registry
GET  /v2/rules/packs/{publisher}/{version}/manifest
GET  /v2/rules/packs/{publisher}/{version}/pack.cbor

POST /v2/meets
GET  /v2/meets/{meetId}
POST /v2/meets/{meetId}/quota-allocations
POST /v2/entitlements/refresh

POST /v2/savefiles/{meetId}
POST /v2/reconciliation-runs
GET  /v2/reconciliation-runs/{runId}
GET  /v2/receipts/{receiptId}

GET  /v2/balance
GET  /v2/transactions
POST /v2/billing/topup
```

All mutation endpoints require idempotency keys. Payment webhooks are provider
specific and should terminate at separate endpoints with provider signature
verification.

## 8. Storage and Deployment Direction

Initial hosted stack remains aligned with `architecture-v1.md`:

- Cloudflare Workers for API;
- D1 for low-volume relational state;
- R2 for immutable save-files, RulesPack assets, receipts, and exports;
- Queues for reconciliation and records extraction;
- Durable Objects only where coordination or live federation dashboards become
  necessary;
- Stripe/YooKassa/Paddle/invoice rails selected by federation region.

Self-hosting is not a V2 billing target. If a federation requires self-hosted
operational storage for legal reasons, storage adapters can be introduced for
save-files and authority data while commercial billing remains platform-hosted.

## 9. Implementation Phasing

This spec intentionally separates design from V1 runtime changes.

1. Finalize this V2 backend plan and review with product/legal/security.
2. Define canonical `Athlete`, `Nomination`, `Stream`, `Group`, and
   `ReportDefinition` contracts in documentation.
3. Design entitlement token schema and reconciliation receipt schema.
4. Convert ISF v5.1 preset into an internal RulesPack-compatible artifact in a
   separate branch/sprint, without CDN loading at first.
5. Build backend MVP for federation account, quota allocation, entitlement token,
   save-file upload, and reconciliation for test meets.
6. Add payment providers after ledger and idempotency are proven.
7. Add sanctioning and records extraction after reconciliation is stable.
8. Onboard the first federation pack through a manual admin workflow before
   building a public federation publishing portal.

## 10. Open Questions

- Exact per-nomination price and overage policy by federation and region.
- Whether V2 should support invoice-only pilots before payment provider webhooks.
- How long entitlement tokens may remain valid offline before mandatory refresh.
- Which fields are required for athlete fingerprints without creating privacy risk.
- Whether pack signing is federation root-key only or delegated seasonal signer.
- Whether V2 records archive is public by default or sanctioning-tier gated.
- Which regions require non-Cloudflare storage fallback for operational save-files.

## 11. One-line Summary

V2 backend adds money, trust, rules distribution, reconciliation, and federation
onboarding around the offline-first client; the meet itself remains local-first,
RulesPacks are signed immutable data pinned per save-file, and every cloud-side
effect is auditable, idempotent, and reversible through compensating records.
