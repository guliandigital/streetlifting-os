# Next chat prompt — Sprint 2 UAT / Sprint 3 start (Chat 2.2)

Streetlifting OS — Chat 2.2. Predecessor: Chat 2.1 shipped `/judging` screen (v0.2.0).

---

## КОНТЕКСТ

Проект: offline-first ISF Streetlifting Meet Client.
Memory: `~/.claude/projects/C--PROJECTS-streetlifting-os/memory/MEMORY.md` + `project_status.md`
Кодовая база: `C:\PROJECTS\streetlifting-os\app\`
Основной spec: `docs/openlifter-isf-implementation-blueprint-v2.md` §11.7 (Results) + §15 (Sprint 3 backlog)

---

## ТЕКУЩЕЕ СОСТОЯНИЕ (после Chat 2.1 + v0.2.0)

- **243 тестов**, TS strict, ESLint clean
- Маршруты: `/`, `/registration`, `/weigh-ins`, `/judging`
- `/judging`: 60 с таймер, 3-судейские карточки, очередь попыток, подтверждение
- v0.2.0 тегирован и опубликован на GitHub Releases (Win + macOS + Linux)
- `stateVersion: "2"` — не меняем

**Что НЕ готово (следующий scope)**:
- `/results` экран (blueprint §11.7)
- Classic CSV export (UTF-8)
- Multirep module (blueprint §15, Sprint 3)

---

## ЗАДАЧА ЭТОГО ЧАТА

### Приоритет 1 — UAT checklist (если у пользователя есть тестовый турнир)

Если пользователь запускает v0.2.0 на реальном или тестовом турнире, пройти:

**Pre-meet:**
- [ ] Создать новый meet → проверить дефолтные пресеты ISF (возраст, веса, диски)
- [ ] Импортировать CSV с 10+ спортсменами → убедиться что UTF-8 BOM + кириллица ОК
- [ ] Взвешивание: ввести массы, подтвердить → категории разрешаются правильно
- [ ] Сохранить файл → закрыть приложение → загрузить файл → всё на месте

**Судейство (новое в v0.2.0):**
- [ ] Открыть `/judging`, выбрать PU
- [ ] Проверить: очередь отображает попытки в правильном порядке (нагрузка ASC → масса ASC)
- [ ] Запустить таймер → таймер тикает → цвет меняется (зелёный → оранжевый → красный)
- [ ] Проголосовать через 3 карточки → статус меняется в live (PENDING → GOOD / NO LIFT)
- [ ] 2-1 split: проверить бейдж «2-1»
- [ ] Подтвердить попытку → атлет уходит из очереди R1 → встаёт в R2
- [ ] Использовать «Зачёт всем» / «Не зачёт всем» для solo-режима
- [ ] Skip / No-show: атлет уходит без записи голосов
- [ ] После 3 раундов → очередь пустая, «Все попытки завершены»

**Bugs to watch:**
- Таймер не останавливается при смене упражнения (PU → DI)
- Голоса не сбрасываются при переходе к следующей попытке
- `commitAttemptVotes` пишет в неверный индекс при concurrent entries
- Потеря `activeEntryIndex` при save + load

Найденные баги → фиксить в этом же чате, тег `v0.2.1`.

---

### Приоритет 2 — Results screen (`/results`, blueprint §11.7)

**Scope:**

```
Страница /results:
  Вкладки:
  - По категориям (weight cat × age cat × sex)
  - По ISF-очкам (absolute ranking, единый список)

  На каждой вкладке:
  - Таблица: место | имя | клуб | ВК | масса | P1/P2/P3 | лучшее PU |
              D1/D2/D3 | лучшее DI | сумма | разряд | ISF коэф | ISF очки
  - Выделение: 1-2-3 места золото/серебро/бронза
  - Расчёт: ClassicResultService (уже есть в result.ts + points.ts)
  - Guest-athletes: в таблице, но без места (displayed с флагом «Гость»)

  Экспорт:
  - Кнопка «Скачать CSV» → UTF-8 BOM, формат протокола PowerTable-совместимый
    (см. powertable-findings-v2.md §4.3 для verbatim колонок)
  - Кнопка «Печать» → window.print() с CSS @media print

  i18n: ru-RU + en-US для всех строк
```

**Ключевые сервисы (уже готовы):**
- `src/logic/isf/result.ts` — `getTotal(entry)`, `getExerciseResult(entry, ex)`
- `src/logic/isf/points.ts` — `IsfPointsService.calculate(entry, event)`
- `src/logic/isf/age.ts` — `ageInYears()`, `resolveAgeCategory()`
- `src/logic/isf/weight-category-resolver.ts` — `resolveWeightCategory()`

**Новый файл:**
- `src/logic/isf/classic-placing.ts` — чистый сервис:
  ```ts
  export function computeClassicResults(
    entries: readonly Entry[],
    meet: MeetState,
  ): ClassicResultRow[]
  // Сортировка: total DESC → ISF pts DESC → масса ASC (тайбрек §7.10)
  // Place = 1,2,3,… ; guest = null; tied places share number, next skipped
  ```

**Тесты:**
- `tests/classic-placing.test.ts` (25+) — стандартные случаи + тайбрек

---

### Приоритет 3 — Sprint 3 kickoff (Multirep, blueprint §15)

Если время позволяет, начать Multirep:
- Добавить Multirep preset-selector в регистрацию (поле `presetLoadKg`)
- `MultirepOrderService` — manual fixed order (V1)
- `/judging` Multirep-режим: 120 с таймер, поле «Кол-во повторений», ввод reps
- Тесты: `multirep-placing.test.ts`

---

## ПОРЯДОК ДЕЙСТВИЙ

1. Прочитать memory + project_status.md
2. Если есть баги от UAT → фиксить, тег v0.2.1
3. Иначе → Results screen (Приоритет 2)
4. Typecheck + 270+ тестов зелёных
5. Bump версии (0.3.0 если Multirep готов, иначе 0.2.1 для хотфиксов)
6. Commit + push + tag → Release на GitHub
7. Подготовить next-chat-prompt-2-3.md

---

## ОГРАНИЧЕНИЯ

- НЕ менять `stateVersion` (остаётся `"2"`)
- НЕ трогать Masters M5/M6 boundary тесты (маркетинговый дифференциатор)
- НЕ копировать код из OpenLifter / PowerGage / PowerTable (clean-room)
- Все строки UI — bilingual RU + EN
- PowerShell с `dangerouslyDisableSandbox: true` для всех команд (Bash сломан на этой машине)
- Тесты запускать через `node node_modules\vitest\vitest.mjs run` (не `npm test`)
