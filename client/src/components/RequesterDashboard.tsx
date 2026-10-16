import { useEffect, useState } from 'react';
import { fetchRequesterDashboard } from '../api';
import type { RequesterDashboardResponse, RequesterTicketFilters } from '../api';
import { useAuth } from '../context/AuthContext';

interface Props {
  onNavigateTickets: (filters: RequesterTicketFilters) => void;
  onOpenTicket: (ticketId: number) => void;
  onNavigateCreate: () => void;
}

function failureMessage(error: unknown) {
  const failure = error as { status?: number; code?: string; message?: string };
  if (failure.status === 401) return 'Your session has expired. Sign in again to view your dashboard.';
  if (failure.code === 'MUST_CHANGE_PASSWORD') return 'Change your initial password before viewing your dashboard.';
  if (failure.status === 403) return 'You do not have permission to view the Requester Dashboard.';
  return failure.message || 'Unable to retrieve your dashboard. Please retry.';
}

export function RequesterDashboard(props: Props) {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Checking your session…</p>;
  if (!user) return <p role="alert">Sign in to view your dashboard.</p>;
  if (user.mustChangePassword) return <p role="alert">Change your initial password before viewing your dashboard.</p>;
  if (user.role !== 'REQUESTER') return <p role="alert">You do not have permission to view the Requester Dashboard.</p>;
  // Account changes unmount the old request and its data before showing a new account.
  return <DashboardContent key={user.id} {...props} />;
}

function DashboardContent({ onNavigateTickets, onOpenTicket, onNavigateCreate }: Props) {
  const [data, setData] = useState<RequesterDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    fetchRequesterDashboard(controller.signal).then(result => { if (active) setData(result); })
      .catch(failure => { if (active) setError(failureMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [attempt]);

  const metrics = [
    { key: 'active', label: 'Active Tickets' },
    { key: 'waitingForRequester', label: 'Waiting for Requester' },
    { key: 'resolved', label: 'Resolved Tickets' },
  ] as const;
  const formatTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

  return <section aria-labelledby="requester-dashboard-title" aria-busy={loading}>
    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
      <h1 id="requester-dashboard-title" className="h3 mb-0" style={{ color: '#006B3C' }}>Requester Dashboard</h1>
      <div className="d-flex flex-wrap gap-2">
        <button type="button" className="btn btn-outline-success" onClick={() => onNavigateTickets({})}>My Tickets</button>
        <button type="button" className="btn btn-zen-primary" onClick={onNavigateCreate}>Create Ticket</button>
      </div>
    </div>
    {loading && <p role="status">Loading your dashboard…</p>}
    {error && <div className="alert alert-danger" role="alert"><p>{error}</p>
      <button type="button" className="btn btn-outline-danger" onClick={() => setAttempt(value => value + 1)}>Retry dashboard</button></div>}
    {!loading && data && <>
      <p className="small text-muted" role="status">As of <time dateTime={data.asOf}>{formatTime(data.asOf)}</time>. Times shown in your local timezone.
        {' '}<button type="button" className="btn btn-link btn-sm" onClick={() => setAttempt(value => value + 1)}>Refresh dashboard</button></p>
      <div className="row g-3 mb-4">
        {metrics.map(metric => <div className="col-12 col-md-4" key={metric.key}>
          <article className="card h-100 shadow-sm p-3" aria-labelledby={`dashboard-${metric.key}`}>
            <h2 id={`dashboard-${metric.key}`} className="h6">{metric.label}</h2>
            <p className="fs-2 fw-bold" style={{ color: '#006B3C' }}>{data.counts[metric.key]}</p>
            <button type="button" className="btn btn-outline-success mt-auto" onClick={() => onNavigateTickets(data.drillDowns[metric.key].filters)}
              aria-label={`View ${metric.label} (${data.counts[metric.key]})`}>View tickets</button>
          </article>
        </div>)}
      </div>
      <section className="card shadow-sm p-3 p-md-4" aria-labelledby="recent-tickets-heading">
        <h2 id="recent-tickets-heading" className="h5">Recent Tickets</h2>
        {data.recentTickets.length === 0 ? <p>No Tickets Yet. Create a Ticket when you need IT support.</p>
          : <ul className="list-unstyled mb-0">{data.recentTickets.map(ticket => <li key={ticket.id} className="border-bottom py-3" style={{ overflowWrap: 'anywhere' }}>
            <div className="d-flex flex-column flex-sm-row justify-content-between gap-2">
              <button type="button" className="btn btn-link p-0 text-start font-monospace fw-semibold" style={{ color: '#006B3C' }}
                onClick={() => onOpenTicket(ticket.id)} aria-label={`Open Ticket ${ticket.ticketNumber}`}>{ticket.ticketNumber}</button>
              <span className="fw-semibold small">{ticket.currentStatus.replace(/_/g, ' ')}</span>
            </div>
            <p className="my-2">{ticket.summary}</p>
            <p className="small text-muted mb-0">Last updated <time dateTime={ticket.updatedAt}>{formatTime(ticket.updatedAt)}</time></p>
          </li>)}</ul>}
      </section>
    </>}
  </section>;
}
