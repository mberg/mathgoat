import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  timeout: 180000,
  use: {
    baseURL: "http://127.0.0.1:8788",
    actionTimeout: 10000,
    trace: "retain-on-failure",
    channel: "chrome",
    viewport: { width: 1440, height: 1100 },
  },
  webServer: {
    command:
      "npx wrangler d1 migrations apply DB --local --persist-to .wrangler/e2e && npx wrangler dev --port 8788 --persist-to .wrangler/e2e",
    url: "http://127.0.0.1:8788",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
