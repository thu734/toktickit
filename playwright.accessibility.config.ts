import { defineConfig } from '@playwright/test';

const runId = process.env.LAB4_A11Y_RUN ??= `${Date.now()}-${process.pid}`;

// UI-only verification: no API server or database is started. Every API request
// is fulfilled by the fixture; unexpected API requests fail the test.
export default defineConfig({
  testDir: './e2e/lab-04',
  testMatch: 'accessibility-responsive.spec.ts',
  outputDir: `./test-results/lab-04-accessibility/${runId}`,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: { baseURL: 'http://127.0.0.1:5196', browserName: 'chromium', locale: 'en-US', timezoneId: 'Asia/Bangkok', serviceWorkers: 'block', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5196 --strictPort',
    cwd: './client',
    env: { VITE_API_URL: 'http://127.0.0.1:5196' },
    url: 'http://127.0.0.1:5196',
    reuseExistingServer: false,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'tablet', use: { viewport: { width: 800, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
