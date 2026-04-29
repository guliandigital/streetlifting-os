/**
 * Streetlifting OS — icon generator.
 *
 * Reads the committed logo asset pack and writes:
 *   - app/src-tauri/icons/{32x32,128x128,128x128@2x,256x256,512x512,icon.ico}.png|ico
 *   - app/public/{brand/*, favicon.ico, icon-64.png, icon-192.png, icon-512.png, apple-touch-icon.png}
 *
 * The macOS .icns file is kept as a 512x512 PNG stub to match the existing
 * build flow. Use Tauri CLI with a true vector source if a production .icns is needed.
 *
 * Run: `npm run icons:generate` (from app/).
 */
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(APP_ROOT, "..");
const LOGO_ROOT = path.resolve(REPO_ROOT, "logo");
const FAVICON_DIR = path.join(LOGO_ROOT, "05_favicon");
const HORIZONTAL_DIR = path.join(LOGO_ROOT, "01_horizontal");
const VERTICAL_DIR = path.join(LOGO_ROOT, "02_vertical");
const SYMBOL_DIR = path.join(LOGO_ROOT, "03_symbol");
const SOCIAL_DIR = path.join(LOGO_ROOT, "06_social");

const TAURI_ICONS = path.join(APP_ROOT, "src-tauri/icons");
const PUBLIC_DIR = path.join(APP_ROOT, "public");
const BRAND_DIR = path.join(PUBLIC_DIR, "brand");

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function copyAsset(from: string, to: string): Promise<void> {
  await fs.copyFile(from, to);
  console.log("Wrote", path.relative(REPO_ROOT, to));
}

async function main(): Promise<void> {
  console.log("Reading logo asset pack:", LOGO_ROOT);
  await fs.access(LOGO_ROOT);

  await ensureDir(TAURI_ICONS);
  await ensureDir(PUBLIC_DIR);
  await ensureDir(BRAND_DIR);

  await copyAsset(
    path.join(HORIZONTAL_DIR, "horizontal_compact_dark_transparent.png"),
    path.join(BRAND_DIR, "logo-horizontal-dark.png"),
  );
  await copyAsset(
    path.join(HORIZONTAL_DIR, "horizontal_compact_light_transparent.png"),
    path.join(BRAND_DIR, "logo-horizontal-light.png"),
  );
  await copyAsset(
    path.join(VERTICAL_DIR, "vertical_dark_transparent.png"),
    path.join(BRAND_DIR, "logo-vertical-dark.png"),
  );
  await copyAsset(
    path.join(VERTICAL_DIR, "vertical_light_transparent.png"),
    path.join(BRAND_DIR, "logo-vertical-light.png"),
  );
  await copyAsset(
    path.join(SYMBOL_DIR, "symbol_dark_transparent.png"),
    path.join(BRAND_DIR, "logo-symbol-dark.png"),
  );
  await copyAsset(
    path.join(SYMBOL_DIR, "symbol_light_transparent.png"),
    path.join(BRAND_DIR, "logo-symbol-light.png"),
  );
  await copyAsset(
    path.join(SOCIAL_DIR, "open_graph_1600x900_white.png"),
    path.join(BRAND_DIR, "open-graph-white.png"),
  );
  await copyAsset(
    path.join(SOCIAL_DIR, "open_graph_1600x900_black.png"),
    path.join(BRAND_DIR, "open-graph-black.png"),
  );

  // Tauri Linux PNGs
  await copyAsset(
    path.join(FAVICON_DIR, "favicon_light_on_black_32x32.png"),
    path.join(TAURI_ICONS, "32x32.png"),
  );
  await copyAsset(
    path.join(FAVICON_DIR, "favicon_light_on_black_128x128.png"),
    path.join(TAURI_ICONS, "128x128.png"),
  );
  await copyAsset(
    path.join(FAVICON_DIR, "favicon_light_on_black_256x256.png"),
    path.join(TAURI_ICONS, "128x128@2x.png"),
  );
  await copyAsset(
    path.join(FAVICON_DIR, "favicon_light_on_black_256x256.png"),
    path.join(TAURI_ICONS, "256x256.png"),
  );
  await copyAsset(
    path.join(FAVICON_DIR, "favicon_light_on_black_512x512.png"),
    path.join(TAURI_ICONS, "512x512.png"),
  );

  // Tauri Windows .ico
  await copyAsset(
    path.join(FAVICON_DIR, "favicon.ico"),
    path.join(TAURI_ICONS, "icon.ico"),
  );

  await copyAsset(
    path.join(FAVICON_DIR, "favicon_light_on_black_512x512.png"),
    path.join(TAURI_ICONS, "icon.icns"),
  );

  // PWA manifest icons
  await copyAsset(
    path.join(FAVICON_DIR, "android-chrome-192x192.png"),
    path.join(PUBLIC_DIR, "icon-192.png"),
  );
  await copyAsset(
    path.join(FAVICON_DIR, "android-chrome-512x512.png"),
    path.join(PUBLIC_DIR, "icon-512.png"),
  );
  await copyAsset(
    path.join(FAVICON_DIR, "favicon_light_transparent_64x64.png"),
    path.join(PUBLIC_DIR, "icon-64.png"),
  );

  // Apple touch icon (180×180 — iOS standard)
  await copyAsset(
    path.join(FAVICON_DIR, "apple-touch-icon.png"),
    path.join(PUBLIC_DIR, "apple-touch-icon.png"),
  );

  // Web favicon.ico (multi-size)
  await copyAsset(
    path.join(FAVICON_DIR, "favicon.ico"),
    path.join(PUBLIC_DIR, "favicon.ico"),
  );

  console.log("\nDone. All brand assets refreshed from", path.relative(REPO_ROOT, LOGO_ROOT));
}

void main().catch((err: unknown) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
