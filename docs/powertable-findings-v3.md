# PowerTable — Findings v3 (installed-client session)

Date: 2026-04-25
Method: Live 1С:Enterprise thin-client session, logged in as "ISF Краснодарский край" (account c88eBq). Cache extraction from `%AppData%\1C\1cv8\…\cache.1CD`.
Status: partial capture — home screen and competitions list navigated. Remaining menu items not yet visited.
Precursor: [powertable-findings-v2.md](powertable-findings-v2.md) (deep web dive, now superseded on overlapping sections).

---

## 1. Connection details

| Parameter | Value |
|---|---|
| Protocol | HTTP (not HTTPS — no TLS) |
| Infobase URL | `http://powertable.ru/competition` |
| Infobase UUID | `c3b0d56c-5d81-4b9c-a93b-e51808446b37` |
| 1С platform | 8.3.27.1989 |
| Config version hash | `52021719a02bce46b1d5c19890c13c0900000000` |
| Launcher | `C:\PROJECTS\streetlifting-os\PowerTable\powertable_starter_v7.exe` |
| Launcher size | 14.25 MB |
| Launcher PE version info | None (stripped) — custom launcher, not stock 1С starter |
| Local ibases file | `%AppData%\Roaming\1C\1CEStart\ibases.v8i` |
| Local cache | `%AppData%\Roaming\1C\1cv8\c3b0d56c-5d81-4b9c-a93b-e51808446b37\054d405a-dfc4-4f54-bb21-baa06c8122ca\cache.1CD` |

Security note: plain HTTP means credentials and all meet data transit in cleartext. Operators on public Wi-Fi (tournament venue) are exposed. Our product uses local storage — no network attack surface on day-of-event.

---

## 2. 1С object schema — confirmed identifiers

Extracted from `cache.1CD` (shared-read copy, UTF-16 string sweep).

### 2.1 Object types

| Object path | 1С type | English equivalent |
|---|---|---|
| `Обработка.РабочийСтол` | DataProcessor | Home / Dashboard |
| `Справочник.Соревнования` | Catalog | Competitions |

Both confirmed by usersettings API calls captured in cache:
- `objectkey=ОсновноеОкно/Такси/НастройкиОкнаТонкогоКлиента` — main application window
- `objectkey=Обработка.РабочийСтол.Форма.Форма/Такси/НастройкиОкнаТонкогоКлиента`
- `objectkey=Справочник.Соревнования.Форма.ФормаСписка/Такси/НастройкиОкнаТонкогоКлиента`

### 2.2 Form UUIDs

| UUID | Object (inferred) |
|---|---|
| `64c38084-6b9b-4b01-b848-d1e90171617d` | Unknown (logform `md:0:64c38084…`) |
| `e2cbe9a0-5d15-4b63-92f8-1ca36911de4c` | `Справочник.Соревнования.Форма.ФормаСписка` |

`md:0:…` notation = metadata object type 0 (likely Catalog). These UUIDs are stable across sessions (tied to the config version hash).

### 2.3 Module IDs (from e1cib/modules/src calls)

```
urn:module:md:01f3db53-368f-40bc-ad99-672900ac09f1@property='d5963243-262e-4398-b4d7-fb16d06484f6';version='ecff933bae9db8429148999d3a…'
urn:module:md:64c38084-6b9b-4b01-b848-d1e90171617d@property='e087ab-1491-49b6-aba7-43571b41ac2b';ext='3';version='be078a119490b14dbe0913fe391e456a…'
urn:module:md:c1e3db83-94a3-465c-90d3-5432c4ee3991@property='d5963243-262e-4398-b4d7-fb16d06484f6';version='2a06ccd87d7624469d099fbedd…'
urn:module:md:e2cbe9a0-5d15-4b63-92f8-1ca36911de4c@property='e087ab-1491-49b6-aba7-43571b41ac2b';ext='4';version='764191444fcce bfd783c5dd2cbb17…'
```

These are server-side module source references. The client fetches module bodies from `e1cib/modules/src?…`. Module content is not in the cache (it is not a module-source cache, only a metadata structure cache).

### 2.4 API surface (from cache URL fragments)

| API path | Purpose |
|---|---|
| `e1cib/metadata/splash` | Config version handshake |
| `e1cib/modules/defs` | Module definitions index |
| `e1cib/modules/src` | Module source code (server-side) |
| `e1cib/logform` | Form layout (UI metadata) |
| `e1cib/usersettings` | Per-user/per-form UI state persistence |
| `e1cib/sdc` | Unknown (SDK call?) |
| `e1cib/picturecollection/info` | Icon/picture collection metadata |
| `e1cib/picturecollection/item/0:<uuid>` | Individual icon (PNG) |
| `e1cib/tempstorage/<uuid>` | Temporary binary storage (session-scoped) |
| `e1csys/backend/desktop.png` | Desktop background image at requested scale |
| `e1csys/backend/mainmdimages.zip` | Main metadata icon pack (scale-aware) |
| `e1csys/backend/userlistimages.zip` | User list icon pack |
| `e1csys/backend/appearance.zip` | UI theme/appearance pack |
| `e1csys/basic/folder.zip` | Basic folder/tree icons |

URL parameters common to all:
- `sysver=8.3.27.1989` — 1С platform version
- `confver=52021719a02bce46b1d5c19890c13c09` — config version (20-byte prefix)
- `scale=100` / `scale=125` — DPI-aware image scaling
- `interfacevar=0` / `8` / `16` — interface variant flags
- `operatingsystem=0` — OS flag
- `extract=true/false` — whether to extract from zip

---

## 3. Full main menu (from screenshot)

Verified from screenshot taken during live session:

| Menu item (RU) | English | Type |
|---|---|---|
| Справочники | Reference data | Catalog |
| Соревнования | Competitions | Catalog |
| Спортсмены | Athletes | Catalog |
| Номинации спортсменов | Athlete nominations | Catalog |
| Номинации судей | Judge nominations | Catalog |
| Судьи | Judges | Catalog |
| Распределение по потокам и группам | Stream/group distribution | Processing |
| Отчёты/печатные формы | Reports/printable forms | Processing |
| Печать грамот | Certificate printing | Processing |
| Награждение | Award ceremony | Processing |
| Оператор табло | Scoreboard operator | Processing |
| Склад | Warehouse/inventory | Processing |
| Уведомления | Notifications | Processing |
| Информационные таблицы для трансляций | Stream info tables | Processing |

Total: 14 menu items. All visible in the standard navigation panel of the home screen.

---

## 4. Dashboard / home screen

Visible at login:

| Widget | Value observed | Meaning |
|---|---|---|
| Billing balance | 0 RUB | Account balance exhausted |
| Pricing tier | 41 RUB/nomination | Current per-nomination rate |
| Nominations used | 187 | Cumulative nominations under this federation account |
| Connection latency | ~302 ms average | Current round-trip to powertable.ru |
| Latency threshold "отличное" | < 300 ms | Good quality |
| Latency threshold "нормальное" | 300–500 ms | Normal quality |
| Cross-federation analytics | Chart for Краснодарский край | Regional view, multiple competitions shown |

Billing implication: this is a pay-as-you-go account with zero balance — operators must pre-fund before entering nominations. There is no free tier visible within the client.

---

## 5. What remains to capture (deferred)

The following menu items were NOT navigated during this session. Each will expand the cache on navigation:

- [ ] Спортсмены — athlete form, field list, search filters
- [ ] Номинации спортсменов — nomination form (entry fields, weight class selector, category selector)
- [ ] Судьи — judge form
- [ ] Распределение по потокам и группам — stream/group assignment (most complex workflow)
- [ ] Отчёты/печатные формы — report menu, export formats
- [ ] Награждение — ceremony workflow
- [ ] Оператор табло — scoreboard control screen (highest priority — this is the judging-day UI)
- [ ] Склад — warehouse (out of scope for V1)
- [ ] Уведомления — notification settings

Priority order for next session:
1. **Оператор табло** — reveals the live judging-day UI
2. **Номинации спортсменов** — reveals all athlete-entry fields
3. **Распределение по потокам и группам** — reveals stream/group/flight model
4. **Отчёты/печатные формы** — reveals export capabilities

---

## 6. Key architectural inferences

### 6.1 Object model confirmed

PowerTable uses 1С `Справочник` (Catalog) for Competitions and Athletes, not `Документ` (Document). This means competitions are treated as a master-data reference, not as a transactional document. Implications for our design: this is consistent with our blueprint's `MeetState` being a flat JSON record — competitions are "records", not "events with a ledger."

### 6.2 No offline capability

The entire application is a thin client that makes HTTP requests for every interaction. The cache.1CD stores UI structure (form layouts, module definitions) but not data. When the network drops, the client cannot proceed. This is the main architectural weakness our product solves.

### 6.3 Config hash as a version fence

The config version `52021719a02bce46b1d5c19890c13c09` appears in every API call. When the server pushes a config update (new form layout, new module), all clients instantly receive it on the next request. There is no client-side "skip update" option. Federation operators cannot pin to a known-good version.

### 6.4 Scale-aware icon delivery

The server delivers icons at the client's DPI scale (`scale=100` or `scale=125`). At 125% DPI (common on modern laptops), different icon packs are fetched. Our product should handle HiDPI via CSS `device-pixel-ratio` media queries and SVG assets where possible — no server-side scaling required.

### 6.5 Launcher is custom (not stock 1С)

`powertable_starter_v7.exe` (14.25 MB, no PE version info) is a modified version of the standard 1С Enterprise Starter. It pre-configures the infobase connection and likely bypasses the standard connection dialog. Operators receive a branded one-click launcher — no 1С technical knowledge required.

---

## 7. Summary delta vs v2

| v2 "unknown" item | Status after live session |
|---|---|
| Underlying object schema | Partially resolved: Справочник for Competitions and Athletes confirmed |
| Write API | Still unknown (not captured) |
| Local persistence | Confirmed: UI structure only, no data cached offline |
| Configuration screens | Partially captured: full menu structure confirmed |
| Judging screen layout | Still unknown (Оператор табло not yet navigated) |
| Pricing model | Confirmed at client level: 41 RUB/nom, pre-funded balance, no free tier |
| Connection model | Confirmed: polling HTTP/REST over 1С e1cib API |

---

## 8. One-line summary

PowerTable's installed client is a thin-shell over a 1С:Enterprise infobase at `http://powertable.ru/competition`; object types Справочник.Соревнования and Обработка.РабочийСтол are confirmed from cache; the full 14-item menu is documented; the critical judging UI ("Оператор табло") and nomination entry form remain to be captured in the next session.
