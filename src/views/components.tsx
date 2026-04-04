import type { FC } from 'hono/jsx';
import type { Ticket } from '../types';

export const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const label = status.replace('_', ' ');
  return <span class={`badge badge-${status}`}>{label}</span>;
};

export const PriorityBadge: FC<{ priority: string }> = ({ priority }) => {
  return <span class={`badge badge-${priority}`}>{priority}</span>;
};

export const TicketTable: FC<{ tickets: Ticket[]; basePath: string; showOrg?: boolean }> = ({
  tickets,
  basePath,
  showOrg,
}) => {
  if (tickets.length === 0) {
    return (
      <div class="card" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
        <p class="mb-0">No tickets yet.</p>
      </div>
    );
  }
  return (
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            {showOrg && <th>Organization</th>}
            <th>Status</th>
            <th>Priority</th>
            <th>Submitted by</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr>
              <td><a href={`${basePath}/${t.id}`}>{t.subject}</a></td>
              {showOrg && <td>{t.org_name}</td>}
              <td><StatusBadge status={t.status} /></td>
              <td><PriorityBadge priority={t.priority} /></td>
              <td>{t.submitted_by}</td>
              <td style="white-space:nowrap">{new Date(t.created_at + 'Z').toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const Flash: FC<{ message?: string; type?: string }> = ({
  message,
  type,
}) => {
  if (!message) return null;
  return <div class={`flash flash-${type || 'success'}`}>{message}</div>;
};

export const StatCard: FC<{ label: string; value: number }> = ({
  label,
  value,
}) => {
  return (
    <div class="stat-card">
      <div class="stat-value">{value}</div>
      <div class="stat-label">{label}</div>
    </div>
  );
};
