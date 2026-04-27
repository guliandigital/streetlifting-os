import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
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
  test: {
    environment: "happy-dom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      include: ["src/logic/**/*.ts", "src/domain/**/*.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
