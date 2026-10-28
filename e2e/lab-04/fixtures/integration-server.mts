// Test-only process: real built Express app, private IPC readiness, no product endpoints.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import bcrypt from '../../../server/node_modules/bcryptjs/index.js';
import { createTestDatabase } from '../../../server/tests/lab-04/migrationTestDatabase.ts';
const db = await createTestDatabase();
let disconnectApi = async () => { };
let server: ReturnType<typeof createServer> | undefined;
async function close() { await new Promise<void>(resolve => server ? server.close(() => resolve()) : resolve()); await disconnectApi(); await db.dispose(); }
process.on('message', message => { if (message === 'stop')
    void close().then(() => process.exit(0)); });
process.on('disconnect', () => void close().then(() => process.exit(0)));
try {
    const deployment = db.deployThrough();
    process.env.DATABASE_URL = db.url;
    process.env.NODE_ENV = 'test';
    process.env.TOKTICKIT_TEST_FILES = db.work;
    process.env.SESSION_SECRET = process.env.LAB4_RUN_ID!;
    assert(process.env.LAB4_SERVER_BUILD, 'Owned server build is required');
    const build = process.env.LAB4_SERVER_BUILD!;
    const { getPrisma } = await import(pathToFileURL(resolve(build, 'src/prisma.js')).href);
    const apiDb = getPrisma();
    disconnectApi = () => apiDb.$disconnect();
    const [identity] = await apiDb.$queryRawUnsafe('SELECT current_database() AS database, current_schema() AS schema');
    assert.deepEqual(identity, { database: 'toktickit_test', schema: db.schema });
    const names = readdirSync('prisma/migrations').filter(name => /^\d/.test(name)).sort();
    const history = await apiDb.$queryRawUnsafe('SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name');
    assert.deepEqual(history.map((row: any) => row.migration_name), names);
    for (const row of history) {
        assert(row.finished_at && !row.rolled_back_at);
        assert.equal(row.checksum, createHash('sha256').update(readFileSync(`prisma/migrations/${row.migration_name}/migration.sql`)).digest('hex'));
    }
    const diff = db.schemaDiff(readFileSync('prisma/schema.prisma', 'utf8'));
    assert.equal(diff.trim(), '-- This is an empty migration.');
    const constraints = await apiDb.$queryRawUnsafe(`SELECT conname FROM pg_constraint WHERE connamespace = current_schema()::regnamespace AND contype = 'c'`);
    for (const name of ['tickets_workflow_revision_nonnegative', 'actions_description_nonblank', 'actions_terminal_result', 'actions_followup_note', 'action_event_fields_object', 'action_request_key_nonblank', 'action_request_hash_sha256', 'action_request_result_object'])
        assert(constraints.some((r: any) => r.conname === name));
    const triggers = await apiDb.$queryRawUnsafe(`SELECT tgname FROM pg_trigger WHERE tgrelid IN ('actions_taken'::regclass,'action_audit_events'::regclass,'action_creation_requests'::regclass) AND NOT tgisinternal AND tgenabled <> 'D'`);
    assert.deepEqual(triggers.map((r: any) => r.tgname).sort(), ['action_creation_result_immutable', 'action_events_append_only', 'action_identity_immutable']);
    // Explicit live query catches the former P2022 failure before any browser journey.
    await apiDb.$queryRawUnsafe('SELECT "creationRequestKey", "creationPayloadHash", "workflowRevision" FROM tickets LIMIT 0');
    const index = await apiDb.$queryRawUnsafe(`SELECT indexname FROM pg_indexes WHERE schemaname=current_schema() AND indexname='tickets_requesterId_creationRequestKey_key'`);
    assert.equal(index.length, 1);
    const passwordHash = await bcrypt.hash('Lab4Test123!', 10);
    const users: Record<string, any> = {};
    for (const [key, role, name] of [['requester', 'REQUESTER', 'Jennifer Test Requester'], ['other', 'REQUESTER', 'Other Requester'], ['staff', 'IT_STAFF', 'Sam Test Staff'], ['second', 'IT_STAFF', 'Taylor Ticket Owner'], ['admin', 'ADMINISTRATOR', 'Alex Test Administrator'], ['inactive', 'IT_STAFF', 'Inactive Staff'], ['empty', 'REQUESTER', 'Empty Requester']]) {
        users[key] = await db.client.user.create({ data: { name, role: role as any, email: `${key}@lab4.test`, passwordHash, mustChangePassword: false, isActive: key !== 'inactive' } });
    }
    const category = await db.client.category.create({ data: { name: 'Account and Access' } });
    const system = await db.client.relatedSystem.create({ data: { name: 'Email' } });
    const tickets = [];
    for (const [i, status] of ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'].entries()) {
        tickets.push(await db.client.ticket.create({ data: { ticketNumber: `TKT-2026-${String(i + 1).padStart(6, '0')}`, summary: `${status.replaceAll('_', ' ')} support request with durable evidence`, description: 'Representative support request. Verify persisted state independently.', requesterId: users.requester.id, categoryId: category.id, relatedSystemId: system.id, currentStatus: status as any, itPriority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][i % 4] as any, assignedStaffId: i % 2 ? users.staff.id : null, createdAt: new Date('2026-10-01T09:00:00Z'), updatedAt: new Date(`2026-10-${String(i + 1).padStart(2, '0')}T09:00:00Z`) } }));
    }
    const foreign = await db.client.ticket.create({ data: { ticketNumber: 'TKT-2026-000009', summary: 'Other owner private request', description: 'Must remain unavailable to Jennifer.', requesterId: users.other.id, categoryId: category.id, relatedSystemId: system.id } });
    const { app } = await import(pathToFileURL(resolve(build, 'src/app.js')).href);
    server = createServer((req, res) => { res.setHeader('X-Lab4-Test-Run', process.env.LAB4_RUN_ID!); app(req, res); });
    await new Promise<void>((resolve, reject) => { server!.once('error', reject); server!.listen(3107, '127.0.0.1', resolve); });
    process.send!({ url: db.url, schema: db.schema, users: Object.fromEntries(Object.entries(users).map(([key, u]) => [key, { id: u.id, name: u.name, email: u.email, role: u.role }])), category, system, tickets, foreign, readiness: { identity, migrations: names, checksumsVerified: true, prismaDiff: diff.trim(), checks: constraints.map((r: any) => r.conname), triggers: triggers.map((r: any) => r.tgname), retryColumnsAndIndex: true, deployment } });
}
catch (error) {
    console.error(error);
    await close();
    process.exit(1);
}
