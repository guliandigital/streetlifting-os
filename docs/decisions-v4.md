# Decisions v4 — IPF/IWF research, governance baseline, anti-doping phasing

Date: 2026-04-26
Source: research session covering IPF + IWF as proven international-federation models; user alignment on realistic ISF maturity (private-clinic anti-doping today, IOC/ITA-grade later).
Anchors:
- [decisions-v1.md](decisions-v1.md) — D1–D12 (rules-engine closure)
- [decisions-v2.md](decisions-v2.md) — D13–D29 (PowerTable installed-client closure)
- [decisions-v3.md](decisions-v3.md) — D30–D40 (platform + multi-federation + sport scope)
- [competitor-federation-research-v1.md](competitor-federation-research-v1.md) — IPF + IWF research evidence base

This document records 5 governance + integration decisions (D41–D45) shaped by IPF/IWF experience and ISF's actual current scale.

## Reading guide

| ID | Title | Phase |
|---|---|---|
| D41 | IOC-grade governance baseline (Olympic-application deferred) | V1+ baseline; formal application V5+ |
| D42 | **Anti-doping: phased — private clinics now → ITA later** | Phase 1 (V1–V4) → Phase 2 (V5+) → Phase 3 (V6+) |
| D43 | OpenStreetlifting.org parallel community DB | V3 launch |
| D44 | Vendor partnerships (Goodlift, etc.) — deferred to V4+ | V4+ |
| D45 | Annual rule-pack version cadence | V2+ |

## D41 — IOC-grade governance baseline; Olympic application deferred

Source: IPF + IWF research. IPF/IWF established that IOC-grade governance is achievable without committing to a formal Olympic-application path. IWF's 2020–2022 reform under IOC pressure proved that **late retrofitting of governance is more expensive than building it in from day 1**.

Decision: Streetlifting OS is built to IOC-grade standards with V1, but ISF does NOT formally apply for IOC recognition until V5+. Specifically:

**Standards applied with V1:**
- Crypto-signed audit trail for every save-file (D38) — tamper-evident history
- Versioned RulesPack with publisher signature (D32) — rule-change accountability
- Three-tier judge certification (РК / НК / МК) display (V3 — D44 from decisions-v2)
- Annual rule version cadence with frozen Pack-per-meet (D45 below)
- Conflict-of-interest disclosure framework (V3+ admin dashboard)

**Standards deferred to V5+ (Olympic-grade):**
- Formal IOC GAISF/SportAccord membership application
- Independent governance audit (Big-4 firm)
- Term limits + elected board structure mandated in ISF bylaws
- ITA contract for sample collection (see D42 phasing)

**Cost impact**: ~$10–20k/year additional compliance overhead from V2 onwards (DPO consultancy, audit tooling). Not the $50–100k I quoted earlier — that was overcautious; IPF-tier compliance is sufficient for streetlifting's current scale.

**Marketing positioning**: «Built to IOC-grade governance standards» — used in federation-onboarding sales pitch. Differentiates Streetlifting OS from PowerTable (no audit trail, single-developer bus factor) and PowerGage (no signed save-files).

## D42 — Anti-doping: phased model (private clinics → ITA → WADA NADO)

Source: user input on actual ISF reality (small federation, anti-doping currently via private clinics not WADA/ITA) + IPF/IWF research showing anti-doping must be outsourced eventually but not at startup scale.

Decision: 3-phase anti-doping integration model.

### Phase 1 (V1–V4) — Federation-managed via private clinics

**Reality**: ISF and member federations currently use small private clinics for sample collection + analysis. No WADA accreditation, no ITA contract.

**Streetlifting OS role**: passive record-keeper. Operator manually enters test results from clinic reports.

**Data model** (Athlete entity, V2+):

```ts
type AntidopingTest = {
  id: string;
  athleteId: string;
  collectionDate: string;        // ISO 8601
  clinicName: string;             // free-text, e.g., "ООО Лаборатория Здоровье, Краснодар"
  clinicCountry: string;
  sampleId: string;               // clinic-issued reference
  result: "pending" | "negative" | "positive" | "TUE_approved" | "void";
  reportPdfRef?: string;          // R2 storage key for uploaded PDF
  enteredBy: string;              // operator user ID
  enteredAt: string;
  signature: string;              // Ed25519 signature of (athleteId + sampleId + result + enteredAt)
};

type AntidopingBan = {
  id: string;
  athleteId: string;
  startDate: string;
  endDate: string | null;          // null = permanent
  reason: string;                  // free-text, e.g., "Stanozolol detected, sample 2026-03-15"
  testRef?: string;                // optional FK to AntidopingTest
  appealStatus?: "none" | "pending" | "rejected" | "upheld";
};
```

Tamper evidence: Ed25519 signature of test record. Federation can't backdate or alter results without invalidating signature on next sync.

### Phase 2 (V5+) — ITA integration

**Trigger conditions** (any one):
- ISF reaches 10+ sanctioned-international meets per year
- ISF has 5+ active continental federations
- ISF board explicitly votes to upgrade

**Why ITA over WADA-direct**: ITA is independent (Lausanne, Switzerland), already serves IWF and 50+ small federations, removes ISF from data-controller status on health data. Cost: ~€30–80k/year + ~€500/sample collection. Affordable when ISF crosses threshold.

**Streetlifting OS integration**: ITA REST API for status checks. Federation continues to enter test records manually OR ITA pushes results via webhook. We add `provider: "private_clinic" | "ITA"` to AntidopingTest schema.

### Phase 3 (V6+) — WADA NADO integration option

For national federations that prefer their national NADO over ITA (e.g., РУСАДА для РФ, USADA для США, NADA для Германии): we support WADA's ADAMS API or per-NADO APIs. Federation chooses provider per meet.

### V1–V3 implementation impact

**No anti-doping module ships in V1–V2.** This is operationally simple: federations track samples via Excel + email today, and Streetlifting OS focusing on meet management doesn't disrupt that workflow.

**V3 ships Phase 1 module** (private-clinic record-keeping) when Athlete entity (D13) is split out — anti-doping fits naturally there.

**V4** stays Phase 1; Phase 2 trigger evaluation happens at end of V4.

## D43 — OpenStreetlifting.org parallel community database

Source: IPF research — OpenPowerlifting.org runs as community-driven, MIT-licensed public database. Aggregates 50+ federations, ~3M lifts. Independent of IPF, but PowerTable + Goodlift export to it. Drives mind-share for the sport (athletes search themselves there, not on federation websites).

Decision: launch `OpenStreetlifting.org` as an independent community project parallel to V3 public release of Streetlifting OS.

**Project structure**:
- Domain: `openstreetlifting.org` (registration TBD)
- Hosting: Cloudflare Pages (static site) + R2 (CSV ingestion + downloads). ~$0/year for first 5 years of growth.
- Tech: VitePress / Astro static site + ingestion-API (Cloudflare Worker)
- License: **MIT** for code, **CC-BY-SA 4.0** for data
- Governance: separate GitHub org `openstreetlifting`. **NOT a Streetlifting OS subsidiary.** Streetlifting OS sponsors hosting + ingestion API, but data and direction are community-controlled.
- Sources: ingest CSVs from Streetlifting OS, PowerTable, PowerGage exports, manual federation submissions, spreadsheets

**Strategic rationale**:
- Mind-share: athletes search themselves in public rankings = PR for the sport
- Federation-neutral: aggregates ISF + WSF + НАП + FinalRep + smaller — strengthens our D33 multi-federation positioning
- Open-data legitimacy: «Built on open data» message for athletes who distrust closed federation systems
- Cost: ~$0 for years; volunteer-driven model proven by OpenPowerlifting

**What Streetlifting OS contributes**:
- One-click export to OpenStreetlifting CSV format from V3
- Per-federation push API (when federation operator confirms publication consent)
- Athlete consent matrix (D37) controls whether their data flows to OpenStreetlifting

**What Streetlifting OS does NOT do**:
- Run OpenStreetlifting infrastructure long-term (volunteers do this)
- Decide editorial / curation policy
- Use OpenStreetlifting as commercial up-sell

This separation protects both: Streetlifting OS stays a paid commercial product, OpenStreetlifting stays a free community resource.

## D44 — Vendor partnerships deferred to V4+

Source: user input + IPF research showing established vendors (Goodlift) and federations (IPF) coexist via standard format compatibility, not formal partnerships.

Decision: NO partnerships with competing vendors (Goodlift, PowerTable, PowerGage) until V4+ when Streetlifting OS has:
- 3+ federations onboarded (ISF + 2 others)
- 12+ months production track record
- Clear traction signal

**V1–V3 strategy**: standard-format compatibility instead of partnerships.
- Export to OpenPowerlifting CSV (V2)
- Export to OpenStreetlifting CSV (V3)
- Export to allpowerlifting.com format (V3)
- Federation-specific export adapters (per blueprint v2 §6.7)
- Migration-friendly CSV import from PowerTable + PowerGage save-formats (V3)

This makes Streetlifting OS the **easiest software to migrate to** from any incumbent — federation moves their historical data via CSV import, no vendor lock-in.

**V4+ partnership target priority**:
1. **PowerGage** — most likely target. Already multi-federation, Russian-speaking, ISF-aware (id_range bands). Aging stack (Windows, Firebird) → migration path attractive. Possible acquisition target.
2. **Goodlift** — peer relationship via cross-federation rules-pack exchange. They serve IPF, we serve ISF; mutual import.
3. **PowerTable** — Тополь Д.Г. is single-developer, bus factor 1. Possible acquisition or graceful succession partnership when he wants to retire.

**No discussions with any vendor before V3 public launch**. Pre-launch we have nothing to offer; post-launch we negotiate as peers.

## D45 — Annual rule-pack version cadence (IPF/IWF model)

Source: IPF Annual General Assembly + IWF Annual Congress both update rules yearly. Mid-year errata possible. Save-files vintage'д to their Pack of issuance.

Decision: RulesPack versioning follows annual cadence.

- **Major version per year**: `isf-v5.1-2026`, `isf-v5.2-2027`, `isf-v6.0-2028`, ...
- **Effective date**: typically 1 January of issuing year, or 1 August (matching ISF v5.1 effective 2025-08-01)
- **Mid-year errata**: minor patches like `isf-v5.1-2026.1` for typo fixes / clarifications. Same major number, suffix increments.
- **Each Pack signed by ISF root key** (D38 chain-of-trust).
- **Save-files freeze Pack ID at meet creation**. Subsequent rule changes never alter past meets.
- **Pack discoverability**: `/packs/manifest.json` on Rules CDN lists all active + deprecated Packs with effective dates.

**Operator UX**:
- Meet creation defaults to latest active Pack
- Operator can pin meet to older Pack if competition regulations require (e.g., national federation runs 2025-rules meet in 2026)
- UI shows Pack ID in meet header; click → diff vs latest

**Other federations follow same cadence**. WSF, НАП, FinalRep each manage their own Pack series. Cross-federation events (when V5+ launches) negotiate which Pack governs.

## Sprint impact

| Sprint | New from D41–D45 |
|---|---|
| **Sprint 1** (current) | None — all V4+ work |
| **Sprint 2** | Audit-trail framework hooks in save-file format (D41 — Ed25519 signature stub field) |
| **Sprint 3** (Multirep) | None |
| **V2 (Sprint 4–6)** | Annual cadence support in RulesPack manifest (D45). Audit trail flesh-out (D41) |
| **V3** | OpenStreetlifting export (D43). Phase 1 anti-doping module (D42 Phase 1) |
| **V4** | Phase 2 anti-doping evaluation (D42). Vendor partnership discussions begin (D44) |
| **V5+** | ITA integration (D42 Phase 2). IOC application discussion (D41) |

## Open questions remaining (D40 carryover + new)

| # | Question | Status |
|---|---|---|
| D40.1 | Pricing tier | open |
| D40.2 | Trial model | open |
| D40.3 | Domain (`streetlifting.app` recommended) | open |
| D40.4 | Legal entity (Estonia OÜ + РФ ИП + Switzerland for ISF Central?) | open |
| D40.5 | ISF revenue split on sanctioning fees | open |
| D40.6 | WSF/FinalRep contacts | open |
| **NEW D40.9** | OpenStreetlifting.org legal vehicle (community org / non-profit / informal?) | open |
| **NEW D40.10** | Phase 2 trigger threshold for ITA — what KPIs? (10 events/year? 5 continentals?) | open |
| **NEW D40.11** | When does ISF start charging member federations? Annual fee like IPF ($1k–5k)? | open |

## One-line summary

Streetlifting OS commits to IOC-grade governance from V1 (audit trail, signed save-files, RulesPack versioning) but defers formal Olympic-application until V5+. Anti-doping starts as private-clinic record-keeping (Phase 1, V1–V4), upgrades to ITA when ISF reaches threshold scale (Phase 2, V5+), and adds national NADO integrations as opt-in (Phase 3, V6+). OpenStreetlifting.org launches in parallel as an independent community database. Vendor partnerships deferred until V4+ traction; standard-format compatibility is the V1–V3 strategy instead.
