import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.js", "tests/unit/**/*.test.js", "tests/integration/**/*.test.js"]
  }
});
