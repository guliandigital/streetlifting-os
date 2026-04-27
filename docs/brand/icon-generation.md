# Streetlifting OS — генерация иконок из SVG

Это инструкция для разработчика (Чат 1.2 или последующие). Иконки приложения генерируются программно из единого источника `docs/brand/logo-placeholder.svg`.

## Зачем единый источник

- Невозможна рассинхронизация: все размеры всегда соответствуют одному дизайну
- При замене placeholder на финальный логотип (v0.2.0) меняется один файл — все иконки регенерируются автоматически
- В Git хранится только SVG (~1 KB) + сгенерированные PNG (~50 KB total) — не несколько мегабайт исходников

## Скрипт генерации

Создать `app/scripts/generate-icons.ts`:

```typescript
/**
 * Generate all icon sizes from a single SVG source.
 * Run: npm run icons:generate
 */
import sharp from "sharp";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as toIco from "to-ico";

const ROOT = path.resolve(__dirname, "..");
const SVG_SOURCE = path.resolve(
  ROOT,
  "../docs/brand/logo-placeholder.svg",
);

const TAURI_ICONS = path.join(ROOT, "src-tauri/icons");
const PUBLIC = path.join(ROOT, "public");

const TAURI_PNG_SIZES = [32, 128, 256, 512];
const PWA_PNG_SIZES = [192, 512];

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function svgToPng(svgPath: string, size: number): Promise<Buffer> {
  return sharp(svgPath).resize(size, size).png().toBuffer();
}

async function generateIcoFromSvg(svgPath: string): Promise<Buffer> {
  const sizes = [16, 32, 48, 64, 128, 256];
  const buffers = await Promise.all(
    sizes.map((s) => svgToPng(svgPath, s)),
  );
  return toIco(buffers);
}

async function main() {
  console.log("Reading SVG source:", SVG_SOURCE);
  await fs.access(SVG_SOURCE); // throws if missing

  await ensureDir(TAURI_ICONS);
  await ensureDir(PUBLIC);

  // Tauri Linux PNGs
  for (const size of TAURI_PNG_SIZES) {
    const buf = await svgToPng(SVG_SOURCE, size);
    const out = path.join(TAURI_ICONS, `${size}x${size}.png`);
    await fs.writeFile(out, buf);
    console.log("Wrote", out);
  }

  // Tauri Linux retina (128@2x = 256)
  const retinaBuf = await svgToPng(SVG_SOURCE, 256);
  await fs.writeFile(
    path.join(TAURI_ICONS, "128x128@2x.png"),
    retinaBuf,
  );

  // Tauri Windows .ico
  const icoBuf = await generateIcoFromSvg(SVG_SOURCE);
  await fs.writeFile(path.join(TAURI_ICONS, "icon.ico"), icoBuf);
  console.log("Wrote", path.join(TAURI_ICONS, "icon.ico"));

  // Tauri macOS .icns — generate via tauri CLI separately:
  //   npx @tauri-apps/cli icon docs/brand/logo-placeholder.svg
  // Tauri's icon CLI generates .icns + .ico + all PNG sizes from one source.
  // This script is a fallback if you want to do it manually.

  // PWA manifest icons
  for (const size of PWA_PNG_SIZES) {
    const buf = await svgToPng(SVG_SOURCE, size);
    const out = path.join(PUBLIC, `icon-${size}.png`);
    await fs.writeFile(out, buf);
    console.log("Wrote", out);
  }

  // PWA favicon
  const favicon = await generateIcoFromSvg(SVG_SOURCE);
  await fs.writeFile(path.join(PUBLIC, "favicon.ico"), favicon);

  // SVG copy for index.html <link rel="icon" type="image/svg+xml">
  await fs.copyFile(
    SVG_SOURCE,
    path.join(PUBLIC, "icon.svg"),
  );

  console.log("\nDone. All icons generated.");
}

void main().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
```

## Зависимости

```bash
npm install --save-dev sharp to-ico tsx
```

В `package.json` → `scripts`:
```json
{
  "scripts": {
    "icons:generate": "tsx scripts/generate-icons.ts"
  }
}
```

## Альтернатива через Tauri CLI

Tauri 2 имеет встроенный CLI-инструмент:

```bash
cd app
npx @tauri-apps/cli icon ../docs/brand/logo-placeholder.svg
```

Эта команда генерирует:
- `src-tauri/icons/32x32.png`
- `src-tauri/icons/128x128.png`
- `src-tauri/icons/128x128@2x.png`
- `src-tauri/icons/icon.icns`
- `src-tauri/icons/icon.ico`
- (но не PWA-иконки — нужен наш скрипт для них)

**Рекомендация:** используем Tauri CLI для desktop-иконок (`.icns`, `.ico` с правильным форматом) + наш скрипт для PWA-иконок (192px и 512px).

## Запуск перед сборкой

Скрипт генерации НЕ запускается автоматически в CI — иконки коммитятся в репозиторий. Запускать вручную при изменении логотипа:

```bash
# 1. Обновить docs/brand/logo-placeholder.svg
# 2. Сгенерировать desktop-иконки через Tauri CLI:
cd app
npx @tauri-apps/cli icon ../docs/brand/logo-placeholder.svg

# 3. Сгенерировать PWA-иконки через наш скрипт:
npm run icons:generate

# 4. Проверить результат:
ls src-tauri/icons/
ls public/

# 5. Закоммитить изменения:
git add src-tauri/icons/ public/
git commit -m "chore: regenerate icons from updated SVG source"
```

## Что произойдёт при замене на финальный логотип

В v0.2.0 (или позже), когда финальный логотип готов:

1. Заменить `docs/brand/logo-placeholder.svg` на финальный SVG (то же имя, только содержимое меняется — для git diff)
2. Запустить регенерацию по инструкции выше
3. Проверить что в маленьком размере (16×16, 32×32) логотип читается; если нет — упростить SVG
4. Обновить `docs/brand/brand-guidelines-v1.md` — раздел «Логотип» из placeholder в final
5. Коммит: `feat: replace placeholder logo with final design`
