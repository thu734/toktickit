import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "tests/lab-04/{migration-regression,seed,actions-data-integrity}.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    hookTimeout: 120000,
  },
});
