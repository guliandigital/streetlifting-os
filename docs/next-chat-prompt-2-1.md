# Next chat prompt — Sprint 2: Judging UI (Chat 2.1)

Streetlifting OS — Sprint 2 starts here. Predecessor: Chat 1.2 shipped v0.1.0 desktop release.

---

## КОНТЕКСТ

Я продолжаю проект Streetlifting OS — offline-first программу для соревнований по
стритлифтингу и силовой калистенике. Полный контекст в:

1. Memory-файлах (загрузятся автоматически):
   - `~/.claude/projects/C--PROJECTS-streetlifting-os/memory/MEMORY.md`
   - `~/.claude/projects/C--PROJECTS-streetlifting-os/memory/project_status.md`

2. Документах проекта:
   - `C:/PROJECTS/streetlifting-os/docs/openlifter-isf-implementation-blueprint-v2.md`
     **§11.6 Judging UI** — это основной spec для Sprint 2
   - `C:/PROJECTS/streetlifting-os/docs/architecture-v1.md`
   - `C:/PROJECTS/streetlifting-os/docs/decisions-v1.md` … `v4.md`
   - `C:/PROJECTS/streetlifting-os/CHANGELOG.md` — что вошло в 0.1.0

3. Кодовая база: `C:/PROJECTS/streetlifting-os/app/`

---

## ТЕКУЩЕЕ СОСТОЯНИЕ (после Чата 1.2)

- v0.1.0 опубликован на GitHub Releases (Win MSI/NSIS + macOS DMG + Linux AppImage/DEB)
- PWA развёрнут на GitHub Pages: <https://guliandigital.github.io/streetlifting-os/>
- 167 юнит-тестов проходят, typecheck/lint/build зелёные
- CI/Release/Pages workflows в `.github/workflows/` работают
- Маршруты `/`, `/registration`, `/weigh-ins` готовы
- Доменные типы `JudgeVotes`, `Discipline` уже определены (Sprint 1 §2)
- Логика `judge-votes` (3-judge majority) уже реализована и покрыта тестами

**Что НЕ готово (Sprint 2 scope):**
- UI-страница `/judging` ещё не создана (только route-stub)
- Attempt timer (60-секундный обратный отсчёт)
- Vote capture (3 кнопки на каждого судью)
- Attempt status display (Запланировано / Выполнено / Не зачёт)
- Audio cues (опционально — feedback при тайм-ауте)
- Подсчёт текущей попытки flight'а (next-up)

---

## ЗАДАЧА ЭТОГО ЧАТА (Sprint 2 = v0.2.0)

Реализовать экран судейства согласно blueprint v2 §11.6:

### A. Page `/judging`

- Защищён `RequireMeet` (как `/registration` и `/weigh-ins`)
- Layout двухколоночный (per blueprint §11.6):
  - Левая колонка: список ближайших попыток (next 5 in queue)
  - Правая колонка: текущий атлет — фото-плейсхолдер, имя, категория,
    разряд, попытка №, заявленный вес
- Кнопки управления попыткой:
  - **Старт** — запускает 60-секундный таймер (визуальный обратный отсчёт)
  - **Стоп** — досрочно завершает попытку (атлет закончил раньше)
- 3 vote-cards (по одной на каждого судью):
  - Зелёная кнопка «Зачёт» (`white`)
  - Оранжевая кнопка «Не зачёт» (`red`)
  - Кнопка «Сброс» (если судья ошибся в нажатии)
  - Подпись с именем судьи (если задано в meet.officials)
- Под vote-cards: live-indicator статуса попытки (computed via `judgeVotesToStatus`)
- После всех 3 голосов — кнопка **Подтвердить попытку** (commit в state)
- При подтверждении: переход к следующей попытке в очереди

### B. Attempt timer

- 60 секунд по умолчанию (поле `meetState.attemptTimerSec`, default = 60)
- Визуально — большой circular progress + цифровой счётчик
- Цветовая индикация: зелёный 60–20с, оранжевый 19–10с, красный <10с
- Аудио-cue в момент 0с (опционально, Web Audio API beep)
- Pause/Resume не нужно (попытка либо идёт, либо нет — упрощаем)

### C. State management

- Новый slice: `judging-slice.ts` (или extend existing meet-slice)
- Selector: текущая попытка (по очереди flight + lot order)
- Action types:
  - `JUDGING_START_TIMER` — запускает таймер
  - `JUDGING_STOP_TIMER` — досрочно стопает
  - `JUDGING_CAST_VOTE` — судья X голосует Y
  - `JUDGING_RESET_VOTE` — сброс голоса
  - `JUDGING_COMMIT_ATTEMPT` — записать итог в attempt[].judgeVotes + attempt[].status
  - `JUDGING_NEXT_ATTEMPT` — пропуск без записи (если атлет не вышел)

### D. Domain логика (расширяем существующее)

- `src/logic/isf/attempt-queue.ts` — новый pure-модуль:
  - `getCurrentAttempt(state): Attempt | null` — текущий атлет на платформе
  - `getNextAttempts(state, n): Attempt[]` — очередь следующих попыток
  - Учитывает lotOrder, attemptNumber (1→2→3), category cluster, flight
  - 50+ юнит-тестов на edge-cases (empty flight, all attempts done, mixed categories)

### E. i18n

- ru-RU + en-US парность для всех новых строк
- Ключи в `judging.*` namespace

### F. Tests

- `tests/attempt-queue.test.ts` (50+) — pure logic
- `tests/judging-slice.test.ts` (20+) — Redux state transitions
- `src/pages/judging/judging-page.test.tsx` (10+) — RTL component tests

---

## ОГРАНИЧЕНИЯ

- НЕ ломать существующие 167 тестов и SaveFile schema
- НЕ менять stateVersion (уже "2") — только расширяем существующие поля
- НЕ копировать код из OpenLifter, PowerGage, PowerTable (clean-room)
- ВСЕ строки UI — bilingual RU+EN
- Audio — опционально (если упирается в тестируемость, скип на v0.2.0)

---

## ПОРЯДОК ДЕЙСТВИЙ

1. Прочитать MEMORY.md + project_status.md, blueprint v2 §11.6
2. Прочитать существующие domain types: `src/domain/models/judge-votes.ts`,
   `src/domain/models/attempt.ts`, `src/domain/models/discipline.ts`
3. Прочитать существующие logic-функции: `src/logic/isf/judge-votes.ts`
4. Запросить подтверждение перед началом работы (если есть открытые вопросы по UX)
5. TDD: сначала attempt-queue tests, потом attempt-queue impl
6. Page + slice + i18n
7. Прогнать typecheck + tests, скинуть выводы
8. Bump версию: package.json + tauri.conf.json + Cargo.toml → 0.2.0
9. Обновить CHANGELOG.md (новая секция `## [0.2.0]`)
10. Закоммитить, попросить меня поставить тег v0.2.0
11. Подготовить промт для Чата 2.2 (тестирование Sprint 2 на реальном meet?)

---

## ВАЖНЫЕ ДЕТАЛИ

- **Status вычисляется из judgeVotes**, никогда не сохраняется отдельно
  (см. `src/logic/isf/judge-votes.ts`). UI должен подхватывать computed status
- **3-judge majority** — 2 из 3 нужны для зачёта (D15)
- Attempts хранятся в `meet.current.flights[].entries[].attempts[]`
  (см. blueprint v2 §6.1) — Sprint 1 положил структуру, Sprint 2 её заполняет
- M5/M6 multipliers применяются ПОСЛЕ подтверждения попытки (через `points.ts` →
  `result.ts`); экран судейства не вычисляет points сам
- Timer state — НЕ сохраняется в save-file (transient, не должен
  переживать reload). Хранить в отдельном Redux slice без persist
