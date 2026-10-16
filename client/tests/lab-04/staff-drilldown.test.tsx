import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StaffTicketQueue } from '../../src/components/StaffTicketQueue';
import * as api from '../../src/api';
const empty={items:[],pagination:{page:1,limit:10,totalItems:0,totalPages:1}};
beforeEach(()=>{vi.spyOn(api,'fetchCategories').mockResolvedValue([]);vi.spyOn(api,'fetchStaffTickets').mockResolvedValue(empty)});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()});
describe('Staff dashboard queue filter integration',()=>{
  it.each([{statusGroup:'active' as const,assignedStaffId:'me'},{statusGroup:'active' as const,assignedStaffId:'unassigned'},{currentStatus:'CLOSED'},{itPriority:'URGENT'}])('applies initial %j before fetching',async filters=>{
    render(<StaffTicketQueue initialFilters={filters}/>);
    await waitFor(()=>expect(api.fetchStaffTickets).toHaveBeenCalledWith(expect.objectContaining({...filters,page:1,sortBy:'updatedAt',sortOrder:'desc'})));
    if(filters.assignedStaffId)expect(screen.getByLabelText('Assignment')).toHaveValue(filters.assignedStaffId);
  });
  it('clears dashboard filters through existing Clear Filters',async()=>{
    render(<StaffTicketQueue initialFilters={{statusGroup:'active',assignedStaffId:'me'}}/>);await waitFor(()=>expect(api.fetchStaffTickets).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole('button',{name:/Clear Filters/i})[0]);
    await waitFor(()=>expect(api.fetchStaffTickets).toHaveBeenLastCalledWith(expect.objectContaining({statusGroup:undefined,assignedStaffId:undefined,currentStatus:undefined,page:1})));
  });
  it('encodes active/current-user filters in the session-based API request',async()=>{
    vi.mocked(api.fetchStaffTickets).mockRestore();const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({data:[],pagination:empty.pagination})});vi.stubGlobal('fetch',fetch);
    await api.fetchStaffTickets({statusGroup:'active',assignedStaffId:'me',page:2});
    const [url,options]=fetch.mock.calls[0];expect(new URL(url).searchParams.get('statusGroup')).toBe('active');expect(new URL(url).searchParams.get('assignedStaffId')).toBe('me');expect(options.credentials).toBe('include');
  });
});
