import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for academix-web.
 *
 * Scoped deliberately to navigation behaviour for now. The stack's own unit tests run in jsdom,
 * which cannot exercise the thing that actually broke in production: real browser history, the
 * platform back gesture, and page lifecycle across a reload.
 *
 * Runs against a PRODUCTION build (`next build && next start`), not `next dev`, for two reasons:
 * dev-mode double-rendering and fast-refresh remounts perturb exactly the mount/unmount behaviour
 * under test, and prod is what users actually run. navigation-stack devtools are off by default in
 * a prod build, so specs enable them per-page with installNavDevtools().
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,        // these specs drive shared browser history; keep them serial
  forbidOnly: !!process.env.CI,
  retries: 0,                  // a navigation test that only passes on retry is a bug, not a flake
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Reuse an already-running server locally so the suite is fast to iterate on; always start a
  // fresh one in CI.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npx next start -p 3100',
        url: 'http://127.0.0.1:3100',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
