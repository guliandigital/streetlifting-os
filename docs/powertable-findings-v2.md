# PowerTable — Findings v2 (deep web dive)

Date: 2026-04-25
Method: deep crawl of every public-facing endpoint at `https://powertable.ru/`, extraction of XLSX-format protocol artifacts, and reconstruction of the application data model from rendered output.
Status: **supersedes [powertable-findings-v1.md](powertable-findings-v1.md) on overlapping sections**. v1 remains valid as an outside-in light pass.

The next phase will be the installed-client phase, when the user installs the 1С:Enterprise thin client locally. This document is the briefing for that phase: it lists what we already know, what we cannot know without the client, and what to capture once it is running.

## 1. Legal and business shape

Verified at [/contacts](https://powertable.ru/contacts) and [/public.html](https://powertable.ru/public.html):

- **Legal form**: «Самозанятый Тополь Дмитрий Геннадьевич» (self-employed individual, not a registered legal entity, not an LLC).
- **ИНН**: 615007310099 (Rostov region tax ID; +7 928 area code on the founder's phone matches).
- **Founder/owner/sole operator**: Дмитрий Тополь.
- Direct channels: `+7 928 149 8358`, `td2001@yandex.ru`, `t.me/dtopol`, `vk.com/powertable`.
- Service classification: «информационные услуги» (information services).
- Refund policy: bank transfer only when paid amount exceeds services rendered. No e-money refunds.
- SLA: none. Provider commits to «разумные усилия» (reasonable efforts).
- Data retention: up to 6 years.
- Hosting: not disclosed in the public offer.
- On-prem option: explicitly absent.

Implication: PowerTable, despite serving 4,889 cumulative competitions across 13 federations and 9 countries, is a **bus factor of 1**. Federations choosing it accept that risk implicitly. This is a positioning lever for our product — not a price one.

## 2. Catalog scale (verified counters)

From `/api/hs/p/city` and `/api/hs/p/clubs`:

| Counter | Value |
|---|---:|
| Cumulative competitions in PowerTable | **4,889** |
| Countries covered | 9 (RU, BY, KZ, KG, MD, ES, UK, HU, CN) |
| Russian cities listed | 130+ |
| Top city by event volume | Москва (24) |
| Тор-3 cities | Москва (24), Санкт-Петербург (21), Долгопрудный (17) |
| Public clubs | ~14 |
| Top clubs | "PT 1 PowerTable 1" (22), "PT 2 PowerTable 2" (12) |

The "PT 1 / PT 2" clubs being top suggests PowerTable runs **internal demo competitions** on its own infrastructure — useful baseline for trial users.

## 3. Change log analysis (`/api/hs/p/history`)

The system has a public release journal published in 2024-03 with daily Telegram notifications. Highlights from the last ~24 months:

### 2026

| Date | Change |
|---|---|
| 2026-04-09 | Stabilized "operator scoreboard v2"; fixed table jumping on updates |
| 2026-04-08 | Added absolute-championship data to medal calculations |
| 2026-03-31 | Display calculation status during recalculation |
| 2026-03-26 | **Separated athlete name fields (surname / first name / patronymic)** |
| 2026-03-11 | Fixed scoreboard v2 exit sequence bug |
| 2026-03-02 | Per-discipline absolute championship calculation settings |
| 2026-02-27 | Configurable points for absolute championship by discipline |
| 2026-02-13 | Added "SPAM" button for reporting fraudulent registrations |
| 2026-02-03 | Warehouse inventory management module |

### 2025

| Date | Change |
|---|---|
| 2025-11-21 | **Launched operator scoreboard v2** with asynchronous updates |
| 2025-11-18 | Warnings when recalculation already active |
| 2025-11-07 | Automatic IP whitelisting |
| 2025-08-29 | Bilingual online certificate printing |
| 2025-01-28 | DOTS formula support for absolute |
| 2025-01-20 | Document upload (anti-doping certificates, insurance) |

### 2024

| Date | Change |
|---|---|
| 2024-08-28 | **Launched Telegram bot** `@PowerTable_bot` |
| 2024-07-24 | Self-service participant certificate generation |
| 2024-06-19 | Telegram notification on tournament recalculation |
| 2024-06-04 | File upload size limits (photos/banners < 1 MB; music < 8 MB) |
| 2024-03-28 | Public change journal launched with daily Telegram notifications |

### Architectural inferences from the change log

- Until **2026-03-26**, athlete names were stored as a **single string field** (no surname/first/patronymic split). For ~7 years of operation. Critical data-quality lesson for our schema: split from day 0.
- Scoreboard v2 (Nov 2025 → April 2026) shows the **operator scoreboard was the largest pain point**, requiring a five-month stabilization arc with multiple bug fixes.
- Telegram bot is recent (Aug 2024). Most of PowerTable's history (2019–2024) operated without push-notification side-channels.
- Anti-fraud "SPAM" button (Feb 2026) implies a problem with bogus public-form registrations that must be moderated.
- Warehouse inventory module (Feb 2026) suggests federation-side stock management for plates/equipment — far outside our V1 scope.
- Document upload (Jan 2025) means the system now stores anti-doping certs and sports insurance. Privacy policy at [/privacy_policy.html](https://powertable.ru/privacy_policy.html) explicitly enumerates these fields.

## 4. Final compact protocol — verbatim structure

Source artifact: `/api/hs/p/report?cm=4093&rep=compact` returns an `application/xlsx` (49 KB) with `sharedStrings.xml` containing 515 strings. Extracted contents are in `C:\Users\arara\AppData\Local\Temp\pt_compact_strings.txt`. The event is the Moscow Open Russia Championship 16–17.08.2025, 113 nominations.

### 4.1 Header block

```
16-17.08.2025 – Открытый Чемпионат России по классическому и многоповторному стритлифтингу. г. Москва
16 августа - 17 августа 2025 г.
Москва
```

### 4.2 Section heading per discipline

Each discipline gets its own section. Headings observed in this single event:

- `Классический стритлифтинг (двоеборье)`
- `Классическое отжимание на брусьях` (Classic Dip Single-Lift)
- `Классическое подтягивание` (Classic Pull-Up Single-Lift)
- `Многоповторный стритлифтинг 8/16 (total)` (Multirep 2-Lift Sub-Juniors)
- `Многоповторный стритлифтинг 16/24 (total)` (Multirep 2-Lift Juniors & Masters)
- `Многоповторный стритлифтинг 24/32 (total)` (Multirep 2-Lift Amateur Open Men)
- `Многоповторный стритлифтинг 32/48 (total)` (Multirep 2-Lift Pro Men)
- `Подтягивания с 8 kg` (Multirep PU Single-Lift, Sub-Juniors)
- `Подтягивания с 16 kg`
- `Подтягивания с 24 kg`
- `Подтягивания с 32 kg`
- `Отжимания с 24 kg` (Multirep Dip Single-Lift)
- `Отжимания с 32 kg`
- `Отжимания с 48 kg`

After each discipline section: `Абсолютные победители (<discipline name>)` — absolute winners across all categories of that discipline.

After all disciplines: `Тренеры (ИТОГОВОЕ ПЕРВЕНСТВО ТРЕНЕРОВ)` — coaches' overall standings.

Footer:
```
Главный судья соревнований
Ванцев Дмитрий Сергеевич , Омск
Главный секретарь соревнований
Денисова Татьяна Игоревна  , Омск
```

### 4.3 Classic protocol column row (verbatim, in document order)

```
№ | Возрастная | Команда | Рожд | ВК | Вес |
П1 | П2 | П3 | П4(R) | Подтягивания классические |
О1 | О2 | О3 | О4(R) | Отжимания классические |
Сумма | Разряд | Коэф | Абс | Очки | Тренер
```

Glossary:
- `Возрастная` — age category (Open, Juniors(18-22), Sub-Juniors(13-17), Masters M1(40-44), M2(45-49), M3(50-54), M5)
- `Команда` — team or `Личник, <city>` for individual entry
- `Рожд` — birth date / age (`DD.MM.YYYY/AA` format)
- `ВК` — weight category (e.g. `52 kg`, `67.5 kg`, `82.5 kg`, `125 kg`)
- `Вес` — bodyweight (decimal with comma)
- `П1..П3` — Pull-Up declared/successful weights
- `П4(R)` — Pull-Up 4th attempt (record only)
- `Подтягивания классические` — best PU
- `О1..О3 + О4(R) + Отжимания классические` — symmetric for Dips
- `Сумма` — total = best PU + best Dip
- `Разряд` — sport rank achieved (`+КМС`, `КМС`, `+МС`, `МС`, `+МСМК`, `МСМК`, `+Элита`, `Элита`, `+1`, `+1 юн`, `+3 юн`)
- `Коэф` — ISF coefficient
- `Абс` — ISF absolute points
- `Очки` — points (alternative scoring column for some events)
- `Тренер` — coach name(s); multiple coaches allowed (semicolon-separated)

### 4.4 Multirep protocol column row

For 2-Lift Multirep sections (`Многоповторный <PUkg>/<DIkg> (total)`):

```
№ | Возрастная | Команда | Рожд | ВК | Вес |
Кол-во | Подтягивания многоповторные |
Кол-во | Отжимания многоповторные |
Сумма | Разряд | Коэф | Абс | Очки | Тренер
```

`Кол-во` = repetition count.

For 1-Lift Multirep sections (`Подтягивания с N kg`, `Отжимания с N kg`): the same shape minus the off-exercise pair.

### 4.5 Sample athlete row (Classic, verbatim)

Yana Shchurova, women, Open, weight class 52 kg:

```
1
Щурова Яна Васильевна
Ж
Open
Личник, Тюмень
20.03.1987/38
52 kg
52
10  12,5  15  17,5
30  32,5  35  -
47,5
+КМС
28,862859
Л
Тепикина О. , Сажин Иван
```

Read as: place 1, female, Open, individual entry from Tyumen, born 20.03.1987 (age 38), 52 kg class, bodyweight 52.0 kg, PU attempts {10, 12.5, 15, 17.5} (4 attempts visible — sequence 1–3 plus record P4(R) = 17.5), Dip attempts {30, 32.5, 35, —} (3 attempts, no 4th), best PU 17.5 (record), best Dip 35, total 47.5, achieved rank "+КМС" (above КМС), ISF coef × result = 28.862859, place column "Л" (Личник?), coach "Тепикина О., Сажин Иван".

### 4.6 Sample athlete row (Multirep)

Sub-Junior Алексей Когосов, 16 yo, in `Многоповторный 16/24 (total)`:

```
Когосов Алексей Андреевич
Sub-Juniors(13-17)
16.06.2009/16
59,5
40  (PU reps with 16 kg)
22  (Dip reps with 24 kg)
62  (sum reps)
```

(Reps shown in `Подтягивания многоповторные` and `Отжимания многоповторные` columns; weight class implied by section header `16/24`.)

### 4.7 Discipline encoding model — confirmed

Verified from §4.2 above: PowerTable encodes Multirep load presets **into the discipline name itself** (`Многоповторный 16/24`, `Подтягивания с 24 kg`, `Отжимания с 32 kg`).

This is a **schema overload** parallel to PowerGage's column overload (`bench/dl` reused for PU/DI). PowerGage overloads columns; PowerTable overloads category names. Both use a generic powerlifting-shaped underlying schema.

Evidence: when fetched with `&dsp=0002`, the same event renders with `S 1, S 2, S 3, B 1, B 2, B 3, D 1, D 2, D 3, RESULT, FORECAST, SUM, PL, COEF, ABS, SUM, PL, COEF, ABS` columns — the generic powerlifting layout. The dedicated PU/DI column view at `wt?nom=4093` (no `dsp`) is a **render-time projection** from the generic underlying model, not a separate schema.

Architectural lesson: **both PowerGage and PowerTable confirm that overloading a powerlifting schema for ISF works**, but at the cost of category-name complexity. Our blueprint avoids both by giving Classic and Multirep first-class, dedicated schemas.

## 5. Records page — verbatim structure

Source: `/api/hs/p/report?cm=4093&rep=records` (XLSX, 49 KB, 123 strings extracted to `pt_records_strings.txt`).

### 5.1 Header

```
16-17.08.2025 – Открытый Чемпионат России по классическому и многоповторному стритлифтингу. г. Москва
РЕКОРДЫ СОРЕВНОВАНИЯ
по состоянию на 22 апреля 2026 г. 03:02:44 по МСК
```

### 5.2 Column row

```
Дата | Страна | Регион | Спортсмен, год рождения | Весовая | Упражнение | Результат
```

### 5.3 Hierarchy of section headers

Records are grouped four levels deep:

1. **Тип рекорда** — record type. Observed: `Общие рекорды`. (Other types likely: Olympic, equipped, raw — not seen at this event.)
2. **Вид рекорда** — record level/scope. Observed: `Страна`. (Other levels likely: `Регион`, `Мир`.)
3. **Дисциплина** — discipline. Same set as the compact protocol's section headings.
4. **Возрастная** — age category. Observed: `Open`, `Juniors`, `Masters M1`, `Masters M2`, `Masters M3`, `Masters M5`, `Sub-Juniors`.

Athlete rows nest under all four headers. Multiple records per athlete row are shown when an athlete set both an exercise record and a sum record on the same day (e.g. `Балакин Андрей Александрович, 1994` set PU=72.5, Dip=95, Sum=167.5).

This four-level hierarchy is the canonical records layout we should mirror.

### 5.4 Record kinds observed

For one event of this scope (113 nominations, 1 day), the records page lists:
- 1 Classic 2-Lift discipline (Sum + individual lifts)
- 2 Classic Single-Lift disciplines (Pull-Up, Dip)
- 4 Multirep 2-Lift disciplines (8/16, 16/24, 24/32, 32/48)
- 7 Multirep Single-Lift disciplines (PU 8/16/24/32, Dip 24/32/48)

Total: 14 disciplines. Each can contain records per age category × weight class.

Implication: a single ISF event can produce **dozens of distinct national records** in one weekend. Our `RecordsService` (out of V1, but worth designing now) needs a multi-axis index.

## 6. Working protocol — both render projections

### 6.1 ISF projection (no `dsp` param)

`/api/hs/p/wt?nom=4093` columns (verbatim):

```
Team | Class | Weight | P 1 | P 2 | P 3 | P(R)1 | Pull-up Classic | D 1 | D 2 | D 3 | D(R)1 | Dip Classic | RESULT | FORECAST | SUM | PL | COEF | ABS
```

`P(R)1` notation matches the XLSX's `П4(R)` — same 4th-attempt slot, named differently in HTML (R)1 vs XLSX П4(R).

### 6.2 Generic powerlifting projection (`&dsp=0002`)

Same event, different `dsp`:

```
Team | Class | Weight | S 1 | S 2 | S 3 | Squat | B 1 | B 2 | B 3 | Benchpress | S+B | D 1 | D 2 | D 3 | Deadlift | RESULT | FORECAST | SUM | PL | COEF | ABS | SUM | PL | COEF | ABS
```

Note: `S+B` column suggests powerlifting two-lift contests are also supported. Two `SUM | PL | COEF | ABS` block repetitions imply the protocol handles both two-lift and three-lift scoring side by side.

### 6.3 What `dsp` values exist

Not enumerable from public surface. Probable values:
- empty / not present → ISF projection (PU/DI)
- `0001` → ? (unknown — not tested)
- `0002` → powerlifting (S/B/D)
- Discipline-specific values for armlift, bench-only, deadlift-only, etc.

This is a render layer, not a domain layer. Our product does not need to replicate it.

### 6.4 FORECAST column — verified again

The `FORECAST` column appears in both ISF and powerlifting projections. It is a **render-layer value**, computed from current state plus declared upcoming attempts. Worth borrowing into our `ResultCalculator.getForecast(entry)`.

## 7. Federation hierarchy

Verified at `/api/hs/p/fed?fed=74`:

- Federation `0010` = ISF (top level, international).
- Federation `74` = "ISF Москва и Московская область" (regional sub-federation under ISF).

Pattern: top-level federation has a numeric code; regional sub-federations have separate numeric IDs that are not derived from the parent code. Each regional federation has its own contact info, event list, and is filterable.

Top-level events listed at `/api/hs/p/all_sorev?fed=0010` aggregate from all regional ISF sub-federations.

Implication for our product: V1 ISF Meet Client does not need a federation concept. V2/admin platform might.

## 8. Sub-page link structure (event-level)

Verified at `/api/hs/p/sorev?nom=4093`:

| Path | Purpose | Format |
|---|---|---|
| `/api/hs/p/sorev?nom=NNNN` | Event landing page | HTML |
| `/api/hs/p/nom?nom=NNNN` | Athlete search dropdown (single field per athlete: name + birth year + fed) | HTML |
| `/api/hs/p/team?nom=NNNN` | Team registration / printable team form | HTML (limited content visible) |
| `/api/hs/p/wt?nom=NNNN[&dsp=XXXX]` | Live working protocol | HTML |
| `/api/hs/p/report?cm=NNNN&rep=compact` | Final compact protocol | **XLSX** |
| `/api/hs/p/report?cm=NNNN&rep=records` | Records set at event | **XLSX** |

The `cm` param (in `report?cm=…`) versus `nom` param (everywhere else) is the only inconsistency. Likely an internal API naming artifact (`cm` may stand for "competition mark" or similar 1С construct).

Endpoints **not visible** publicly:
- `report?rep=schedule` or similar
- `report?rep=fullprotocol`
- A live timer / countdown endpoint
- A judges' panel info endpoint
- Any write endpoint (registration, weigh-in, attempt entry)

## 9. UX features visible in production data

Confirmed in real ISF event data:

| Feature | Evidence |
|---|---|
| 4 attempts per exercise (3 + record) | `П1 П2 П3 П4(R)` columns; `O1..O4(R)` |
| Bodyweight to 0.1 kg | "59,5", "82,05", "67,3" |
| Plate increment 1.25 kg respected | Тарасова Юлия (Masters M3) attempts: 20, 22.5, 25, 26.25 — `26.25` is `25 + 1.25` |
| Weight class with `.5` halves | `52 kg`, `67.5 kg`, `82.5 kg` — confirms half-kilogram class boundaries exist |
| Sport-rank certification on protocol | `+КМС`, `КМС`, `+МС`, `МС`, `+МСМК`, `+Элита`, `+1`, `+1 юн` |
| Multi-coach attribution | `Тепикина О. , Сажин Иван` — semicolon list per athlete |
| Coach standings as separate scoring | `Тренеры (ИТОГОВОЕ ПЕРВЕНСТВО ТРЕНЕРОВ)` section |
| "Личник" (individual entry) | Used when athlete has no club affiliation |
| Bilingual rendering | `&lg=en` / `&lg=ru` URL parameter; same data, English glossary inserted |
| Decimal comma in RU output | `26,25`, `28,862859`, `47,5` |
| Decimal point in EN output | (presumed; not checked at this depth) |
| Refused attempt shown as `-` | Visible in row 41 |
| "бр" annotation | Unknown — appears once |

### 9.1 Sport rank decoding

| Code | Meaning | Notes |
|---|---|---|
| `КМС` | Кандидат в мастера спорта (Candidate Master of Sport) | RU national rank |
| `+КМС` | Achieved norm above КМС (= МС next) | The `+` prefix is a "norm achieved" marker |
| `МС` | Мастер спорта | |
| `+МС` | Achieved МСМК norm | |
| `МСМК` | Мастер спорта международного класса | |
| `+МСМК` | Achieved Элита norm | |
| `Элита` | Top tier (above international master) | Russian streetlifting-specific |
| `+Элита` | Achieved beyond Элита | |
| `+1` / `+3` | Achieved 1st / 3rd youth rank norm | For young athletes below КМС |
| `+1 юн` / `+3 юн` | Junior (юн = юношеский) norm tiers | |

These come from streetlifting.ru/docs/standards. A non-trivial `RankCalculator` service will be needed in V2 — not in V1 scope, but the data shape exists.

## 10. What this confirms about ISF rules in production

Cross-referencing with ISF v5.1 (already extracted in [decisions-v1.md](decisions-v1.md)):

| ISF v5.1 rule | PowerTable conformance |
|---|---|
| §2.2 Multirep loads (8/12/16/24/32/48 kg) | ✓ All four 2-Lift combos visible: 8/16, 16/24, 24/32, 32/48 |
| §2.2 Single-Lift Multirep | ✓ "Подтягивания с N kg", "Отжимания с N kg" sections |
| §3 Sub-Juniors (13-17), Juniors (18-22), Masters M1-M6 | ✓ Same labels in protocol |
| §6.6 Plate set 5/10/15/20/25 kg | ✓ Increments visible (with 1.25 kg / 2.5 kg micro-plates implied) |
| §7 Belt total = multiple of 1.25 kg | ✓ Visible (Tarasova attempts: 20, 22.5, 25, 26.25) |
| §10.9.4 Masters M5 (60-69) ≠ M6 (70+) split | ⚠️ Not confirmed at this event; only one M5 athlete present, no M6 — would need a different event to verify |
| §10.9.5 Additional points (BW − Limit) × 0.5 | ⚠️ Not separately columned in protocol; possibly folded into `Очки` or `Абс` columns. Cannot confirm without client access. |
| §7.4.7 4th attempt for record only (Classic) | ✓ `П4(R)` / `О4(R)` columns |

## 11. What we still cannot see (requires installed client)

After the deepest possible web crawl, the following remain opaque:

1. **Underlying database / object schema** — PowerTable runs on 1С:Enterprise. The 1С infobase schema (object types, attributes, tabular sections) is private. We see only rendered output.
2. **Write API** — registration, weigh-in entry, attempt declaration, attempt good-lift/no-lift judging. All inferred to be 1С-client-only.
3. **Local persistence on the operator workstation** — does the 1С thin client cache offline state? What happens when network drops mid-meet?
4. **Auto-save / undo behavior** — invisible from web.
5. **Configuration screens** — meet setup, federation rules editor, category editor, plate set editor. We know they exist (per change log) but have not seen them.
6. **Judging screen layout** — the operator's daily view. We see only the protocol it produces.
7. **Mobile app workflows** — Android/iOS clients are referenced; their actual screen flow is unverified.
8. **Telegram bot command set** — `@PowerTable_bot` accepts athlete music uploads, weight-request submissions, etc., but the exact command grammar is opaque.
9. **Save-file / export-file format** — does the federation receive a file or only Excel printouts? Unknown.
10. **Multi-platform (помост) coordination** — how do parallel platforms synchronize state? Unknown.
11. **OBS plugin protocol** — `obs-command` 1.6.3 is referenced, the doc is a binary `.doc` file. The actual command schema between PowerTable and OBS is unverified.
12. **Time-sync requirement** — NetTime 3.14 is explicitly recommended. Why? Probably for live-stream timestamp alignment, but unconfirmed.
13. **Per-meet pricing details and billing model details** — the `/price` page describes the rate card; the actual billing UI inside the operator client is unknown.
14. **Localization beyond RU/EN** — no evidence of other locales.

These are exactly the items the user's installed-client phase will close.

## 12. Capture plan for the installed-client phase

When the user installs the 1С:Enterprise thin client and grants access, capture in this order:

### 12.1 Initial install snapshot

- Full file tree of installation directory (typically `C:\Program Files\1cv8\` or similar).
- All `.cf` / `.cfu` config / update files.
- Any `.ini`, `.xml`, `.json` config in install directory.
- Registry keys touched (HKLM\SOFTWARE\1C, HKLM\SOFTWARE\PowerTable if any).
- Firewall rules added.
- Background services, scheduled tasks, autostart entries.
- Network listeners (`netstat -ab`) before and after launch.
- The "Стартер" launcher binary location and what it actually downloads.

### 12.2 First-launch capture

- Login flow — what credentials does the operator need?
- Where is local cache stored (likely under `%AppData%\1C\1cv8\…`)?
- Initial federation/event sync — does the client download the entire infobase? Selective?
- Connection model — persistent socket? polling HTTP?

### 12.3 Workflow walkthroughs (with screenshots)

- Meet setup wizard end-to-end. Capture every field, every preset list, every defaulted value.
- Registration screen. Capture all available fields (compare against §11 of the working blueprint).
- Weigh-in screen. Capture order of operations, validation behavior.
- Flight order generation. Capture the generated artifact and its options.
- Judging screen. Capture the judge-table layout, button mapping, attempt-declaration UX, timer behavior.
- Secretary screen. Capture how the secretary view differs.
- Results screen. Capture filter/sort options.
- Export menu. Capture every available report and its file format.
- Records management screen.
- Telegram bot integration screen.

### 12.4 Data capture per workflow

- Screenshot every distinct screen.
- Save a sample meet file (after dummy data entry) — locate where it lives on disk; copy it out for offline inspection.
- Run the working protocol export — confirm the XLSX shape matches what we extracted from the public web.
- Run the records export — same comparison.
- Trigger an OBS-stream rehearsal if feasible.

### 12.5 Edge-case probes

- What happens when network drops during attempt entry?
- What happens when two operators edit the same athlete simultaneously?
- Can a meet be exported and re-imported on a different machine?
- Is there an "offline" or "sandbox" mode?
- Is there a meet template / preset library?

### 12.6 Deliverable after the installed-client phase

Produce `docs/powertable-findings-v3.md` containing:
- Install footprint
- Object schema reconstruction (from the 1С configurator if accessible, or from screen field labels)
- Workflow map with screenshots
- Save / export file schemas
- Network protocol observations
- Final delta table vs ISF v5.1 and our blueprint

## 13. What this changes in our blueprint

Items to add/amend in the next blueprint revision (separate edit pass):

1. **Coach attribution** — `Entry.coaches: string[]` is needed (multi-coach support visible in protocol).
2. **Coach standings as a scoring view** — `Тренеры (ИТОГОВОЕ ПЕРВЕНСТВО ТРЕНЕРОВ)` is a real federation requirement; consider adding to §11.7 Results or marking as V2.
3. **Single-Lift events in Classic and Multirep** — blueprint §6.1 has `Event = "PU" | "DI" | "PUDI"` which already covers this; PowerTable confirms operators do use 1-Lift events frequently. Keep the enum as-is.
4. **Sport rank annotation column** (`Разряд`) — add as a derived column in the Results view; do not store in `Entry`.
5. **`Очки` column distinct from `Абс`** — PowerTable shows both. `Абс` is ISF coefficient × result; `Очки` may be event-specific points (e.g. team scoring). Investigate during installed-client phase before deciding.
6. **Half-kilogram weight classes** — blueprint §6.3 `WeightCategory` already permits this (decimal `minKg`/`maxKg`). Confirmed needed: `52 kg`, `67.5 kg`, `82.5 kg`.
7. **`Личник` / individual-entry mode** — when no team. Blueprint §6.7 already has `team?: string` (optional); the convention is "empty team field = individual". Add to UI: if no team, render as `Личник, <city>`.
8. **Records page** — formal hierarchy four levels deep (type → scope → discipline → age cat). Out of V1 but design `RecordsService` interface.
9. **Bilingual XLSX export with `lg` parameter** — blueprint §11.7 currently lists "official protocol CSV". Upgrade to "XLSX with bilingual output, RU + EN". Russian operators expect XLSX, not CSV.
10. **Head referee + head secretary fields on `MeetState`** — required for protocol footer (verified in §4.2 footer block).

## 14. One-line summary

PowerTable is a single-developer SaaS on 1С:Enterprise; its ISF protocol layout, four-level records hierarchy, sport-rank annotations, `Тренеры` standings, and `FORECAST` column are the most copy-worthy production-grade UX patterns. The product confirms ISF v5.1 rules in production (4 attempts, 1.25 kg increments, half-kilogram classes, full Multirep preset matrix). The installed-client phase remains the only path to verify schema, write API, save-file format, and offline-resilience behavior.
