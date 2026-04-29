# Streetlifting OS — генерация иконок

Иконки приложения и web-ассеты обновляются из committed logo pack в `logo/`.

## Источники

| Назначение | Источник |
|---|---|
| Header logo | `logo/01_horizontal/horizontal_compact_*_transparent.png` |
| Welcome logo | `logo/02_vertical/vertical_*_transparent.png` |
| Compact symbol | `logo/03_symbol/symbol_*_transparent.png` |
| Favicon / PWA / Tauri icons | `logo/05_favicon/` |
| Open Graph image | `logo/06_social/open_graph_1600x900_*.png` |

## Запуск

```bash
cd app
npm run icons:generate
```

Скрипт обновляет:

| Цель | Файлы |
|---|---|
| Web favicon | `app/public/favicon.ico` |
| Apple touch icon | `app/public/apple-touch-icon.png` |
| PWA icons | `app/public/icon-64.png`, `app/public/icon-192.png`, `app/public/icon-512.png` |
| Public brand assets | `app/public/brand/*` |
| Tauri icons | `app/src-tauri/icons/*` |

После запуска нужно проверить diff и закоммитить изменения в `app/public/`, `app/src-tauri/icons/` и `app/scripts/generate-icons.ts`, если менялся сам процесс.

## macOS `.icns`

Текущий logo pack растровый. Для production macOS `.icns` лучше подготовить true-vector source и отдельно запустить Tauri CLI:

```bash
cd app
npx @tauri-apps/cli icon <path-to-vector-logo.svg>
```

До появления true-vector source `app/scripts/generate-icons.ts` сохраняет существующий raster stub для `icon.icns`, чтобы локальная структура icons оставалась полной.
