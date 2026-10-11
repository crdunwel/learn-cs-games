import { defineConfig } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT || "5173";
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests/browser",
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 2 : undefined,
  retries: 0,
  use: {
    baseURL,
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
