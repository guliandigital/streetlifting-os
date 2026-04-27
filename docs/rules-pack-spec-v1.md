# Rules Pack — Format Specification v1

Date: 2026-04-26
Status: V2 implementation target. V1 ships ISF v5.1 hardcoded but typed against this spec.
Anchors:
- [decisions-v3.md](decisions-v3.md) D32 — Rules Pack abstraction
- [architecture-v1.md](architecture-v1.md) §4.2 — Rules CDN
- [openlifter-isf-implementation-blueprint-v2.md](openlifter-isf-implementation-blueprint-v2.md) §6 — domain model

This document specifies the format, lifecycle, and cryptographic signing of `RulesPack` — the unit of federation rule governance in Streetlifting OS.

## 1. Goal

A Rules Pack captures everything a federation must declare to run sanctioned meets on the platform: scoring formulas, weight/age categories, attempt models, equipment, presets. It is **versioned**, **signed**, and **immutable** once published. Save-files reference a Rules Pack by `(publisher, version)`, freezing the rules used at that meet for all future reads.

**Key properties**:
- One Pack = one federation × one rulebook version (e.g., `isf-v5.1-2026`)
- Packs are pure data — no executable code
- Packs are signed by the publishing federation's root key (Ed25519)
- Packs are world-readable on the Rules CDN (Layer 2); no auth needed for read
- Packs are append-only — published Packs never mutate; new versions replace logically but never overwrite

## 2. URL convention (on Rules CDN)

```
https://rules.streetlifting.app/
  registry.json                           # global pack catalog (all federations, all versions)
  packs/
    {publisher}/
      {version}/
        manifest.json                      # Pack metadata + asset hashes
        pack.json                          # the Pack itself (data)
        pack.cbor                          # canonical binary form (signed)
        signature.bin                      # Ed25519 sig over pack.cbor
        locales/
          ru-RU.json                       # Pack strings translations
          en-US.json
          ...
        assets/
          logo.svg                         # federation visual assets (optional)
          rules-document.pdf               # federation rulebook PDF (optional)
```

**Examples** (V3+):
- `https://rules.streetlifting.app/packs/isf/v5.1-2026/...`
- `https://rules.streetlifting.app/packs/wsf/v3.0-2025/...`
- `https://rules.streetlifting.app/packs/nap/folk-bp-v2-2024/...`

## 3. Format — TypeScript shape

```ts
export type RulesPackId = string;  // canonical: "{publisher}-{version}", e.g., "isf-v5.1-2026"

export type RulesPack = {
  // ── Identity ──────────────────────────────────────────────────
  id: RulesPackId;                  // "isf-v5.1-2026"
  schemaVersion: "1";                // this Pack-spec version
  publisher: FederationId;           // "isf", "wsf", "nap", "finalrep", ...
  publisherDisplayName: { ru: string; en: string };
  version: string;                   // "v5.1-2026" (federation's own versioning)
  effectiveFrom: string;             // ISO date — earliest meet date this Pack covers
  effectiveUntil: string | null;     // ISO date or null (still current)
  publishedAt: string;               // ISO timestamp when this Pack was signed
  
  // ── Sport scope ───────────────────────────────────────────────
  sports: ("streetlifting" | "weighted_calisthenics")[];
  competitionFormats: CompetitionFormat[];
  exercises: Exercise[];             // subset of "PU" | "DI" | "MU_BAR" | "MU_RING" | "SQ"
  
  // ── Domain definitions ────────────────────────────────────────
  disciplines: Discipline[];
  weightCategories: WeightCategory[];
  ageCategories: AgeCategory[];
  divisions: Division[];
  
  // ── Scoring ───────────────────────────────────────────────────
  formulas: FormulaDefinition[];
  defaultFormulaPerDiscipline: Record<DisciplineCode, FormulaCode>;
  mastersMultipliers: MastersTable | null;     // null if federation has no masters multiplier
  additionalPointsFormula: AdditionalPointsSpec | null;  // ISF-specific; null otherwise
  
  // ── Attempt model ─────────────────────────────────────────────
  attemptModel: {
    classic?: {
      sequenceCount: 3 | 4 | 5;        // standard attempts
      recordOnlySlot: number | null;   // e.g., 4 for ISF; null for federations without record attempt
      timerSec: number;                 // 60 for ISF Classic, may differ
    };
    multirep?: {
      sequenceCount: 1 | 2;             // 1 for ISF Multirep
      timerSec: number;                  // 120 for ISF Multirep
    };
    weighted_calisthenics?: {
      sequenceCount: 3 | 4;
      eventOrder: Exercise[];           // e.g., ["MU_BAR", "PU", "DI", "SQ"] for ISF WC
      timerSecPerEvent: Record<Exercise, number>;
    };
  };
  
  // ── Tiebreak rules ────────────────────────────────────────────
  tiebreakRules: {
    placing: TiebreakSpec[];           // ordered list of comparators
    draw: TiebreakSpec[];               // for attempt order
  };
  
  // ── Weight-change protocol ────────────────────────────────────
  weightChangeRules: {
    round1MaxChanges: number;            // ISF: 1
    round2MaxChanges: number;            // ISF: 0
    round3MaxChanges: number;            // ISF: 2
    minChangeNoticeSec: number;          // ISF: 300 (5 min before)
    autoProgression: {
      onSuccess: number;                  // ISF: +2.5 kg auto
      onFail: "repeat" | "auto_decrement"; // ISF: "repeat"
      timeoutSec: number;                 // ISF: 60
    };
  };
  
  // ── Judging ───────────────────────────────────────────────────
  judging: {
    judgeCount: 1 | 3 | 5;             // ISF: 3; some federations 5
    majorityRule: "simple" | "supermajority";
    splitDecisionAnnouncement: boolean; // ISF: true
  };
  
  // ── Equipment ─────────────────────────────────────────────────
  plateSet: Plate[];
  plateIncrement: number;             // ISF: 1.25
  bodyweightPrecision: number;        // ISF: 0.1
  bodyweightCategoryMatch: "lower_bound_inclusive" | "upper_bound_inclusive";  // ISF: upper inclusive
  
  // ── Records authority ─────────────────────────────────────────
  recordsAuthority: {
    issuesWorldRecords: boolean;
    issuesContinentalRecords: boolean;
    issuesNationalRecords: boolean;
    recognizesRecordsFrom: FederationId[];  // bilateral recognition
  };
  
  // ── Sanctioning ───────────────────────────────────────────────
  sanctioning: {
    tiers: SanctioningTier[];
    requiresMandateCommission: boolean;
    requiresAntiDopingPlan: boolean;
    minJudgeRankPerTier: Record<SanctioningTierName, JudgeRank>;
  };
  
  // ── Cryptographic root-of-trust ──────────────────────────────
  publisherKey: {
    keyId: string;                     // "isf-root-2025"
    publicKey: string;                 // base64-encoded Ed25519 pubkey
    issuedAt: string;
    expiresAt: string | null;
  };
  
  // ── Bundled assets ───────────────────────────────────────────
  assets: {
    logoUrl?: string;
    rulesDocumentUrl?: string;
    websiteUrl: string;
    supportContact: string;
  };
  
  // ── Meta ─────────────────────────────────────────────────────
  notes?: string;
  changelogFromPreviousVersion?: string;
};

// ────────────────────────────────────────────────────────────────

export type FederationId = string;  // "isf", "wsf", "nap", "finalrep", "streetlifting-ru", ...

export type FormulaDefinition = {
  code: FormulaCode;
  displayName: { ru: string; en: string };
  // Coefficient table or formula coefficients per (sex, exercise, bw)
  // For "isf_points": full coefficient table from streetlifting.ru/points/
  // For "result_x_coefficient": multiplier per (sex, discipline, ageCat) from D3
  // For "dots", "wilks", etc.: standard PL formulas (not used in V1 streetlifting Packs but supported)
  coefficientTable?: CoefficientTableEntry[];
  multiplierTable?: MultiplierTableEntry[];
  formulaSource: "table" | "polynomial" | "external";
};

export type FormulaCode = "isf_points" | "result_x_coefficient" | "dots" | "wilks" | "raw" | "ipf_gl";

export type MastersTable = {
  bands: { minAge: number; maxAge: number | null; multiplier: number }[];
};

export type AdditionalPointsSpec = {
  formula: "linear_above_threshold";  // (bw − limit) × 0.5
  thresholds: { sex: Sex; event: Event; limitKg: number; multiplier: number }[];
};

export type TiebreakSpec =
  | { kind: "lighter_bodyweight"; }
  | { kind: "lighter_reweigh"; }
  | { kind: "earlier_declaration_time"; }
  | { kind: "lower_lot_number"; }
  | { kind: "first_to_achieve_result"; }
  | { kind: "shared_place_next_vacant"; };

export type SanctioningTier = {
  name: SanctioningTierName;            // "unsanctioned" | "national" | "international"
  recordsEligibility: ("national" | "continental" | "world")[];
  fee: { currency: string; amountCents: number } | null;
  reviewerRole: "none" | "national_secretary" | "federation_president";
};
```

(See blueprint v2 §6 for shared base types: `Discipline`, `WeightCategory`, `AgeCategory`, `Plate`, `Exercise`, `CompetitionFormat`, `Event`.)

## 4. JSON Schema (abridged — for runtime validation in client)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RulesPack",
  "type": "object",
  "required": ["id", "schemaVersion", "publisher", "version", "effectiveFrom",
               "publishedAt", "sports", "disciplines", "weightCategories",
               "ageCategories", "formulas", "attemptModel", "tiebreakRules",
               "weightChangeRules", "judging", "plateSet", "plateIncrement",
               "publisherKey"],
  "properties": {
    "id":            { "type": "string", "pattern": "^[a-z0-9_-]+$" },
    "schemaVersion": { "const": "1" },
    "publisher":     { "type": "string", "pattern": "^[a-z0-9_-]+$" },
    "version":       { "type": "string" },
    "effectiveFrom": { "type": "string", "format": "date" },
    "publishedAt":   { "type": "string", "format": "date-time" },
    "sports": {
      "type": "array",
      "items": { "enum": ["streetlifting", "weighted_calisthenics"] },
      "minItems": 1
    },
    "judging": {
      "type": "object",
      "required": ["judgeCount", "majorityRule"],
      "properties": {
        "judgeCount":  { "enum": [1, 3, 5] },
        "majorityRule": { "enum": ["simple", "supermajority"] }
      }
    }
    /* ... full schema in src/domain/rules-pack/schema.json */
  }
}
```

Full JSON Schema ships in `src/domain/rules-pack/schema.json` and is validated at Pack download time using `ajv`.

## 5. Versioning rules

**Pack ID format**: `{publisher}-{version}`, lowercase, hyphen-separated. Examples:
- `isf-v5.1-2026` — ISF rules v5.1 effective for 2026 season
- `isf-v5.2-2027` — minor revision; new Pack
- `isf-v6.0-2028` — major revision; new Pack
- `wsf-v3.0-2025` — WSF v3.0
- `nap-folk-bp-v2-2024` — NAP folk BP v2

**Immutability**: once published, a Pack file is **immutable**. Cloudflare R2 with object lock enforces this on the storage layer.

**Corrections**: if a published Pack has an error, the federation publishes a **revision** with a new version (e.g., `isf-v5.1-2026-r1`). The old version continues to exist; meets that started under it remain bound to it. New meets created after the revision date use the revision.

**Effective dates**: a Pack declares `effectiveFrom` and optionally `effectiveUntil`. Operators creating a meet pick from Packs whose date range covers the meet's `date`.

**Multiple active Packs**: a federation may have multiple Packs effective simultaneously (e.g., transitioning seasons). Operator picks explicitly; if not picked, latest by `publishedAt` is default.

**Save-file binding**: when a meet is created, save-file embeds `{ rulesPackId, rulesPackVersion, rulesPackHash }`. Reading a save-file always uses the bound Pack — even years later, even if the Pack has been superseded.

## 6. Cryptographic signing

**Goal**: verify that a Pack truly came from the federation it claims, has not been tampered, and the federation's authority over its own rules is preserved.

**Algorithm**: Ed25519 (small keys, fast, broadly supported).

**Process** (publisher side):
1. Federation drafts Pack content
2. Serialize to **canonical CBOR** (deterministic byte representation)
3. Sign CBOR bytes with federation root key → 64-byte signature
4. Upload to Rules CDN: `pack.cbor`, `pack.json` (human-readable mirror), `signature.bin`, `manifest.json`

**Process** (client side):
1. Fetch `manifest.json` → extract `cborHash`, `signatureUrl`, `publisherKeyId`
2. Fetch `pack.cbor`, `signature.bin`
3. Resolve `publisherKeyId` to public key (from registry.json or trust store)
4. Verify signature: `ed25519_verify(publisherPubKey, pack.cbor, signature)` — must succeed
5. Hash check: SHA-256(pack.cbor) must match manifest.cborHash
6. Parse pack.cbor; compare against pack.json (paranoia check, optional)
7. Validate against JSON Schema (§4)
8. Cache verified Pack in IndexedDB

**Key custody**:
- Federation root keys generated in a **key ceremony** at federation onboarding
- Private key held by federation custody (not by Streetlifting OS)
- Public key registered in Streetlifting OS root trust store
- Top federations recommended HSM (YubiHSM, AWS CloudHSM) for private key storage
- Key rotation: new key issued, old key marked deprecated, all packs signed by old key remain valid until `effectiveUntil`

**Trust store** (`registry.json`):
```json
{
  "version": 1,
  "lastUpdated": "2026-04-26T12:00:00Z",
  "federations": [
    {
      "id": "isf",
      "displayName": { "ru": "ISF", "en": "International Streetlifting Federation" },
      "rootKeys": [
        {
          "keyId": "isf-root-2025",
          "publicKey": "base64-ed25519-pubkey",
          "issuedAt": "2025-01-01T00:00:00Z",
          "expiresAt": "2030-01-01T00:00:00Z",
          "revokedAt": null
        }
      ],
      "activePacks": ["isf-v5.1-2026", "isf-v5.2-2027"]
    },
    {
      "id": "wsf",
      "displayName": { "ru": "WSF", "en": "World Streetlifting Federation" },
      "rootKeys": [...],
      "activePacks": ["wsf-v3.0-2025"]
    }
    /* ... */
  ]
}
```

The registry itself is signed by the **Streetlifting OS platform key** (separate root-of-trust above federations). Client trusts the platform key; platform vouches for federation keys.

## 7. Publishing workflow

V3+ federation publishing portal (`publish.streetlifting.app`):

1. **Federation logs in** to portal (auth via JWT)
2. **Drafts Pack** in editor (forms-based JSON editor with Pack JSON Schema validation)
3. **Reviews** rendered Pack (preview pane shows what operators will see)
4. **Submits for internal review** (federation's own approval workflow — secretary, president, etc.)
5. **Signs** Pack with root key (signing happens client-side; private key never leaves custody)
6. **Publishes** — Pack uploaded to Rules CDN, registry.json updated
7. **Announcement** auto-pushed to operator clients; clients pick up new Pack at next sync

**Bootstrap onboarding** (V3 wave 1):
For ISF, WSF, НАП, FinalRep — the platform team manually drafts the first Pack with the federation's rule committee, then transfers ownership.

## 8. Discovery

**Client-side Pack discovery**:
1. On app start: fetch `registry.json` (small, ~10–50 KB); diff against cached version
2. New Packs appear → optionally auto-download (per user setting)
3. New Pack version of currently-used Pack: notify user, manual upgrade for in-progress meets

**Per-meet Pack selection**:
- Meet Setup screen: dropdown sources from `registry.activePacks` filtered by `competitionFormat` capability + `effectiveFrom/Until` covering meet date
- Operator picks; can't change after first nomination is added (Pack ID becomes immutable on the meet)

**Federation pack visibility**:
- Federations may declare a Pack as `private` (not in registry, only visible to operators with their federation_id)
- Default: public (any operator can use any federation's Pack — though only that federation can sanction meets under it)

## 9. Migration when Packs change

**Forward Pack version updates** (e.g., ISF v5.1 → ISF v5.2):
- New Pack published, `effectiveFrom: "2027-01-01"`
- Meets created on/after 2027-01-01 default to v5.2
- Meets created before 2027-01-01 stay on v5.1 (explicitly bound)
- Save-files dated 2026 always read with v5.1 (immutable binding)

**Pack revisions** (typo fix, errata):
- New Pack with revision suffix (`isf-v5.1-2026-r1`)
- registry.json updates: `isf-v5.1-2026` marked superseded, `isf-v5.1-2026-r1` becomes default for new meets
- In-progress meets: operator can opt to migrate (if revision is non-substantive — typo, label fix); else keep original
- Save-files always reference the version under which they were created

**Schema-version upgrade** (Pack-spec v1 → v2):
- Pack-spec v1 is forever-readable; clients support all schemaVersions they're built against
- Major schema upgrades (e.g., adding new sport like armlifting) bump Pack-spec version
- Old Packs signed under v1 schema continue to work; new Packs choose v1 or v2 at publish time

## 10. Validation rules

Client validates a Pack at download time:
1. **Schema**: matches Pack-spec JSON Schema (§4)
2. **Signature**: Ed25519 verify against publisher's registered root key
3. **Hash**: SHA-256(pack.cbor) == manifest.cborHash
4. **Dates**: `effectiveFrom` < `publishedAt`; `publishedAt` <= now
5. **Internal consistency**:
   - All `defaultFormulaPerDiscipline` keys exist in `disciplines`
   - All `formulas[].code` referenced in `defaultFormulaPerDiscipline` exist
   - `weightCategories` cover all sex × age combos referenced (no gaps)
   - `mastersMultipliers.bands` are non-overlapping, ascending
   - `attemptModel.{competitionFormat}` exists for each `competitionFormats[]`
6. **Sanity bounds**:
   - `judgeCount` ∈ {1, 3, 5}
   - `plateIncrement` > 0
   - `bodyweightPrecision` > 0
   - `attemptModel.classic.timerSec` ∈ [30, 600]

Validation failure → Pack rejected, not cached, error logged to user with reason.

## 11. ISF v5.1 as Pack — example skeleton

This is what `isf-v5.1-2026` looks like in practice (abbreviated):

```json
{
  "id": "isf-v5.1-2026",
  "schemaVersion": "1",
  "publisher": "isf",
  "publisherDisplayName": { "ru": "ISF", "en": "International Streetlifting Federation" },
  "version": "v5.1-2026",
  "effectiveFrom": "2025-08-01",
  "effectiveUntil": null,
  "publishedAt": "2026-04-26T12:00:00Z",
  "sports": ["streetlifting"],
  "competitionFormats": ["classic", "multirep"],
  "exercises": ["PU", "DI"],
  "disciplines": [/* 22 entries from D24 */],
  "weightCategories": [/* 19 entries from D28 */],
  "ageCategories": [/* 9 entries from D27, M5: 60–69, M6: 70+ */],
  "formulas": [
    { "code": "isf_points", "coefficientTable": [/* full table from streetlifting.ru/points */] },
    { "code": "result_x_coefficient", "multiplierTable": [/* from D3 */] }
  ],
  "defaultFormulaPerDiscipline": {
    "classic_2lift": "isf_points",
    "classic_pu": "isf_points",
    "classic_di": "isf_points",
    "multirep_2lift_8_12": "result_x_coefficient",
    /* ... all 22 disciplines */
  },
  "mastersMultipliers": {
    "bands": [
      { "minAge": 40, "maxAge": 44, "multiplier": 1.025 },
      { "minAge": 45, "maxAge": 49, "multiplier": 1.050 },
      { "minAge": 50, "maxAge": 54, "multiplier": 1.075 },
      { "minAge": 55, "maxAge": 59, "multiplier": 1.100 },
      { "minAge": 60, "maxAge": 69, "multiplier": 1.125 },
      { "minAge": 70, "maxAge": null, "multiplier": 1.150 }
    ]
  },
  "additionalPointsFormula": {
    "formula": "linear_above_threshold",
    "thresholds": [
      { "sex": "M", "event": "PU",   "limitKg": 90,  "multiplier": 0.5 },
      { "sex": "M", "event": "DI",   "limitKg": 100, "multiplier": 0.5 },
      { "sex": "M", "event": "PUDI", "limitKg": 95,  "multiplier": 0.5 },
      { "sex": "F", "event": "PU",   "limitKg": 55,  "multiplier": 0.5 },
      { "sex": "F", "event": "DI",   "limitKg": 65,  "multiplier": 0.5 },
      { "sex": "F", "event": "PUDI", "limitKg": 60,  "multiplier": 0.5 }
    ]
  },
  "attemptModel": {
    "classic":  { "sequenceCount": 3, "recordOnlySlot": 4, "timerSec": 60 },
    "multirep": { "sequenceCount": 1, "timerSec": 120 }
  },
  "tiebreakRules": {
    "placing": [
      { "kind": "lighter_bodyweight" },
      { "kind": "lighter_reweigh" },
      { "kind": "shared_place_next_vacant" }
    ],
    "draw": [
      { "kind": "lower_lot_number" },
      { "kind": "lighter_bodyweight" },
      { "kind": "earlier_declaration_time" }
    ]
  },
  "weightChangeRules": {
    "round1MaxChanges": 1,
    "round2MaxChanges": 0,
    "round3MaxChanges": 2,
    "minChangeNoticeSec": 300,
    "autoProgression": { "onSuccess": 2.5, "onFail": "repeat", "timeoutSec": 60 }
  },
  "judging": {
    "judgeCount": 3,
    "majorityRule": "simple",
    "splitDecisionAnnouncement": true
  },
  "plateSet": [/* ISF_V51_DEFAULT_PLATES_V2 from D25 */],
  "plateIncrement": 1.25,
  "bodyweightPrecision": 0.1,
  "bodyweightCategoryMatch": "upper_bound_inclusive",
  "recordsAuthority": {
    "issuesWorldRecords": true,
    "issuesContinentalRecords": true,
    "issuesNationalRecords": false,
    "recognizesRecordsFrom": []
  },
  "sanctioning": {
    "tiers": [
      { "name": "unsanctioned",  "recordsEligibility": [],            "fee": null },
      { "name": "national",      "recordsEligibility": ["national"],  "fee": { "currency": "USD", "amountCents": 5000 } },
      { "name": "international", "recordsEligibility": ["world"],     "fee": { "currency": "USD", "amountCents": 25000 } }
    ],
    "requiresMandateCommission": true,
    "requiresAntiDopingPlan": true,
    "minJudgeRankPerTier": {
      "unsanctioned": "regional",
      "national":     "national",
      "international": "international"
    }
  },
  "publisherKey": {
    "keyId": "isf-root-2025",
    "publicKey": "<base64-Ed25519-pubkey>",
    "issuedAt": "2025-01-01T00:00:00Z",
    "expiresAt": "2030-01-01T00:00:00Z"
  },
  "assets": {
    "logoUrl": "https://rules.streetlifting.app/packs/isf/v5.1-2026/assets/logo.svg",
    "rulesDocumentUrl": "https://rules.streetlifting.app/packs/isf/v5.1-2026/assets/ISF_Rules_v5.1.pdf",
    "websiteUrl": "https://streetlifting.ru",
    "supportContact": "info@isf-streetlifting.org"
  }
}
```

## 12. Federation specifics — preview

**WSF Pack** (V3 onboarding target):
- Likely shape similar to ISF but TBD per WSF rules. Key differences to research: judge count, formula choice (DOTS? Wilks? proprietary?), age categories (may differ from ISF M5/M6 split).

**НАП folk BP Pack** (V3 onboarding target):
- Different attempt model: single fixed-load, max-reps-to-failure
- Sport: not pure streetlifting; bench press only with multirep semantics
- Implication: may need a third `competitionFormat`: `"folk_bp"` or just reuse `"multirep"` with NAP-specific scoring
- TBD during onboarding

**FinalRep Pack** (V3 onboarding target):
- TBD — research needed during onboarding

**Important**: V1 and V2 do not need to support these. Pack abstraction is V2 work; non-ISF Packs are V3 work.

## 13. V1 implementation note

**Sprint 1 does not implement Pack loading**. Sprint 1 hardcodes ISF v5.1 in `src/domain/presets/`:
- `disciplines.ts` exports `ISF_V51_DISCIPLINES`
- `age-categories.ts` exports `ISF_V51_AGE_CATEGORIES`
- `weight-categories.ts` exports `ISF_V51_WEIGHT_CATEGORIES`
- `plates.ts` exports `ISF_V51_DEFAULT_PLATES_V2`
- `multirep-loads.ts` exports `ISF_V51_MULTIREP_PRESETS`

**Type system**: typed against `RulesPack` shape from this spec, even though instance is hardcoded.

**V2 Sprint 4 refactor** (mechanical):
1. Wrap all `ISF_V51_*` exports into a single `ISF_V51_PACK: RulesPack` constant
2. `MeetState.rulesPackId: RulesPackId` becomes a real reference (not implicit)
3. `ResultCalculator`, `IsfPointsService`, `ClassicOrderService`, `PlacingService` all gain `pack: RulesPack` parameter
4. Pack loader from Rules CDN (Layer 2) ships
5. ISF v5.1 Pack uploaded to Rules CDN
6. Client falls back to embedded `ISF_V51_PACK` if CDN unreachable

This refactor is mechanical and can be done in a single Sprint.

## 14. One-line summary

A Rules Pack is a versioned, signed, immutable JSON document declaring everything a federation needs to run sanctioned meets — categories, formulas, attempt models, equipment — published to a global CDN and pinned by save-files for permanent rule provenance.
