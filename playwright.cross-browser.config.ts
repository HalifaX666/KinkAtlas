import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/cross-browser.spec.ts', '**/capsule-crypto.smoke.spec.ts'],
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4177',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev:e2e -- --port 4177',
    url: 'http://127.0.0.1:4177',
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
