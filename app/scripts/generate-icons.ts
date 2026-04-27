/**
 * Streetlifting OS — icon generator.
 *
 * Reads docs/brand/logo-placeholder.svg (single source of truth) and writes:
 *   - app/src-tauri/icons/{32x32,128x128,128x128@2x,256x256,512x512,icon.ico}.png|ico
 *   - app/public/{icon.svg, favicon.ico, icon-192.png, icon-512.png, apple-touch-icon.png}
 *
 * The macOS .icns file is NOT produced here — Tauri's own CLI does that better:
 *   npx @tauri-apps/cli icon ../docs/brand/logo-placeholder.svg
 * Run that command after this script to refresh icon.icns. (Tauri CLI requires Rust.)
 *
 * Run: `npm run icons:generate` (from app/).
 */
import sharp from "sharp";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
// `to-ico` is a CommonJS module — import the default export.
import toIco from "to-ico";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(APP_ROOT, "..");
const SVG_SOURCE = path.resolve(REPO_ROOT, "docs/brand/logo-placeholder.svg");

const TAURI_ICONS = path.join(APP_ROOT, "src-tauri/icons");
const PUBLIC_DIR = path.join(APP_ROOT, "public");

const TAURI_PNG_SIZES = [32, 128, 256, 512] as const;
const ICO_SIZES = [16, 32, 48, 64, 128, 256] as const;

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function svgToPng(svgPath: string, size: number): Promise<Buffer> {
  return sharp(svgPath).resize(size, size).png().toBuffer();
}

async function generateIco(svgPath: string): Promise<Buffer> {
  const buffers = await Promise.all(
    ICO_SIZES.map((size) => svgToPng(svgPath, size)),
  );
  return toIco(buffers);
}

async function main(): Promise<void> {
  console.log("Reading SVG source:", SVG_SOURCE);
  await fs.access(SVG_SOURCE);

  await ensureDir(TAURI_ICONS);
  await ensureDir(PUBLIC_DIR);

  // Tauri Linux PNGs
  for (const size of TAURI_PNG_SIZES) {
    const buf = await svgToPng(SVG_SOURCE, size);
    const out = path.join(TAURI_ICONS, `${size}x${size}.png`);
    await fs.writeFile(out, buf);
    console.log("Wrote", path.relative(REPO_ROOT, out));
  }

  // Retina copy: 128@2x = 256
  const retinaBuf = await svgToPng(SVG_SOURCE, 256);
  const retinaOut = path.join(TAURI_ICONS, "128x128@2x.png");
  await fs.writeFile(retinaOut, retinaBuf);
  console.log("Wrote", path.relative(REPO_ROOT, retinaOut));

  // Tauri Windows .ico
  const icoBuf = await generateIco(SVG_SOURCE);
  const icoOut = path.join(TAURI_ICONS, "icon.ico");
  await fs.writeFile(icoOut, icoBuf);
  console.log("Wrote", path.relative(REPO_ROOT, icoOut));

  // Placeholder .icns — content is a plain PNG renamed; Tauri CLI overwrites
  // properly when run separately. This stub lets `tauri build` succeed in CI
  // before someone runs the Tauri CLI.
  const icnsStub = await svgToPng(SVG_SOURCE, 512);
  const icnsOut = path.join(TAURI_ICONS, "icon.icns");
  await fs.writeFile(icnsOut, icnsStub);
  console.log(
    "Wrote",
    path.relative(REPO_ROOT, icnsOut),
    "(stub — run `npx @tauri-apps/cli icon` for real .icns)",
  );

  // PWA manifest icons
  for (const size of [192, 512] as const) {
    const buf = await svgToPng(SVG_SOURCE, size);
    const out = path.join(PUBLIC_DIR, `icon-${size}.png`);
    await fs.writeFile(out, buf);
    console.log("Wrote", path.relative(REPO_ROOT, out));
  }

  // Apple touch icon (180×180 — iOS standard)
  const appleBuf = await svgToPng(SVG_SOURCE, 180);
  const appleOut = path.join(PUBLIC_DIR, "apple-touch-icon.png");
  await fs.writeFile(appleOut, appleBuf);
  console.log("Wrote", path.relative(REPO_ROOT, appleOut));

  // Web favicon.ico (multi-size)
  const faviconBuf = await generateIco(SVG_SOURCE);
  const faviconOut = path.join(PUBLIC_DIR, "favicon.ico");
  await fs.writeFile(faviconOut, faviconBuf);
  console.log("Wrote", path.relative(REPO_ROOT, faviconOut));

  // SVG copy for index.html <link rel="icon" type="image/svg+xml">
  const svgOut = path.join(PUBLIC_DIR, "icon.svg");
  await fs.copyFile(SVG_SOURCE, svgOut);
  console.log("Wrote", path.relative(REPO_ROOT, svgOut));

  console.log("\nDone. All icons regenerated from", path.relative(REPO_ROOT, SVG_SOURCE));
}

void main().catch((err: unknown) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
