import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MyTicketsList } from '../../src/components/MyTicketsList';
import { RequesterProvider } from '../../src/context/RequesterContext';
import * as api from '../../src/api';
const owner={id:1,name:'Requester',email:'owner@test.local',department:'IT'};
const empty={items:[],pagination:{page:1,limit:10,totalItems:0,totalPages:1}};
beforeEach(()=>{
  vi.spyOn(api,'fetchCategories').mockResolvedValue([]);vi.spyOn(api,'fetchTickets').mockResolvedValue(empty);
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('Requester dashboard drill-down integration',()=>{
  it.each([{statusGroup:'active' as const},{currentStatus:'WAITING_FOR_REQUESTER'},{currentStatus:'RESOLVED'}])('applies initial %j in the server request',async filters=>{
    render(<RequesterProvider initialRequester={owner}><MyTicketsList initialFilters={filters}/></RequesterProvider>);
    await waitFor(()=>expect(api.fetchTickets).toHaveBeenCalledWith(expect.objectContaining({...filters,page:1,sortBy:'updatedAt',sortOrder:'desc'}),1));
    expect(screen.getByLabelText('Current Status')).toHaveValue('statusGroup' in filters?'ACTIVE':filters.currentStatus);
  });
  it('clears the active group using existing Clear Filters',async()=>{
    render(<RequesterProvider initialRequester={owner}><MyTicketsList initialFilters={{statusGroup:'active'}}/></RequesterProvider>);
    await screen.findByText('No Tickets Found');fireEvent.click(screen.getAllByRole('button',{name:'Clear Filters'})[0]);
    await waitFor(()=>expect(api.fetchTickets).toHaveBeenLastCalledWith(expect.objectContaining({statusGroup:undefined,currentStatus:undefined,page:1}),1));
    expect(await screen.findByText('No Tickets Yet')).toBeInTheDocument();
  });
  it('encodes the active group in the existing session-based listing request',async()=>{
    vi.mocked(api.fetchTickets).mockRestore();const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>empty});vi.stubGlobal('fetch',fetch);
    await api.fetchTickets({statusGroup:'active',page:2,limit:10},999);
    const [url,options]=fetch.mock.calls[0];expect(new URL(url).searchParams.get('statusGroup')).toBe('active');expect(new URL(url).searchParams.get('page')).toBe('2');
    expect(new URL(url).searchParams.has('requesterId')).toBe(false);expect(options.credentials).toBe('include');
  });
});
