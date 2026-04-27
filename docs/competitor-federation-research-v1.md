# Competitor Federation Research v1 — IPF, IWF, WADA, ITA

Date: 2026-04-26
Purpose: reference document for ISF maturity roadmap and Streetlifting OS positioning. IPF and IWF are the two proven international-federation models in strength sports; WADA and ITA are the anti-doping standards bodies whose practices ISF will eventually follow.

This document informs decisions D33 (multi-federation positioning), D38 (sanctioning chain-of-trust), D41 (governance baseline), D42 (anti-doping phasing), D43 (OpenStreetlifting), D44 (vendor partnerships), and D45 (rule cadence).

## 1. International Powerlifting Federation (IPF)

### 1.1 Profile

| Attribute | Value |
|---|---|
| Founded | 1972 |
| HQ | Luxembourg |
| Member federations | ~100 national federations |
| Continental confederations | EPF (Europe), AsPF (Asia), NAPF (North America), AfPF (Africa), OPF (Oceania) |
| IOC recognition | NO. Recognized by GAISF (until 2022 dissolution); now SportAccord. IPF on Olympic-application path but not yet candidate. |
| Anti-doping | WADA-compliant since 2003. **Tested + Untested** divisions. WADA Code adoption mandatory. |
| Athlete count | ~30k licensed athletes globally |
| Major events | World Classic Championships, World Open Championships, Continental Championships |
| Annual budget | ~€1–2M (estimate from member fee × federations × tier) |

### 1.2 Governance structure

Four-layer hierarchy (IF → continental → national → club). National federations license IPF brand annually; pay ~$1k–5k/year tiered by member count. National federations license athletes; athletes never join IPF directly.

**Decision-making**:
- General Assembly annually — votes rule changes, board elections
- Executive Committee — between AGMs
- Technical Committee — rule interpretation, equipment cert
- Anti-Doping Committee — works with WADA NADOs

**Term limits**: introduced 2018, max 12 years on Executive Committee (to address governance criticism).

### 1.3 Anti-doping approach

- **WADA Code adoption**: mandatory for all member federations
- **Sample collection**: by national federation NADOs (РУСАДА, USADA, NADA, etc.) — NOT by IPF directly
- **Lab analysis**: WADA-accredited labs only
- **TUE management**: through national NADOs, with IPF Anti-Doping Committee oversight for international meets
- **Public registry**: IPF maintains public list of suspended athletes
- **Cost model**: each test ~$300–800 for athlete (or federation, depending on jurisdiction); federations charge anti-doping levy on athlete licenses

**Key learning for Streetlifting OS**: IPF outsources sample collection entirely. ISF should do same when it reaches WADA-eligibility scale.

### 1.4 Records authority

- World Records: certified by IPF Technical Committee
- Continental Records: certified by continental confederation
- National Records: certified by national federation
- **Strict criteria for record certification**:
  - 3 international (Cat 1) judges
  - WADA-accredited drug test within 24h
  - Certified equipment (Eleiko, Rogue, ER Equipment, ATX — approved-list)
  - Bodyweight verification < 24h before
  - Signed protocol from referee + technical secretary
  - Video evidence (mandatory since 2018)

### 1.5 Software approach — VENDOR MODEL

**Goodlift Liveapp** is a third-party private vendor handling IPF day-of-meet software:
- Runs at all major IPF events
- Live scoreboard streamed to spectators
- Historical results database
- Per-meet license fees (paid by federation)
- Owned and operated independently of IPF

IPF does NOT run its own meet software. This is the opposite of IWF's approach.

**Public results database**: OpenPowerlifting.org (volunteer-driven, MIT-licensed, independent).

**Lesson for Streetlifting OS**: position as Goodlift-equivalent for ISF. Vendor model proven at IPF scale. Keep OpenStreetlifting.org separate from us.

### 1.6 Equipment certification

Approved-list manufacturers: Eleiko (Sweden), Rogue (US), ER Equipment (US), ATX (Germany). Manufacturers pay annual certification fee + audit. Equipment list published on IPF website.

For meets to qualify for record certification, ALL equipment must be from approved list.

**Lesson**: equipment list lives in ISF central admin (V3+ Layer −1). Operator selects from list during meet setup. Streetlifting OS doesn't issue certificates.

### 1.7 Judge certification

- **Cat 2 (National)** — issued by national federation
- **Cat 1 (International)** — issued by IPF after passing exam at international event
- **Elite International** — top tier, by invitation
- Recertification every 4 years
- Activity log per judge (which meets they officiated)

**Lesson**: maps directly to PowerTable's РК / НК / МК scheme we already saw (powertable-findings-v4 §5.1). Three tiers is the established norm.

### 1.8 IPF schism — critical history lesson

**Timeline**:
- 1980s–90s: WPC (World Powerlifting Congress) splits from IPF over drug testing strictness
- 2000s: IPL, WPF, WRPF, NAP, SPF emerge as untested or semi-tested alternatives
- Today: ~10 active powerlifting federations globally, each with own rules + records

**Why**: athletes who failed drug tests, or wanted to lift heavier without testing, formed alternative federations. Federations use this as competitive lever (WPC: «no testing, lift whatever you want»).

**Result**: PowerGage hosts 70+ federation codes. Software vendors must be multi-federation to survive.

**Lesson for Streetlifting OS**: D33 (ISF-anchored multi-federation) is the only viable strategy. If we tied exclusively to ISF, a future schism would kill us. Hosting WSF + НАП + FinalRep + future-splinter-feds protects us.

## 2. International Weightlifting Federation (IWF)

### 2.1 Profile

| Attribute | Value |
|---|---|
| Founded | 1905 (one of oldest IFs) |
| HQ | Lausanne, Switzerland |
| Member federations | ~190 national |
| Continental confederations | EWF, AWF, OWF, PWF, WFA |
| IOC recognition | YES — Olympic discipline since 1896 (Athens) |
| Anti-doping | **ITA** (International Testing Agency) since 2019 — outsourced |
| Athlete count | ~50k licensed |
| Major events | Olympics, World Championships, Continental Championships |
| Annual budget | ~$10–15M (Olympic-tier funding) |

### 2.2 Governance crisis 2010–2022

This is **the most important case study** for ISF.

**Timeline**:
- 2008–2016: massive doping in Eastern Europe + Central Asia. Repeat offenders. IWF leadership implicated in cover-ups.
- 2017: IOC quota cuts for Tokyo 2020 (from 260 athletes to 196) due to doping.
- 2020: ARD documentary exposes IWF leadership corruption (Tamás Aján scandal).
- 2020: McLaren Independent Investigation report — IWF lost ~$10M, drug test cover-ups, vote-buying.
- 2020–2022: IWF mandatory governance reform under IOC threat to remove from Paris 2024.
- 2022: New constitution adopted, term limits, independent board, ITA contract for anti-doping.
- 2024: Successfully on Paris 2024 program. Olympic status preserved by reform.

**Lessons**:
1. **Late retrofitting of governance is existential**. IWF nearly lost the Olympics. ISF should adopt IOC-grade governance early, while small.
2. **Independent anti-doping is non-negotiable** at IOC scale. Federation-managed anti-doping = conflict of interest = doping cover-ups.
3. **Audit trail is critical**. Signed financial records, signed sample reports, signed sanctioning decisions — without these, accusations are impossible to defend against.

This drives D38 (cryptographic signing) and D41 (IOC-grade governance baseline).

### 2.3 Software approach — IN-HOUSE MODEL

**IWF Athletix** is IWF's in-house meet management software:
- Developed by IWF technical staff
- Used at Olympics + World Championships + Continental events
- Integrates with IWF athlete licensing system
- Closed-source, IWF-owned

**Trade-offs vs IPF/Goodlift vendor model**:

| Aspect | IPF (Goodlift vendor) | IWF (Athletix in-house) |
|---|---|---|
| Innovation pace | Fast (vendor incentive) | Slow (no competitive pressure) |
| Cost to federation | Per-meet license fees | Annual dev team salaries |
| IF dependency on vendor | High — vendor lockin | None |
| Vendor risk | Goodlift could fail / be acquired | None |
| Quality | Generally praised | Generally criticized as outdated |
| Multi-federation | No (Goodlift only does IPF) | No (Athletix only does IWF) |

**Lesson for Streetlifting OS**: vendor model (IPF/Goodlift pattern) wins long-term for innovation. **We are the Goodlift for ISF + multi-federation.**

### 2.4 Records authority

Same as IPF: world records by IF, continental by confederation, national by national federation.

Stricter equipment certification (Olympic standard) — Eleiko Olympic certified barbells mandatory at world events.

### 2.5 Membership fee structure

Tiered by national federation size:
- Tier 1 (large national feds, ~30 countries): $5–10k/year
- Tier 2 (medium, ~80 countries): $1–3k/year
- Tier 3 (small, ~80 countries): $500–1k/year

**Lesson for ISF**: similar tiering will be needed when ISF starts charging member federation dues (V4+, see D40.11 open question).

## 3. World Anti-Doping Agency (WADA)

### 3.1 Profile

| Attribute | Value |
|---|---|
| Founded | 1999 |
| HQ | Montréal, Canada |
| Funding | 50% IOC + 50% national governments |
| Standard | World Anti-Doping Code (WADC) — adopted by all Olympic IFs |
| Test labs | ~30 WADA-accredited labs globally |
| ADAMS database | Athlete biological passport; cross-federation accessible |

### 3.2 How WADA works for IFs

- WADA does NOT collect samples directly (that's NADOs and ITA)
- WADA sets standards (Prohibited List, lab criteria, code interpretation)
- WADA accredits labs and NADOs
- WADA runs ADAMS — the global anti-doping database
- WADA appeals to CAS (Court of Arbitration for Sport) for sanctions disputes

**Cost to IF for WADA-compliance**:
- WADA Code adoption — free
- WADA-accredited lab analysis: $300–800/sample
- ADAMS access: free for compliant IFs
- NADO sample collection: $200–500/sample

### 3.3 ISF + WADA path

D42 Phase 1 (current) doesn't involve WADA. Private clinics are not WADA-accredited; their results don't carry international weight.

D42 Phase 2 (V5+) adoption of WADA Code becomes mandatory if ISF wants international athlete eligibility. This unlocks:
- ADAMS database access (verify athlete is clean before international events)
- Cross-federation ban enforcement (IPF/IWF/ISF all see same ban data)
- IOC-eligibility precondition

## 4. International Testing Agency (ITA)

### 4.1 Profile

| Attribute | Value |
|---|---|
| Founded | 2018 |
| HQ | Lausanne, Switzerland |
| Funded by | IOC + IFs that contract with it |
| Mission | Independent anti-doping for IFs that don't run own programs |
| Clients | IWF, World Triathlon, World Curling, ~50 small IFs |

### 4.2 What ITA does

- Sample collection (in-competition + out-of-competition)
- Lab coordination (with WADA-accredited labs)
- Results management (TUE evaluation, sanctioning)
- Athlete biological passport monitoring
- Investigations (intelligence-driven targeting)

### 4.3 Cost to IF

- Annual retainer: ~€30–80k for small federations
- Per-sample collection: ~€500
- Per-lab analysis: ~€300–800

For ISF at V5+ scale (~10 international events/year × 30 samples = 300 samples × €1k = €300k/year + retainer): **~€350–400k/year**. Significant but affordable when ISF is collecting per-nomination fees from millions of nominations globally.

**Comparison vs WADA-direct**: WADA-direct is cheaper (no ITA retainer) but more administrative work for ISF (must manage TUEs, results, sanctions internally). ITA is the «turnkey anti-doping» option.

### 4.4 ISF + ITA timeline

D42 Phase 2 trigger conditions (any one):
- 10+ sanctioned-international meets per year
- 5+ active continental federations
- Board votes to upgrade

At current ISF scale neither trigger is hit. Realistic timeline: 5–8 years from V1 launch.

## 5. The four-way separation pattern

Both IPF and IWF demonstrate the **proven structural separation** that defines mature international sport:

```
┌──────────────────────────────────────────────────────────┐
│ LAYER A. RULES + RECORDS + SANCTIONING (IF central)      │
│   Owns rules, certifies records, approves meets,          │
│   certifies equipment + judges.                           │
│                                                            │
│   IPF: IPF HQ Luxembourg                                  │
│   IWF: IWF HQ Lausanne                                    │
│   ISF (target): ISF Central — Switzerland (V4+)           │
└──────────────────────────────────────────────────────────┘
                          ↓ delegates to
┌──────────────────────────────────────────────────────────┐
│ LAYER B. NATIONAL FEDERATION                             │
│   Athlete licensing, national records, regional cert,     │
│   national NADO partnership.                              │
│                                                            │
│   IPF: 100 national feds (USA Powerlifting, BPU, etc.)   │
│   IWF: 190 national feds                                  │
│   ISF: streetlifting.ru (RF), Polski Zw., etc.           │
└──────────────────────────────────────────────────────────┘
                          ↓ uses
┌──────────────────────────────────────────────────────────┐
│ LAYER C. SOFTWARE VENDOR                                 │
│   Day-of-meet UX, scoreboard, broadcast, save-files.     │
│   Per-meet OR subscription pricing.                       │
│                                                            │
│   IPF: Goodlift Liveapp (independent vendor)              │
│   IWF: IWF Athletix (in-house)                            │
│   ISF: ★ Streetlifting OS ★ (us — vendor model like IPF)  │
└──────────────────────────────────────────────────────────┘
                       ↕ integrates with
┌──────────────────────────────────────────────────────────┐
│ LAYER D. ANTI-DOPING (independent agency)                │
│   Sample collection, lab analysis, TUE, sanctions.       │
│   NEVER part of federation or software vendor.            │
│                                                            │
│   IPF: WADA + national NADOs                              │
│   IWF: ITA (since 2019)                                   │
│   ISF Phase 1 (V1–V4): private clinics + manual entry    │
│   ISF Phase 2 (V5+): ITA contract                        │
│   ISF Phase 3 (V6+): + national NADO opt-ins              │
└──────────────────────────────────────────────────────────┘
```

**Streetlifting OS = exclusively Layer C** with tight integration with A (sanctioning workflow, records sync) and optional B (national federation onboarding) and D (anti-doping API client). We never ARE A, B, or D.

## 6. Mapping IPF/IWF best practices to Streetlifting OS V1–V5

| Practice | IPF | IWF | Streetlifting OS phasing |
|---|---|---|---|
| Multi-federation host | (Goodlift only does IPF) | (Athletix only does IWF) | **D33: V1+ multi-fed by design** |
| Vendor vs in-house | Vendor (Goodlift) | In-house (Athletix) | **Vendor (us) — D33** |
| Rule version cadence | Annual GA | Annual Congress | **Annual — D45 (V2+)** |
| Audit trail / signed records | Manual paper trail | Manual paper trail | **Crypto-signed from V1 — D38** ⭐ |
| Anti-doping body | WADA NADOs | ITA | **Phased — D42** |
| Records DB | OpenPowerlifting (community) + IPF | IWF official | **Both — Streetlifting OS exports + OpenStreetlifting community DB — D43** |
| Equipment cert | Approved-list (Eleiko, Rogue, ER, ATX) | Olympic-cert (Eleiko Olympic) | **Approved-list — V3 admin (D43 from decisions-v2)** |
| Judge cert tiers | 3 (Cat 2 → Cat 1 → Elite) | 4 (Cat 4 → Cat 1) | **3 (РК / НК / МК) — display only — D44 from decisions-v2** |
| HQ jurisdiction | Luxembourg | Switzerland | **Switzerland — D40.4** |
| Olympic recognition | Pursuing | Achieved | **Deferred to V5+ — D41** |
| Athlete licensing | Through national fed | Through national fed + IWF | **Through national fed only — V3+** |
| Annual federation fee | $1k–5k tiered | $500–10k tiered | **TBD — D40.11 open** |

## 7. Actionable conclusions for Streetlifting OS

1. **Adopt vendor model (IPF/Goodlift pattern), not in-house (IWF/Athletix pattern).** This is already our positioning.

2. **Build IOC-grade governance scaffolding from V1**, defer formal Olympic-application to V5+. Reform-late is existentially expensive (IWF lesson).

3. **Anti-doping outsourced from day 1, just at appropriate tier**:
   - V1–V4: federation private clinics + manual entry, signed records (Phase 1)
   - V5+: ITA contract when ISF crosses scale (Phase 2)
   - V6+: optional national NADO integrations (Phase 3)
   - **Streetlifting OS NEVER stores raw health data.** Only references + status.

4. **Multi-federation positioning is non-negotiable** — IPF schism shows that any federation can fragment, and software vendors must serve the whole sport.

5. **OpenStreetlifting.org as parallel community DB** drives mind-share; IPF's OpenPowerlifting model proves it works.

6. **Standard-format compatibility (CSV, JSON exports) instead of vendor partnerships** until V4+. Migration-friendliness wins federations from incumbents.

7. **Annual rule cadence** with frozen Pack-per-meet provides historical correctness + audit defensibility. IPF + IWF both follow this.

8. **Switzerland for ISF Central jurisdiction** matches IWF + IOC precedent. Neutral, GDPR-aligned, prestigious.

## 8. Open questions for federation onboarding sales

For ISF when pitching to national federations to onboard:

1. «Are you currently WADA-compliant? If not, is upgrade on roadmap?» — determines D42 phase fit
2. «What anti-doping testing do you do today?» — private clinics? National NADO? Nothing?
3. «What software do current operators use?» — PowerTable? Spreadsheets? PowerGage?
4. «Do you have national records authority defined?» — affects records sync workflow
5. «Are you continental-affiliated?» — impacts onboarding chain
6. «Do you have judge certification scheme?» — РК/НК equivalent or none

These questions inform the federation onboarding playbook (D34 wave 1 → wave 4 sequencing).

## 9. One-line summary

IPF demonstrates that vendor-model software (Goodlift) + community-driven open data (OpenPowerlifting) + WADA anti-doping is the proven structural pattern for international strength sport. IWF's near-loss of Olympic status proves that federation-managed anti-doping and weak governance are existentially risky. Streetlifting OS positions as the Goodlift for ISF, sponsors OpenStreetlifting as a parallel community DB, and ships IOC-grade governance scaffolding from V1 with anti-doping phased from private clinics (Phase 1) to ITA (Phase 2) to NADO integrations (Phase 3) as ISF matures.
