import { Router } from 'express';
import { requireRole } from '../middleware/authorization.js';
import { getRequesterDashboard } from '../services/requesterDashboard.js';

export const dashboardRouter = Router();
dashboardRouter.get('/dashboard/requester', requireRole('REQUESTER'), async (req,res)=>{
  try { return res.status(200).json(await getRequesterDashboard(req.session.userId!)); }
  catch(error){
    console.error('Error retrieving Requester Dashboard:',error);
    return res.status(500).json({error:'Internal Server Error',message:'Unable to retrieve your dashboard. Please retry.'});
  }
});
