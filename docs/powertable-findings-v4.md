# PowerTable — Findings v4 (full installed-client capture)

Date: 2026-04-25
Method: 7-round screenshot review of running PowerTable 1С client (federation: "ISF Краснодарский край", user 133), continuing from [powertable-findings-v3.md](powertable-findings-v3.md) which captured the 1С technical baseline (infobase URL, object schema, cache extraction, full menu) but deferred the per-screen entity model. v4 closes that deferral.
Status: completes the items listed as deferred in v3 §5 — Спортсмены, Номинации спортсменов, Судьи, Распределение по потокам и группам, Печатные формы, Печать грамот, Награждение, Оператор табло, Звук и Музыка. Plus textual review of the broadcast endpoint catalog at `https://powertable.ru/api/hs/p/`.

Anchors:
- [decisions-v2.md](decisions-v2.md) — decisions D13–D29 derived from this evidence
- [powertable-findings-v3.md](powertable-findings-v3.md) — 1С technical baseline (still authoritative on connection details, cache, object schema)
- [powertable-findings-v2.md](powertable-findings-v2.md) — web-crawl + outside-in observations (still authoritative on those)

## 1. Method and scope

Live client of «PowerTable 1С:Предприятие» as deployed for federation operator account «ISF Краснодарский край», working through:
- Per-meet form tabs: `Основные настройки` / `Дисциплины` / `Весовые категории` / `Возрастные категории` / `Диски` / `Грифы` / `Этапы соревнований`
- Master forms: `Соревнования`, `Спортсмены`, `Судьи`
- Operational screens: `Номинации спортсменов`, `Номинации судей`, `Распределение по потокам и группам`
- Print: `Печатные формы`, `Печать грамот`, `Награждение`
- Live: `Помост` with sub-tabs `Параметры` / `Оператор` / `Высота стоек / начальные веса` / `Звук и Музыка`
- Public broadcast endpoint catalog (URL list, ~40 entries)

Not inspected: actual save-file dump, JSON shape of API responses, mobile companion app, billing screen interior, warehouse module, federation admin panel. Static-only screenshot analysis.

## 2. Authentication and access model (broadcast layer)

Broadcast/operator URL pattern: `https://powertable.ru/api/hs/p/<view>?user=<id>&sk=<key>&pomost=<n>&ver=<format>`

- `/api/hs/` — 1С HTTPService Extension namespace
- `user` — numeric user ID (e.g., 133)
- `sk` — federation-wide security key, visible on operator's `Обращения, настройки` tab as «Ключ защиты». Format: UUID4, e.g., `0c7a1145-6fde-4738-a5d5-7e0f77741927`
- `pomost` — platform number
- `ver` — format flag (e.g., `isf` for ISF-tuned views)

No per-user RBAC visible. **Anyone with the URL can read.** Share-link auth model.

Trade-off (PowerTable's choice):
- Convenient for spectators, coaches, broadcast directors — no logins
- Vulnerable: `sk` leak = full federation read access; mitigated by IP whitelisting (changelog 2025-11-07) but not eliminated
- No per-meet revocation visible; the same key persists across all meets in the federation account

## 3. Athlete entity (cross-meet, persistent)

PowerTable's `Спортсмены` is a persistent catalog, separate from per-meet `Номинации`. **Fundamental architectural divergence from blueprint v1** (which uses one flat `Entry`).

### 3.1 Identity fields

| Field | Type | Notes |
|---|---|---|
| `Код` | int | system ID, e.g., 51206 |
| `ФИО` | string | legacy single-string (kept for back-compat; pre-2026-03-26 schema) |
| `Фамилия` / `Имя` / `Отчество` | string × 3 | split, post-2026-03-26 (PowerTable changelog) |
| `English Full name` | string | strict format `Last, First, Middle` |
| `Дата рождения` | date | |
| `Пол` | enum | М / Ж |
| `Личные данные сверены` | bool | verification flag set during mandate commission |

### 3.2 Sport profile

| Field | Type | Notes |
|---|---|---|
| `Спортивный разряд` | FK | sport rank reference (МСМК, МС, КМС, разряды) |
| `Приказ` | FK | decree/order document granting the rank |
| `Профессия` | string | profession, RU |
| `Профессия ENG` | string | profession, EN |
| `Дата начала тренировок` | date | |
| `Статус` | enum | active / inactive / suspended |
| `Доп инфо` | string | free-text notes |

### 3.3 Social affiliation (multi-valued)

- `Города[]` — cities of registration (multiple)
- `Регионы[]` — regions, each with country (multiple)
- `Страна` — single country
- `Клубы, команды[]` — clubs / teams (multiple)
- `Спортивные общества[]` — sports societies (multiple)
- `Тренеры[]` — coaches (multiple)
- `Вуз` — university (single)

### 3.4 Contacts

Phone, VK, Email, Telegram (icons in master list, full fields in card).

### 3.5 Compliance — anti-doping & financial

| Field | Shape | Notes |
|---|---|---|
| `Членские взносы[]` | { Год, Внесено: bool, Сумма, Комментарий, Федерация } | per-year per-federation membership log |
| `Дисквалификация (частичная)` | `Ограничение доступа к дисциплинам[]` | restricted-discipline list |
| `Дисквалификация (полная)` | { Начало: date, Окончание: date } | full disqualification window |
| `Допинг-пробы[]` | { Дата забора, Статус, Соревнование } | drug test sample log |

### 3.6 Media

- Photo (jpg)
- `Мелодия для выступления` — mp3 walk-in music attached to the athlete

### 3.7 UX safety patterns

- **Edit-locked by default.** Operator must click `Включить возможность редактирования` to unlock.
- `Заявить о дубликате` — duplicate-reporting workflow (anti-mistake)
- `Спам` button — anti-fraud reporting (per PowerTable changelog 2026-02-13)

### 3.8 Tabs on athlete card

| Tab | Purpose |
|---|---|
| Основные | identity + sport profile (above) |
| `Выступления (4)` | cross-meet performance history; counter shows total appearances |
| `Рекорды` | records held by this athlete |
| `Документы` | anti-doping certs, insurance, medical clearance — uploaded files since 2025-01-20 per changelog |

Counter «Выступления (4)» = this athlete competed in 4 meets to date.

## 4. Nomination entity (per-meet, per-discipline)

Verified empirical fact: a single athlete can hold multiple nominations at one meet. Examples from Кубок Краснодара 28.03.2026:

| Athlete | Nomination 1 | Nomination 2 |
|---|---|---|
| Ташуев Мухамед | Подтягивания с 24 kg / 82.5 kg / Open | Подтягивания с 16 kg / 82.5 kg / Masters |
| Бирт Максим | Подтягивания с 8 kg / 56 kg / Sub-Jr | Классическое подтягивание / 56 kg / Open |
| Белогорлов Павел | Выход силой классический / 90 kg / Open | Подтягивания с 12 kg / 90 kg / Open |
| Полено Максим | Классический стритлифтинг (двоеборье) / 67.5 kg / Open | Многоповторный стритлифтинг 24/32 (total) / 67.5 kg / Open |

⇒ **Nomination = athlete × meet × ONE discipline × ONE weight category × ONE age category.**

Same athlete in two age categories on one day (Open + Masters voluntary cross-entry) is allowed. Same athlete in two disciplines is the common case.

### 4.1 Visible columns in `Номинации спортсменов`

| Column | Type | Notes |
|---|---|---|
| `Допуск` | enum + color | Допущен (green) / Проверяет... (yellow) / др. |
| (number) | int | priority / queue ID |
| icons | passport-verified, mandate-passed |
| `М` | bool | mandate commission passed |
| `Взнос` | money | entry fee, RUB |
| `Долг` | money | debt — negative = unpaid balance |
| `Л` | bool | «личник» individual-athlete flag (opts out of team scoring) |
| `П` | bool | printed (?) |
| `Спортсмен` | FK | foreign key to Athlete |
| `Страна` | string | snapshot at registration |
| `Информация` | string | city/region snapshot at registration |
| (date) | date | registration timestamp or birth date |
| `Дисциплина` | FK | foreign key to Discipline catalog |
| `ВК ном` | enum | declared weight category (pre-weighin) |
| `ВК` | enum | actual weight category (post-weighin) |
| `Лучш...` | float | best result, live |
| `Г` | char | group code |
| `Возр` | enum | age category — can differ from athlete's natural age (voluntary upward category) |
| `Гр...` | string | group label |
| `Стат...` | enum | nomination status |
| `ID сцены` | FK | stream/scene assignment |

### 4.2 Bulk operations

Bottom toolbar:
- `Выполнить жеребьёвку` — run draw / lot assignment
- `Мандатная комиссия` — mandate-commission entry workflow
- `Личник. Установить/Снять` — toggle individual flag
- `Поставить всем "Допущен"` — bulk admit
- `Печать номинаций` — print nomination cards (per-athlete)
- `Список кодов авторизации в телеграм` — Telegram fast-auth codes for athletes

## 5. Judge entity (catalog + per-meet nominations)

### 5.1 Judge catalog (`Судьи`)

| Field | Type | Notes |
|---|---|---|
| ФИО | string | |
| Дата рождения | date | |
| Судейская категория | enum | РК (regional) / НК (national) / МК (international) |
| Приказ | string | decree document |
| Решение | string | decision document |
| Продление | date | certification expiry / extension |
| Город | string | |
| Регион | FK | |
| Статус лица | enum | Допущен / etc. |
| Phone, Email, Telegram | strings | |

### 5.2 Per-meet judge nominations (`Номинации судей`)

Mirrors the athlete-nomination flow:
- Per-meet count (Н.Всего / Н.Жен / Н.Муж)
- Sub-table: `Судья / Представляет команду / Город / Статус лица`
- Bottom buttons: «Печать назначения судей» (RU + EN), «Печать кодов быстрой авторизации в телеграм»

### 5.3 Live judging — three independent remotes

PowerTable broadcast catalog exposes **3 separate URL endpoints** for judge remotes:
- `Судейский пульт судьи СЛЕВА`
- `Судейский пульт ЦЕНТРАЛЬНОГО судьи`
- `Судейский пульт судьи СПРАВА`

⇒ Each of three judges gets a dedicated browser URL on phone/tablet. Tap «Зачёт» / «Не зачёт». Result aggregated on operator screen. **Strongest evidence for the 3-judge majority model**, drives D15.

Audio confirmation: PowerTable announces «Вес взят два к одному» / «Попытка неудачная два к одному» on split decisions, naming the specific 2-1 outcome.

## 6. Stream and Group planning entities

`Распределение по потокам и группам` decomposes a meet into time-bounded sessions.

### 6.1 Stream — verified empirical schedule

Sample meet «28.03.2026 - Открытый Кубок Краснодарского края» (single platform, single day):

| Поток | Группы | Номинаций | Дата | Начало | Окончание |
|---|---:|---:|---|---|---|
| Выход силой на максимум | 1 | 2 | 28.03.2026 | 11:20 | 11:21 |
| Двоеборье Классическое | 1 | 4 | 28.03.2026 | 11:40 | 11:53 |
| Классическое подтягивание | 1 | 5 | 28.03.2026 | 12:15 | 12:31 |
| Классическое отжимание | 1 | 3 | 28.03.2026 | 12:35 | 12:36 |
| Двоеборье мультилифт | 1 | 6 | 28.03.2026 | 13:15 | 13:29 |
| Подтягивание мультилифт | 1 | 6 | 28.03.2026 | 14:00 | 14:04 |
| Отжимание мультилифт | 1 | 5 | 28.03.2026 | 14:40 | 14:42 |

Stream fields:
- `name` — operator-friendly: «Двоеборье мультилифт»
- `disciplineCluster` — set of `DisciplineCode` mapped to this stream
- `day`, `platform` — multi-platform / multi-day axes
- `startTime`, `endTime` — auto-computed from per-attempt duration statistics
- `groups[]` — list of groups within the stream

### 6.2 Group

Recommendation in PowerTable UI: «оптимально, для 1 потока делать не более 3-х групп».
A group has a list of nominations, executed sequentially within its stream's time slot.

### 6.3 Auto-duration calculation

Tab `Примерный расчёт длительности соревнования`:
- Default attempt duration without statistics: **65 seconds**
- Per-discipline calibration: PowerTable persists historical attempt durations and uses calibrated averages
- Auto **5-minute gap** between exercises within a stream
- Total meet duration projected to minute precision

Sample calibration (M 82.5 kg, Juniors):
- Выход силой: 35 s/attempt
- Подтягивания классические: 34–71 s/attempt (varies by group)
- Отжимания классические: 45–63 s
- Многоповторные подходы: 41–54 s

### 6.4 Filters and multi-platform

Stream-list filters: `Помост: Все/1`, `День: Все/1(28)`. Confirms:
- `Stream.platform: number` axis (per-platform schedules)
- `Stream.day: number` axis (multi-day meets)

## 7. Operator / judging screens

### 7.1 `Помост / Параметры` — operator configuration

Sort modes (radio):
- по ФИО
- по весовой категории, ФИО
- по возрастной, ВК, ФИО
- **по сумме прогноза, ВК, ФИО** ⭐

Column visibility (full set, checkboxed):

| Column | Default visible? | Notes |
|---|---|---|
| Весовая категория | ✓ | |
| Собственный вес | ✓ | bodyweight (kg) |
| Спортивный разряд / звание | ✓ | |
| Год рождения | ✓ | |
| Коэффициент | — | ISF coefficient |
| Место | ✓ | current place |
| Сколько кг не хватает до 1 места | — | strategic column |
| Командные очки | — | team points |
| Место в абсолютном первенстве | ✓ | |
| Выполненный разряд | — | auto-computed sport rank achievement (D17) |
| **Место (ПРОГНОЗ)** | — | forecast (D16) |
| **Сколько кг не хватает до 1 места (ПРОГНОЗ)** | — | forecast (D16) |
| **Место в абсолютном первенстве (ПРОГНОЗ)** | — | forecast (D16) |
| **Коэффициент (ПРОГНОЗ)** | — | forecast (D16) |
| Статус номинации | ✓ | |
| Предупреждения | ✓ | |
| МестоСумма | — | place by sum-of-successful-attempts |
| СуммаПопыток | — | sum of all successful attempts (not just best) |

Other settings:
- `Не отображать фото спортсмена` — toggle photo display

### 7.2 `Помост / Оператор` — live judging interface

Toolbar layout (left → right):

| Element | Function |
|---|---|
| Bar input field | manual time-entry override |
| ☕ icon button | break |
| `60s Старт` (small) | reset timer |
| **`60s Старт [0 сек]`** (large green) | start 60-second attempt timer |
| Time display `--:--` | counts down |
| ⏸ + Record toggle | pause; flag attempt for video recording |
| **`Зачёт`** (large green) | aggregate good lift |
| **`Не зачёт`** (large orange) | aggregate no lift |

Active-attempt rolling table columns:
`Спортсмен / Дисц. / ВК / Вес / Разряд / Год / [icon] / Рез-т / М / АБС / Рез-т(П) / Статус / Ш`

`Рез-т(П)` = Result (Forecast) — visible inline during judging.

### 7.3 `Помост / Высота стоек / начальные веса`

Squat-rack height + opener-weight setup. **Irrelevant for streetlifting V1** — used only for WC squat / barbell squats. Empty column set: `Группа / № / Помост / Спортсмен / Дисциплина / Вес / WC / Статус`.

### 7.4 `Помост / Звук и Музыка`

See §8.

## 8. Audio system specification

### 8.1 Beeps (default-on toggle: `Использовать звуковое уведомление`)

- Beep at 30 s mark (timer warning)
- Two clicks 3 s before timer end
- Siren on failed attempt

### 8.2 Voice announcements (`Озвучивать оценки судей` toggle)

RU/EN locale toggle: «Русский выкл / английский вкл».

| RU | EN |
|---|---|
| Вес взят | Lift accepted |
| Вес взят два к одному | Lift accepted, 2 to 1 |
| Попытка неудачная | No lift |
| Попытка неудачная два к одному | No lift, 2 to 1 |
| 30 секунд | 30 seconds |
| Время вышло | Time up |

⇒ **Confirms 3-judge majority model** with explicit 2-1 split-decision callout.

### 8.3 Music (toggle: `Использовать музыкальное сопровождение`)

- Background DJ playlist from local folder `C:\PowerTable_music`, plays at 80% volume
- Athlete personal MP3 (uploaded via `@PowerTable_bot` in PowerTable; via file picker in our model) plays at 100% during walk-in
- Auto-duck to 50% during attempt timer
- Player launched via `Создать плейлист / запустить плеер`

## 9. Awards ceremony (`Награждение`)

Dedicated full-screen route. Spec:

- Filter pane: meet, weight categories (F + M), age categories, disciplines, places (№1 / №2 / №3 / All)
- Variant toggle: Весовые / Абсолютка / Команды
- `Награждение с первого места` toggle (1→2→3 vs 3→2→1 sequence)
- `Запустить плеер с торжественной музыкой` button
- Right pane: scrolling list with columns `Дисциплина / Возраст / Пол / Упражнение / ВК / Спортсмен / А / Место / Команда`
- Big button «Следующий (пробел переключает на следующего)» — keyboard-driven advance

## 10. Print forms catalog (`Печатные формы`)

Top tabs: `Протоколы / Пустографки / Номинации / Судьи / Карточки / Расписание / Отчёты / Финансы / Справки`

`Протоколы` sub-sections:

### 10.1 Форма протоколов соревнований ФПР
- Подробный
- Сжатый
- Сокращённый
- Выгрузка в АСП Паурлифтинг

### 10.2 Форма для большого количества дисциплин
- Дисциплины на отдельном листе
- Дисциплины на одном листе

### 10.3 Выгрузка в LibreOffice
- Итоговый протокол
- Итоговый протокол (ENGLISH)

### 10.4 Federation-specific (each: Итоговый протокол + Выгрузка)
- WRPF / WEPF / WSF / СПР / ФЖД / WAF / CAP

### 10.5 Выгрузка протоколов
- `allpowerlifting.com v1 от 09.2020` — older XML format
- `Прямая через API allpowerlifting.com (на тестировании)` — REST integration in beta
- **`OpenPowerlifting`** — direct export to OpenPowerlifting.org's CSV format ⭐

⇒ PowerTable already exports to OpenPowerlifting. We should plan parity in V2.

## 11. Diploma printing (`Печать грамот`)

Six tabs: `Фильтры / Номинации / Рекорды / Команды / Тренеры / Сертификат участника`.

Filters: meet × weight cat (F + M) × age cat × discipline × places (№1 / №2 / №3 / All).

⇒ Diplomas exist for athletes (per nomination), records, teams, **coaches** (separate from teams), and generic participation certificates.

## 12. Broadcast endpoint catalog

40+ public HTTP views, all auth via `?user=&sk=&pomost=`.

### 12.1 Categorized

**Personal info windows / operator screens**
- Основное табло (`/tv?user=&pomost=&ver=isf`) — primary scoreboard

**Tables and windows**

| View | Purpose | Chromakey? |
|---|---|---|
| Рабочая таблица текущей группы | live work table | — |
| Рабочая таблица текущей группы (видео) | OBS/vMix embed | #00FF00 |
| Рабочая таблица предыдущей группы | auto on group switch | — |
| Рабочая таблица текущей группы (JSON) | third-party integration | — (sk-protected) |
| Последовательность выхода | flight order | — |
| Последовательность выхода (компактная) | small screen | — |
| Последовательность выхода (видео) | OBS embed | #00FF00 |
| Табло ассистентов | for plate loaders | — |
| Табло ассистентов вариант 2 (в линию) | inline layout | — |
| Оценки судей + таймер | combined | — |
| Информация о спортсмене на помосте | athlete card | — |
| Информация о спортсмене (видео) | OBS embed | #00FF00 |
| Информация + оценки + таймер | combined | — |
| Основное табло + диски | with belt-load visualization | — |
| Основное табло + диски + оценки | full | — |
| **Нижняя планка** (lower thirds) | TV-style overlay | #00FF00, 4 transitions: статичная / прячущаяся / уезжающая / растворяющаяся |
| Нижняя планка JSON | third-party | — |
| Рабочая таблица + последовательность | combined | — |
| Рабочая таблица + YouTube | for streamer | — |
| Рабочая таблица + последовательность + YouTube | full streamer console | — |
| Информация о спортсменах для ведущего | announcer/MC prompt | — |
| План соревнований на сегодня | schedule projector | — |
| План соревнований (видео) | OBS embed | #00FF00 |
| Переключатель сцен для OBS Studio | 5 scenes: `[Main] [Replay] [Nomination] [Table] [Plan]` | — |
| Уникальный ID текущей попытки | for replay servers | — |

**Composite views for projector**
- Рабочая таблица + оценки + табло ассистентов + основное табло
- + информация о спортсмене variant
- Multi-platform variants: «На 1 и 2 помосты» + mirrored «На 2 и 1 помосты»

**Awards**
- Награждение

**Judge remotes (no mobile app required)**
- Судейский пульт судьи СЛЕВА
- Судейский пульт ЦЕНТРАЛЬНОГО судьи
- Судейский пульт судьи СПРАВА

### 12.2 Architectural inferences

- Broadcasting is a **first-class product surface** — 40+ views, not an afterthought.
- All views are HTTP endpoints, designed for embed in OBS, vMix, projectors, browsers.
- OBS chromakey `#00FF00` is the standard pattern for compositing.
- 5 OBS scenes form the standard broadcast workflow (the OBS scene-switcher endpoint automates scene transitions).
- JSON endpoints exist for third-party integration (replay servers, custom scoreboards, mobile apps).
- Multi-platform broadcasts use mirrored layouts (1+2 vs 2+1) so the broadcast director can pick the leading platform.
- Judge remotes are URLs, not native apps. Each judge bookmarks one URL on a phone/tablet.

## 13. M5/M6 masters split — confirmed differentiator

PowerTable `Возрастные категории` tab (verbatim from screenshot):

| Category | от | до |
|---|---:|---:|
| Open | 13 | 99 |
| Sub-Juniors | 13 | 17 |
| Juniors | 18 | 22 |
| Masters M1 | 40 | 44 |
| Masters M2 | 45 | 49 |
| Masters M3 | 50 | 54 |
| Masters M4 | 55 | 59 |
| **Masters M5** | **60** | **99** |
| **Masters M6** | **99** | **99** (placeholder, never matches) |

Cross-check vs ISF v5.1 §10.9.4:

| Category | ISF v5.1 (correct) | PowerTable | PowerGage |
|---|---|---|---|
| Masters M5 | 60–69 → 1.125 | 60–99 → 1.125 | 60+ → 1.125 |
| Masters M6 | 70+ → 1.150 | 99–99 (dead) | absent |

⇒ **Both incumbents encode the pre-v5.1 single 60+ band.** Any 70-year-old athlete is scored against an outdated multiplier. This is the most user-visible correctness defect in both products and the largest single-decision differentiator for our V1.

See [decisions-v1.md](decisions-v1.md) D6 and [decisions-v2.md](decisions-v2.md) D26.

## 14. Disciplines catalog (verbatim from PowerTable)

22 entries with explicit formula assignment.

### 14.1 Classic (formula = `ISF points`)
- Классический стритлифтинг (двоеборье)
- Классическое отжимание на брусьях
- Классическое подтягивание

### 14.2 Multirep two-lift (formula = `Результат умножить на значение`)
- Многоповторный стритлифтинг 8/12 (total) — F sub-jr/jr/masters
- Многоповторный стритлифтинг 8/16 (total) — M youth (sub-jr)
- Многоповторный стритлифтинг 12/16 (total) — F open
- Многоповторный стритлифтинг 16/24 (total) — M jr/masters
- Многоповторный стритлифтинг 24/32 (total) — M amateur open
- Многоповторный стритлифтинг 32/48 (total) — M pro

### 14.3 Multirep single-lift PU (formula = `Результат умножить на значение`)
- Подтягивания с 8 / 12 / 16 / 24 / 32 kg

### 14.4 Multirep single-lift DI (formula = `Результат умножить на значение`)
- Отжимания с 12 / 16 / 24 / 32 / 48 kg

### 14.5 Reserved (disabled in V1 catalog, present in PowerTable)
- Выход силой классический (Muscle-Up — `Результат × значение`)
- Силовая калистеника (Многоборье) — `ISF points`
- Приседания со штангой классические — `Результат × значение`

⇒ Catalog confirms WC and barbell squat already exist as catalog rows in PowerTable, just disabled. Our `Exercise` enum should be designed extensibly for V3 (`MU`, `SQ`).

## 15. Weight categories (verbatim)

**Women** (7): 44, 48, 52, 56, 60, 67.5, +67.5 kg.

**Men** (12): **52***, 56, 60, 67.5, 75, 82.5, 90, 100, 110, 125, 140, +140 kg.

* M_52 has the explicit restriction «Доступно для: Юноши, девушки» — sub-juniors and juniors only. Senior men do not enter M_52.

## 16. Plate set (verbatim)

PowerTable `Диски` visualization shows the full default set:

50 / 25 / 20 / 15 / 10 / 5 / 2.5 / 2 / 1.5 / 1.25 / 1 / 0.75 / 0.5 / 0.25 kg.

PowerTable colors (display only):
- 50 = green, 25 = red, 20 = blue, 15 = yellow, 10 / 5 / sub-2.5 = white/gray

ISF v5.1 §6.6 colors (canonical):
- 25 = red, 20 = blue, 15 = yellow, **10 = green**, 5 = white

⇒ PowerTable's 50 = green is decorative only; the canonical ISF green is the 10 kg plate. We use ISF colors.

UI helper text in `Диски` tab: «весь снаряд заполняется 25 кг блинами, затем 20, 15, 10, 5, 2.5 и рекордные» — confirms the standard fill order.

Per-bar tab: `Грифы` (bar weight + collar weight) — irrelevant for streetlifting (belt loading, no bar). Used only for WC squat.

## 17. Other findings

### 17.1 Multi-stage meets

`Этапы соревнований` tab supports linking multiple competitions into stages:
- Toggle «Это финал этапов соревнований»
- Cross-federation linking via `Код соревнования из другой федерации`
- `Пересчитать итоги соревнования + командного первенства + тренерского первенства` — separate **тренерское первенство** alongside `Команды`
- Custom diploma templates per absolute classification, with English variants

V2/V3 feature, out of V1.

### 17.2 Test meets

`Это тестовое соревнование` toggle (≤10 nominations, no records, no ratings). Useful UX pattern for onboarding/training a new operator — borrowable for our V1.

### 17.3 Document attachments per nomination

`Файлы` tab on the meet form — per-meet anti-doping cert + insurance + medical clearance management.

### 17.4 Server-quality monitor (re-confirms v3 §6.2)

The PowerTable client displays «Среднее значение качества связи с сервером [295мс]» permanently in the sidebar. Confirms the online-only architecture: the client cannot operate without the server. Our offline-first PWA + Tauri model is the disruption story.

### 17.5 Telegram is deeply integrated

«Список кодов авторизации в телеграм» appears in three places:
- Athletes (`Номинации спортсменов`)
- Judges (`Номинации судей`)
- Athlete personal walk-in music upload (via `@PowerTable_bot`)

Plus per-meet/per-nomination Telegram notifications throughout. **PowerTable replaces ~80% of operator UX with Telegram bot interactions** — a key part of how a single developer (Тополь Д.Г.) sustains 4,889 cumulative meets.

V3 candidate; out of V1/V2 product scope.

## 18. Cross-references to blueprint v2

| Blueprint v2 § | Driven by v4 finding |
|---|---|
| §3.5 (JudgeVotes) | §5.3 + §8.2 (3-judge URLs + split-decision audio) |
| §3.6, §3.7 (ClassicAttempt, MultirepAttempt) | §5.3 (judgeVotes replaces status) |
| §3.9 (Entry — country, reweighKg, disciplineCode) | §3, §4 (PowerTable Athlete + Nomination shape) |
| §3.10 (MeetState — enabledDisciplineCodes, lowerBodyweightFirstTiebreak) | §6, §14 (Stream/Group + discipline catalog) |
| §3.10 (Plate.recordOnly) | §16 (extended plate set) |
| §4.1 (forecast()) | §7.1 (4 forecast columns) |
| §6.2 (Meet Setup tabs) | §7 (mirrors PowerTable form structure) |
| §6.6 (Judging UI layout) | §7.2 (operator screen verbatim) |
| §6.7 (Results — OpenPowerlifting export) | §10.5 |
| §6.8 (Awards ceremony) | §9 |
| §V3 (broadcast publisher) | §12 (broadcast catalog) |

## 19. Risks and caveats

- **Static-only**: We did not interact with the live client beyond viewing screenshots. Exact JSON shapes of save/export are still unknown.
- **Some PowerTable fields are conjectural** based on column abbreviations (e.g., `Ш`, `Г`, icon meanings). Treated as informational, not authoritative.
- **M5/M6 evidence**: PowerTable shows 60–99 / 99–99 in the editable category list; whether their **scoring engine** still applies pre-v5.1 multipliers is inferred from the matching PowerGage `.proc` evidence and not directly verified by running their calculation.
- **Broadcast catalog evidence is text-only** (URL list). Actual rendered HTML structure of each view is not captured.
- **Auth via `sk` token**: we observed but did not test the security model. The shared token may be additionally protected by IP whitelisting (`Автоматическое IP-whitelisting` per PowerTable changelog 2025-11-07) — verify before assuming bare-link access.

## 20. One-line summary

PowerTable's installed client and broadcast catalog confirm: the rule-engine is partially incorrect (M5/M6 against ISF v5.1), the entity model is richer than our v1 blueprint (Athlete↔Nomination split, Stream/Group, Judge entity with 3 remotes, Forecast columns, Sport-rank computation), and the broadcast layer is a 40+-view first-class product surface that we explicitly defer to V3.
