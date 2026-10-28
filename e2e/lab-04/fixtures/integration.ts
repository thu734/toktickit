import { test as base, expect, Page, TestInfo } from '@playwright/test';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PrismaClient } from '../../../server/node_modules/@prisma/client/default.js';
import { validatedSchemaUrl } from '../../../server/tests/lab-04/migrationTestDatabase';
export const api = 'http://127.0.0.1:3107/api';
export const headers = { 'X-Requested-With': 'XMLHttpRequest' };
const root = fileURLToPath(new URL('../../../', import.meta.url));
interface IntegratedLab {
    url: string;
    schema: string;
    users: Record<string, {
        id: number;
        name: string;
        email: string;
        role: string;
    }>;
    category: {
        id: number;
        name: string;
    };
    system: {
        id: number;
        name: string;
    };
    tickets: Array<{
        id: number;
        ticketNumber: string;
        summary: string;
    }>;
    foreign: {
        id: number;
        summary: string;
    };
    readiness: unknown;
    db: PrismaClient;
    query: (sql: string) => Promise<any[]>;
}
export const test = base.extend<{
    lab: IntegratedLab;
}>({
    lab: async ({ page }, use, info) => {
        const child = fork(resolve(root, 'e2e/lab-04/fixtures/integration-server.mts'), [], { cwd: resolve(root, 'server'), execArgv: ['--import', 'tsx'], env: { ...process.env, DATABASE_URL: '', NODE_ENV: 'test' }, silent: true });
        let logs = '';
        child.stdout!.on('data', chunk => logs += chunk);
        child.stderr!.on('data', chunk => logs += chunk);
        let db: PrismaClient | undefined;
        let ownedSchema: string | undefined;
        try {
            const ready: any = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error(`API readiness timed out\n${logs}`)), 60000);
                child.once('message', value => { clearTimeout(timer); resolve(value); });
                child.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned API exited ${code}\n${logs}`)); });
            });
            expect(validatedSchemaUrl(ready.url, ready.schema)).toBe(ready.url);
            ownedSchema = ready.schema;
            db = new PrismaClient({ datasources: { db: { url: ready.url } } });
            const probe = await page.request.get(`${api}/health`);
            expect(probe.status()).toBe(200);
            expect(probe.headers()['x-lab4-test-run']).toBe(process.env.LAB4_RUN_ID);
            const failures: string[] = [];
            page.on('pageerror', error => failures.push(error.message));
            page.on('response', response => { if (response.url().startsWith(api) && response.status() >= 500)
                failures.push(`${response.status()} ${response.url()}`); });
            await info.attach('schema-readiness', { body: JSON.stringify(ready.readiness, null, 2), contentType: 'application/json' });
            await use({ ...ready, db, query: async (sql: string) => db!.$queryRawUnsafe(sql) });
            expect(failures, 'No browser exceptions or unexpected server 5xx').toEqual([]);
        }
        finally {
            await db?.$disconnect();
            const stopped = child.exitCode !== null ? Promise.resolve() : new Promise<void>((resolve, reject) => { const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Owned API did not cleanly dispose its schema')); }, 15000); child.once('exit', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`Owned API exit ${code}\n${logs}`)); }); });
            if (child.connected)
                child.send('stop');
            await stopped;
            if (db && ownedSchema) {
                const remaining = await db.$queryRaw<Array<{
                    count: number;
                }>> `SELECT count(*)::int AS count FROM pg_catalog.pg_namespace WHERE nspname=${ownedSchema}`;
                expect(remaining[0].count, 'Owned schema must be disposed after every test').toBe(0);
                await db.$disconnect();
                await info.attach('owned-schema-cleanup', { body: JSON.stringify({ schema: ownedSchema, remaining: remaining[0].count }), contentType: 'application/json' });
            }
            await info.attach('owned-api-log', { body: logs, contentType: 'text/plain' });
        }
    },
});
export { expect };
export async function login(page: Page, role: string) {
    await page.goto('/');
    await page.getByLabel(/email address/i).fill(`${role}@lab4.test`);
    await page.locator('#password').fill('Lab4Test123!');
    const response = page.waitForResponse(r => r.url() === `${api}/auth/login` && r.request().method() === 'POST');
    await page.getByRole('button', { name: /sign in/i }).click();
    const loggedIn = await response;
    expect(loggedIn.status()).toBe(200);
    const account = (await loggedIn.json()).user;
    expect(account.email).toBe(`${role}@lab4.test`);
    const cookies = await page.context().cookies(api);
    expect(cookies.some(cookie => cookie.name === 'toktickit_session' && cookie.domain === '127.0.0.1' && cookie.httpOnly && cookie.sameSite === 'Strict')).toBe(true);
    const profile = await page.request.get(`${api}/auth/me`);
    expect(profile.status()).toBe(200);
    expect((await profile.json()).user).toEqual(account);
    await expect(page.getByRole('button', { name: 'User profile menu' })).toBeVisible();
}
export async function nav(page: Page, name: RegExp | string) { await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name }).click(); }
export async function openTicket(page: Page, number: string, staff = false) {
    await nav(page, /Ticket Queue|My Tickets/);
    const search = page.locator('#ticket-search, #queue-search');
    await search.fill(number);
    if (staff) {
        await page.getByRole('button', { name: 'Search', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Open Detail', exact: true })).toHaveCount(1);
        await page.getByRole('button', { name: 'Open Detail', exact: true }).click();
    }
    else
        await page.getByRole('button', { name: number, exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Actions Taken', exact: true })).toBeVisible();
    await expect(page.getByText('Loading Actions…', { exact: true })).toHaveCount(0);
}
export async function capture(page: Page, info: TestInfo, folder: string, name: string, role: string, acs: string[], scenario: string, expectedAlert?: string) {
    await expect(page.getByRole('alert')).toHaveCount(expectedAlert ? 1 : 0);
    if (expectedAlert)
        await expect(page.getByRole('alert')).toContainText(expectedAlert);
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const relative = `screenshots/${folder}/${name}-${info.project.name}.png`;
    const path = resolve(process.env.LAB4_RUN_DIR!, relative);
    mkdirSync(resolve(path, '..'), { recursive: true });
    await page.screenshot({ path, fullPage: true, animations: 'disabled' });
    const submissionParts = folder === 'staff-dashboard' ? [5, 9] : folder === 'requester-dashboard' ? [8, 9] : name === 'requester-read-only' ? [6, 7, 8, 9] : name === 'validation' ? [6, 9] : [6, 7, 9];
    const entry = { submissionParts, buildHash: process.env.LAB4_BUILD_HASH, artifact: `artifacts/lab-04/${relative}`, scenario, role, acs, test: info.titlePath, viewport: page.viewportSize(), project: info.project.name, revision: process.env.LAB4_REVISION, sourceHash: process.env.LAB4_SOURCE_HASH, run: process.env.LAB4_RUN_ID, result: 'PASS', sha256: createHash('sha256').update(readFileSync(path)).digest('hex'), integration: 'real frontend/API/session/Prisma/PostgreSQL; isolated migrated schema' };
    writeFileSync(`${path}.json`, JSON.stringify(entry, null, 2) + '\n');
}
