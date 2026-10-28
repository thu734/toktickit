import { test as base, expect, type Page } from '@playwright/test';
import type { ActionTaken, RequesterDashboardResponse, User } from '../../../client/src/api';
import { dashboard as staffDashboard } from '../../../client/tests/lab-04/staffDashboardFixture';

export const longText = 'Long content ' + 'unbroken'.repeat(24);
const time = '2026-10-23T03:00:00.000Z';
const statuses = { new: 'NEW', open: 'OPEN', inProgress: 'IN_PROGRESS', waitingForRequester: 'WAITING_FOR_REQUESTER', resolved: 'RESOLVED', reopened: 'REOPENED' };
export const requesterDashboard: RequesterDashboardResponse = {
  asOf: time, counts: { active: 7, new: 1, open: 2, inProgress: 1, waitingForRequester: 2, resolved: 3, reopened: 1 },
  recentTickets: [{ id: 7, ticketNumber: 'TKT-2026-000007', summary: longText, currentStatus: 'OPEN', updatedAt: time }],
  drillDowns: Object.fromEntries(['active', ...Object.keys(statuses)].map(key => [key, { destination: 'my-tickets', filters: key === 'active' ? { statusGroup: 'active' } : { currentStatus: statuses[key as keyof typeof statuses] } }])) as RequesterDashboardResponse['drillDowns'],
};
export function makeUser(role: User['role']): User {
  return { id: 2, role, name: longText, email: 'long.' + 'name'.repeat(20) + '@example.test', isActive: true, mustChangePassword: false };
}
export function makeAction(status: ActionTaken['status'], id = 10): ActionTaken {
  return { id, ticketId: 7, performedById: 2, assignedToId: null, description: longText, result: status === 'PLANNED' ? null : longText,
    status, followUpRequired: status === 'COMPLETED', followUpNote: status === 'COMPLETED' ? longText : null, attachmentNotes: longText,
    performedBy: makeUser('IT_STAFF'), assignedTo: null, createdAt: time, updatedAt: time };
}
export type Scenario = {
  role: User['role']; dashboardState?: 'ready' | 'zero' | 'error' | 'loading';
  actionsState?: 'ready' | 'error' | 'loading'; ticketStatus?: string;
  saveState?: 'success' | 'conflict' | 'error';
};
export const test = base.extend<{ unexpected: string[] }>({
  unexpected: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await use(errors);
    expect(errors, 'No unexpected API requests or runtime errors').toEqual([]);
  }, { auto: true }],
});
export { expect };

export async function mount(page: Page, scenario: Scenario, unexpected: string[]) {
  const user = makeUser(scenario.role);
  const ticket = {
    id: 7, ticketNumber: 'TKT-2026-000007', summary: longText.slice(0, 150), description: longText,
    requestedPriority: 'MEDIUM', itPriority: 'HIGH', currentStatus: scenario.ticketStatus || 'OPEN',
    requesterId: 2, categoryId: 1, relatedSystemId: 1, category: { id: 1, name: 'Hardware' }, relatedSystem: { id: 1, name: 'Workstation' },
    requester: { ...makeUser('REQUESTER'), department: 'Support' }, assignedStaffId: null, assignedStaff: null,
    createdAt: time, updatedAt: time, workflowRevision: 1,
    attachments: [{ id: 3, filename: longText + '.pdf', mimeType: 'application/pdf', fileSize: 1024, isRemoved: false, createdAt: time }],
  };
  let releaseLoading!: () => void;
  const loadingGate = new Promise<void>(resolve => { releaseLoading = resolve; });
  let actions = [makeAction('PLANNED'), makeAction('COMPLETED', 11), makeAction('CANCELLED', 12)];
  await page.clock.install({ time: new Date(time) });
  // Catch every application API call, regardless of host, and never forward it.
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    const send = (json: unknown, status = 200) => route.fulfill({ status, json });
    if (method === 'GET') {
      if (path === '/api/auth/me') return send({ user });
      if (path === '/api/categories') return send([ticket.category]);
      if (path === '/api/related-systems') return send([ticket.relatedSystem]);
      if (path === '/api/staff/users') return send([makeUser('IT_STAFF')]);
      if (path === '/api/admin/users') return send([user]);
      if (path === '/api/tickets' || path === '/api/staff/tickets') return send({ items: [ticket], pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 } });
      if (path === '/api/tickets/7' || path === '/api/staff/tickets/7') return send(ticket);
      if (path === '/api/tickets/7/comments') return send([]);
      if (path === '/api/staff/tickets/7/notes') return send([]);
      if (path === '/api/tickets/7/actions-taken') {
        if (scenario.actionsState === 'loading') await loadingGate;
        if (scenario.actionsState === 'error') return send({}, 500);
        return send({ actions, workflowRevision: ticket.workflowRevision });
      }
      if (path === '/api/dashboard/requester' || path === '/api/dashboard/staff') {
        if (scenario.dashboardState === 'loading') await loadingGate;
        if (scenario.dashboardState === 'error') return send({}, 500);
        const data = path.endsWith('/requester') ? structuredClone(requesterDashboard) : structuredClone(staffDashboard);
        if ('myActions' in data) {
          data.recentTickets = [{ ...staffDashboard.recentTickets[0], ticketNumber: ticket.ticketNumber, summary: longText }];
          data.myActions = [{ ...staffDashboard.myActions[0], description: longText, ticket: { id: 7, ticketNumber: ticket.ticketNumber, currentStatus: 'RESOLVED' } }];
        }
        if (scenario.dashboardState === 'zero') {
          data.recentTickets = [];
          if ('myActions' in data) { data.myActions = []; data.counts = { unassignedActive: 0, myActive: 0, byStatus: Object.fromEntries(Object.keys(data.counts.byStatus).map(s => [s, 0])) as typeof data.counts.byStatus, byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 } }; }
          else data.counts = { active: 0, new: 0, open: 0, inProgress: 0, waitingForRequester: 0, resolved: 0, reopened: 0 };
        }
        return send(data);
      }
    }
    if (['POST', 'PATCH'].includes(method) && /^\/api\/tickets\/7\/actions-taken(\/\d+)?$/.test(path)) {
      if (scenario.saveState === 'conflict') return send({ message: 'Conflict' }, 409);
      if (scenario.saveState === 'error') return send({}, 500);
      const fields = route.request().postDataJSON();
      const action = { ...makeAction('PLANNED', 13), ...fields };
      actions = [...actions, action]; ticket.workflowRevision++;
      return send({ action, workflowRevision: ticket.workflowRevision });
    }
    unexpected.push(method + ' ' + route.request().url());
    return send({ message: 'Unexpected request blocked by UI verification fixture' }, 500);
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'User profile menu' })).toBeVisible();
  return { releaseLoading };
}
export async function dashboard(page: Page) {
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Dashboard/ })).toBeVisible();
}
export async function detail(page: Page) {
  await dashboard(page);
  await page.getByRole('button', { name: 'Open Ticket TKT-2026-000007', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Actions Taken', exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Action 10', exact: true })).toBeVisible();
}
