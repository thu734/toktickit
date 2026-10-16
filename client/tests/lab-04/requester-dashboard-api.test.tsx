import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchRequesterDashboard } from '../../src/api';
afterEach(()=>vi.unstubAllGlobals());
describe('Requester dashboard transport',()=>{
  it('uses the session cookie, supports cancellation and sends no requester override',async()=>{
    const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({counts:{active:1}})});vi.stubGlobal('fetch',fetch);const controller=new AbortController();
    await fetchRequesterDashboard(controller.signal);expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/dashboard\/requester$/),{credentials:'include',signal:controller.signal});
  });
  it('preserves authorization status and password-lock codes',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:403,json:async()=>({code:'MUST_CHANGE_PASSWORD',error:'Password required'})}));
    await expect(fetchRequesterDashboard()).rejects.toMatchObject({status:403,code:'MUST_CHANGE_PASSWORD',message:'Password required'});
  });
  it('handles a non-JSON server failure safely',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:502,json:async()=>{throw new Error('not JSON')}}));
    await expect(fetchRequesterDashboard()).rejects.toMatchObject({status:502,message:'Unable to retrieve your dashboard.'});
  });
});
