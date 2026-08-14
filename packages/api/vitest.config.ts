import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["test/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "integration",
          include: ["test/integration/**/*.test.ts"],
          environment: "node",
          // Applies migrations once for the whole run.
          globalSetup: ["./test/integration/global-setup.ts"],
          // Per-worker env wiring.
          setupFiles: ["./test/integration/setup.ts"],
          // Every test runs inside its own transaction and rolls back, so
          // nothing is shared and files may overlap freely.
          fileParallelism: true,
          // Concurrent tests within a file. Each holds one pooled connection
          // for the life of its transaction, so this is bounded together with
          // `maxConnections` in db-fixture.ts.
          maxConcurrency: 8,
          hookTimeout: 60_000,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
