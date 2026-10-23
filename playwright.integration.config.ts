import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from '@playwright/test';
if (!process.env.LAB4_RUN_ID || !process.env.LAB4_RUN_DIR)
    throw new Error('Run npm run test:lab4:integrated; the owned build/evidence runner is required.');
if (!process.env.LAB4_CLIENT_BUILD || !process.env.LAB4_SERVER_BUILD)
    throw new Error('Owned run-local production builds are required.');
const assets = resolve(process.env.LAB4_CLIENT_BUILD, 'assets');
const bundles = readdirSync(assets).filter(name => name.endsWith('.js'));
if (!bundles.some(name => readFileSync(resolve(assets, name), 'utf8').includes('http://127.0.0.1:3107')))
    throw new Error('SAFETY BLOCK: frontend must be built for the owned isolated API, never the development API.');
export default defineConfig({
    testDir: './e2e/lab-04', testMatch: /(?:actions-taken-flow|ticket-resolution|dashboards)\.spec\.ts/,
    fullyParallel: false, workers: 1, retries: 0, forbidOnly: true, timeout: 90000,
    outputDir: `${process.env.LAB4_RUN_DIR}/playwright`,
    reporter: [['list'], ['json', { outputFile: `${process.env.LAB4_RUN_DIR}/results.json` }]],
    use: { actionTimeout: 10000, baseURL: 'http://127.0.0.1:5207', serviceWorkers: 'block', trace: 'retain-on-failure', locale: 'en-US', timezoneId: 'Asia/Bangkok' },
    webServer: { command: 'npm run preview --prefix client -- --outDir "$LAB4_CLIENT_BUILD" --host 127.0.0.1 --port 5207 --strictPort', url: 'http://127.0.0.1:5207', reuseExistingServer: false },
    projects: [{ name: 'desktop', use: { viewport: { width: 1280, height: 720 } } }, { name: 'tablet', use: { viewport: { width: 800, height: 900 } } }, { name: 'mobile', use: { viewport: { width: 390, height: 844 } } }],
});
