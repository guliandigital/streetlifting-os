# Decisions v3 — platform architecture and governance

Date: 2026-04-26
Source: strategic alignment session covering pricing, central control, multi-federation positioning, and sport scope.
Anchors:
- [decisions-v1.md](decisions-v1.md) — D1–D12 (rules-engine closure)
- [decisions-v2.md](decisions-v2.md) — D13–D29 (PowerTable installed-client closure)
- [architecture-v1.md](architecture-v1.md) — full system architecture absorbing these decisions
- [rules-pack-spec-v1.md](rules-pack-spec-v1.md) — Rules Pack format spec

This document records 11 platform-level decisions (D30–D40) covering monetization, governance hierarchy, multi-federation positioning, and sport scope expansion. It supplements decisions-v1 and v2; does not supersede them.

## Reading order

| Group | Decisions | Effect |
|---|---|---|
| **Monetization** | D30, D31 | Backend becomes mandatory; offline-first preserved via pre-paid quota |
| **Governance** | D32, D33, D37, D38 | Multi-federation platform with ISF as anchor; cryptographic sanctioning |
| **Scope** | D34, D35, D36, D39 | Federation roster, sport scope, brand, type-system reservations |
| **Open** | D40 | Items still requiring user input |

## D30 — Pricing model: paid per-nomination, no free tier

Source: user direction, 2026-04-26.

Decision: Streetlifting OS is a paid product modeled on PowerTable's per-nomination billing. There is no free open-source or self-hostable tier. Federations buy quota; operators run meets against the quota.

**Pricing strategy** (recommendation, pending D40 confirmation):
- CIS / RU / BY / KZ / KG: $0.20–$0.60 per nomination (RUB 17–55), match PowerTable
- International: $0.40–$1.50 per nomination
- Volume discount tiers per federation (e.g., 10k+ nominations/year → −20%)
- Premium for sanctioned-international meets: +50%

**Trial model** (recommendation, pending D40):
- Free **test meets** — limited to 10 nominations, no records, no public protocol, watermark on exports
- **First-meet-free** — first paid meet for a new federation up to 30 nominations, after which standard rates apply
- No 30-day "trial" — instead, test meets are permanent

**Pricing implications**:
- Backend (Layer 0) is mandatory, not optional
- Client cannot operate without an initial license sync
- Federations cannot self-host the licensing layer (closed-source)
- Rules engine + client UI may be open-source under proprietary license (TBD per D40)

## D31 — Pre-paid quota mechanism (offline-first + paid)

Source: derived from D30 + D5 (offline-first).

Decision: client never makes blocking calls to the server during a meet. License + quota cached locally; time-bombed.

```
Phase 1: Pre-meet (online)
  Federation tops up balance via Stripe / YooKassa
  Operator clicks "Sync for meet" — client downloads:
    - License JWT (TTL 24–48 hours)
    - Quota allocation (e.g., 50 nominations, expires_at = now + 7 days)
    - Latest Rules Pack version (per D32)

Phase 2: Meet day (offline-OK)
  Client decrements local quota counter as nominations are added
  License JWT validity is checked at start; meet runs to completion regardless
  Audio cues, judging, save/load all 100% local

Phase 3: Post-meet (online)
  Save-file uploaded to Layer 3 (Save-File + Reconciliation)
  Server verifies signed save-file → reconciles billed nominations
  Federation balance debited; receipt issued
  Quota refilled if pre-paid plan
```

**Anti-abuse rules**:
- Same `(athlete, meet, discipline)` cannot be billed twice (server-side check on `nominationId` collision)
- License JWT refresh requires online sync; if client unsynced > 7 days, **NEW** nominations blocked but ongoing meets complete
- Quota expiration: unused quota expires at `expires_at` (typical 7–30 days)
- Refunds: per-nomination refund possible via federation account portal; bulk refund for cancelled meets

**Save-file fields added** (vs blueprint v2 §10):
```ts
SaveFile {
  // ...
  licenseTokenId: string;
  quotaAllocationId: string;
  billedNominationIds: string[];  // Filled by server post-reconciliation
  signature: { federationKeyId, sanctioningCert, ed25519Sig };  // per D38
}
```

## D32 — Multi-federation Rules Pack abstraction

Source: user direction, 2026-04-26 ("консолидировать все организации стритлифтинга...").

Decision: all federation-specific constants (presets, formulas, rules, equipment) extracted into a versioned, signed `RulesPack` entity. Each meet is bound to a specific RulesPack ID + version (immutable history). See [rules-pack-spec-v1.md](rules-pack-spec-v1.md) for the formal spec.

**V1 implementation**: ISF v5.1 hardcoded in `src/domain/presets/`, but typed as a Pack so V2 refactor is mechanical.

**V2 refactor**: extract Pack abstraction; ISF v5.1 becomes `isf-v5.1-2026` formal pack. Other federations plug in via the same interface.

**Why a Pack abstraction is the right design**:
- Federations have different attempt models, weight cats, age cats, formulas, equipment
- Save-files must be readable forever — Pack version pin freezes the rules used at that meet
- New federations can be onboarded **without code changes** — just publish their Pack
- ISF v5.1 → v5.2 → v6.0 → ... are different Packs; old meets read with their original Pack

Constants moved into `RulesPack` (full list in [rules-pack-spec-v1.md](rules-pack-spec-v1.md) §3):
- All ISF v5.1 presets (D24, D27, D28)
- Masters multipliers (D6, D26)
- Plate set + increment (D25)
- Attempt time limits (D10)
- Tiebreak rules (D2)
- Weight-change protocol (D9)
- Judge count (D15) — ISF=3, NAP=3, WSF likely 3, FinalRep TBD
- Scoring formulas (`isf_points`, `result_x_coefficient`, `dots`, `wilks`, `raw`, ...)
- Additional points formula (D7) — ISF only

Domain types **don't change** — only their fillers. Sprint 1 implements ISF v5.1 hardcoded; Sprint 4+ refactors to RulesPack abstraction.

## D33 — ISF-anchored positioning (variant B)

Source: user choice, 2026-04-26 (variant B from architecture proposal).

Decision: Streetlifting OS is a multi-federation platform with **ISF as anchor partner**. Other federations onboard as paying customers with isolated rules packs.

**ISF special rights**:
- Co-branding on platform: "Streetlifting OS — Official Platform of ISF"
- Revenue share on sanctioning fees (TBD per D40 — recommend 30% to ISF central)
- Privileged tier: discounted per-nomination rate; deluxe support; priority feature requests
- **Approval rights** on competitor federation onboarding (review, not veto — ISF can object, platform makes final call)
- Access to global activity dashboard (Layer −1) for ISF-sanctioned meets only
- Default rules pack pre-installed on first install (operators see ISF v5.1 as default choice)

**Other federations (WSF, НАП, FinalRep, smaller)**:
- Equal commercial terms (per-nomination + sanctioning fees)
- Their rules packs are isolated — neither ISF nor other federations can read
- Their save-files signed by their own federation key (cryptographically separate from ISF chain-of-trust)
- Optional cross-federation features (athlete passport sync per D37) require bilateral agreements

**Brand language**:
- Top of website: "Streetlifting OS — Official Platform of ISF & Partner Federations"
- Footer / legal: clarifies platform is independent (not owned by ISF)
- Per-federation branded views available (white-label option for major federations)

This is a **Stripe-model**: Streetlifting OS is independent infrastructure; ISF is the anchor partner like Visa was for Stripe. Both win.

## D34 — Federation onboarding roster

Source: user direction, 2026-04-26.

Decision: target federations for V3+ onboarding, ranked by priority.

| Wave | Federation | Status | Notes |
|---|---|---|---|
| **V1 baseline** | **ISF** (anchor) | confirmed | ISF v5.1 hardcoded in V1, formal Pack in V2 |
| **V3 wave 1** | **WSF** (World Streetlifting Federation) | target | Largest competitor by activity per PowerGage findings; rules pack research needed; estimated similar to ISF in shape |
| **V3 wave 1** | **НАП** (folk BP / народный жим) | target | Different attempt model: single fixed-load, max-reps-to-failure. Rules pack must support new attempt schema |
| **V3 wave 2** | **FinalRep** | target | Rules and scope to be researched; user-named federation |
| **V3 wave 3** | Smaller federations TBD | open | National federations: streetlifting.ru (RU national, separate from ISF), Polski Związek, Nederlandse, etc. To be identified during V2 |

**Onboarding workflow** (per federation, V3+):
1. Business agreement (revenue terms, sanctioning rights, data residency, trademark use)
2. Rules pack drafting — federation provides their rulebook; we transform into Pack JSON
3. Cryptographic key issuance — federation gets root signing key
4. Pack publishing on Rules CDN (Layer 2)
5. Federation account creation in Layer 0 (billing)
6. Pilot meet with the new federation
7. Public launch on platform

**Federations explicitly out of scope**: powerlifting-only federations (WPC, IPF, GPC) are **not** onboarding targets. PowerGage already serves that market on Windows. We focus on streetlifting + calisthenics (per D35).

## D35 — Sport scope: Streetlifting + Weighted Calisthenics

Source: user direction, 2026-04-26.

Decision: platform supports two sports:
- **Streetlifting** — V1 (Pull-Ups + Dips, Classic 3-attempt + Multirep timed)
- **Weighted Calisthenics (Силовая Калистеника)** — V2 launch (4-event tetrathlon: Muscle-Up + Pull-Ups + Dips + Barbell Squats per ISF v5.1 §2.3)

**Implications for V1 type system** (this is D39):
- `Exercise` enum **must include** `"MU"` and `"SQ"` from V1 types (no use yet, but reserved)
- `CompetitionFormat` enum **must include** `"weighted_calisthenics"` from V1 types
- WC has gendered defaults (female = Ring Muscle-Up, male = Bar Muscle-Up); model with sub-variants `"MU_BAR"` / `"MU_RING"` or with attempt-level `equipment` field

**WC-specific equipment** (V2 work):
- Squat rack (height adjustment, opener weight) — already partially modeled by PowerTable's "Высота стоек" tab
- Muscle-up bar (different from streetlifting bar)
- Rings (for female default Ring Muscle-Up)

**WC scoring** (V2 work):
- Tetrathlon: total = bestMU + bestPU + bestDI + bestSQ
- Records: 4-event records, not 2-lift
- ISF points formula applies; coefficients differ from streetlifting

**Reserved exclusions** (still out of scope, even with WC added):
- Powerlifting (full S/B/D)
- Bench-only / DL-only / Squat-only contests
- Armlifting (`armLift.sql` in PowerGage)
- OCR / strongman / other strength sports

## D36 — Brand: Streetlifting OS retained

Source: user choice, 2026-04-26.

Decision: brand "Streetlifting OS" retained despite multi-sport scope (calisthenics).

**Rationale**:
- Brand evokes the dominant sport (streetlifting)
- Calisthenics is adjacent enough that "Streetlifting OS supports calisthenics" reads naturally
- Avoids costly rebrand after V1
- "OS" suffix evokes infrastructure / platform positioning

**Tagline**: "The Operating System for Streetlifting and Calisthenics Federations" (English) / «Операционная система для федераций стритлифтинга и калистеники» (Russian).

**Brand assets needed before V2 launch**:
- Logo (TBD)
- Wordmark (TBD)
- Color palette: primary, secondary, neutrals
- Domain (TBD per D40 — recommendations: `streetlifting.app`, `streetliftingos.com`)
- Trademark registration: TBD per legal entity choice (D40)

## D37 — Cross-federation Athlete Passport (V3)

Source: derived from D33 + multi-federation reality.

Decision: introduce `GlobalAthleteIdentity` as platform-level athlete entity, with per-federation profiles attached.

```ts
type GlobalAthleteIdentity = {
  id: string;                   // "ATH-2026-000123456" — issued by Streetlifting OS platform
  fullName: { ru: string; en: string };
  birthDate: string;
  sex: "M" | "F";
  
  federationProfiles: {
    federationId: FederationId; // "isf", "wsf", "nap", ...
    externalId: string;          // federation's own ID, e.g., "ISF-2026-RU-000123"
    consent: ConsentLevel;       // controls what federation sees
    enrolledAt: string;
  }[];
  
  consentMatrix: Record<FederationId, {
    antidoping: boolean;
    bodyweightHistory: boolean;
    results: boolean;
    contactInfo: boolean;
  }>;
};
```

**Key properties**:
- Master ID issued by platform, not by any federation
- Each federation has its own ID for the athlete (continuity with their existing systems)
- Athlete consent matrix controls per-federation data flow
- Anti-doping disqualifications cross federations **only if** receiving federation has a recognition agreement with the disqualifying federation (bilateral, not automatic)

**Privacy**:
- Athletes can revoke consent per federation at any time
- Revocation → that federation no longer sees future updates (historical results immutable per D38)
- GDPR / ФЗ-152 compliance: athlete is data subject; platform is controller; federations are processors per agreement

**V3 launch**. Until then, V1/V2 athletes are scoped per save-file (no global identity).

## D38 — Sanctioning workflow with cryptographic signing

Source: user direction (ISF central control) + multi-federation generalization.

Decision: every meet declares its sanctioning federation. Sanctioning federation reviews + approves the meet, issuing a signing certificate. Save-files are signed end-to-end.

**Three sanction tiers**:

| Tier | Records eligibility | Sanctioning fee | Federation review |
|---|---|---|---|
| **Unsanctioned** | none | $0 | none — federation may flag for audit later |
| **Sanctioned national** | national records | small (~$50) | national federation reviews |
| **Sanctioned international** | world records (per federation's authority) | full (~$200–500) | federation HQ reviews |

**Sanctioning workflow**:
1. Federation operator creates meet with `status: draft`
2. Operator submits for sanctioning, declaring tier
3. Reviewer (national or HQ depending on tier) approves/rejects
4. On approve → server issues `SanctioningCertificate` (Ed25519-signed, includes meet ID + tier + federation key + expiry)
5. Operator runs meet; client embeds the cert in save-file
6. After meet: save-file is signed by operator key + sanctioning cert → uploaded
7. Server verifies both signatures; results extracted to records DB

**Cryptographic chain-of-trust**:
```
Streetlifting OS Platform Root Key (Ed25519)
   ↓ signs
Federation Root Keys (one per federation: ISF, WSF, NAP, FinalRep, ...)
   ↓ sign
Operator Keys (one per federation operator user)
   ↓ sign
Save-files with sanctioning cert
```

**Tamper evidence**:
- Edit save-file post-meet → operator signature invalid → audit-detectable on next sync
- Federation sees mismatch in audit dashboard

**Tech**: Ed25519 (Rust-native via Tauri; small keys, fast sign/verify), CBOR canonical serialization for the signed envelope.

## D39 — V1 type-system reservations for V2 sports scope

Source: derived from D35 (WC scope) — applies to blueprint v2 §6.1.

Decision: extend V1 type-system to reserve V2 expansion **before** Sprint 1 starts, to avoid breaking schema migration later.

```ts
// blueprint v2 §6.1 EXTENDED
export type CompetitionFormat = "classic" | "multirep" | "weighted_calisthenics";
//                                                       ^^^^^^^^^^^^^^^^^^^^^^^^ NEW per D35

export type Exercise = "PU" | "DI" | "MU_BAR" | "MU_RING" | "SQ";
//                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ NEW per D35
//                              MU_BAR = Bar Muscle-Up (male default + optional female)
//                              MU_RING = Ring Muscle-Up (female default per ISF v5.1 Glossary)
//                              SQ = Barbell Back Squat (WC tetrathlon 4th lift)

export type Event = "PU" | "DI" | "PUDI" | "MU" | "SQ" | "MUPDISQ";
//                                          ^^^^^^^^^^^^^^^^^^^^^ NEW per D35
//                                          MU = single muscle-up event
//                                          SQ = single squat event
//                                          MUPDISQ = WC tetrathlon (Muscle-Up + Pull-Ups + Dips + Squat)
```

V1 implementations (Sprint 1 result calculator, order, placing) handle **only** `"classic"` and `"multirep"`. V2 implementations add `"weighted_calisthenics"`.

V1 disciplines (per D24) use only `Exercise = "PU" | "DI"`. V2 introduces:
- `wc_muscleup_bar` — single MU bar
- `wc_muscleup_ring` — single MU ring (female default)
- `wc_squat` — single barbell squat
- `wc_tetrathlon` — full 4-event WC contest

Save-file format: V1 save-files embed the unused enum values; V2 save-files use them. No migration needed (additive).

## D40 — Open questions blocking V3+ launch

These items still require user input. Not blockers for Sprint 1; **must resolve before V2 backend work**.

| # | Question | Recommended default | User decision |
|---|---|---|---|
| 40.1 | **Pricing tier**: $0.20–0.60 (match PT) / $0.50–2.50 (premium) / other? | Match PT for CIS; +20% for international | TBD |
| 40.2 | **Trial model**: test meets ≤10 nom + first-meet-free / only test meets / no trial | Test meets + first-meet-free | TBD |
| 40.3 | **Domain**: `streetlifting.app` / `streetliftingos.com` / `streetlifting-os.io` / other | `streetlifting.app` | TBD |
| 40.4 | **Legal entity**: РФ ИП / РФ ООО / Estonia OÜ / US LLC / other | Estonia OÜ for global reach + RF ИП for RU billing | TBD |
| 40.5 | **Revenue split with ISF** (D33): % of sanctioning fees + per-nomination commission? | 30% of sanctioning fees to ISF; 0% per-nomination commission (separate streams) | TBD |
| 40.6 | **WSF / FinalRep contact**: do we have introductions, or cold outreach? | TBD — need user contacts | TBD |
| 40.7 | **Anti-doping integration scope**: WADA TUE/sample sync (V4) — yes/no? | Yes, V4 | TBD |
| 40.8 | **Federation publishing portal access**: open self-serve / invitation-only / hybrid | Invitation-only V3, self-serve V4 | TBD |

## Sprint 1 impact summary

**Sprint 1 scope changes from D30–D39**:

| Item | Change |
|---|---|
| Type system (blueprint v2 §6.1) | Extended per D39 — `Exercise` adds `"MU_BAR" | "MU_RING" | "SQ"`; `CompetitionFormat` adds `"weighted_calisthenics"`; `Event` adds `"MU" | "SQ" | "MUPDISQ"` |
| Discipline catalog (D24) | Unchanged — V1 disciplines use only PU + DI; WC reserved for V2 |
| ISF rules baseline | Unchanged — Sprint 1 implements ISF v5.1 hardcoded; Pack refactor is V2 work |
| Save-file format | Add stub fields per D31: `licenseTokenId`, `quotaAllocationId`, `billedNominationIds[]`, `signature` (filled in V2 with real backend integration; nullable in V1) |
| Sprint 1 backlog | Unchanged item count (10) — all 10 items still atomic and independent |

**No new Sprint 1 items added by D30–D39** — all backend, governance, and Pack-abstraction work is V2+. Sprint 1 remains GO with the type-system extensions absorbed.

## Updated phasing

| Version | Capabilities |
|---|---|
| **V1** (Sprints 1–3) | ISF v5.1 hardcoded, client-only, no backend, save-files local. Type-system reserved for WC + multi-federation. |
| **V2** (Sprint 4–6) | Backend launches: Layer 0 (billing) + Layer 3 (save-file backup + reconciliation). RulesPack abstraction extracted. Audio system (D18). Awards ceremony view (D19). OpenPowerlifting export. Federation onboarding portal (private, ISF-only). |
| **V3** (Sprint 7–9) | Multi-federation: WSF + НАП onboarding. Cross-federation Athlete Passport. Sanctioning workflow + crypto signing. Layer −1 (Federation Authority) launches. Broadcast publisher (Layer 4). |
| **V4** (Sprint 10+) | FinalRep + smaller federations. Audit & enforcement dashboard. Judge certification system. WC sport launches. WADA integration scope. |
| **V5** (post-V4) | Federated records (cross-federation recognition). Open publishing portal. Mobile companion app (if telemetry justifies). |

## One-line summary

Decisions v3 establish Streetlifting OS as a paid (per-nomination), ISF-anchored, multi-federation platform supporting streetlifting and weighted calisthenics, with offline-first preserved via pre-paid quota; type-system V1 reserves WC and MU/SQ exercises so V2 sport expansion is additive, not breaking.
