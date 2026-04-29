import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type TauriConfig = {
  bundle?: {
    createUpdaterArtifacts?: boolean;
  };
  plugins?: {
    updater?: {
      pubkey?: string;
      endpoints?: string[];
    };
  };
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "..");

const tauriConfigPath = resolve(appRoot, "src-tauri", "tauri.conf.json");
const releaseWorkflowPath = resolve(repoRoot, ".github", "workflows", "release.yml");

const config = JSON.parse(readFileSync(tauriConfigPath, "utf8")) as TauriConfig;
const releaseWorkflow = readFileSync(releaseWorkflowPath, "utf8");

const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

if (config.bundle?.createUpdaterArtifacts !== true) {
  fail("bundle.createUpdaterArtifacts must be true so release builds publish signed updater artifacts.");
}

const updater = config.plugins?.updater;
if (!updater) {
  fail("plugins.updater must be configured in tauri.conf.json.");
} else {
  const pubkey = updater.pubkey?.trim();

  if (!pubkey) {
    fail("plugins.updater.pubkey must contain the public half of the Ed25519/minisign keypair.");
  } else if (pubkey === "dW5zZXQ=") {
    fail("plugins.updater.pubkey still uses the old placeholder value.");
  } else {
    const decodedPubkey = Buffer.from(pubkey, "base64").toString("utf8");
    if (!decodedPubkey.includes("minisign public key")) {
      fail("plugins.updater.pubkey must be a base64-encoded minisign public key.");
    }
    if (/private|secret/i.test(decodedPubkey)) {
      fail("plugins.updater.pubkey appears to contain private-key material.");
    }
  }

  const endpoints = updater.endpoints ?? [];
  if (endpoints.length === 0) {
    fail("plugins.updater.endpoints must include at least one HTTPS latest.json endpoint.");
  }

  for (const endpoint of endpoints) {
    if (!endpoint.startsWith("https://")) {
      fail(`Updater endpoint must use HTTPS: ${endpoint}`);
    }
    if (!endpoint.endsWith("/latest.json")) {
      fail(`Updater endpoint must point at latest.json: ${endpoint}`);
    }
    if (endpoint.includes("{{") || endpoint.includes("<") || endpoint.includes("example.com")) {
      fail(`Updater endpoint must not contain placeholders: ${endpoint}`);
    }
  }
}

const serializedConfig = JSON.stringify(config);
for (const forbidden of [
  "BEGIN PRIVATE KEY",
  "minisign secret key",
  "untrusted comment: minisign secret key",
]) {
  if (serializedConfig.includes(forbidden)) {
    fail(`tauri.conf.json must not contain private-key material: ${forbidden}`);
  }
}

if (!releaseWorkflow.includes("TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}")) {
  fail("release.yml must pass secrets.TAURI_SIGNING_PRIVATE_KEY to tauri-action.");
}

if (
  !releaseWorkflow.includes(
    "TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}",
  )
) {
  fail("release.yml must pass secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD to tauri-action.");
}

if (!releaseWorkflow.includes("releaseDraft: true")) {
  fail("release.yml must keep GitHub releases as drafts for manual smoke-test approval.");
}

if (failures.length > 0) {
  console.error("Updater release config validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Updater release config validation passed.");
