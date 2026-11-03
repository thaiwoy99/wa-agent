import { config } from "dotenv";
import { defineConfig } from "vitest/config";

const testEnv = config({ path: ".env.test", quiet: true }).parsed;

export default defineConfig({
  test: {
    env: testEnv,
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
  },
});