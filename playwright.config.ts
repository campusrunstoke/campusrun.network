import { defineConfig, devices } from "@playwright/test";

const PORT = 3210;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

// Covers the two platforms the spec names: iPhone Safari and Android Chrome.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? "list" : "line",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
  // Reuse a running dev server locally; start one in CI.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `PORT=${PORT} npm run dev`,
        url: `${baseURL}/stoked`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
