import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/lab-04/{migration-regression,seed,actions-data-integrity}.test.ts"],
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 120000,
    // No global db push: every suite owns a guarded, migrated disposable schema.
  },
});
