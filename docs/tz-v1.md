# Техническое задание — Streetlifting OS v1.0

Версия: 1.0
Дата: 2026-04-26
Статус: ратифицировано, готово к началу разработки Sprint 1

---

## 0. Метаинформация документа

Данное ТЗ — **канонический документ** для разработки Streetlifting OS. Все технические детали, типы данных, бизнес-правила, decisions и т.д. зафиксированы в подчинённых документах (см. §16). Настоящее ТЗ агрегирует требования и связывает их со sprint-планом.

**Иерархия документов проекта**:

```
ТЗ v1.0 (этот документ — общее требование)
   ├── architecture-v1.md (архитектура системы)
   ├── openlifter-isf-implementation-blueprint-v2.md (доменная модель + Sprint backlog)
   ├── rules-pack-spec-v1.md (формат Rules Pack)
   ├── decisions-v1.md (D1–D12)
   ├── decisions-v2.md (D13–D29)
   ├── decisions-v3.md (D30–D40)
   └── findings/ (powergage-findings-v1, powertable-findings-v1..v4, reference-comparison-v1)
```

При расхождении: подчинённые документы детализируют ТЗ; ТЗ имеет приоритет на стратегические вопросы (scope, монетизация, позиционирование). При технических расхождениях источник истины — последний по версии документ.

---

## 1. Введение и определения

### 1.1 Назначение продукта

**Streetlifting OS** — программная платформа для проведения соревнований по стритлифтингу и силовой калистенике, ориентированная на национальные, региональные и международные федерации.

### 1.2 Ключевые принципы

| Принцип | Расшифровка |
|---|---|
| **Offline-first** | Клиент в день турнира работает без сети. Сетевые сбои не останавливают мит. |
| **Multi-federation** | Платформа агностична к федерации; ISF — якорный партнёр, но не единственный. |
| **Pay-per-nomination** | Монетизация через предоплаченный счёт квоты номинаций. Бесплатной версии нет. |
| **Cryptographic provenance** | Save-файлы митов криптографически подписаны end-to-end (federation key + sanctioning cert). |
| **ISF-correctness** | Правила ISF v5.1 от 2025-08-01 — единственная источник истины для V1; M5/M6 split по 70+ соблюдается (отличает нас от PowerTable + PowerGage). |

### 1.3 Глоссарий

| Термин | Определение |
|---|---|
| **Мит** (соревнование) | Одно физическое соревнование с фиксированной датой и местом |
| **Номинация** | Заявка одного атлета на одну дисциплину одного мита; единица оплаты |
| **Дисциплина** | Тип состязания (Classic 2-lift, Multirep 16/24, single PU/DI/MU/SQ, и т.д.) |
| **Помост (platform)** | Физическое место выполнения подходов; мит может иметь несколько помостов параллельно |
| **Поток (stream)** | Время-bounded блок мита: одна дисциплина-кластер на одном помосте в одно время |
| **Группа (group)** | Подмножество номинаций внутри потока, выполняющих подходы последовательно |
| **Rules Pack** | Версионированный, подписанный JSON-документ, описывающий правила одной федерации |
| **Sanctioning** | Процедура одобрения мита федерацией для зачёта рекордов и рейтингов |
| **Athlete Passport** | Кросс-федерационная идентичность атлета, выпускается платформой |
| **Federation Authority (Layer −1)** | Per-federation control plane (V3+): sanctioning, records, audit |
| **Operator** | Пользователь клиента (секретарь, главный судья, мандатная комиссия) |
| **МК / НК / РК** | Международная / Национальная / Региональная судейская категория |

---

## 2. Цели и стратегическое позиционирование

### 2.1 Бизнес-цели

| Год | Цель |
|---|---|
| **Год 1 (V1+V2)** | 1 федерация (ISF) live, 50+ митов, 5,000+ номинаций, $5,000–25,000 GMV |
| **Год 2 (V3)** | 4 федерации (ISF, WSF, НАП, FinalRep), 200+ митов, 25,000+ номинаций, 5+ стран, $50–200K GMV |
| **Год 3 (V4+V5)** | 15+ федераций, 1,000+ митов, 200,000+ номинаций, 20+ стран, $500K–2M GMV; запуск WC; первые WC мировые рекорды |

### 2.2 Стратегическое позиционирование (D33)

**ISF-anchored multi-federation платформа**:
- ISF — якорный партнёр (co-branding, revenue share по sanctioning, privileged tier)
- Другие федерации (WSF, НАП, FinalRep, мелкие) — равноправные коммерческие клиенты с изолированными rules packs
- Платформа независима (не принадлежит ISF) — модель Stripe для платежей

### 2.3 Конкурентные преимущества vs существующие продукты

| Конкурент | Их слабость | Наше преимущество |
|---|---|---|
| **PowerTable** (powertable.ru) | Online-only, plain HTTP, bus factor 1, **некорректный M5/M6 split** | Offline-first, multi-federation, корректные правила ISF v5.1 |
| **PowerGage** | Windows-only, Firebird 2.5, multi-federation через schema overload, **некорректный M5/M6** | Cross-platform, нативная ISF-схема, корректные правила |
| **OpenLifter** | Powerlifting-only, AGPL, нет ISF-доменной модели | Native ISF/WC модель, коммерческая лицензия |

**Ключевой correctness-differentiator**: правильный split Masters M5 (60–69) / M6 (70+ → 1.150) по ISF v5.1 §10.9.4. Это означает что **любой атлет 70+ лет** в PowerTable и PowerGage сейчас оценивается по устаревшему коэффициенту.

### 2.4 Ограничения области (то, что мы НЕ делаем)

- Не паурлифтинг (S/B/D, bench-only, DL-only) — занято PowerGage'ом
- Не армлифтинг, не OCR, не strongman — adjacent sports, не в scope V1–V5
- Нет бесплатной open-source версии (D30)
- Нет live cloud sync рабочего состояния во время мита (нарушит offline-first)
- Нет Telegram-бот интеграции (тяжёлая поддержка, low margin)
- Нет нативных мобильных приложений (заменены PWA + judge-remote URLs)
- Нет federation CRM / биллинга для нужд федерации (платформа выдаёт invoice-данные через API)

---

## 3. Стейкхолдеры

| Роль | Тип | Что хочет |
|---|---|---|
| **ISF центр** | Anchor partner | Co-branding, revenue share, контроль над ISF-санкционированными митами, корректные правила |
| **Национальные федерации** (РФ, PL, NL, DE, и т.д.) | Customer | Per-federation rules pack, локализация, изолированные данные, sanctioning по своим правилам |
| **WSF / НАП / FinalRep** | Customer | Equal commercial terms, separate rules packs, separate records authority |
| **Секретарь федерации** | Operator user | Регистрация атлетов, мандатная комиссия, расписание, отчёты |
| **Главный судья** | Operator user | Запуск судейства, контроль таймеров, сбор голосов 3 судей |
| **Судья (3 на помосте)** | Operator user | Голос «Зачёт / Не зачёт» через свой judge-remote URL |
| **Атлет** | End-user (passive в V1, active в V3+) | Personal results, athlete passport (V3), records tracking |
| **Тренер** | End-user | Просмотр live-результатов и forecast по своим атлетам |
| **Зритель / трансляция** | End-user | Public protocol page, OBS-friendly views (V3) |
| **Антидопинг-инспектор** | Federation user (V4+) | Логи проб, статусы дисквалификаций |
| **Мы (Streetlifting OS)** | Platform owner | Per-nomination revenue, sanctioning fees, минимальный operating overhead |

---

## 4. Область / Scope по версиям

### 4.1 V1 — Sprints 1–3 (Q3 2026)

**В скоупе**:
- Стритлифтинг: Classic 2-lift (3 попытки PU + 3 попытки DI), single Classic PU/DI; Multirep 2-lift (6 комбо), single Multirep PU/DI
- Дисциплины: 22 catalog (D24); веса: 19 категорий (D28); возраста: 9 категорий (D27)
- Workflow одного мита, один помост, один день, оффлайн
- Save/load JSON-файла с stateVersion: "2"
- 3-судья модель голосования (D15)
- Forecast service interface (stub в V1)
- ru-RU + en-US локализация
- Tauri desktop (Win/macOS/Linux) + PWA fallback

**НЕ в скоупе V1**:
- Backend (нет облачных сервисов)
- Multi-federation (только ISF v5.1 hardcoded)
- Sanctioning workflow
- Audio system (placeholder beep only)
- Awards ceremony view
- Broadcast publisher
- Athlete passport
- Multi-platform / multi-day (модель данных поддерживает, UI не реализует)
- Stream/Group entities (только flag-string для группировки)
- Sport rank computation
- Records archive
- WC sport (типы зарезервированы per D39)

### 4.2 V2 — Sprints 4–6 (Q4 2026)

- Backend launches: Layer 0 (billing) + Layer 3 (save-file backup + reconciliation)
- Pre-paid quota mechanism (D31)
- License JWT issuance + validation
- Stripe + YooKassa интеграция (D40.4 определит юр. лицо для платёжных систем)
- RulesPack abstraction extraction; ISF v5.1 → формальный Pack
- Audio system: beeps + RU/EN voice announcements (D18)
- Awards ceremony view (D19)
- OpenPowerlifting CSV export (паритет с PowerTable)
- Federation onboarding portal (private, ISF-only)
- Forecast UI columns (full implementation)
- Sport rank computation (D17)

### 4.3 V3 — Sprints 7–9 (Q1–Q2 2027)

- Multi-federation: WSF + НАП onboarding (D34)
- Cross-federation Athlete Passport (D37)
- Sanctioning workflow + Ed25519 cryptographic signing (D38)
- Layer −1 (Federation Authority) launches: ISF Central + WSF Central
- Broadcast publisher (Layer 4) — local HTTP server в Tauri (D20)
- OBS chromakey HTML modes (D21)
- Multi-platform broadcast layouts (D22)
- Public share-link sk-token model (D23)
- Stream/Group entities + auto-duration scheduling (D14)
- Multi-stage meets (Этапы соревнований)
- Records DB per federation
- Public protocol pages

### 4.4 V4 — Sprints 10–12 (Q3–Q4 2027)

- FinalRep + smaller federations onboarding
- **Weighted Calisthenics sport launch** (D35)
- WC tetrathlon (Muscle-Up + Pull-Ups + Dips + Barbell Squat)
- WC records per ISF
- Audit & enforcement dashboard
- Judge certification system
- Anti-doping coordination (WADA scope зависит от D40.7)
- Regional ISF instances (RU, CN если необходимо)

### 4.5 V5+ — Q1 2028 и далее

- Federated records (cross-federation recognition)
- Open self-serve federation publishing portal
- Mobile companion app (только если телеметрия покажет ≥10% спрос)
- Регулярные обновления Rules Packs

---

## 5. Функциональные требования V1 (детально)

### 5.1 Регистрация мита

**FR-V1-001** Оператор может создать новый мит, указав: название, дату, город, страну, формат соревнования (Classic / Multirep), федерация (ISF в V1).

**FR-V1-002** При создании мита автоматически загружается preset ISF v5.1 со всеми справочниками: 22 дисциплины, 19 весовых категорий, 9 возрастных, default plate set, default timers (60s Classic, 120s Multirep).

**FR-V1-003** Оператор может включить/отключить отдельные дисциплины из catalog для своего мита.

**FR-V1-004** Оператор может включить/отключить отдельные весовые категории и возрастные категории.

**FR-V1-005** Оператор может редактировать plate set (добавить/убрать диски, изменить количество).

**FR-V1-006** Поддерживается флаг `lowerBodyweightFirstTiebreak: boolean` в meet config.

### 5.2 Регистрация атлетов

**FR-V1-010** Оператор может создать запись об атлете со следующими полями: ФИО, пол, дата рождения, division, страна, team, member ID, guest-flag, instagram, notes.

**FR-V1-011** Оператор может указать дисциплину, к которой регистрирует атлета (из включённых на мите).

**FR-V1-012** Оператор может назначить атлету day/platform/flight (строки в V1; полноценные сущности в V3).

**FR-V1-013** Поддерживается CSV-импорт списка атлетов с маппингом на наши поля.

**FR-V1-014** Поддерживается CSV-экспорт списка регистраций.

### 5.3 Взвешивание

**FR-V1-020** Оператор может ввести bodyweight атлета с точностью 0.1 кг (D12).

**FR-V1-021** Опционально оператор может ввести reweighKg (повторное взвешивание для разрешения tied placing) (D2A.2).

**FR-V1-022** При вводе bodyweight автоматически назначается weight category по правилу `bodyweight ≤ upper_bound` (D12, ISF §7.2).

**FR-V1-023** Возрастная категория автоматически вычисляется из birthDate относительно даты мита; M_52 (мужская) доступна только для youth/junior.

**FR-V1-024** При попытке зарегистрировать на M_52 атлета не из youth/junior — UI показывает предупреждение и блокирует.

### 5.4 Жеребьёвка и порядок выступления

**FR-V1-030** Оператор может выполнить жеребьёвку (присвоить lot numbers).

**FR-V1-031** Порядок выступления для Classic: declared weight ASC → bodyweight ASC (или ID surrogate per `lowerBodyweightFirstTiebreak`) → declaration time ASC (D2B).

**FR-V1-032** Порядок для Multirep — manual fixed order (V1; auto-sort не реализуется).

**FR-V1-033** Оператор может печатать (HTML print) flight order по дисциплине.

### 5.5 Судейство — Classic

**FR-V1-040** Судейский экран показывает текущего атлета, дисциплину, ВК, заявленный вес, текущую попытку.

**FR-V1-041** Запуск 60-секундного таймера большой кнопкой (60s START).

**FR-V1-042** При запуске таймера — звуковой сигнал старта (placeholder beep в V1).

**FR-V1-043** Каждый из 3 судей (left/center/right) может проголосовать «Зачёт» / «Не зачёт» через своё UI-окно (3 карточки в V1; отдельные URL — V3).

**FR-V1-044** Aggregate-кнопки «Зачёт всем» / «Не зачёт всем» (для случаев, когда оператор официально один — устанавливают все 3 голоса в одно значение).

**FR-V1-045** Status попытки автоматически вычисляется из judgeVotes (D15): 2+ true → success, 2+ false → fail, иначе pending.

**FR-V1-046** UI показывает «2-1» badge при split decision.

**FR-V1-047** Record toggle помечает попытку как record-attempt (slot 4 для Classic per D11).

**FR-V1-048** Защита от 1-минутного timeout: если weight не задеклорирован за 60s после предыдущей попытки — auto-progression (D9): после успеха +2.5 kg, после неудачи — повтор веса.

### 5.6 Судейство — Multirep

**FR-V1-050** Multirep экран: текущий атлет, preset load, 120-секундный таймер.

**FR-V1-051** Поле для ввода количества выполненных reps в конце попытки.

**FR-V1-052** Опциональное поле noRepCount (количество дисквалифицированных reps, не считаются в результат).

**FR-V1-053** 3-судья модель голосования (как в Classic) — голосуют за всю попытку, не per-rep.

### 5.7 Расчёт результата

**FR-V1-060** **Classic**: per-exercise = best successful declared load; total = bestPU + bestDI; unit = kg.

**FR-V1-061** **Multirep**: per-exercise = reps; total = repsPU + repsDI; unit = reps.

**FR-V1-062** **ISF Points** (D6, D7, D26):
- coefficient × result = base points
- × masters multiplier (M1: 1.025, M2: 1.050, M3: 1.075, M4: 1.100, **M5: 1.125 (60–69), M6: 1.150 (70+)**)
- + additional points = `(bodyweight − limit) × 0.5` if bw > limit, else 0
- M: PU 90 / DI 100 / PUDI 95; F: PU 55 / DI 65 / PUDI 60

**FR-V1-063** Forecast service возвращает stub-значения (current real values для place + coefficient; null для kg-to-first и predicted-absolute) — D16.

### 5.8 Размещение (placing)

**FR-V1-070** Placing tiebreak (D2A): lighter bodyweight → lighter reweigh → shared place + next vacant.

**FR-V1-071** Guest-атлеты не размещаются (`Entry.guest = true` исключаются из placing).

**FR-V1-072** Result === 0 — атлет не размещается официально.

**FR-V1-073** Place assignment корректно обрабатывает ties: emit shared place, skip next place number.

### 5.9 Результаты и экспорт

**FR-V1-080** Список результатов с группировкой по category / age category / weight category / ISF points.

**FR-V1-081** Экспорт CSV (UTF-8) с полным набором колонок мита.

**FR-V1-082** HTML print views для протоколов (browser print to PDF).

**FR-V1-083** Forecast columns скрыты по умолчанию в V1 (data-stub присутствует).

### 5.10 Save / Load

**FR-V1-090** Сохранение мита в JSON-файл на локальный диск через Tauri filesystem API.

**FR-V1-091** Загрузка ранее сохранённого JSON-файла с автоматической migration v1→v2 при необходимости.

**FR-V1-092** Save-файл содержит `versions: { stateVersion: "2", releaseVersion }`.

**FR-V1-093** Save-файл содержит stub-поля per D31 для V2 backend integration: `licenseTokenId: null`, `quotaAllocationId: null`, `billedNominationIds: []`, `signature: null`.

**FR-V1-094** Migration v1→v2 (если кто-то откроет файл старого формата): см. blueprint v2 §10.2.

### 5.11 Локализация

**FR-V1-100** UI поддерживает ru-RU и en-US.

**FR-V1-101** Переключение языка из настроек приложения, сохраняется в localStorage.

**FR-V1-102** Все строки UI вынесены в i18n-bundles; ни одной hardcoded строки в коде.

---

## 6. Нефункциональные требования

### 6.1 Производительность

**NFR-PERF-001** Время холодного старта клиента ≤ 3s на современном (2024+) ноутбуке.

**NFR-PERF-002** Открытие save-файла мита на 200 атлетов ≤ 2s.

**NFR-PERF-003** Расчёт результатов (incl. ISF points + placing) для мита 200 атлетов ≤ 200ms.

**NFR-PERF-004** UI-отзывчивость в момент судейства: latency Зачёт/Не зачёт → визуальное обновление ≤ 100ms.

**NFR-PERF-005** Размер Tauri-инсталлятора ≤ 30 MB.

### 6.2 Offline-first guarantees

**NFR-OFFLINE-001** Клиент в день турнира **не делает blocking-запросов к серверу**.

**NFR-OFFLINE-002** Все данные мита хранятся локально (IndexedDB + JSON файлы).

**NFR-OFFLINE-003** Если сеть пропала во время мита — функциональность не деградирует.

**NFR-OFFLINE-004** License JWT и quota allocation скачиваются ДО мита; их валидность проверяется один раз на старте.

**NFR-OFFLINE-005** Ongoing-мит **не блокируется** при истечении JWT; блокируется только создание новых митов.

### 6.3 Безопасность

**NFR-SEC-001** Save-файлы хранятся в plaintext JSON в V1 (без шифрования). V2 — опциональное шифрование per federation policy.

**NFR-SEC-002** Save-файлы подписываются Ed25519 federation key + sanctioning cert (V2+).

**NFR-SEC-003** License JWT хранится в Tauri secure storage (не в localStorage в V2+).

**NFR-SEC-004** TLS 1.2+ обязателен для всех HTTP-вызовов клиента.

**NFR-SEC-005** Никакого PII атлетов в URL / query string / referrer log.

**NFR-SEC-006** API-ключи backend никогда не embedded в клиент; используются только OAuth + JWT.

### 6.4 Совместимость и платформы

**NFR-COMPAT-001** Desktop platforms: Windows 10+ (x64, arm64), macOS 12+ (Intel + Apple Silicon), Linux (Ubuntu 22.04+, Fedora 38+, AppImage universal).

**NFR-COMPAT-002** PWA fallback: Chrome 110+, Firefox 110+, Edge 110+, Safari 16+.

**NFR-COMPAT-003** Mobile (V3+): только PWA; native apps не планируются до V5+.

### 6.5 Локализация и i18n

**NFR-I18N-001** ru-RU + en-US в V1 (D34 wave 1: PL, UA, BY, KZ — V2; DE, FR, ES, IT, NL — V2; азиатские — V3).

**NFR-I18N-002** Date / number / currency forматирование через `Intl` API соответствующего locale.

**NFR-I18N-003** Federation pack может override default locale для своих операторов.

### 6.6 Доступность

**NFR-A11Y-001** WCAG 2.1 AA минимум для всех ключевых экранов (judging, registration, results).

**NFR-A11Y-002** Keyboard-driven workflow для judging (chord-shortcuts: Q/W/E для left/center/right vote).

**NFR-A11Y-003** Контрастность кнопок Зачёт / Не зачёт ≥ 4.5:1.

**NFR-A11Y-004** Screen-reader-friendly labels для критических элементов (timers, vote buttons).

### 6.7 Compliance

**NFR-COMPLY-001** GDPR (EU): Paddle как Merchant of Record (handles VAT + DPA), V2+.

**NFR-COMPLY-002** ФЗ-152 (РФ): self-host опция для российских федераций; персональные данные хранятся в РФ ДЦ.

**NFR-COMPLY-003** Sanctions check: блокировка федераций из подсанкционных юрисдикций (RU/BY на Stripe → fallback на YooKassa).

**NFR-COMPLY-004** Возрастной контроль: атлеты моложе 13 лет не регистрируются (ISF v5.1 — Open от 13).

### 6.8 Maintainability

**NFR-MAINT-001** Test coverage ≥ 80% для domain-логики (logic/isf/*).

**NFR-MAINT-002** TypeScript strict mode mandatory для всех файлов.

**NFR-MAINT-003** Все public API доменных сервисов задокументированы JSDoc.

**NFR-MAINT-004** Все строковые литералы проходят через i18n (нет hardcoded UI-текста).

**NFR-MAINT-005** Save-file format обратно совместим: открытие save-файла любой версии ≥ stateVersion: "1" должно работать через цепочку миграций.

---

## 7. Архитектура системы

См. полное описание в [architecture-v1.md](architecture-v1.md). Краткая сводка:

### 7.1 Шесть слоёв системы

| Слой | Назначение | Версия запуска |
|---|---|---|
| **−1. Federation Authority** | Per-federation control plane: sanctioning, records, audit, judge certification | V3 |
| **0. Account + Billing** | Federation accounts, payment, license JWT, quota allocation, reconciliation | V2 |
| **1. Client** | Tauri + React PWA. Offline-first. Domain logic, save/load, judging UI | V1 |
| **2. Multi-Federation Rules CDN** | Versioned, signed Rules Packs (Cloudflare R2 + Workers) | V1 (embedded) / V2 (CDN fetch) |
| **3. Save-File + Reconciliation** | Long-term storage, billing reconciliation, records extraction, public protocols | V2 |
| **4. Broadcast Publisher** | Local HTTP server в Tauri: OBS-friendly views, judge remotes | V3 |

### 7.2 Поток данных в день мита

1. Pre-meet (online): federation tops up → client pulls license + quota
2. Meet day (offline OK): client decrements local quota, signs save-file локально
3. Post-meet (online): save-file uploads → backend reconciles → balance debited

---

## 8. Технологический стек

### 8.1 Layer 1 (Client) — V1

| Слой | Выбор | Версия |
|---|---|---|
| Build | Vite | 5.x |
| Framework | React | 18.x |
| Language | TypeScript strict | 5.x |
| State | Redux Toolkit + RTK Query | 2.x |
| Router | react-router | 7.x |
| UI kit | Mantine | 7.x |
| Forms | react-hook-form + zod | latest |
| i18n | react-i18next | latest |
| Storage | Dexie (IndexedDB) | 4.x |
| Tests (unit) | Vitest | latest |
| Tests (e2e) | Playwright | latest |
| Desktop wrapper | Tauri | 2.x |
| PWA | vite-plugin-pwa | latest |
| Crypto (V2+) | ed25519-dalek (Rust side) | latest |

### 8.2 Layer 0, 2, 3 (Backend) — V2+

| Слой | Выбор |
|---|---|
| API runtime | Cloudflare Workers |
| Database | Cloudflare D1 |
| Object storage | Cloudflare R2 |
| Auth | JWT (HS256 ops; ES256 signed certs) |
| Email | Resend |
| Payment INTL | Stripe |
| Payment RU/CIS | YooKassa |
| Payment EU (VAT) | Paddle |

### 8.3 Layer −1 (Federation Authority) — V3+

Per-federation Cloudflare Workers + D1 + R2; Durable Objects для real-time monitoring.

### 8.4 Layer 4 (Broadcast Publisher) — V3+

Rust `axum` HTTP server bundled inside Tauri.

---

## 9. План реализации

### 9.1 Sprint 1 — Foundation + Classic Domain (4 недели)

**Цель**: Доменное ядро Classic + save/load + presets.

**Backlog (10 items)** — см. [openlifter-isf-implementation-blueprint-v2.md](openlifter-isf-implementation-blueprint-v2.md) §14:
1. Bootstrap клиента (Vite + React + TS + Redux + Tauri)
2. Доменные типы (incl. JudgeVotes, Discipline, ForecastResult, extended Plate, Entry с country/reweighKg/disciplineCode)
3. ISF v5.1 presets (disciplines D24, ages D27, weights D28, plates D25, multirep loads D3)
4. Save/load с stateVersion: "2" + migration v1→v2
5. Registration CRUD
6. Weigh-in для Classic
7. Result calculation для Classic (с правильным M5/M6 split per D26)
8. Classic order logic (D2B 3-level tiebreak)
9. Judge votes domain (D15)
10. Forecast service stub (D16)

**Definition of Done**:
- Можно создать Classic мит из preset, save/load
- Можно регистрировать атлетов, взвешивать
- Можно вычислять best results, totals, ISF points
- Domain unit tests covering: tiebreaks, masters multipliers (boundary at 60/69/70/80), additional points, judge vote aggregation (3-0/2-1/1-2/0-3)

### 9.2 Sprint 2 — Classic Judging UI + Results (4 недели)

**Цель**: Полноценный Classic мит end-to-end.

**Backlog**:
- Judging screen layout (60s timer, big buttons, Record toggle, 3-judge vote cards)
- 60-second timer with placeholder beep
- Belt-load visualization
- Results views (by category, by ISF points)
- Classic CSV export (UTF-8)
- Judge vote UI (3 cards / chord shortcuts Q/W/E)
- Forecast columns (hidden by default)
- Regression tests

**Definition of Done**: полноценный Classic мит можно симулировать end-to-end локально.

### 9.3 Sprint 3 — Multirep (4 недели)

**Цель**: Multirep module.

**Backlog**:
- Multirep preset config UI
- One-attempt timed workflow с 120s таймером
- Reps / no-rep result entry
- Multirep results + placing
- Multirep ISF points (formula = `result_x_coefficient`)
- Multirep CSV export
- Regression tests

**Definition of Done**: полноценный Multirep мит end-to-end.

### 9.4 Sprint 4–6 — V2 (3 sprints, ~12 недель)

- Sprint 4: Backend launches (Layer 0 + 3) + RulesPack abstraction
- Sprint 5: Audio (D18) + Awards (D19) + OpenPowerlifting export + Forecast UI full
- Sprint 6: Federation onboarding portal (private) + sport rank computation (D17)

### 9.5 Sprint 7–9 — V3 (3 sprints, ~12 недель)

- Sprint 7: Athlete Passport + sanctioning workflow + crypto signing
- Sprint 8: Layer −1 (ISF Central + WSF Central) + Stream/Group entities
- Sprint 9: Broadcast publisher (Layer 4) + WSF & НАП onboarding

### 9.6 Sprint 10–12 — V4 (3 sprints, ~12 недель)

- Sprint 10: WC sport (Muscle-Up + Squat) — domain logic + UI
- Sprint 11: WC records + tetrathlon scoring + audit dashboard
- Sprint 12: FinalRep + smaller federations onboarding + judge certification

---

## 10. Критерии приёмки

### 10.1 Sprint 1 acceptance

- [ ] Tauri-приложение собирается под Win/macOS/Linux, открывается, показывает Home screen
- [ ] Можно создать новый мит ISF Classic, сохранить, открыть в новой сессии
- [ ] Регистрация 50+ атлетов работает, CSV import ≥ 100 строк проходит
- [ ] Взвешивание с reweighKg для нескольких атлетов
- [ ] Result calculation корректен на reference fixtures:
  - `classic-small-meet.json` (3 атлета, ручная проверка)
  - `classic-tie-break.json` (BW + reweigh tiebreaks)
  - `classic-masters-m5-m6.json` (атлеты 60, 69, 70, 80 — multipliers 1.125, 1.125, 1.150, 1.150)
  - `classic-judge-split-decision.json` (2-1 lift и 1-2 fail)
- [ ] Все unit-тесты domain-логики проходят с coverage ≥ 80%
- [ ] Save-файл содержит все предусмотренные поля (incl. stub-поля для V2 backend)

### 10.2 Sprint 2 acceptance

- [ ] Judging UI работает с keyboard shortcuts (Q/W/E для голосов)
- [ ] Таймер 60s показывает обратный отсчёт с миллисекундной точностью
- [ ] Beep на 30s mark и terminal beep
- [ ] Belt-load visualization рендерит правильную раскладку плит
- [ ] Results views корректны на тестовых митах
- [ ] CSV export проходит UTF-8 валидацию

### 10.3 Sprint 3 acceptance

- [ ] Multirep preset auto-fills loadKg по division × sex × age
- [ ] 120s таймер
- [ ] Reps + no-rep entry
- [ ] Multirep results = `repsPU + repsDI`, корректный ISF points расчёт

### 10.4 V2 acceptance

- [ ] Federation может пополнить баланс через Stripe/YooKassa
- [ ] License JWT issued и используется клиентом
- [ ] Quota allocation работает offline (decrement локально, reconcile post-sync)
- [ ] Save-file uploaded к Layer 3 успешно verified (signature)
- [ ] RulesPack загружается с CDN (с fallback на embedded)
- [ ] Audio system: beeps + voice (RU+EN)
- [ ] Awards screen работает с keyboard advance

### 10.5 V3 acceptance

- [ ] Sanctioning workflow end-to-end (draft → submit → review → approve → certificate issued)
- [ ] Save-files signed, tampering detection работает
- [ ] Athlete Passport — атлет может быть зарегистрирован одновременно в ISF и WSF mites
- [ ] Broadcast publisher отдаёт рабочую таблицу + judge remotes на localhost
- [ ] WSF и НАП митs можно проводить с своими rules packs
- [ ] OBS chromakey #00FF00 views рендерятся

---

## 11. Риски и mitigation

| Риск | Вероятность | Влияние | Mitigation |
|---|---|---|---|
| ISF не одобряет позиционирование «ISF-anchored» | Средняя | Блокирует D33 | Engage ISF leadership на ранней стадии; co-design Pack с rule committee |
| WSF / FinalRep отказываются (loyalty к PowerTable) | Средняя | Замедляет V3+ | Lead with offline + correctness story; пилотный мит бесплатно |
| Cloudflare outage в день турнира | Низкая | Оператор паникует | Не имеет значения — клиент offline-first; влияет только на pre-/post-sync |
| Stripe/YooKassa account suspended | Средняя | Платежи блокируются | Dual stack payment processors; manual invoicing fallback |
| Federation root key compromise | Низкая | Tampered save-files indistinguishable | Key rotation procedure; HSM для top federations |
| GDPR enforcement action | Средняя | Штрафы + brand damage | Paddle как Merchant of Record (handles tax + DPA) |
| Open-source clone клиента | Высокая | Erodes per-nomination revenue | Defensive moat — sanctioning + records + chain-of-trust legitimacy (clone не имеет cryptographic provenance) |
| Multi-federation politics (A требует drop B) | Средняя | Operational headache | D33 anchor model: ISF approval rights, не veto; documented platform-neutrality stance |
| Sprint 1 переезд на multi-federation refactor | Низкая | Технический долг | Type-system reservations per D39 уже в Sprint 1 — V2 refactor чисто механический |
| Корректность M5/M6 не обнаруживается рынком | Средняя | Differentiator не раскручивается | Marketing focus: side-by-side comparison с PowerTable на тесте 70-летнего атлета |

---

## 12. Ресурсы и бюджет

### 12.1 Команда (минимальная для V1)

| Роль | Загрузка | Sprint 1–3 |
|---|---|---|
| Tech lead / архитектор | 100% | full |
| Frontend developer (React + TS) | 100% | full |
| Rust developer (Tauri) | 50% | partial (auto-update + crypto setup) |
| QA / tester | 50% | partial (Sprint 2 onwards) |
| Designer | 30% | Sprint 2 (judging UI) |
| Translator (ru/en review) | one-off | Sprint 3 |

### 12.2 Стоимость инфраструктуры (V1: ~$0/мес; V2: ~$50/мес)

- V1: только GitHub Releases, локальные сборки — $0
- V2: Cloudflare Workers/D1/R2 free tier; Stripe transaction fees; Resend $0–10
- V3+: scaling proportional к федерациям; ~$10–50 per federation per month

### 12.3 Open questions для бюджетирования (D40)

- D40.1 Pricing tier — определяет revenue model
- D40.4 Юр. лицо — определяет accountancy + tax compliance cost
- D40.5 ISF revenue split — определяет gross margin

---

## 13. Эталонные данные

### 13.1 ISF v5.1 источники (binding)

- `C:\PROJECTS\streetlifting-os\ISF_Rules_ver.5.1_(RU).docx`
- `C:\PROJECTS\streetlifting-os\ISF_Rules_ver.5.1_(en-US).docx`
- `https://streetlifting.ru/points/` — coefficient lookup tables
- `https://streetlifting.ru/docs/standards` — sport rank standards (V2)

### 13.2 Reference materials (read-only)

- `_research/openlifter-main/` — OpenLifter source (architecture reference, AGPL — no copy)
- `Power Gage/` — PowerGage installed tree (workflow reference, proprietary — no copy)
- `PowerTable/` — PowerTable installed client + cache (UX benchmark, proprietary)

### 13.3 Test fixtures (Sprint 1+ обязательны)

`tests/fixtures/`:
- `classic-small-meet.json`
- `classic-tie-break.json`
- `classic-masters-m5-m6.json` ⭐ (главный correctness fixture)
- `classic-judge-split-decision.json`
- `multirep-basic.json`
- `multirep-preset-loads.json`

---

## 14. Открытые вопросы (требуют решения до V2)

См. [decisions-v3.md](decisions-v3.md) §D40:

| # | Вопрос | Default рекомендация |
|---|---|---|
| 40.1 | Pricing tier | Match PT: $0.20–0.60 CIS, $0.40–1.50 INTL |
| 40.2 | Trial model | Test meets ≤10 nom + first-meet-free |
| 40.3 | Domain | `streetlifting.app` |
| 40.4 | Юр. лицо | Estonia OÜ + РФ ИП для RU billing |
| 40.5 | ISF revenue split | 30% sanctioning fees, 0% per-nom commission |
| 40.6 | WSF/FinalRep contacts | TBD |
| 40.7 | WADA scope | Yes, V4 |
| 40.8 | Federation publishing access | Invitation-only V3, self-serve V4 |

---

## 15. Юридические аспекты (предварительно; финал в D40)

- **Лицензия кода**: proprietary commercial (НЕ open-source), per D30
- **Trademark**: «Streetlifting OS» подлежит регистрации в юрисдикции основной компании (D40.4)
- **Privacy policy + ToS**: drafted на основе Paddle templates (адаптируется под наши условия)
- **DPA с федерациями**: standard SaaS DPA template (ISF + следующие federations)
- **Брендинг**: ISF co-brand требует agreement с ISF leadership (часть пилотного onboarding)

---

## 16. Документация и references

| Документ | Назначение |
|---|---|
| **ТЗ v1.0** (этот документ) | Канонические требования и план |
| [architecture-v1.md](architecture-v1.md) | Системная архитектура, 6 слоёв |
| [openlifter-isf-implementation-blueprint-v2.md](openlifter-isf-implementation-blueprint-v2.md) | Доменная модель, типы, Sprint backlog |
| [rules-pack-spec-v1.md](rules-pack-spec-v1.md) | Формат RulesPack |
| [decisions-v1.md](decisions-v1.md) | D1–D12: pre-V1 closure |
| [decisions-v2.md](decisions-v2.md) | D13–D29: PowerTable installed-client closure |
| [decisions-v3.md](decisions-v3.md) | D30–D40: platform/governance closure |
| [powergage-findings-v1.md](powergage-findings-v1.md) | PowerGage static analysis |
| [powertable-findings-v1.md](powertable-findings-v1.md), [v2](powertable-findings-v2.md), [v3](powertable-findings-v3.md), [v4](powertable-findings-v4.md) | PowerTable findings (web → 1С client → broadcast) |
| [reference-comparison-v1.md](reference-comparison-v1.md) | OpenLifter / PowerGage / PowerTable feature matrix |

---

## 17. Финальное one-line summary

Streetlifting OS v1.0 — это offline-first paid-per-nomination Tauri-клиент для ISF v5.1 с правильной обработкой Masters M5/M6 (70+), готовый к multi-federation расширению (WSF, НАП, FinalRep) и Weighted Calisthenics в V2–V4, под архитектурную крышу ISF-anchored платформы с cryptographic-signed sanctioning workflow и 6-слойной топологией.

---

## Ratification

**Утверждено к разработке 2026-04-26.**

Подписи:

- Product owner: ____________________________
- Tech lead: ____________________________
- ISF liaison: ____________________________ (V2+)
