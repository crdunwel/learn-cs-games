// Production smoke checks deliberately serve dist beneath the Pages subdirectory.
// See docs/deployment.md; the normal browser suite exercises the development app.
import { defineConfig } from "@playwright/test";

const port = process.env.RELEASE_PORT || "4179";
const basePath = process.env.VITE_BASE_PATH || "/learn-cs-games/";
export default defineConfig({
  testDir: "./tests/release",
  forbidOnly: !!process.env.CI,
  workers: 1,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${port}${basePath}`,
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort --base=${basePath}`,
    url: `http://127.0.0.1:${port}${basePath}`,
    reuseExistingServer: false,
  },
  reporter: "list",
});
