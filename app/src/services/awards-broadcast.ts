/**
 * Awards-broadcast transport — thin wrapper around BroadcastChannel.
 *
 * Keeps the React hooks side dumb and the pure-logic envelope module
 * (logic/reports/awards-broadcast.ts) free of platform APIs.
 *
 * Tauri 2.x WebView (Edge / WebKit / WebKitGTK) supports BroadcastChannel
 * within a single window. Cross-window broadcast inside Tauri is
 * deferred to the V3 Local Broadcast Publisher.
 */

import {
  AWARDS_BROADCAST_CHANNEL,
  parseEnvelope,
  type AwardsBroadcastMessage,
} from "@logic/reports/awards-broadcast";

export type AwardsBroadcastSubscriber = (
  message: AwardsBroadcastMessage,
) => void;

export type AwardsBroadcastPublisher = {
  send(message: AwardsBroadcastMessage): void;
  close(): void;
};

export type AwardsBroadcastListener = {
  close(): void;
};

function isBroadcastChannelSupported(): boolean {
  return typeof globalThis.BroadcastChannel === "function";
}

export function openAwardsPublisher(): AwardsBroadcastPublisher {
  if (!isBroadcastChannelSupported()) {
    return { send: () => {}, close: () => {} };
  }
  const channel = new BroadcastChannel(AWARDS_BROADCAST_CHANNEL);
  return {
    send(message) {
      channel.postMessage(message);
    },
    close() {
      channel.close();
    },
  };
}

export function openAwardsListener(
  onMessage: AwardsBroadcastSubscriber,
): AwardsBroadcastListener {
  if (!isBroadcastChannelSupported()) {
    return { close: () => {} };
  }
  const channel = new BroadcastChannel(AWARDS_BROADCAST_CHANNEL);
  const handler = (event: MessageEvent): void => {
    const parsed = parseEnvelope(event.data);
    if (parsed !== null) onMessage(parsed);
  };
  channel.addEventListener("message", handler);
  return {
    close() {
      channel.removeEventListener("message", handler);
      channel.close();
    },
  };
}
