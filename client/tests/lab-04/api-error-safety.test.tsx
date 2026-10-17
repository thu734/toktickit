import { afterEach, expect, it, vi } from 'vitest';
import * as api from '../../src/api';
afterEach(() => vi.unstubAllGlobals());
const calls: [string, () => Promise<unknown>][] = [
  ['Ticket detail', () => api.fetchTicketDetail(7)],
  ['Ticket list', () => api.fetchTickets({})],
  ['Admin users', () => api.fetchAdminUsers()],
  ['Login', () => api.loginApi('user@test.local', 'password')],
  ['Password change', () => api.changePassword({currentPassword:'a',newPassword:'b',confirmPassword:'b'})],
  ['Comments', () => api.fetchTicketComments(7)],
  ['Notes', () => api.fetchInternalNotes(7)],
  ['Staff detail', () => api.fetchStaffTicketDetail(7)],
  ['Staff directory', () => api.fetchStaffUsers({strict:true})],
  ['Actions', () => api.fetchActions(7)],
  ['Requester dashboard', () => api.fetchRequesterDashboard()],
  ['Staff dashboard', () => api.fetchStaffDashboard()],
];
it.each(calls)('%s keeps upstream 500 details out of user-facing errors', async (_name, call) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:false,status:500,json:async()=>({message:'SQL password=secret',error:'SQL password=secret',code:'INTERNAL_ERROR'})}));
  const error = await call().catch(e => e) as Error & { status: number };
  expect(error).toBeInstanceOf(Error); expect(error.status).toBe(500); expect(error.message).not.toMatch(/SQL|secret|password=/);
});
it.each(calls)('%s preserves status when an upstream error body is not JSON', async (_name, call) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:false,status:502,json:async()=>{throw new SyntaxError('Sensitive gateway HTML');}}));
  const error = await call().catch(e => e) as Error & { status: number };
  expect(error).toBeInstanceOf(Error); expect(error.status).toBe(502); expect(error.message).not.toMatch(/Sensitive|SyntaxError|HTML/);
});
it('retains approved validation and conflict guidance', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:false,status:409,json:async()=>({message:'Refresh and review.',code:'STALE_REVISION'})}));
  await expect(api.updateAction(7,3,{workflowRevision:0,result:'Done'})).rejects.toMatchObject({status:409,code:'STALE_REVISION',message:'Refresh and review.'});
});
it('treats an already-expired logout as signed out', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:false,status:401}));
  await expect(api.logoutApi()).resolves.toBeUndefined();
});
