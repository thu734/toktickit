import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
async function run(args, env) {
  const child = spawn(process.execPath, args, { cwd: `${root}server`, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', value => output += value);
  child.stderr.on('data', value => output += value);
  const timer = setTimeout(() => child.kill('SIGTERM'), 15000);
  try { const [code] = await once(child, 'exit'); return { code, output }; }
  finally { clearTimeout(timer); }
}
test('missing DATABASE_URL fails before claiming API readiness', async () => {
  const result = await run(['--import', 'tsx', 'src/index.ts'], { DATABASE_URL: '' });
  assert.equal(result.code, 1);
  assert.match(result.output, /API startup failed: DATABASE_URL is missing/);
  assert.doesNotMatch(result.output, /API listening/);
});
test('an occupied API port fails clearly without logging configuration secrets', async () => {
  const occupied = createServer();
  occupied.listen(0);
  await once(occupied, 'listening');
  try {
    const result = await run(['--import', 'tsx', 'src/index.ts'], {
      DATABASE_URL: 'postgresql://private-user:private-password@localhost:5432/unused',
      SESSION_SECRET: 'private-session-value', PORT: String(occupied.address().port),
    });
    assert.equal(result.code, 1);
    assert.match(result.output, /API startup failed: port .* is already in use/);
    assert.doesNotMatch(result.output, /private-user|private-password|private-session-value|API listening/);
  } finally { await new Promise(resolve => occupied.close(resolve)); }
});

test('authenticated smoke requires explicit controlled credentials', async () => {
  const result = await run(['--import', 'tsx', '../scripts/startup-smoke.mjs'], {
    DATABASE_URL: 'postgresql://private-user:private-password@localhost:5432/toktickit?schema=public',
    SMOKE_EMAIL: '', SMOKE_PASSWORD: '', SMOKE_ROLE: '',
  });
  assert.equal(result.code, 1);
  assert.match(result.output, /Set SMOKE_EMAIL, SMOKE_PASSWORD and SMOKE_ROLE/);
  assert.doesNotMatch(result.output, /private-user|private-password|API listening/);
});
test('smoke rejects an unexpected database before starting services or connecting', async () => {
  const result = await run(['--import', 'tsx', '../scripts/startup-smoke.mjs', '--connectivity-only'], {
    DATABASE_URL: 'postgresql://private-user:private-password@localhost:5432/toktickit_test?schema=public',
    SMOKE_EXPECTED_DATABASE: 'toktickit',
  });
  assert.equal(result.code, 1);
  assert.match(result.output, /Database\/schema configuration does not match/);
  assert.doesNotMatch(result.output, /private-user|private-password|API listening/);
});
