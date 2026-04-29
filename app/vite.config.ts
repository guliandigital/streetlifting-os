import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

const tauriDevHost = process.env["TAURI_DEV_HOST"];

// `tauri build` / `tauri dev` set TAURI_PLATFORM. In a Tauri bundle the page
// is served from the `tauri://` custom protocol, where service workers cannot
// register — so the PWA layer adds nothing and may emit warnings. Disable it.
const isTauriBuild = !!process.env["TAURI_PLATFORM"];

// GitHub Pages serves the PWA under `/streetlifting-os/`. Set VITE_PUBLIC_BASE
// to override (e.g. for a custom domain or local preview).
const publicBase = process.env["VITE_PUBLIC_BASE"] ??
  (isTauriBuild ? "/" : "/streetlifting-os/");

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: publicBase,
  plugins: [
    react(),
    VitePWA({
      disable: isTauriBuild,
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "icon-64.png",
        "brand/logo-horizontal-dark.png",
        "brand/logo-horizontal-light.png",
        "brand/logo-symbol-dark.png",
        "brand/logo-symbol-light.png",
        "brand/open-graph-white.png",
      ],
      manifest: {
        name: "Streetlifting OS",
        short_name: "Streetlifting OS",
        description:
          "Offline-first ISF Streetlifting & Calisthenics meet client",
        theme_color: "#05090B",
        background_color: "#FFFFFF",
        display: "standalone",
        start_url: ".",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@app": path.resolve(__dirname, "./src/app"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@store": path.resolve(__dirname, "./src/store"),
      "@domain": path.resolve(__dirname, "./src/domain"),
      "@logic": path.resolve(__dirname, "./src/logic"),
      "@persistence": path.resolve(__dirname, "./src/persistence"),
      "@translations": path.resolve(__dirname, "./src/translations"),
    },
  },
  // Tauri-specific config
  clearScreen: false,
  build: {
    // Split vendor code into separate chunks to keep each under 500 kB.
    rollupOptions: {
      output: {
        manualChunks: {
          // React runtime
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Redux
          "vendor-redux": ["@reduxjs/toolkit", "react-redux"],
          // Mantine core UI
          "vendor-mantine-core": ["@mantine/core", "@mantine/hooks", "@mantine/modals", "@mantine/notifications"],
          // Mantine extras (dates, forms)
          "vendor-mantine-ext": ["@mantine/dates", "@mantine/form", "mantine-datatable"],
          // i18n
          "vendor-i18n": ["i18next", "react-i18next", "i18next-browser-languagedetector"],
        },
      },
    },
  },
  server: {
    // 1420 is the Tauri convention; if a local proxy / browser blocks it, override
    // via VITE_PORT env var (e.g., VITE_PORT=5173 npm run dev).
    port: Number(process.env["VITE_PORT"] ?? 1420),
    strictPort: true,
    // Force IPv4 binding to avoid Windows IPv6-only `[::1]` issue where
    // Chrome resolves localhost → 127.0.0.1 but Vite listens only on [::1].
    // TAURI_DEV_HOST overrides for mobile dev (Tauri sets it).
    host: tauriDevHost ?? "127.0.0.1",
    hmr: tauriDevHost
      ? {
          protocol: "ws",
          host: tauriDevHost,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
