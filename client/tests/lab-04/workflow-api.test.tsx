import { afterEach, describe, expect, it, vi } from 'vitest';
import { assignStaffTicket, updateStaffTicketPriority, updateStaffTicketStatus } from '../../src/api';
afterEach(() => vi.unstubAllGlobals());
describe('Ticket workflow client transport', () => {
  it.each(['assign','priority','status'])('sends %s with session cookies, CSRF header and expected revision', async op => {
    const fetch = vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({workflowRevision:9})});vi.stubGlobal('fetch',fetch);
    if(op==='assign') await assignStaffTicket(7,2,8);
    if(op==='priority') await updateStaffTicketPriority(7,'HIGH',8);
    if(op==='status') await updateStaffTicketStatus(7,'RESOLVED','Fixed',8);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/api/staff/tickets/7/${op}`),expect.objectContaining({method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json','X-Requested-With':'XMLHttpRequest'}}));
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({workflowRevision:8});
  });
  it('preserves the resolution conflict code, status and permitted blocker summary', async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:409,json:async()=>({code:'RESOLUTION_BLOCKED',message:'Review Actions',blockingWork:{planned:1,followUp:2}})}));
    await expect(updateStaffTicketStatus(7,'RESOLVED','Fixed',8)).rejects.toMatchObject({status:409,code:'RESOLUTION_BLOCKED',message:'Review Actions',blockingWork:{planned:1,followUp:2}});
  });
});
