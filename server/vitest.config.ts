// server/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      }
    },
    include: ["**/*.test.ts", "**/*.spec.ts"],
    exclude: ["node_modules", "dist", "**/*.d.ts"]
  }
});