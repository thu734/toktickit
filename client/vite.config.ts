import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("./src/", import.meta.url));

export default defineConfig({
  plugins: [{
    name: "local-typescript-source",
    enforce: "pre",
    resolveId(id, importer) {
      if (!importer || !id.startsWith(".")) return null;
      const target = resolve(dirname(importer.split("?")[0]), id);
      if (!target.startsWith(sourceRoot.endsWith(sep) ? sourceRoot : sourceRoot + sep)) return null;
      const base = target.endsWith(".js") ? target.slice(0, -3) : target;
      for (const extension of [".ts", ".tsx"]) {
        if (existsSync(base + extension)) return base + extension;
      }
      return null;
    },
  }, react()],
  server: { host: "localhost", port: 5173, strictPort: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    include: ["tests/**/*.test.tsx"],
  },
});
