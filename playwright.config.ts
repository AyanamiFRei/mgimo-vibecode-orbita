import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        viewport: { width: 360, height: 800 },
      },
    },
    {
      name: "iphone-se-webkit",
      use: { ...devices["iPhone SE"], browserName: "webkit" },
      grep: /headline/,
    },
  ],
  webServer: {
    command: "node e2e/serve.mjs",
    url: "http://localhost:3100/login",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
