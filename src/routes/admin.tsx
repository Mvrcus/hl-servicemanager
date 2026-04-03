import { Hono } from 'hono';
import type { Bindings, SessionData } from '../types';
import { Layout } from '../views/layout';
import { TicketTable, Flash, StatCard, StatusBadge, PriorityBadge } from '../views/components';
import { adminAuth } from '../middleware/auth';
import {
  getAllOrgs,
  getAllTickets,
  getTicketById,
  getTicketsByOrg,
  getOrgById,
  createOrg,
  updateTicket,
  getCommentsByTicket,
  createComment,
  getTicketCounts,
} from '../db/queries';

type Env = {
  Bindings: Bindings;
  Variables: { session: SessionData };
};

const app = new Hono<Env>();

// Admin auth on all routes except login (handled in public.tsx)
app.use('*', adminAuth);

const adminNav = (
  <>
    <li><a href="/admin">Dashboard</a></li>
    <li><a href="/admin/orgs">Organizations</a></li>
    <li><a href="/admin/tickets">All Tickets</a></li>
    <li>
      <form method="POST" action="/auth/logout" style="margin:0">
        <button type="submit" class="outline secondary" style="padding: 0.25rem 0.75rem; margin: 0;">
          Logout
        </button>
      </form>
    </li>
  </>
);

// Admin dashboard
app.get('/', async (c) => {
  const counts = await getTicketCounts(c.env.DB);
  const orgs = await getAllOrgs(c.env.DB);

  return c.html(
    <Layout title="Admin Dashboard" nav={adminNav}>
      <h2>Admin Dashboard</h2>

      <div class="stats">
        <StatCard label="Organizations" value={orgs.length} />
        <StatCard label="Open" value={counts.open} />
        <StatCard label="In Progress" value={counts.in_progress} />
        <StatCard label="Waiting" value={counts.waiting} />
        <StatCard label="Total Tickets" value={counts.total} />
      </div>

      <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
        <a href="/admin/tickets" role="button">View All Tickets</a>
        <a href="/admin/orgs" role="button" class="outline">Manage Organizations</a>
      </div>
    </Layout>
  );
});

// Org list
app.get('/orgs', async (c) => {
  const orgs = await getAllOrgs(c.env.DB);
  const msg = c.req.query('msg');

  return c.html(
    <Layout title="Organizations" nav={adminNav}>
      <h2>Organizations</h2>
      <Flash message={msg === 'created' ? 'Organization created!' : undefined} />

      <article>
        <h4>Add Organization</h4>
        <form method="POST" action="/admin/orgs">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <label>
              Name
              <input type="text" name="name" required placeholder="Agency XYZ" />
            </label>
            <label>
              Domain
              <input type="text" name="domain" required placeholder="agencyxyz.com" />
            </label>
          </div>
          <label>
            About / Notes
            <textarea name="about" rows={3} placeholder="Project details, notes for the client..."></textarea>
          </label>
          <button type="submit">Create Organization</button>
        </form>
      </article>

      {orgs.length === 0 ? (
        <p>No organizations yet.</p>
      ) : (
        <figure>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Domain</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr>
                  <td>{org.name}</td>
                  <td>{org.domain}</td>
                  <td>{new Date(org.created_at + 'Z').toLocaleDateString()}</td>
                  <td>
                    <a href={`/admin/orgs/${org.id}`}>View</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      )}
    </Layout>
  );
});

// Create org
app.post('/orgs', async (c) => {
  const body = await c.req.parseBody();
  const name = (body.name as string || '').trim();
  const domain = (body.domain as string || '').trim().toLowerCase();
  const about = (body.about as string || '').trim();

  if (!name || !domain) return c.redirect('/admin/orgs');

  await createOrg(c.env.DB, name, domain, about);
  return c.redirect('/admin/orgs?msg=created');
});

// Org detail
app.get('/orgs/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const org = await getOrgById(c.env.DB, id);
  if (!org) return c.redirect('/admin/orgs');

  const tickets = await getTicketsByOrg(c.env.DB, id);
  const counts = await getTicketCounts(c.env.DB, id);

  return c.html(
    <Layout title={org.name} nav={adminNav}>
      <a href="/admin/orgs">&larr; Back to organizations</a>
      <h2>{org.name}</h2>
      <p>Domain: <strong>{org.domain}</strong></p>
      {org.about && <p>{org.about}</p>}

      <div class="stats">
        <StatCard label="Open" value={counts.open} />
        <StatCard label="In Progress" value={counts.in_progress} />
        <StatCard label="Total" value={counts.total} />
      </div>

      <h3>Tickets</h3>
      <TicketTable tickets={tickets} basePath="/admin/tickets" />
    </Layout>
  );
});

// All tickets
app.get('/tickets', async (c) => {
  const tickets = await getAllTickets(c.env.DB);
  const statusFilter = c.req.query('status');

  const filtered = statusFilter
    ? tickets.filter((t) => t.status === statusFilter)
    : tickets;

  return c.html(
    <Layout title="All Tickets" nav={adminNav}>
      <h2>All Tickets</h2>

      <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
        <a href="/admin/tickets" role="button" class={!statusFilter ? '' : 'outline'} style="padding: 0.25rem 0.75rem;">All</a>
        <a href="/admin/tickets?status=open" role="button" class={statusFilter === 'open' ? '' : 'outline'} style="padding: 0.25rem 0.75rem;">Open</a>
        <a href="/admin/tickets?status=in_progress" role="button" class={statusFilter === 'in_progress' ? '' : 'outline'} style="padding: 0.25rem 0.75rem;">In Progress</a>
        <a href="/admin/tickets?status=waiting" role="button" class={statusFilter === 'waiting' ? '' : 'outline'} style="padding: 0.25rem 0.75rem;">Waiting</a>
        <a href="/admin/tickets?status=closed" role="button" class={statusFilter === 'closed' ? '' : 'outline'} style="padding: 0.25rem 0.75rem;">Closed</a>
      </div>

      {filtered.length === 0 ? (
        <p>No tickets found.</p>
      ) : (
        <figure>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Organization</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Submitted by</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr>
                  <td><a href={`/admin/tickets/${t.id}`}>{t.subject}</a></td>
                  <td>{t.org_name}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td>{t.submitted_by}</td>
                  <td>{new Date(t.created_at + 'Z').toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      )}
    </Layout>
  );
});

// Ticket detail (admin)
app.get('/tickets/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket) return c.redirect('/admin/tickets');

  const comments = await getCommentsByTicket(c.env.DB, id);
  const msg = c.req.query('msg');

  return c.html(
    <Layout title={ticket.subject} nav={adminNav}>
      <a href="/admin/tickets">&larr; Back to tickets</a>
      <h2>{ticket.subject}</h2>
      <Flash
        message={
          msg === 'updated' ? 'Ticket updated.' :
          msg === 'commented' ? 'Comment added.' :
          undefined
        }
      />

      <div style="display: flex; gap: 1rem; margin-bottom: 1rem; align-items: center;">
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        <small style="color: var(--pico-muted-color)">
          {ticket.org_name} — {ticket.submitted_by} —{' '}
          {new Date(ticket.created_at + 'Z').toLocaleDateString()}
        </small>
      </div>

      <article>
        <p>{ticket.description}</p>
      </article>

      <article>
        <h4>Update Ticket</h4>
        <form method="POST" action={`/admin/tickets/${id}`}>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <label>
              Status
              <select name="status">
                {['open', 'in_progress', 'waiting', 'closed'].map((s) => (
                  <option value={s} selected={s === ticket.status}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select name="priority">
                {['low', 'normal', 'high'].map((p) => (
                  <option value={p} selected={p === ticket.priority}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit">Update</button>
        </form>
      </article>

      <h4>Comments</h4>
      {comments.length === 0 && <p>No comments yet.</p>}
      {comments.map((comment) => (
        <div class={`comment ${comment.author === 'admin' ? 'comment-admin' : ''}`}>
          <div class="comment-meta">
            <strong>{comment.author === 'admin' ? 'Service Provider' : comment.author}</strong>{' '}
            — {new Date(comment.created_at + 'Z').toLocaleString()}
          </div>
          <p style="margin:0">{comment.body}</p>
        </div>
      ))}

      <form method="POST" action={`/admin/tickets/${id}/comments`} style="margin-top: 1rem;">
        <label>
          Reply
          <textarea name="body" required rows={3} placeholder="Type your reply..."></textarea>
        </label>
        <button type="submit">Post Reply</button>
      </form>
    </Layout>
  );
});

// Update ticket
app.post('/tickets/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.parseBody();
  const status = body.status as string;
  const priority = body.priority as string;

  await updateTicket(c.env.DB, id, status, priority);
  return c.redirect(`/admin/tickets/${id}?msg=updated`);
});

// Admin comment
app.post('/tickets/:id/comments', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.parseBody();
  const text = (body.body as string || '').trim();

  if (!text) return c.redirect(`/admin/tickets/${id}`);

  await createComment(c.env.DB, id, 'admin', text);
  return c.redirect(`/admin/tickets/${id}?msg=commented`);
});

export default app;
