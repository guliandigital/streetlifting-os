/**
 * Storage facade — `saveToFile` / `loadFromFile` work on both Tauri desktop
 * and browser PWA via runtime detection.
 *
 * Tauri path uses `@tauri-apps/plugin-dialog` + `@tauri-apps/plugin-fs`.
 * Browser path uses anchor-download for save and `<input type="file">` for load.
 */

import type { SaveFile } from "@domain/models";
import { encode, decode, suggestedFilename } from "./save-file-codec";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

function isTauri(): boolean {
  return (
    typeof window !== "undefined" && window.__TAURI_INTERNALS__ !== undefined
  );
}

// ─── Save ────────────────────────────────────────────────────────────────────

export async function saveToFile(saveFile: SaveFile): Promise<{
  saved: boolean;
  path?: string;
}> {
  const json = encode(saveFile);
  const filename = suggestedFilename(saveFile);

  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({
      defaultPath: filename,
      filters: [{ name: "Streetlifting OS save-file", extensions: ["json"] }],
    });
    if (path === null) return { saved: false };
    await writeTextFile(path, json);
    return { saved: true, path };
  }

  // Browser fallback: anchor download
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { saved: true };
}

// ─── Load ────────────────────────────────────────────────────────────────────

export async function loadFromFile(): Promise<{
  loaded: boolean;
  saveFile?: SaveFile;
  path?: string;
}> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const selected = await open({
      multiple: false,
      filters: [{ name: "Streetlifting OS save-file", extensions: ["json"] }],
    });
    if (selected === null || Array.isArray(selected)) {
      return { loaded: false };
    }
    const path =
      typeof selected === "string" ? selected : (selected as { path: string }).path;
    const json = await readTextFile(path);
    return { loaded: true, saveFile: decode(json), path };
  }

  // Browser fallback: file picker
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve({ loaded: false });
        return;
      }
      void file.text().then((text) => {
        const saveFile = decode(text);
        resolve({ loaded: true, saveFile });
      });
    };
    input.click();
  });
}
