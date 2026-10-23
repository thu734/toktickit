import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { loadEnv } from '../client/node_modules/vite/dist/node/index.js';

// Own source services; never reuse an unidentified server or change DB records.
class SmokeFailure extends Error {}
const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(`${root}server/.env`)) loadEnvFile(`${root}server/.env`);
const connectivityOnly = process.argv.includes('--connectivity-only');
let frontend, server, prisma, browser;
let stage = 'configuration';
try {
  if (!process.env.DATABASE_URL) throw new SmokeFailure('DATABASE_URL is required. Configure server/.env.');
  const url = new URL(process.env.DATABASE_URL);
  const expectedDatabase = process.env.SMOKE_EXPECTED_DATABASE || 'toktickit';
  const expectedSchema = process.env.SMOKE_EXPECTED_SCHEMA || 'public';
  if (decodeURIComponent(url.pathname.slice(1)) !== expectedDatabase || (url.searchParams.get('schema') || 'public') !== expectedSchema)
    throw new SmokeFailure('Database/schema configuration does not match the explicit smoke target.');
  const email = process.env.SMOKE_EMAIL, password = process.env.SMOKE_PASSWORD, role = process.env.SMOKE_ROLE;
  if (!connectivityOnly && (!email || !password || !['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'].includes(role)))
    throw new SmokeFailure('Set SMOKE_EMAIL, SMOKE_PASSWORD and SMOKE_ROLE to controlled current credentials, or explicitly use --connectivity-only.');
  const configuredOrigin = loadEnv('development', `${root}client`, 'VITE_').VITE_API_URL || 'http://localhost:3000';
  const normalApi = `http://localhost:${process.env.PORT || 3000}`;
  if (configuredOrigin !== normalApi) throw new SmokeFailure('Development frontend API origin does not match the configured development API.');
  const apiPort = process.env.SMOKE_API_PORT || '3300';
  const frontendPort = process.env.SMOKE_FRONTEND_PORT || '5300';
  const api = `http://localhost:${apiPort}`, front = `http://localhost:${frontendPort}`;
  process.env.PORT = apiPort;
  process.env.SESSION_SECRET ||= randomBytes(48).toString('hex');
  stage = 'API startup';
  // Same source entrypoint and Prisma singleton as normal development startup.
  ({ server } = await import('../server/src/index.ts'));
  if (!server.listening) await once(server, 'listening');
  const { getPrisma } = await import('../server/src/prisma.ts');
  prisma = getPrisma();
  stage = 'database readiness';
  const [identity] = await prisma.$queryRawUnsafe('SELECT current_database() AS database,current_schema() AS schema');
  if (identity.database !== expectedDatabase || identity.schema !== expectedSchema) throw new SmokeFailure('Connected database/schema does not match the smoke target.');
  await prisma.$queryRawUnsafe('SELECT "creationRequestKey","creationPayloadHash","workflowRevision" FROM tickets LIMIT 0');
  stage = 'API reachability';
  if (!(await fetch(`${api}/api/health`, { signal: AbortSignal.timeout(5000) })).ok) throw new SmokeFailure('API health request failed.');
  if (!(await fetch(`${api}/api/categories`, { signal: AbortSignal.timeout(5000) })).ok) throw new SmokeFailure('Database-backed API read failed.');
  stage = 'frontend startup';
  frontend = spawn('npm', ['run', 'dev', '--', '--host', 'localhost', '--port', frontendPort, '--strictPort'], {
    cwd: `${root}client`, env: { ...process.env, VITE_API_URL: api }, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  let frontendOutput = '';
  const collect = value => { frontendOutput = (frontendOutput + value).slice(-8192).replace(/\x1b\[[0-9;]*m/g, ''); };
  frontend.stdout.on('data', collect); frontend.stderr.on('data', collect);
  frontend.on('error', () => {});
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (frontend.exitCode !== null) throw new SmokeFailure('Owned frontend failed to start; check port availability.');
    try { ready = frontendOutput.includes(`http://localhost:${frontendPort}/`) && (await fetch(front, { signal: AbortSignal.timeout(500) })).ok; } catch { /* bounded readiness polling, not test retry */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new SmokeFailure('Owned frontend did not become reachable.');
  stage = 'frontend API origin';
  const source = await (await fetch(`${front}/src/apiOrigin.ts`, { signal: AbortSignal.timeout(5000) })).text();
  if (!source.includes(`"VITE_API_URL": "${api}"`)) throw new SmokeFailure('Served frontend is configured for a different API.');
  console.log(`PASS: source frontend/API, configured origin, API database ${expectedDatabase}/${expectedSchema}, retry-column readiness.`);
  if (connectivityOnly) {
    console.log('AUTH NOT VERIFIED: explicit --connectivity-only mode; no login attempted.');
  } else {
    stage = 'browser login/session';
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    context.setDefaultTimeout(10000);
    const page = await context.newPage();
    await page.goto(front);
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    const response = page.waitForResponse(r => r.url() === `${api}/api/auth/login` && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    const login = await response;
    if (login.status() !== 200) throw new SmokeFailure(`Login rejected (HTTP ${login.status()}); verify the current smoke credential/account, not the initial seed password.`);
    const cookie = (await context.cookies(api)).find(c => c.name === 'toktickit_session');
    if (!cookie || cookie.domain !== 'localhost' || !cookie.httpOnly || cookie.sameSite !== 'Strict') throw new SmokeFailure('Expected localhost session cookie was not established.');
    const profile = await page.evaluate(async api => {
      const r = await fetch(`${api}/api/auth/me`, { credentials: 'include' });
      return { status: r.status, data: await r.json() };
    }, api);
    if (profile.status !== 200 || profile.data.user?.email !== email || profile.data.user?.role !== role) throw new SmokeFailure('Session profile does not match the controlled smoke account.');
    const reload = page.waitForResponse(r => r.url() === `${api}/api/auth/me`);
    await page.reload();
    if ((await reload).status() !== 200) throw new SmokeFailure('Session did not survive browser reload.');
    console.log(`PASS: real browser login, localhost session cookie, /api/auth/me and reload (${role}).`);
  }
} catch (error) {
  // Never print SQL/Prisma diagnostics, supplied passwords, URLs or cookie values.
  const safe = error instanceof SmokeFailure;
  console.error(`Startup smoke FAIL at ${stage}.${safe ? ` ${error.message}` : ' Check service configuration/readiness; no credential diagnostics are logged.'}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (frontend?.pid) {
    try { process.kill(-frontend.pid, 'SIGTERM'); } catch { /* already stopped */ }
  }
  if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  await prisma?.$disconnect();
}
