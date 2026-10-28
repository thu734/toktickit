import { useEffect, useState } from 'react';
import { fetchStaffDashboard } from '../api';
import type { StaffDashboardResponse, StaffQueueFilters } from '../api';
import { useAuth } from '../context/AuthContext';

export const statusLabels = {
  NEW: 'New', OPEN: 'Open', IN_PROGRESS: 'In Progress', WAITING_FOR_REQUESTER: 'Waiting for Requester',
  RESOLVED: 'Resolved', CLOSED: 'Closed', REOPENED: 'Reopened', CANCELLED: 'Cancelled',
} as const;
export const priorityLabels = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' } as const;
interface Props {
  onNavigateTickets: (filters: StaffQueueFilters) => void;
  onOpenTicket: (ticketId: number, focusActions?: boolean) => void;
}
function failureMessage(error: unknown) {
  const failure = error as { status?: number; code?: string };
  if (failure.status === 401) return 'Your session has expired. Sign in again to view your dashboard.';
  if (failure.code === 'MUST_CHANGE_PASSWORD') return 'Change your initial password before viewing your dashboard.';
  if (failure.status === 403) return 'You do not have permission to view the Staff Dashboard.';
  return 'Unable to retrieve the operational dashboard. Please retry.';
}
export function StaffDashboard(props: Props) {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Checking your session…</p>;
  if (!user) return <p role="alert">Sign in to view your dashboard.</p>;
  if (user.mustChangePassword) return <p role="alert">Change your initial password before viewing your dashboard.</p>;
  if (user.role !== 'IT_STAFF' && user.role !== 'ADMINISTRATOR') return <p role="alert">You do not have permission to view the Staff Dashboard.</p>;
  return <DashboardContent key={user.id} {...props} />;
}
function DashboardContent({ onNavigateTickets, onOpenTicket }: Props) {
  const [data, setData] = useState<StaffDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    fetchStaffDashboard(controller.signal).then(result => { if (active) setData(result); })
      .catch(failure => { if (active) setError(failureMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [attempt]);
  const formatTime = (value: string) => new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value));
  return <section aria-labelledby="staff-dashboard-title" aria-busy={loading}>
    <div className="d-flex flex-column flex-sm-row justify-content-between gap-3 mb-4">
      <h1 id="staff-dashboard-title" className="h3 mb-0" style={{ color: '#006B3C' }}>Staff Dashboard</h1>
      <button type="button" className="btn btn-outline-success" onClick={() => onNavigateTickets({})}>Ticket Queue</button>
    </div>
    {loading && <p role="status">Loading the operational dashboard…</p>}
    {error && <div role="alert" className="alert alert-danger"><p>{error}</p>
      <button type="button" className="btn btn-outline-danger" onClick={() => setAttempt(value => value + 1)}>Retry dashboard</button></div>}
    {!loading && data && <>
      <p className="small text-muted" role="status">As of <time dateTime={data.asOf}>{formatTime(data.asOf)}</time>.
        {' '}<button type="button" className="btn btn-link btn-sm" onClick={() => setAttempt(value => value + 1)}>Refresh dashboard</button></p>
      <div className="row g-3 mb-3" aria-label="Active operational summaries">
        {([{ key: 'unassignedActive', label: 'Unassigned Active Tickets' }, { key: 'myActive', label: 'My Assigned Tickets' }] as const).map(metric =>
          <div className="col-12 col-md-6" key={metric.key}><article className="card border-0 h-100 shadow-sm p-3">
            <h2 className="h6">{metric.label}</h2><p className="fs-2 fw-bold text-success">{data.counts[metric.key]}</p>
            <button type="button" className="btn btn-outline-success mt-auto" aria-label={`View ${metric.label} (${data.counts[metric.key]})`}
              onClick={() => onNavigateTickets(data.drillDowns[metric.key].filters)}>View tickets</button>
          </article></div>)}
      </div>
      <div className="row g-3 mb-4">
        <section className="col-12 col-lg-8" aria-labelledby="status-summary-heading"><div className="card border-0 h-100 shadow-sm p-3">
          <h2 id="status-summary-heading" className="h5">Tickets by Status</h2>
          <div className="row g-2">{(Object.keys(statusLabels) as (keyof typeof statusLabels)[]).map(status =>
            <div className="col-12 col-sm-6 col-xl-3" key={status}><button type="button" className="btn btn-light text-success w-100 h-100"
              aria-label={`View ${statusLabels[status]} Tickets (${data.counts.byStatus[status]})`}
              onClick={() => onNavigateTickets(data.drillDowns.byStatus[status].filters)}>{statusLabels[status]}: {data.counts.byStatus[status]}</button></div>)}</div>
        </div></section>
        <section className="col-12 col-lg-4" aria-labelledby="priority-summary-heading"><div className="card border-0 h-100 shadow-sm p-3">
          <h2 id="priority-summary-heading" className="h5">Tickets by IT Priority</h2>
          <div className="row g-2">{(Object.keys(priorityLabels) as (keyof typeof priorityLabels)[]).map(priority =>
            <div className="col-6" key={priority}><button type="button" className="btn btn-light text-success w-100 h-100"
              aria-label={`View ${priorityLabels[priority]} Priority Tickets (${data.counts.byPriority[priority]})`}
              onClick={() => onNavigateTickets(data.drillDowns.byPriority[priority].filters)}>{priorityLabels[priority]}: {data.counts.byPriority[priority]}</button></div>)}</div>
        </div></section>
      </div>
      <div className="row g-3" aria-label="Operational previews">
        <section className="col-12 col-lg-6" aria-labelledby="staff-recent-heading"><div className="card border-0 h-100 shadow-sm p-3">
          <h2 id="staff-recent-heading" className="h5">Recently Updated Tickets</h2>
          {data.recentTickets.length === 0 ? <p>No operational Tickets yet.</p> : <ul className="list-unstyled mb-0">{data.recentTickets.map(ticket =>
            <li key={ticket.id} className="py-3" style={{ overflowWrap: 'anywhere' }}>
              <button type="button" className="btn btn-link p-0 text-start fw-semibold" aria-label={`Open Ticket ${ticket.ticketNumber}`}
                onClick={() => onOpenTicket(ticket.id)}>{ticket.ticketNumber}</button>
              <p className="my-2">{ticket.summary}</p><p className="small mb-1">{statusLabels[ticket.currentStatus]} · {priorityLabels[ticket.itPriority]}</p>
              <p className="small text-muted mb-0">Updated <time dateTime={ticket.updatedAt}>{formatTime(ticket.updatedAt)}</time></p>
            </li>)}</ul>}
        </div></section>
        <section className="col-12 col-lg-6" aria-labelledby="my-actions-heading"><div className="card border-0 h-100 shadow-sm p-3">
          <h2 id="my-actions-heading" className="h5">My Planned Actions</h2>
          {data.myActions.length === 0 ? <p>No planned Actions assigned to you.</p> : <ul className="list-unstyled mb-0">{data.myActions.map(action =>
            <li key={action.id} className="py-3" style={{ overflowWrap: 'anywhere' }}>
              <p className="mb-2">{action.description}</p>
              <button type="button" className="btn btn-link p-0 text-start" aria-label={`Open Action ${action.id} on Ticket ${action.ticket.ticketNumber}`}
                onClick={() => onOpenTicket(action.ticket.id, true)}>View Actions — {action.ticket.ticketNumber}</button>
              <p className="small my-1">{statusLabels[action.ticket.currentStatus]}</p>
              {['RESOLVED', 'CLOSED', 'CANCELLED'].includes(action.ticket.currentStatus) && <p className="small text-muted mb-0">Actions on this Ticket are read-only.</p>}
            </li>)}</ul>}
        </div></section>
      </div>
    </>}
  </section>;
}
