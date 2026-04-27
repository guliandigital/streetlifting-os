# Streetlifting OS — Чат 1.2: Tauri builds + первый desktop release

КОНТЕКСТ

Я продолжаю проект Streetlifting OS — offline-first программу для проведения соревнований по стритлифтингу и силовой калистенике, разрабатываемую для ISF и других федераций. Полный контекст в:

1. Memory-файлах (загрузятся автоматически):
   `~/.claude/projects/C--PROJECTS-streetlifting-os/memory/MEMORY.md`
   `~/.claude/projects/C--PROJECTS-streetlifting-os/memory/project_status.md`

2. Документах проекта (читай по мере надобности):
   `C:/PROJECTS/streetlifting-os/docs/openlifter-isf-implementation-blueprint-v2.md`
   `C:/PROJECTS/streetlifting-os/docs/decisions-v1.md` — `decisions-v4.md`
   `C:/PROJECTS/streetlifting-os/docs/architecture-v1.md`

3. Кодовая база: `C:/PROJECTS/streetlifting-os/app/`

ТЕКУЩЕЕ СОСТОЯНИЕ

Sprint 1 = 10/10 готово. 167 юнит-тестов проходят. Build зелёный (`npm run typecheck`, `npm run test -- --run`, `npm run build`). Готовы:

- Доменные типы + ISF v5.1 пресеты
- Логика: judge-votes, age, masters multipliers (M5/M6 split), bodyweight limits, Classic result, ISF points, Classic order, forecast stub, weight-category resolver, lot-assignment, CSV import/export
- Сохранение/загрузка (`stateVersion: "2"`, миграция v1→v2)
- AppShell с маршрутами `/`, `/registration`, `/weigh-ins`
- Регистрация: DataTable + react-hook-form/zod модал + CSV import/export + жеребьёвка
- Взвешивание: inline-editing + авто-резолв категорий + подтверждение
- ru-RU + en-US i18n полностью

ЗАДАЧА ЭТОГО ЧАТА

Собрать первый desktop-релиз Tauri: подписанные бинарники под Windows / macOS / Linux. PWA-режим в браузере уже работает; нужно довести Tauri 2 интеграцию до production.

ТРЕБОВАНИЯ К РЕАЛИЗАЦИИ

Tauri конфигурация (`app/src-tauri/`):
- Проверить `tauri.conf.json`: identifier (com.streetlifting.os), product name, version (соответствует package.json)
- Иконки: 32×32, 128×128, 256×256, .icns (mac), .ico (win) — сгенерировать через `npm run tauri icon path/to/source.png` из логотипа в `_research/branding/` если есть, иначе создать placeholder
- Bundle config: targets для каждой платформы:
  - Windows: `nsis` + `msi` (signed via `signtool` если есть .pfx; иначе unsigned для dev)
  - macOS: `dmg` + `app` (notarization deferred — нужен Apple Developer ID)
  - Linux: `deb` + `appimage`
- Auto-updater stub: реализовать сервер-агностичную проверку через `@tauri-apps/plugin-updater`, но указать TBD для URL — production endpoint появится в V2 (D31 backend)

Скрипты сборки:
- Документировать `npm run tauri:build` в README с предусловиями (Rust toolchain, target-specific deps)
- Добавить GitHub Actions workflow `.github/workflows/desktop-release.yml`:
  - matrix: windows-latest, macos-latest, ubuntu-latest
  - build artifacts на каждой ОС
  - upload as release artifacts на тег `v*`
- Не пушить .pfx / .p12 в репо — secrets через GH Actions Secrets

Smoke-тесты desktop-сборки:
- Запустить `npm run tauri:dev` локально, проверить что:
  - Окно открывается с правильными размерами (default 1280×800, min 1024×600)
  - File-dialog для save/load работает (Tauri plugin-dialog) — тестировать с реальным сохранением + перезагрузкой
  - Меню «Файл» (если оно существует в существующем коде) корректно
  - PWA service worker НЕ активируется в Tauri-режиме (это веб-only)

PWA конфигурация:
- Проверить `vite-plugin-pwa` config: manifest.json содержит правильное name, theme_color, icons
- Service worker должен работать только в браузерном режиме; в Tauri отключаем через env-flag

Установочный wizard (Windows MSI):
- Минимальный per-user install (без admin rights) — это offline-first приложение
- Default install dir: `%LOCALAPPDATA%\Streetlifting OS\`
- Saved meets автоматически в `%APPDATA%\Streetlifting OS\meets\` — настроить Tauri's `appDataDir` API

Проверка цепи save → load на каждой платформе:
- Создать meet, добавить 5 спортсменов, сохранить в JSON-файл, закрыть, перезапустить, загрузить — данные должны сохраниться побайтно (с учётом прохождения через v1→v2 миграцию)
- Тестировать UTF-8 BOM для CSV-export на Excel Windows

Документация:
- `app/README.md` — секция Desktop Builds с пошаговой инструкцией
- `docs/release-process-v1.md` (NEW) — checklist для каждого релиза: версия в package.json + tauri.conf.json + Cargo.toml, changelog, GitHub Release notes, signed binary upload, smoke-test протокол
- Версионирование per SemVer: V1 launch = 0.1.0; до Sprint 3 — 0.x; первый GA = 1.0.0

ПОРЯДОК ДЕЙСТВИЙ

1. Прочитать MEMORY.md + project_status.md, ознакомиться с состоянием
2. Прочитать `app/src-tauri/tauri.conf.json` и `app/src-tauri/Cargo.toml` — понять текущую конфигурацию
3. Прочитать blueprint v2 §3 (scope) и §11.1 (Home), чтобы понять product surface
4. **Запросить моё подтверждение перед началом работы** (план реализации с уточнениями: какие платформы первыми, signing strategy, auto-updater on/off в V1)
5. Реализовать минимальный путь к dev-сборке `npm run tauri:dev` без warnings
6. Реализовать `npm run tauri:build` для Windows как первой цели
7. Добавить GH Actions workflow
8. Прогнать typecheck + tests + bundle (все три должны быть зелёные после изменений)
9. Скинуть мне выводы

ОГРАНИЧЕНИЯ

- НЕ копировать код из OpenLifter, PowerGage, PowerTable (clean-room)
- НЕ менять существующие 167 тестов
- НЕ менять схему SaveFile без миграции (D15)
- ВСЕ строки UI — bilingual RU+EN (D5)
- NoAGPL contamination — каждый файл оригинальный
- Bash на этом Windows env сломан (fork failures) — используй PowerShell

ПОСЛЕ ЗАВЕРШЕНИЯ

- Обновить `app/README.md` (Sprint 1 + Desktop Build status)
- Обновить `project_status.md` (новые файлы, готовность к V1 launch)
- Скинуть мне выводы `npm run typecheck`, `npm run test -- --run`, `npm run build`, `npm run tauri:build`
- Подготовить промт для следующего чата (Чат 2.1 — Sprint 2 judging UI)

ВАЖНЫЕ ДЕТАЛИ

- Blueprint v2 §11.6 описывает layout judging UI на следующий sprint — НЕ реализовывать здесь, только подготовить инфраструктуру
- Tauri 2 уже имеет `@tauri-apps/plugin-fs` и `@tauri-apps/plugin-dialog` в dependencies — использовать их, не Tauri 1.x APIs
- Vite must bind `host: "127.0.0.1"` — уже настроено, не ломать
- Yandex.Browser блокирует localhost — для веб-теста использовать Edge/Chrome

Начинай с шага 1 (чтение memory + tauri.conf.json) и затем шаг 4 (попроси у меня подтверждения плана перед написанием кода).
