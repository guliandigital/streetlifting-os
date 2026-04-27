# Streetlifting OS — Architecture v1

Date: 2026-04-26
Status: design baseline for V1–V3.
Anchors:
- [decisions-v1.md](decisions-v1.md), [decisions-v2.md](decisions-v2.md), [decisions-v3.md](decisions-v3.md)
- [openlifter-isf-implementation-blueprint-v2.md](openlifter-isf-implementation-blueprint-v2.md) — domain model + Sprint 1 spec
- [rules-pack-spec-v1.md](rules-pack-spec-v1.md) — Rules Pack format

This document is the canonical system architecture for Streetlifting OS. It supersedes the brief architecture mention in blueprint v2 §3 and absorbs all decisions D5, D20–D23 (offline-first, broadcast publisher, share-link auth) and D30–D39 (paid model, multi-federation, sanctioning).

## 1. What we're building

Streetlifting OS is the **operating system for streetlifting and weighted-calisthenics federations** worldwide.

**Three lines of business**:
1. **Meet client** (paid, per-nomination) — the operator-facing application that runs tournaments
2. **Federation services** (paid, sanctioning fees) — sanctioning, records authority, audit, judge certification
3. **Athlete passport** (free for athletes; data flows controlled by federation agreements) — cross-federation identity

**Anchor partner**: ISF (International Streetlifting Federation). ISF v5.1 ships as the V1 default rules pack; ISF gets co-branding + revenue share on sanctioning fees; ISF central control over ISF-sanctioned meets only (per D33).

**Other federations welcome**: WSF, НАП, FinalRep, smaller national/regional bodies onboard as paying partners with isolated rules packs (per D34).

## 2. Foundational principles

| Principle | What it means | Decision anchor |
|---|---|---|
| **Offline-first on tournament day** | Client never makes blocking server calls during a meet. Network outage at the venue does not stop the meet. | D5, D31 |
| **Pre-paid quota model** | Federations pre-pay per-nomination quota; client decrements local counter offline; reconciliation post-meet | D30, D31 |
| **Multi-federation by design** | Rules Pack abstraction; no federation hardcoded into the codebase past V2; federations isolated cryptographically | D32 |
| **ISF-anchored, others as guests** | ISF gets privileged tier and co-branding; platform stays independent (Stripe model) | D33 |
| **Cryptographic chain-of-trust** | Save-files signed end-to-end; sanctioning embedded; tamper-evident | D38 |
| **Federation-aware data sovereignty** | Per-federation regional storage where law requires (RU ФЗ-152, EU GDPR); central anonymized pool for records | D33, D37 |
| **Open APIs, closed source** | Rules Pack format is open spec; client and platform code is proprietary commercial | D30, D32 |

## 3. Topology — six layers

```
                                                ┌─────────────────┐
                                                │ FEDERATION DATA │
                                                │   GOVERNANCE    │
                                                └─────────────────┘
                                                         ↑
                       ┌─────────────────────────────────┴──────────────────────────────┐
                       │  Layer −1. FEDERATION AUTHORITY  (V3+)                         │
                       │  • Sanctioning workflow      • Records authority               │
                       │  • Audit & enforcement       • Judge certification             │
                       │  • Live monitoring dashboard                                   │
                       │  Plural: ISF central, WSF central, NAP central, ...            │
                       └────────────────────────────────────┬───────────────────────────┘
                                                            │ delegates
                       ┌────────────────────────────────────┴───────────────────────────┐
                       │  Layer 0. ACCOUNT + BILLING  (V2)                              │
                       │  • Federation accounts        • Payment processing             │
                       │  • Operator users             • License JWT issuance           │
                       │  • Pre-paid quota allocation  • Reconciliation                 │
                       │  Cloudflare Workers + D1 + R2; Stripe + YooKassa               │
                       └────────────────────────────────────┬───────────────────────────┘
                                                            │ at app start, before meet
                       ┌────────────────────────────────────┴───────────────────────────┐
┌───────────────┐      │  Layer 1. CLIENT  (V1)                                         │
│ Operator      │ ◄───►│  • Tauri 2 desktop wrapper    • React 18 + TypeScript SPA      │
│ on tournament │      │  • IndexedDB working state    • JSON save-files via Tauri FS   │
│ floor         │      │  • License + quota cached     • Operates 100% offline          │
│               │      │  • Embeds latest pulled Rules Pack                             │
└───────────────┘      └──┬─────────────────────┬─────────────────────────┬─────────────┘
                          │ rules updates       │ post-meet sync          │ V3
                          ↓                     ↓                         ↓
                       ┌──────────┐    ┌──────────────────────┐    ┌──────────────────┐
                       │ Layer 2. │    │ Layer 3.             │    │ Layer 4.         │
                       │ RULES    │    │ SAVE-FILE +          │    │ BROADCAST        │
                       │ CDN      │    │ RECONCILIATION       │    │ PUBLISHER        │
                       │          │    │                      │    │                  │
                       │ Multi-   │    │ • Save-file storage  │    │ • Local HTTP     │
                       │ federa-  │    │ • Reconcile billing  │    │   server in Tauri│
                       │ tion     │    │ • Public protocols   │    │ • OBS chromakey  │
                       │ rules    │    │ • Federation views   │    │ • Judge remotes  │
                       │ packs    │    │ • Records extraction │    │ • Lower thirds   │
                       │          │    │                      │    │                  │
                       │ R2 + CF  │    │ R2 + D1 + Workers    │    │ axum (Rust)      │
                       │ Workers  │    │                      │    │ inside Tauri     │
                       └──────────┘    └──────────────────────┘    └──────────────────┘
```

**Working order on tournament day** (operator perspective):
1. Operator opens client (offline OK)
2. If license JWT still valid + quota remains: full functionality
3. Meet runs entirely on Layer 1; all input/output via local file system
4. After meet: operator clicks "Sync"; client uploads to Layer 3; backend reconciles billing; federation account debited

**Layers ordered by criticality**:
- Layer 1 must always work (tournament day)
- Layer 2 nice-to-have (auto-update of rules; client falls back to embedded version)
- Layer 0 mandatory before/after meet, never during
- Layer 3 mandatory post-meet (otherwise sanctioning + billing don't close)
- Layer −1 mandatory for sanctioned meets (V3+)
- Layer 4 nice-to-have (broadcast/streaming; meet runs without it)

## 4. Layer details

### 4.1 Layer 1 — Client

See [openlifter-isf-implementation-blueprint-v2.md](openlifter-isf-implementation-blueprint-v2.md) for full domain model, Sprint backlog, and code structure. Key tech-stack decisions:

| Concern | Choice | Rationale |
|---|---|---|
| Build | **Vite 5** | Fast dev loop, mature React tooling |
| Framework | **React 18 + TypeScript strict** | Largest ecosystem, AI-assist friendliness, type safety |
| State | **Redux Toolkit + RTK Query** | Time-travel debugging for judging; mirrors OpenLifter architecture |
| Router | **react-router v7** | PWA-friendly; standard |
| UI kit | **Mantine v7** | Out-of-box i18n (RU + EN), tables, forms, modals; bilingual on day 1 |
| Forms | **react-hook-form + zod** | RHF performance + zod runtime validation = save-file migration freebie |
| i18n | **react-i18next** | Lazy-load locale bundles per federation pack |
| Storage | **Dexie (IndexedDB wrapper)** | Save-files can include images and audio; localStorage too small |
| Tests | **Vitest + Playwright** | Vite-native; fast |
| Desktop wrapper | **Tauri 2** | ~10 MB binary vs Electron 100+ MB; Rust security; native auto-updater |
| PWA | **vite-plugin-pwa** | Service worker out-of-box for fallback install path |
| Crypto (sign/verify save-files) | **Tauri Rust → ed25519-dalek** | Native, fast, small keys |
| Charts (results visualization) | **visx** or **recharts** | TBD per Sprint 2 |

**Module map** (mirrors blueprint v2 §13):
```
src/
  app/                 # entry, routing, layout
  pages/               # one folder per route
  components/          # reusable UI: judge-vote-card, timer-display, bar-load-viz, ...
  store/               # Redux Toolkit slices
  domain/
    models/            # TS types from blueprint v2 §6
    presets/           # ISF v5.1 hardcoded presets (V1); RulesPack consumer (V2+)
  logic/               # pure rule services: result, points, order, placing, judge-votes, forecast
  persistence/
    save-file.ts       # JSON serialization, Tauri FS bindings
    migrations/        # state-version forward migration
    license-manager.ts # V2: quota check, JWT validation, sync queue
    crypto.ts          # V2: Ed25519 sign + verify
  translations/        # ru-RU.ts, en-US.ts (V1); locale bundles loader (V2+)
src-tauri/             # Rust side
  src/
    main.rs
    license.rs         # V2: secure license storage
    crypto.rs          # V2: signing
    publisher/         # V3: broadcast HTTP server (Layer 4)
```

### 4.2 Layer 2 — Multi-Federation Rules CDN

**Purpose**: deliver Rules Packs (per D32 + [rules-pack-spec-v1.md](rules-pack-spec-v1.md)) to clients on demand.

**URL structure**:
```
https://rules.streetlifting.app/packs/<publisher>/<version>/manifest.json
https://rules.streetlifting.app/packs/<publisher>/<version>/pack.json
https://rules.streetlifting.app/packs/<publisher>/<version>/locale-<lang>.json
https://rules.streetlifting.app/packs/<publisher>/<version>/signature.bin
https://rules.streetlifting.app/registry.json    # global pack catalog
```

**Examples** (V3 onwards):
- `/packs/isf/v5.1-2026/...`
- `/packs/wsf/v3.0-2025/...`
- `/packs/nap/folk-bp-v2-2024/...`
- `/packs/finalrep/v1-2025/...`

**Tech**: Cloudflare R2 (immutable JSON storage) + Cloudflare Workers (registry, signature verification, version diff).

**Cost**: free tier covers first ~10 GB egress + 100k req/day → enough for ~50 federations × 1000 clients each.

**Client behavior**:
- On app start: fetch `registry.json` (small, ~5 KB), check for updates
- If update available + Wi-Fi: pull new pack, verify signature, cache in IndexedDB
- If offline: use last cached version
- Pack version pinned per meet — once a meet starts with `isf-v5.1-2026`, it always reads with that version, even if v5.2 publishes

### 4.3 Layer 0 — Account + Billing

**Purpose**: federations top up balance, license JWTs are issued, quota allocations granted, post-meet reconciliation occurs.

**Stack**:
| Component | Tech | Cost (initial) |
|---|---|---|
| API runtime | Cloudflare Workers | $0 free tier |
| Database | Cloudflare D1 (SQLite at edge) | $0 free tier |
| Object storage | Cloudflare R2 | $0 free tier |
| Auth | JWT (HS256 for ops; ES256 for signed certs) | self-hosted |
| Email | Resend | $0–10/mo |
| Payment INTL | Stripe | 2.9% + $0.30/txn |
| Payment RU/CIS | YooKassa | 2.8%/txn |
| Payment EU (with VAT) | Paddle (Merchant of Record) | 5% + tax handling |
| Tax compliance | Paddle (EU), self for RU, accountant for others | varies |

**Schema (essential tables)**:
```sql
federations          (id, name, country, billing_currency, parent_org, root_key_pub)
users                (id, federation_id, email, role, locale, last_active_at)
meets                (id, federation_id, name, date, sanctioning_tier, status, rules_pack_id)
nominations          (id, meet_id, athlete_data_json, billed_at, billed_amount, currency)
balance_transactions (id, federation_id, type, amount_cents, currency, source, meta)
quota_allocations    (id, federation_id, meet_id, allocated_at, expires_at, used_count, max_count)
license_tokens       (id, federation_id, jwt_jti, issued_at, expires_at, revoked_at)
sanctioning_certs    (id, meet_id, federation_id, tier, issued_at, signature)
```

**API surface** (REST + JWT, all over HTTPS):
```
POST /v1/auth/login                    — operator login → JWT
POST /v1/balance/topup                 — federation top-up (Stripe / YooKassa redirect)
POST /v1/quota/allocate                — operator pulls quota for upcoming meet
POST /v1/license/refresh               — refresh JWT (min 7d before expiry)
POST /v1/meets/{id}/sanction-request   — submit meet for sanctioning
GET  /v1/meets/{id}/sanction-status    — check approval
POST /v1/savefiles/{meet-id}           — upload save-file (signed)
GET  /v1/savefiles/{meet-id}           — download
GET  /v1/balance                       — current balance
GET  /v1/transactions                  — billing history
GET  /v1/meets                         — federation's meets
```

**Critical constraint**: no API call from client during tournament day. License JWT and quota allocation are pulled the day BEFORE; full reconciliation is post-meet.

### 4.4 Layer 3 — Save-File + Reconciliation

**Purpose**: long-term storage of save-files; reconciliation of billing; extraction of records and rankings; per-federation analytics.

**Stack**: same Cloudflare Workers + D1 + R2 stack as Layer 0 (often merged at architecture level — could share Workers project).

**Save-file storage**:
- R2 bucket `savefiles-{federation-id}` per federation
- Path: `meets/{year}/{meet-id}/v{version}.json` (versioned in case of post-meet edits with proper authorization)
- Per-federation regional buckets where law requires (RU bucket in Russian datacenter; EU bucket in EU; etc.) — Cloudflare R2 supports jurisdictional locations or self-host fallback

**Reconciliation pipeline**:
1. Save-file uploaded with operator + sanctioning signatures
2. Worker verifies signatures
3. Counts billable nominations (deduplicated against `nominations.athlete_data_json` hash)
4. Inserts `nominations` rows with `billed_at: now()`, deducts from `balance_transactions`
5. If sanctioned tier: extracts results to `records` and `rankings` tables (V3 work)
6. Returns receipt to client

**Public protocols**:
- Per-meet public URL: `https://protocols.streetlifting.app/{federation}/{meet-id}` (read-only HTML)
- Federation can opt out (private meet) — set `meet.public = false`
- TBD: search by athlete, by federation, by date

### 4.5 Layer −1 — Federation Authority (V3+)

**Purpose**: per-federation control plane. Each federation runs its own instance for its sanctioning, records, audit, judge certification.

**Plural by design**: ISF Central, WSF Central, NAP Central, FinalRep Central are **separate** instances. They may share Cloudflare infrastructure but have isolated data, isolated keys, isolated dashboards.

**Per-federation capabilities** (each runs these for its scope):

| Capability | What it does | Implementation |
|---|---|---|
| **License tree** | Cascading suspend/revoke down hierarchy | DAG of license_tokens with parent_id |
| **Sanctioning workflow** | Approve/reject meets, issue certs | Worker queue + admin UI |
| **Records authority** | Maintain world/continental/national records DB | D1 table per record type |
| **Athlete passport** | Issue federation IDs, link to global identity | per-federation `athletes_local` table FK to global `athletes_global` |
| **Judge certification** | Track judge credentials, expiries | D1 + admin UI |
| **Anti-doping coordination** | Sample log, dq enforcement | D1 + bilateral-agreement registry |
| **Live monitoring** | Geographic map of active meets, escalation feed | WebSocket + Cloudflare Durable Objects |
| **Audit & enforcement** | Spot-check sample, sanctions tooling | Admin UI |

**ISF Central deluxe**:
- Co-branded with platform on top-of-mind UX
- Default rules pack pre-installed
- Full activity dashboard for ISF-sanctioned meets only
- Approval rights on competing federation onboarding

**Cross-federation interactions**:
- Athlete passport sync: bilateral agreements between federations declare what data flows
- Records recognition: federations may recognize each other's records (rare; world records are usually federation-scoped)
- No global authority over federation data; platform brokers, doesn't dictate

### 4.6 Layer 4 — Broadcast Publisher (V3+)

**Purpose**: serve OBS-friendly, projector-friendly, judge-remote views from inside the Tauri client. **Local server, no cloud dependency**.

**Tech**: Rust `axum` HTTP server bundled with Tauri. Reads from main app's shared state (Tauri command bridge or shared SQLite).

**Endpoint catalog** (mirrors PowerTable's 40+ views per [powertable-findings-v4.md](powertable-findings-v4.md) §12):
- Working table (default + chromakey + JSON)
- Lifting order (default + chromakey + compact)
- Athlete info (default + chromakey)
- Main scoreboard (with/without plate vis, with/without judge votes)
- Lower thirds (4 transition variants, all chromakey)
- Schedule (default + chromakey)
- Composite views (multi-pane for projectors)
- Judge remotes (left / center / right)
- OBS scene switcher (5 scenes: Main / Replay / Nomination / Table / Plan)
- Unique current-attempt ID (for replay sync)

**Auth**: per-meet share-link tokens (per D23). Generated by client, valid for the duration of the meet.

**Multi-platform meets**: composite layouts include "1+2" / "2+1" mirrored variants for two-platform meets.

## 5. Tech stack summary table

| Layer | Frontend | Backend | Storage | Crypto | Cost (V2 launch) |
|---|---|---|---|---|---|
| Layer 1 (client) | React 18 + Mantine v7 + Tauri 2 | — | IndexedDB + Tauri FS | ed25519-dalek | bundled in installer |
| Layer 2 (rules CDN) | — | Cloudflare Workers | R2 | Ed25519 verify | $0 |
| Layer 0 (billing) | React admin (separate app) | Cloudflare Workers | D1 + R2 | JWT + Ed25519 | ~$5/mo + Stripe fees |
| Layer 3 (save-files) | React federation portal | Cloudflare Workers | D1 + R2 | Ed25519 verify | ~$5/mo |
| Layer −1 (authority) | Per-federation admin app | Cloudflare Workers + Durable Objects | D1 per federation | Ed25519 sign chain | ~$10/mo per federation |
| Layer 4 (publisher) | Server-side Rust templates → HTML | Rust axum bundled in Tauri | — | — | bundled |

## 6. Distribution

**Per blueprint v2 + D33 (ISF anchor)**:

| Channel | Audience | Implementation |
|---|---|---|
| GitHub Releases | Tech-savvy federations, transparency | Tauri matrix: Win MSI / macOS DMG (signed) / Linux AppImage |
| Per-federation white-label installer | Major federations with branding | CI matrix parameterized by `FEDERATION_ID` → installer with pre-installed federation pack |
| PWA via `streetlifting.app` | Federations without admin rights | Browser-based fallback; federation pack loaded by subdomain |
| Auto-update (Tauri) | All desktop installs | Tauri's signed updater; pinning per federation possible |
| Future: Microsoft Store / Snap / Flathub | EU + RU compliance use-cases | V3+ |

**Federation onboarding** (V3+):
1. Business agreement signed (revenue split, sanctioning rights, trademark use, data residency)
2. Rules Pack drafted (federation rulebook → Pack JSON)
3. Federation root key issued (ceremonially, written to federation custody)
4. Pack published to Rules CDN (Layer 2)
5. Federation account provisioned in Layer 0
6. Federation Authority instance provisioned (Layer −1)
7. Pilot meet
8. Public launch on platform

## 7. Localization strategy

**V1 baseline**: ru-RU + en-US (per blueprint v2).

**V2 expansion** (federation-pack model per D33):
Each federation publishes a `federation-pack.json` bundle:
```json
{
  "federationId": "isf-poland",
  "displayName": "Polski Związek Streetliftingu",
  "displayNameEn": "Polish Streetlifting Federation",
  "defaultLocale": "pl-PL",
  "supportedLocales": ["pl-PL", "en-US"],
  "theme": { "primary": "#DC143C", "logoUrl": "..." },
  "rulesPackId": "isf-v5.1-2026",
  "supportContact": "kontakt@psf.pl",
  "websiteUrl": "psf.pl"
}
```

**Locale rollout waves** (priority by ISF activity per PowerTable findings):
- **Wave 1 (V2)**: ru-RU, en-US, pl-PL, uk-UA, be-BY, kk-KZ
- **Wave 2 (V2)**: de-DE, fr-FR, es-ES, it-IT, nl-NL
- **Wave 3 (V3)**: zh-Hans, ja-JP, ko-KR, ar-SA
- **Wave 4 (V3+)**: tr-TR, pt-PT, bg-BG, ro-RO, cs-CZ, sk-SK, hr-HR, sv-SE

**Translation infrastructure**: Crowdin or Weblate, federation-funded community translation. Streetlifting OS provides string keys; federations recruit native-speaker volunteers / contractors.

## 8. Data sovereignty

**Tension**: ISF wants global view; RU ФЗ-152 / CN data localization / EU GDPR demand local storage.

**Solution**: federated data model.

| Data class | Where it lives | Who can read |
|---|---|---|
| **Operational save-files** (full PII) | Federation's regional R2 bucket | Federation only + ISF Central with federation consent |
| **Sanctioned-meet metadata** (results, anonymized athlete IDs) | ISF central pool | ISF Central (read-only by other federations via API) |
| **Records DB** | ISF central + federation mirror | Public read |
| **Athlete passport** | Streetlifting OS platform (neutral jurisdiction) | Athlete + consented federations |
| **Anti-doping samples** | Federation's regional storage (high security) | Federation + WADA (per agreement) + bilateral cross-federation if athlete consents |

**Regional ISF instances** (V4+):
- ISF Russia: hosted in RU datacenter, full operational data; bilateral exchange to ISF Switzerland with anonymization
- ISF China: separate ISF China instance with bilateral exchange to ISF Switzerland
- ISF Switzerland (or wherever neutral): central archive

**For other federations**: each federation declares its data residency requirement on onboarding. Cloudflare R2 supports jurisdictional pinning; for federations needing self-host, we provide a Docker bundle (PostgreSQL + MinIO + Caddy).

## 9. Cross-federation interactions (V3+)

### 9.1 Athlete Passport sync

Per D37: athletes have a `GlobalAthleteIdentity` with per-federation profiles. Athletes consent to per-federation data flow.

**Bilateral recognition**:
- Two federations declare a recognition agreement: "ISF and WSF mutually recognize anti-doping disqualifications"
- Effect: when an athlete is DQ'd in ISF, the WSF Federation Authority receives a sanctioned event and applies the same DQ window
- Granular: federations can recognize specific things (DQ but not records; results sync but not DQ)

### 9.2 Federated records (V5)

Most "world records" are federation-scoped (ISF World Record vs WSF World Record — different rules → different records).

In rare cases, multiple federations co-sanction a meet and recognize each other's records there. Platform supports declaring such meets at sanction time.

### 9.3 Multi-federation athletes

Same athlete competes in ISF + WSF + national federation. Each federation has its own ID; passport ties them together.

When operator registers an athlete for a meet:
- Search by name → suggest matching `GlobalAthleteIdentity` candidates
- If match: link nomination to athlete; pull bodyweight history if consented
- If no match: create new Identity at platform level

## 10. Phasing — what ships when

| Version | Layer 1 | Layer 2 | Layer 0 | Layer 3 | Layer −1 | Layer 4 |
|---|---|---|---|---|---|---|
| **V1** (Sprints 1–3) | ✓ ISF v5.1 hardcoded | (embedded only, no fetch) | — | — | — | — |
| **V2** (Sprints 4–6) | ✓ Pack consumer | ✓ ISF Pack only | ✓ launch | ✓ launch | — | — |
| **V3** (Sprints 7–9) | ✓ multi-pack | ✓ WSF + НАП Packs | ✓ multi-fed | ✓ records extraction | ✓ ISF Central + WSF Central | ✓ launch |
| **V4** (Sprints 10–12) | ✓ WC sport | ✓ FinalRep + smaller | ✓ WC billing | ✓ WC records | ✓ all federations | ✓ enhanced |
| **V5** | ✓ mature | open publishing portal | mature | federated records | mature | mobile companion (if telemetry justifies) |

## 11. Out of scope explicitly

| Feature | Why out |
|---|---|
| Free / open-source tier | Per D30 — paid only |
| Self-hosted federation instance for billing | Closed-source backend |
| Powerlifting-only meets (S/B/D) | PowerGage already serves this; out of platform focus |
| Armlifting / OCR / strongman | Adjacent sports, not in V1–V5 scope (per D35) |
| Athlete personal portal with online registration | Out of platform — federations may build their own using our APIs |
| Telegram bot integration (PowerTable parity) | Out — heavy maintenance burden, low-margin feature |
| Live online cloud sync of working state during meet | Anti-pattern — would break offline-first guarantee (D5) |
| Mobile native apps | Deferred indefinitely; PWA + URL-judge-remotes cover 95% of use cases (per D23 + V3 scope) |
| Federation CRM / ERP / accounting | Out — federations use external accounting; we provide invoicing data via API |
| White-label native apps for individual federations | Possible at high price tier; not planned for V1–V4 |

## 12. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| ISF rejects platform endorsement | Medium | Blocks ISF-anchor positioning | Engage ISF leadership early; co-design Pack format with their rule committee |
| WSF / FinalRep refuse onboarding (loyal to PowerTable) | Medium | Slows V3+ federation rollout | Lead with offline + correctness story; provide free pilot meet |
| Cloudflare outage on tournament day | Low | Operator panics | Doesn't matter — client offline-first; only top-up + sync impacted |
| Stripe/YooKassa account suspended (sanctions, fraud chargebacks) | Medium | Federations can't pay | Maintain dual payment processors; fallback to invoicing for B2B |
| Federation root key compromised | Low | Tampered save-files indistinguishable | Key rotation procedure; key custody policy; HSM for top federations |
| EU GDPR enforcement action | Medium | Fines + brand damage | Paddle as Merchant of Record (handles tax + GDPR DPA); audit trail in Layer −1 |
| Open-source clone (someone reimplements client) | High | Erodes per-nomination revenue | Defensible only via federation contracts (sanctioning, records) — clone has no chain-of-trust legitimacy |
| Multi-federation politics (federation A demands we drop federation B) | Medium | Operational headache | D33 anchor model: ISF has approval rights; other federations don't get vetos; documented platform-neutrality stance |

## 13. Success metrics

**Year 1 (V1 + V2)**:
- 1 federation live (ISF) with at least 5 federation operator users
- 50+ meets ran on platform (ISF only)
- 5,000+ paid nominations
- $5,000–25,000 GMV

**Year 2 (V3)**:
- 4 federations live (ISF, WSF, НАП, FinalRep)
- 200+ meets ran
- 25,000+ paid nominations
- 5+ countries
- $50,000–200,000 GMV

**Year 3 (V4 + V5)**:
- 15+ federations live
- 1,000+ meets ran
- 200,000+ paid nominations
- 20+ countries
- $500,000–2,000,000 GMV
- WC sport launches; first WC world records issued via platform

## 14. Decision references

- D5 — offline-first
- D15 — 3-judge majority
- D24 — discipline catalog (V1)
- D27, D28 — preset categories (V1)
- D30 — paid model
- D31 — pre-paid quota
- D32 — Rules Pack abstraction
- D33 — ISF-anchored positioning
- D34 — federation roster
- D35 — sport scope (streetlifting + WC)
- D36 — brand retention
- D37 — Athlete Passport
- D38 — sanctioning + crypto
- D39 — V1 type-system reservations
- D40 — open questions

## 15. One-line summary

Streetlifting OS is a six-layer paid platform: offline-first Tauri client (V1), multi-federation Rules CDN + per-nomination billing + save-file backend (V2), per-federation authority + cross-federation athlete passport + local broadcast publisher (V3), Weighted Calisthenics sport + smaller federations (V4), federated records + open publishing portal (V5).
