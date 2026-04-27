# PowerTable — Findings v1 (outside-in pass)

Date: 2026-04-25
Method: outside-in observation via public web pages and the public API at `https://powertable.ru/`. No SaaS account, no client install, no insider documentation. All findings are evidenced by the URLs cited inline.
Reference role: PowerTable is a **competitive UX benchmark and the de-facto live system for ISF events in Russia**. We do not have access to its source, schema, or proprietary documentation. We use it to calibrate against current operator expectations.

## 1. Product overview

PowerTable is a SaaS-style competition-management platform for strength sports federations, with multi-platform native desktop clients backed by a cloud server.

- Platform stack: **1С:Enterprise v8.3.27.1989** thin-client (Russian ERP/business platform). Native binaries for Windows 32/64, macOS, Linux DEB/RPM (i386/x64). Source: homepage download links.
- Cloud server: HP ProLiant DL380 Gen9, dual Xeon, 128 GB RAM, RAID6 SSD, triple 100 Mbps + LTE backup. Source: homepage hardware spec.
- Mobile companions: native Android (ARM + Intel APK), iOS app (manual install), Opera APK for Android TV (set-top scoreboards). Source: homepage.
- Auxiliary: NetTime 3.14 time-sync recommended; OBS Studio + obs-command 1.6.3 plugin + "PowerTable Advanced Stream" tool for live broadcast pipelines. Source: homepage.
- Public API: documented at [/api.html](https://powertable.ru/api.html).
- Telegram bot: `@PowerTable_bot` for athlete/judge notifications, music upload, weight requests, photo updates.

There is **no offline mode**. Desktop clients connect to the cloud; if network is down, operations stop.

## 2. Federation coverage

PowerTable serves a wide federation set. Numeric internal codes recovered from [/api/hs/p/federation](https://powertable.ru/api/hs/p/federation) (event count after federation name; codes are PowerTable-internal, not shared with PowerGage):

| Code | Federation | Events |
|---|---|---|
| 0001 | IPF International Powerlifting Federation | 707 |
| 0002 | WPC World Powerlifting Congress | 235 |
| 0003 | НАП Национальная ассоциация пауэрлифтинга | 975 |
| **0010** | **ISF International Streetlifting Federation** | **102** |
| 0013 | СПР Союз пауэрлифтеров России | 376 |
| 0014 | IPL International Powerlifting League | 235 |
| 0019 | WRPF World RAW Powerlifting Federation | 717 |
| 0020 | WAF World Armlifting Federation | 273 |
| 0024 | WPF World Powerlifting Federation | 172 |
| 0035 | BBPF Biathlon Bench Press Federation | 241 |
| 0036 | WSF World Streetlifting Federation | 354 |
| 0044 | WAO World Armlifting Organization | 129 |
| 0049 | WPSO | 175 |

Implications:
- ISF is supported as a first-class federation in PowerTable, but it is not the most-used (НАП, WRPF, IPF, СПР dominate). ISF event volume (~102) is comparable to mid-tier powerlifting federations.
- WSF (World Streetlifting Federation, code 0036) co-exists with ISF (code 0010). Two streetlifting federations, distinct datasets.
- PowerTable's encoding `0010` for ISF is unrelated to PowerGage's `20041904+` band — these are independent classification schemes.

## 3. ISF on PowerTable — actual production layout

### 3.1 Verified ISF event

Open Russia Championship in Classical and Multirep Streetlifting, Moscow, 16–17.08.2025: 113 nominations (9 women, 104 men), 4 countries, 27 regions, 49 cities. URL: [/api/hs/p/sorev?nom=4093](https://powertable.ru/api/hs/p/sorev?nom=4093&lg=en). This is the largest ISF event in PowerTable for the 2024–2026 window.

### 3.2 Working protocol layout

Columns (verbatim from `/api/hs/p/wt?nom=4093&lg=en`):

```
Team | Class | Weight | P 1 | P 2 | P 3 | P(R)1 | Pull-up Classic | D 1 | D 2 | D 3 | D(R)1 | Dip Classic | RESULT | FORECAST | SUM | PL | COEF | ABS
```

Mapping:
- `P 1, P 2, P 3` — three Pull-Up classic attempts (declared loads).
- `P(R)1` — fourth pull-up attempt slot, used for **record certification only**. Same role as PowerGage's `bench4` + `oc11`. Confirms ISF-side: 4th attempt does not count toward total.
- `Pull-up Classic` — best successful PU.
- `D 1, D 2, D 3, D(R)1, Dip Classic` — symmetric for Dips.
- `RESULT` — current best total at the moment of viewing.
- `FORECAST` — projected total assuming declared upcoming attempts succeed. UX feature absent from PowerGage and OpenLifter.
- `SUM` — final total = `bestPU + bestDI`.
- `PL` — placement.
- `COEF` — ISF absolute coefficient.
- `ABS` — absolute points (= `COEF × SUM × mastersMultiplier`).

### 3.3 Categories shown

For this specific Moscow event:
- **Open**: ages 13–99
- **Juniors**: 18–22
- **Masters M1**: 40–44
- **Masters M2**: 45–49
- **Masters M3**: 50–54

Plus weight classes by gender. Categories visible at this event are a subset of the full ISF set in our blueprint §6.2 (`youth`, `junior`, `open`, `masters40plus`, `masters_m1..m6`).

### 3.4 Inference about PowerTable's domain model

Visible columns prove PowerTable models ISF Classic with a **dedicated three-attempt-plus-record column set** (no schema overload onto bench/DL slots like PowerGage). This is closer to our blueprint's clean schema than PowerGage's approach — though we cannot confirm whether PowerTable's underlying 1С object model is dedicated or overloaded internally.

Evidence summary:
- **3 attempts + 1 record slot** per exercise — consistent with blueprint §6.4 + future-proofing for ISF record validation.
- **`FORECAST` column** — UX value-add. Worth replicating in our judging screen as a "projected total" indicator.
- **No multirep columns** in this protocol view — meaning PowerTable likely uses a separate protocol layout for multirep events. We have no captured multirep protocol yet.

## 4. Feature surface (homepage + en page)

Capabilities advertised:

### 4.1 Operations

- Athlete, judge, and nomination registration.
- Configurable disciplines and exercises (federation-specific editor).
- Per-federation weight + age categories.
- Records management.
- Financial accounting.
- Stream + group (flight) distribution.
- Multi-platform (помост) operation: unlimited platforms, **one operator per platform**.
- Award ceremonies with music playback.
- Certificate and diploma printing.
- Multi-format report and protocol exports.

### 4.2 Online services

- Real-time live streaming with **automatic camera switching**.
- Online competitions with **remote judging**.
- Per-attempt athlete video recording.
- OBS Studio integration via the `obs-command` 1.6.3 plugin.
- "PowerTable Advanced Stream" companion app for broadcasters.
- Personal athlete pages with online registration.
- Wide selection of public scoreboard layouts viewable from any internet device.

### 4.3 Communications

Telegram bot capabilities:
- Auto-alerts to athletes and judges.
- Athlete music upload.
- Athlete weight-request submission (declared opener / next attempt).
- Photo updates.
- Weigh-in and stream notifications.

### 4.4 Mobile clients

- **Android**: judge controls, jury, weigh-in, rack-height measurement.
- **iOS**: judge controls, jury, weigh-in.
- **Opera APK** for Android TV / set-top boxes — used as scoreboard display.

### 4.5 API

From [/api.html](https://powertable.ru/api.html), authenticated by a per-user `sk` token:

| Endpoint | Purpose |
|---|---|
| `/api/hs/p/nomination?nom=ZZZ&json=true&sk=…` | Per-event nomination list, JSON |
| `/api/hs/p/nomination?nom=ZZZ&csv=true&code={ANSI,OEM,UTF8,UTF16}&sk=…` | Per-event nomination list, CSV with encoding choice |
| `/api/hs/p/schedule?nom=ZZZ&json=true&sk=…` | Event schedule |
| `/api/hs/p/nomination?sportsman=true&sk=…` | All federation athletes |
| `/api/hs/p/online?user=YYY&v=json_v2&pomost=N&sk=…` | Live platform feed during competition |
| `/api/hs/p/work_table?user=YYY&type=json&pomost=N&sk=…` | Working protocol |
| `…&type=json_wilks` | Sorted by Wilks |
| `…&type=json_result` | Sorted by result |
| `…&type=json_start` | Sorted by declared start weights |

Public (no token) endpoints used for discovery:
- `/api/hs/p/federation` — federation directory.
- `/api/hs/p/clubs` — club directory.
- `/api/hs/p/city` — city directory.
- `/api/hs/p/all_sorev?fed=NNNN` — events by federation.
- `/api/hs/p/sorev?nom=NNNN` — single event.
- `/api/hs/p/wt?nom=NNNN` — public live working protocol.
- `/api/hs/p/history` — change log.

Notable observations:
- **CSV encoding choice** (ANSI/OEM/UTF8/UTF16) shows PowerTable still serves Windows-1251 / DOS-866 consumers in production. UTF-8 is one of four options, not the only one.
- **Wilks-sorted, result-sorted, and declared-weight-sorted views are first-class** — work_table accepts a `type` parameter. Our blueprint should support these three sorts.
- **No registration / weigh-in write endpoints** are exposed in the public API surface. Read-only public API; writes happen through the 1С client.

## 5. Pricing model (CIS, 2025-09-01 → 2026-08-31)

From [/price](https://powertable.ru/price). Pay **per nomination** (per athlete-event entry, billed when the athlete actually competes). Two pricing tracks:

### 5.1 3-year prepaid packages

| Package | Total RUB | Per nomination |
|---|---:|---:|
| 100 nominations | 4,100 | 41 |
| 250 | 6,875 | 27.50 |
| 667 | 13,673.50 | 20.50 |
| 1,600 | 28,000 | 17.50 |

### 5.2 Annual usage tiers (pay as you go)

| Volume range | Per nomination |
|---|---:|
| 0–100 | 55 |
| 100–250 | 41 |
| 250–667 | 27.50 |
| 667–1,600 | 20.50 |
| 1,600+ | 17.50 |

Other:
- Other countries: USD 0.35–1.86 per nomination, 20% prepayment discount.
- Six-day grace period for negative balance, then suspension.
- "Full functionality + technical support" included; online stream coverage by separate agreement.
- Clients pay only for nominations that actually competed (not no-shows).

Implications for our positioning:
- ~17.50 RUB / nomination at scale = **the price ceiling our product must beat to disrupt**, factoring in offline operation and one-time licensing.
- Pay-per-nomination model presumes constant cloud connectivity. Our offline-first design is a different value proposition, not a direct price comparison.

## 6. Training and operator base

From [/training](https://powertable.ru/training):
- Self-study video tutorials on Rutube and YouTube.
- Audience: existing judges/secretaries learning PowerTable; judges transitioning to secretary or speaker-judge roles; athletes aspiring to officiate.
- Lead instructor: Irina Rode — international-category WPC judge, secretary, speaker-judge.
- No detailed curriculum on the page; lessons are video-only.

Implications:
- The PowerTable operator persona is a **certified judge or experienced secretary**, not a casual user. The product assumes operator competence.
- Our product can position for the same persona, or aim lower (volunteer-friendly UX). The blueprint's quiet, schema-first approach implies the latter.

## 7. What is worth borrowing

| Idea | Why | Where in our product |
|---|---|---|
| `FORECAST` column = projected total under remaining declared attempts | UX value during live judging | Add to blueprint §11.7 Results and §11.6 Judging — derive in `ResultCalculator` |
| Three sort modes for work-table (start weights / result / Wilks) | Operators flip these constantly during a meet | Already implicit in OpenLifter's lifting order; make explicit in our judging screen |
| One operator per platform | Sets the staffing floor | Already implicit in the blueprint's single-screen judging design |
| Public live protocol URL per event | Lets spectators view without an account | Out of scope for V1 (no cloud), but informs the export layer |
| `P(R)1` / `D(R)1` 4th-attempt slot reserved for records | Real ISF requirement | Add **future** field in `ClassicAttempt` or a sibling `recordAttempt` slot — V2 |
| CSV with explicit encoding choice (UTF-8 baseline) | Russian operators still consume ANSI/OEM | UTF-8-only in our product, document as deliberate decision |
| Telegram-bot side-channel | Real operator workflow uses this | Out of scope for V1, candidate for separate connector |
| Federation-customizable categories editor | Allows non-ISF federations to reuse | Out of scope; ISF only |
| Live online scoreboard as a separate render layer | Decouples judging from spectators | Out of scope for V1; matches PowerGage's `OnlineScoreTable.exe` pattern |

## 8. What is **not** worth borrowing

| PowerTable choice | Why we avoid it |
|---|---|
| 1С:Enterprise platform | Russia-only ecosystem, paid runtime per workstation, locks us out of browser/Tauri offline-first deployment |
| Mandatory cloud connectivity | Conflicts with our offline-first goal |
| Pay-per-nomination billing | Operationally complex; doesn't fit a one-time desktop client |
| Multi-federation breadth (13 federations) | We are ISF-only; breadth = schema overload (same lesson as PowerGage) |
| ANSI/OEM/UTF-16 CSV outputs | Legacy concession; we ship UTF-8 only |
| Public read-only API for everything except writes | Implies the writes still go through a proprietary 1С client; we ship a self-contained client |
| Auto camera switching, OBS plugin, video-per-attempt | Out of scope V1; complicates the offline product |

## 9. Comparison points to PowerGage

| Aspect | PowerGage | PowerTable |
|---|---|---|
| Deployment | Local Windows desktop, Firebird DB, optional client/server | SaaS + 1С:Enterprise thin client (Win/macOS/Linux) |
| Storage | Firebird stored procedures | 1С proprietary storage on cloud server |
| Offline | Yes (local DB) | No |
| ISF schema | Overloaded onto bench/DL columns | Dedicated PU/DI columns visible in protocol |
| 4th attempt | `bench4` + `oc11`, federation-gated | `P(R)1` / `D(R)1`, separate record slot |
| Mobile | None | Android, iOS, Android TV scoreboard |
| Live stream | Separate `OnlineScoreTable.exe` process + `OnlineScore.xml` | Built-in OBS plugin, auto-switch cameras, video-per-attempt |
| Notifications | None evidenced | Telegram bot integrated |
| Pricing | Closed (free tier "PG_Free" exists, paid tiers undocumented in our possession) | Pay-per-nomination, 17.50–55 RUB |
| Operator persona | Certified judge/secretary | Certified judge/secretary |
| Multi-federation | Yes (70+ id_range bands) | Yes (13 first-class federations) |
| Public live protocol URL | Yes (`OnlineScoreTable.exe` HTML output) | Yes (`/api/hs/p/wt?nom=…`) |
| Forecast / projected total | Not evidenced in `.proc` | Yes (`FORECAST` column) |

## 10. Risks and caveats

- All findings are based on **publicly visible** pages and the documented API. The actual desktop application, secretary screens, and judging client were not inspected.
- The 1С object model is opaque from the outside. Inference about "dedicated PU/DI columns" is from the rendered protocol only; the underlying schema may still overload powerlifting fields (we cannot tell).
- Pricing observed is a **CIS rate card**. Other-country pricing in USD is not the same product economics.
- The English `/en/` pages are partial translations; some details (e.g. Telegram bot specifics) appear only on the Russian homepage.
- We did not capture a multirep-format protocol. The Moscow Open is a combined classic+multirep event, but the working-protocol view we sampled showed only classic columns. A separate multirep protocol view likely exists; documenting it requires identifying its dispatcher parameter.

## 11. Open follow-ups

1. Capture a PowerTable multirep working protocol URL and document its column layout.
2. Capture a PowerTable final protocol page (compact) and contrast its column set with the working protocol.
3. Open one of the Yandex.Disk video tutorials referenced from `/training` and transcribe a secretary-flow lesson.
4. Inspect the public protocol JSON for an ISF event to recover the field schema (calls to `/api/hs/p/work_table?type=json` require an `sk` token, but the unauthenticated `/api/hs/p/wt?nom=…` HTML page is enough for column-level evidence).
5. Compare PowerTable's category editor (if a public demo exists) against our blueprint §6.2 / §6.3.
6. Cross-check: does PowerTable's `FORECAST` column factor in masters multipliers and ISF coef? If yes, our `ResultCalculator` must do the same.

## 12. One-line summary

PowerTable is the production Russian SaaS for ISF events on a 1С:Enterprise stack. Its three-attempts-plus-record column layout, `FORECAST` projection, and three sort modes are the most copy-worthy ideas. Its cloud-only deployment, pay-per-nomination economics, and 1С platform are exactly what an offline-first ISF client positions against.
