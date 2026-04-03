import type { FC } from 'hono/jsx';
import type { Ticket } from '../types';

export const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const label = status.replace('_', ' ');
  return <span class={`badge badge-${status}`}>{label}</span>;
};

export const PriorityBadge: FC<{ priority: string }> = ({ priority }) => {
  return <span class={`badge badge-${priority}`}>{priority}</span>;
};

export const TicketRow: FC<{ ticket: Ticket; basePath: string }> = ({
  ticket,
  basePath,
}) => {
  return (
    <tr>
      <td>
        <a href={`${basePath}/${ticket.id}`}>{ticket.subject}</a>
      </td>
      <td>
        <StatusBadge status={ticket.status} />
      </td>
      <td>
        <PriorityBadge priority={ticket.priority} />
      </td>
      <td>{ticket.submitted_by}</td>
      <td>{new Date(ticket.created_at + 'Z').toLocaleDateString()}</td>
    </tr>
  );
};

export const TicketTable: FC<{ tickets: Ticket[]; basePath: string }> = ({
  tickets,
  basePath,
}) => {
  if (tickets.length === 0) {
    return <p>No tickets yet.</p>;
  }
  return (
    <figure>
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Submitted by</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <TicketRow ticket={t} basePath={basePath} />
          ))}
        </tbody>
      </table>
    </figure>
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
      <h2>{value}</h2>
      <p>{label}</p>
    </div>
  );
};
