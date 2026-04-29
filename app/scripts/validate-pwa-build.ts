import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

type WebManifest = {
  name?: string;
  short_name?: string;
  start_url?: string;
  icons?: Array<{
    src?: string;
    sizes?: string;
    type?: string;
    purpose?: string;
  }>;
};

const appRoot = process.cwd();
const distDir = path.join(appRoot, "dist");
const expectedBase = process.env["VITE_PUBLIC_BASE"] ?? "/streetlifting-os/";

const errors: string[] = [];

const fail = (message: string) => {
  errors.push(message);
};

const assertFile = (relativePath: string) => {
  const absolutePath = path.join(distDir, relativePath);
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    fail(`Missing file: dist/${relativePath}`);
    return false;
  }
  return true;
};

const readRequiredFile = (relativePath: string) => {
  if (!assertFile(relativePath)) {
    return "";
  }
  return readFileSync(path.join(distDir, relativePath), "utf8");
};

if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
  fail("Missing dist directory. Run npm run build first.");
} else {
  const indexHtml = readRequiredFile("index.html");
  const manifestJson = readRequiredFile("manifest.webmanifest");

  assertFile("registerSW.js");

  const hasServiceWorker = ["sw.js", "service-worker.js"].some((fileName) =>
    existsSync(path.join(distDir, fileName)),
  );

  if (!hasServiceWorker) {
    fail("Missing generated service worker: expected dist/sw.js or dist/service-worker.js");
  }

  const assetsDir = path.join(distDir, "assets");
  if (!existsSync(assetsDir) || readdirSync(assetsDir).length === 0) {
    fail("Missing built asset bundle under dist/assets");
  }

  if (indexHtml) {
    if (!indexHtml.includes("manifest.webmanifest")) {
      fail("index.html does not reference manifest.webmanifest");
    }

    if (expectedBase !== "/" && !indexHtml.includes(`${expectedBase}assets/`)) {
      fail(`index.html does not reference assets with expected base ${expectedBase}`);
    }

    if (expectedBase !== "/" && /(?:src|href)="\/assets\//.test(indexHtml)) {
      fail("index.html contains root-relative /assets/ references while a sub-path base is expected");
    }
  }

  if (manifestJson) {
    let manifest: WebManifest | null = null;

    try {
      manifest = JSON.parse(manifestJson) as WebManifest;
    } catch (error) {
      fail(`manifest.webmanifest is not valid JSON: ${(error as Error).message}`);
    }

    if (manifest) {
      if (manifest.name !== "Streetlifting OS") {
        fail("manifest.webmanifest has unexpected app name");
      }

      if (manifest.start_url !== ".") {
        fail('manifest.webmanifest start_url must be "." for sub-path deploys');
      }

      if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
        fail("manifest.webmanifest has no icons");
      } else {
        for (const icon of manifest.icons) {
          if (!icon.src) {
            fail("manifest.webmanifest contains an icon without src");
            continue;
          }

          const iconPath = path.join(distDir, icon.src);
          if (!existsSync(iconPath)) {
            fail(`manifest icon is missing from dist: ${icon.src}`);
          }
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error("PWA build validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`PWA build validation passed for base ${expectedBase}`);
