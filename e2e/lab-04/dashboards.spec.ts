import { test, expect, api, headers, login, nav, openTicket, capture } from './fixtures/integration';
import { randomUUID } from 'node:crypto';
const active = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'];
const statuses = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'];
const labels = ['New', 'Open', 'In Progress', 'Waiting for Requester', 'Resolved', 'Closed', 'Reopened', 'Cancelled'];
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
// Read the visible count surface, independently of the accessible-name assertion.
async function visibleCount(button: import('@playwright/test').Locator) {
    const value = await button.evaluate(node => {
        const card = node.closest('article') || node.closest('.card');
        const primary = card?.querySelector('.fs-2');
        return primary?.textContent || node.textContent || '';
    });
    const match = value.match(/(\d+)\s*$/);
    expect(match, 'Visible metric must expose a numeric value').not.toBeNull();
    return Number(match![1]);
}
test('E2E-DASH-01 — Requester SQL reconciliation, all metric drill-downs, recent ordering and ownership', async ({ page, lab }, info) => {
    await login(page, 'requester');
    const response = page.waitForResponse(r => r.url() === `${api}/dashboard/requester`);
    await nav(page, 'Dashboard');
    const dto = await (await response).json();
    const rows: any[] = await lab.query(`SELECT * FROM tickets WHERE "requesterId"=${lab.users.requester.id} ORDER BY "updatedAt" DESC,id DESC`);
    const expected = { active: rows.filter(t => active.includes(t.currentStatus)).length, new: rows.filter(t => t.currentStatus === 'NEW').length, open: rows.filter(t => t.currentStatus === 'OPEN').length, inProgress: rows.filter(t => t.currentStatus === 'IN_PROGRESS').length, waitingForRequester: rows.filter(t => t.currentStatus === 'WAITING_FOR_REQUESTER').length, resolved: rows.filter(t => t.currentStatus === 'RESOLVED').length, reopened: rows.filter(t => t.currentStatus === 'REOPENED').length };
    expect(dto.counts).toEqual(expected);
    expect(dto.recentTickets.map((t: any) => t.id)).toEqual(rows.slice(0, 5).map(t => t.id));
    expect(dto.recentTickets).toHaveLength(5);
    expect(Number.isFinite(Date.parse(dto.asOf))).toBe(true);
    for (const [label, count] of [['All Active', expected.active], ['New', expected.new], ['Open', expected.open], ['In Progress', expected.inProgress], ['Waiting for Requester', expected.waitingForRequester], ['Resolved', expected.resolved], ['Reopened', expected.reopened]])
        await expect(page.getByRole('button', { name: `View ${label} (${count})`, exact: true })).toBeVisible();
    const metricTable = [];
    for (const [key, label, predicate] of [['active', 'All Active', "currentStatus IN (NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED)"], ['open', 'Open', "currentStatus='OPEN'"], ['waitingForRequester', 'Waiting for Requester', "currentStatus='WAITING_FOR_REQUESTER'"], ['resolved', 'Resolved', "currentStatus='RESOLVED'"]]) {
        const button = page.getByRole('button', { name: `View ${label} (${expected[key as keyof typeof expected]})`, exact: true });
        const uiValue = key === 'active' ? Number((await page.locator('[aria-label="Active Tickets summary"] strong').innerText()).match(/(\d+)$/)![1]) : await visibleCount(button);
        expect(uiValue).toBe(expected[key as keyof typeof expected]);
        metricTable.push({ metric: label, predicate: `requesterId=session.userId AND ${predicate}`, role: 'REQUESTER', databaseValue: expected[key as keyof typeof expected], apiValue: dto.counts[key], uiValue, result: 'PASS' });
    }
    await expect(page.getByText(lab.foreign.summary, { exact: true })).toHaveCount(0);
    await capture(page, info, 'requester-dashboard', 'baseline', 'REQUESTER', ['AC-17', 'AC-19', 'AC-23', 'AC-24'], 'Seven counts and recent-five reconcile to independent SQL; owned Requester dashboard');
    for (const [label, key, status] of [['All Active', 'active', 'ACTIVE'], ['New', 'new', 'NEW'], ['Open', 'open', 'OPEN'], ['In Progress', 'inProgress', 'IN_PROGRESS'], ['Waiting for Requester', 'waitingForRequester', 'WAITING_FOR_REQUESTER'], ['Resolved', 'resolved', 'RESOLVED'], ['Reopened', 'reopened', 'REOPENED']]) {
        const destination=page.waitForResponse(r=>r.url().startsWith(`${api}/tickets?`) && new URL(r.url()).searchParams.get(status==='ACTIVE'?'statusGroup':'currentStatus')===(status==='ACTIVE'?'active':status));
        await page.getByRole('button', { name: `View ${label} (${expected[key as keyof typeof expected]})`, exact: true }).click();
        await expect(page.locator('#ticket-status-filter')).toHaveValue(status);
        const result = await destination;
        expect(result.status()).toBe(200);
        const list = await result.json();
        expect(list.pagination.totalItems).toBe(expected[key as keyof typeof expected]);
        await nav(page, 'Dashboard');
        await expect(page.getByRole('button', { name: 'Refresh dashboard', exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: `Open Ticket ${rows[0].ticketNumber}`, exact: true }).click();
    await expect(page.getByRole('heading', { name: rows[0].ticketNumber, exact: true })).toBeVisible();
    expect((await page.request.get(`${api}/dashboard/staff`)).status()).toBe(403);
    const forged = await page.request.get(`${api}/dashboard/requester?requesterId=${lab.users.other.id}`);
    expect((await forged.json()).counts).toEqual(expected);
    await info.attach('database-reconciliation', { body: JSON.stringify({ role: 'REQUESTER', metricTable, expectedCounts: expected, recentIds: rows.slice(0, 5).map(t => t.id), allSevenDrillDowns: true, sessionOwnership: true }), contentType: 'application/json' });
});
for (const role of ['staff', 'admin'])
    test(`E2E-DASH-02-${role} — operational SQL reconciliation, My Actions and role restrictions`, async ({ page, lab }, info) => {
        await login(page, role);
        // Create through the actual session/API. Include assigned/nonassigned and terminal Actions.
        let rev = 0;
        const actionIds: number[] = [];
        for (let i = 0; i < 7; i++) {
            const result = await page.request.post(`${api}/tickets/${lab.tickets[1].id}/actions-taken`, { headers, data: { workflowRevision: rev, requestKey: randomUUID(), description: `Planned verification ${i + 1}: assess service access and report outcome.`, assignedToId: lab.users[role].id, performedById: lab.users.other.id, createdAt: '2000-01-01T00:00:00Z' } });
            expect(result.status()).toBe(201);
            const value = await result.json();
            rev = value.workflowRevision;
            actionIds.push(value.action.id);
            expect(value.action.performedById).toBe(lab.users[role].id);
            expect(value.action.createdAt).not.toBe('2000-01-01T00:00:00.000Z');
        }
        const terminal = await page.request.patch(`${api}/tickets/${lab.tickets[1].id}/actions-taken/${actionIds[0]}`, { headers, data: { workflowRevision: rev, status: 'COMPLETED', result: 'Completed verification' } });
        expect(terminal.status()).toBe(200);
        rev = (await terminal.json()).workflowRevision;
        const unassign = await page.request.patch(`${api}/tickets/${lab.tickets[1].id}/actions-taken/${actionIds[1]}`, { headers, data: { workflowRevision: rev, assignedToId: lab.users.second.id } });
        expect(unassign.status()).toBe(200);
        const response = page.waitForResponse(r => r.url() === `${api}/dashboard/staff`);
        await nav(page, 'Dashboard');
        const dto = await (await response).json();
        const rows: any[] = await lab.query('SELECT * FROM tickets ORDER BY "updatedAt" DESC,id DESC');
        const planned: any[] = await lab.query(`SELECT a.id,a."ticketId" FROM actions_taken a WHERE "assignedToId"=${lab.users[role].id} AND status='PLANNED' ORDER BY "createdAt",id LIMIT 5`);
        const expected = { unassignedActive: rows.filter(t => t.assignedStaffId === null && active.includes(t.currentStatus)).length, myActive: rows.filter(t => t.assignedStaffId === lab.users[role].id && active.includes(t.currentStatus)).length, byStatus: Object.fromEntries(statuses.map(s => [s, rows.filter(t => t.currentStatus === s).length])), byPriority: Object.fromEntries(priorities.map(p => [p, rows.filter(t => t.itPriority === p).length])) };
        expect(dto.counts).toEqual(expected);
        expect(dto.myActions.map((a: any) => a.id)).toEqual(planned.map(a => a.id));
        expect(dto.myActions).toHaveLength(5);
        expect(dto.recentTickets.map((t: any) => t.id)).toEqual(rows.slice(0, 5).map(t => t.id));
        await expect(page.getByRole('button', { name: `View Unassigned Active Tickets (${expected.unassignedActive})`, exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: `View My Assigned Tickets (${expected.myActive})`, exact: true })).toBeVisible();
        for (const [i, s] of statuses.entries())
            await expect(page.getByRole('button', { name: `View ${labels[i]} Tickets (${expected.byStatus[s]})`, exact: true })).toBeVisible();
        for (const p of priorities)
            await expect(page.getByRole('button', { name: `View ${p[0] + p.slice(1).toLowerCase()} Priority Tickets (${expected.byPriority[p]})`, exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: new RegExp('Open Action ') })).toHaveCount(5);
        const metricTable = [];
        for (const [metric, label, databaseValue, apiValue, predicate] of [
            ['Unassigned Active', 'View Unassigned Active Tickets', expected.unassignedActive, dto.counts.unassignedActive, 'assignedStaffId IS NULL AND currentStatus IN active statuses'],
            ['My Assigned Active', 'View My Assigned Tickets', expected.myActive, dto.counts.myActive, 'assignedStaffId=session.userId AND currentStatus IN active statuses'],
            ['New', 'View New Tickets', expected.byStatus.NEW, dto.counts.byStatus.NEW, "currentStatus='NEW'"],
            ['Urgent', 'View Urgent Priority Tickets', expected.byPriority.URGENT, dto.counts.byPriority.URGENT, "itPriority='URGENT'"],
        ] as const) {
            const uiValue = await visibleCount(page.getByRole('button', { name: `${label} (${databaseValue})`, exact: true }));
            expect(uiValue).toBe(databaseValue);
            metricTable.push({ metric, predicate, role: lab.users[role].role, databaseValue, apiValue, uiValue, result: 'PASS' });
        }
        metricTable.push({ metric: 'My Planned Actions preview', predicate: "assignedToId=session.userId AND status='PLANNED' ORDER BY createdAt,id LIMIT 5", role: lab.users[role].role, databaseValue: planned.length, apiValue: dto.myActions.length, uiValue: await page.getByRole('button', { name: /Open Action / }).count(), result: 'PASS' });

        if (role === 'staff' || info.project.name === 'desktop')
            await capture(page, info, 'staff-dashboard', role === 'staff' ? 'baseline' : 'administrator', 'IT_STAFF' === lab.users[role].role ? 'IT_STAFF' : 'ADMINISTRATOR', ['AC-01', 'AC-16', 'AC-18', 'AC-19', 'AC-23', 'AC-24'], 'All operational metrics and My Actions reconcile independently; server-controlled attribution');
        for (const [i, s] of statuses.entries()) {
            const destination=page.waitForResponse(r=>r.url().startsWith(`${api}/staff/tickets?`) && new URL(r.url()).searchParams.get('currentStatus')===s);
            await page.getByRole('button', { name: `View ${labels[i]} Tickets (${expected.byStatus[s]})`, exact: true }).click();
            await expect(page.locator('#staff-status-filter')).toHaveValue(s);
            const result=await destination;expect(result.status()).toBe(200);expect((await result.json()).pagination.totalItems).toBe(expected.byStatus[s]);
            await nav(page, 'Dashboard');
            await expect(page.getByRole('button', { name: 'Refresh dashboard', exact: true })).toBeVisible();
        }
        for (const p of priorities) {
            const destination=page.waitForResponse(r=>r.url().startsWith(`${api}/staff/tickets?`) && new URL(r.url()).searchParams.get('itPriority')===p);
            await page.getByRole('button', { name: `View ${p[0] + p.slice(1).toLowerCase()} Priority Tickets (${expected.byPriority[p]})`, exact: true }).click();
            await expect(page.locator('#queue-priority')).toHaveValue(p);
            const result=await destination;expect(result.status()).toBe(200);expect((await result.json()).pagination.totalItems).toBe(expected.byPriority[p]);
            await nav(page, 'Dashboard');
            await expect(page.getByRole('button', { name: 'Refresh dashboard', exact: true })).toBeVisible();
        }
        const myAssignedResponse = page.waitForResponse(r => r.url().startsWith(`${api}/staff/tickets?`) && new URL(r.url()).searchParams.get('assignedStaffId') === 'me');
        await page.getByRole('button', { name: `View My Assigned Tickets (${expected.myActive})`, exact: true }).click();
        await expect(page.locator('#staff-assignment-filter')).toHaveValue('me');
        const myAssigned = await myAssignedResponse; expect(myAssigned.status()).toBe(200); expect((await myAssigned.json()).pagination.totalItems).toBe(expected.myActive);
        await expect(page.locator('#staff-status-filter')).toHaveValue('ACTIVE');
        await nav(page, 'Dashboard');
        await expect(page.getByRole('button', { name: 'Refresh dashboard', exact: true })).toBeVisible();
        const unassignedResponse = page.waitForResponse(r => r.url().startsWith(`${api}/staff/tickets?`) && new URL(r.url()).searchParams.get('assignedStaffId') === 'unassigned');
        await page.getByRole('button', { name: `View Unassigned Active Tickets (${expected.unassignedActive})`, exact: true }).click();
        await expect(page.locator('#staff-assignment-filter')).toHaveValue('unassigned');
        const unassigned = await unassignedResponse; expect(unassigned.status()).toBe(200); expect((await unassigned.json()).pagination.totalItems).toBe(expected.unassignedActive);
        await expect(page.locator('#staff-status-filter')).toHaveValue('ACTIVE');
        await nav(page, 'Dashboard');
        await expect(page.getByRole('button', { name: 'Refresh dashboard', exact: true })).toBeVisible();
        await page.getByRole('button', { name: `Open Action ${planned[0].id} on Ticket ${lab.tickets[1].ticketNumber}`, exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Actions Taken', exact: true })).toBeFocused();
        await expect(page.getByRole('article', { name: `Action ${planned[0].id}`, exact: true })).toBeVisible();
        expect((await page.request.get(`${api}/dashboard/requester`)).status()).toBe(403);
        const adminResponse = await page.request.get(`${api}/admin/users`);
        expect(adminResponse.status()).toBe(role === 'admin' ? 200 : 403);
        if (role === 'admin') {
            await nav(page, /User Management/);
            await expect(page.getByRole('heading', { name: /User Management/ })).toBeVisible();
            await expect(page.getByRole('button', { name: /Create User/ })).toBeVisible();
            await page.getByRole('button', { name: /Create User/ }).click();
            const create = page.getByRole('dialog');
            await create.locator('#createName').fill('Integrated account proof');
            await create.locator('#createEmail').fill('created@lab4.test');
            await create.locator('#createRole').selectOption('REQUESTER');
            await create.locator('#createPassword').fill('Lab4Created123!');
            const creation = page.waitForResponse(r => r.url() === `${api}/admin/users` && r.request().method() === 'POST');
            await create.getByRole('button', { name: 'Create User', exact: true }).click();
            expect((await creation).status()).toBe(201);
            await expect(create).toHaveCount(0);
            const createdUser = await lab.db.user.findUniqueOrThrow({ where: { email: 'created@lab4.test' } });
            expect(createdUser).toMatchObject({ name: 'Integrated account proof', role: 'REQUESTER', isActive: true, mustChangePassword: true });
            await page.getByRole('textbox', { name: 'Search users by name or email', exact: true }).fill('created@lab4.test');
            await page.getByRole('button', { name: 'Search', exact: true }).click();
            await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(1);
            await page.getByRole('button', { name: 'Edit', exact: true }).click();
            const edit = page.getByRole('dialog', { name: 'Edit User Account', exact: true });
            await edit.locator('#editName').fill('Verified account correction');
            const saved = page.waitForResponse(r => r.url() === `${api}/admin/users/${createdUser.id}` && r.request().method() === 'PATCH');
            await edit.getByRole('button', { name: 'Save Changes', exact: true }).click();
            expect((await saved).status()).toBe(200);
            await expect(edit).toHaveCount(0);
            const correctedUser = await lab.db.user.findUniqueOrThrow({ where: { id: createdUser.id } });
            expect(correctedUser).toMatchObject({ name: 'Verified account correction', role: 'REQUESTER', isActive: true, mustChangePassword: true });
            expect(correctedUser.passwordHash === createdUser.passwordHash).toBe(true);
            const correctedName = info.project.name === 'desktop' ? page.getByRole('cell', { name: 'Verified account correction', exact: true }) : page.locator('.d-lg-none').getByText('Verified account correction', { exact: true });
            await expect(correctedName).toBeVisible();
        }
        else {
            await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: /User Management/ })).toHaveCount(0);
        }
        await info.attach('database-reconciliation', { body: JSON.stringify({ role: lab.users[role].role, metricTable, adminAccountCreateEdit: role === 'admin', counts: expected, myActions: planned.map(a => a.id), recent: rows.slice(0, 5).map(t => t.id), allMetricDestinations: true, forgedAttributionIgnored: true }), contentType: 'application/json' });
    });
test('E2E-DASH-03 — genuine empty data and expired-session error with real retry recovery', async ({ page, lab }, info) => {
    await login(page, 'empty');
    await nav(page, 'Dashboard');
    await expect(page.getByText('No Tickets Yet. Create a Ticket when you need IT support.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View All Active (0)', exact: true })).toBeVisible();
    expect(await lab.db.ticket.count({ where: { requesterId: lab.users.empty.id } })).toBe(0);
    expect((await page.request.post(`${api}/auth/logout`, { headers })).status()).toBe(200);
    await page.getByRole('button', { name: 'Refresh dashboard', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Your session has expired.');
    await expect(page.getByRole('button', { name: 'View All Active (0)', exact: true })).toHaveCount(0);
    expect((await page.request.post(`${api}/auth/login`, { headers, data: { email: 'empty@lab4.test', password: 'Lab4Test123!' } })).status()).toBe(200);
    await page.getByRole('button', { name: 'Retry dashboard', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'View All Active (0)', exact: true })).toBeVisible();
    // This schema belongs only to this test. Remove only its known fixture Tickets
    // to exercise genuinely empty operational aggregates; no production cleanup API.
    await lab.db.ticket.deleteMany({where:{id:{in:[...lab.tickets.map(t=>t.id),lab.foreign.id]}}});
    expect(await lab.db.ticket.count()).toBe(0);
    for(const role of ['staff','admin']){
        expect((await page.request.post(`${api}/auth/logout`,{headers})).status()).toBe(200);
        await login(page,role);await nav(page,'Dashboard');
        await expect(page.getByText('No operational Tickets yet.',{exact:true})).toBeVisible();
        await expect(page.getByText('No planned Actions assigned to you.',{exact:true})).toBeVisible();
        await expect(page.getByRole('button',{name:'View Unassigned Active Tickets (0)',exact:true})).toBeVisible();
        expect((await page.request.post(`${api}/auth/logout`,{headers})).status()).toBe(200);
        await page.getByRole('button',{name:'Refresh dashboard',exact:true}).click();
        await expect(page.getByRole('alert')).toContainText('Your session has expired.');
        await expect(page.getByRole('button',{name:'View Unassigned Active Tickets (0)',exact:true})).toHaveCount(0);
        expect((await page.request.post(`${api}/auth/login`,{headers,data:{email:`${role}@lab4.test`,password:'Lab4Test123!'}})).status()).toBe(200);
        await page.getByRole('button',{name:'Retry dashboard',exact:true}).click();
        await expect(page.getByRole('alert')).toHaveCount(0);
        await expect(page.getByRole('button',{name:'View Unassigned Active Tickets (0)',exact:true})).toBeVisible();
    }
    await info.attach('database-reconciliation', { body: JSON.stringify({ emptyOperationalTicketCount:0,rolesRecovered:['REQUESTER','IT_STAFF','ADMINISTRATOR'],emptyRequesterTicketCount: 0, expiredSession401: true, retryRecovered: true }), contentType: 'application/json' });
});
