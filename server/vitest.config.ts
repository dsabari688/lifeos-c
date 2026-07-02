import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",

    include: ["**/*.test.ts", "**/*.spec.ts"],

    exclude: [
      "node_modules",
      "dist",
      "**/*.d.ts"
    ],

    coverage: {
      provider: "v8",

      reporter: [
        "text",
        "json",
        "html"
      ],

      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      }
    }
  }
});