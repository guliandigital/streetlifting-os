import type { SignedFinalProtocol } from "./final-protocol";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

const SERVICE_TOKEN_PREFIX = "slisf_";

export type FinalProtocolUploadResponse = {
  status: number;
  body: unknown;
};

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && window.__TAURI_INTERNALS__ !== undefined;
}

/**
 * Upload only through the Tauri command. The PWA deliberately has no fallback:
 * a federation service token must never be exposed to browser-origin requests.
 */
export async function uploadSignedFinalProtocol(
  serviceToken: string,
  envelope: SignedFinalProtocol,
): Promise<FinalProtocolUploadResponse> {
  const token = serviceToken.trim();
  if (!token.startsWith(SERVICE_TOKEN_PREFIX) || token.length < 24) {
    throw new Error("A valid ISF service token is required");
  }
  if (!isTauriRuntime()) {
    throw new Error("Signed protocols can be sent only from the Streetlifting OS desktop app");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<FinalProtocolUploadResponse>("upload_final_protocol", {
    serviceToken: token,
    envelope,
  });
}
