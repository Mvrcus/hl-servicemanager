import { Hono } from 'hono';
import type { Bindings, SessionData } from '../types';
import { Layout } from '../views/layout';
import { TicketTable, Flash, StatCard, StatusBadge, PriorityBadge } from '../views/components';
import { clientAuth } from '../middleware/auth';
import {
  getTicketsByOrg,
  getTicketById,
  createTicket,
  getCommentsByTicket,
  createComment,
  getTicketCounts,
  getOrgById,
} from '../db/queries';
import { sendEmail, getAdminEmail } from '../lib/email';
import { getAllSettings } from '../db/queries';

type Env = {
  Bindings: Bindings;
  Variables: { session: SessionData };
};

const app = new Hono<Env>();

app.use('*', clientAuth);

const clientNav = (email: string) => (
  <>
    <li><a href="/dashboard">Dashboard</a></li>
    <li><a href="/dashboard/tickets">Tickets</a></li>
    <li><a href="/dashboard/tickets/new">New Request</a></li>
    <li>
      <form method="POST" action="/auth/logout" style="margin:0">
        <button type="submit" class="outline secondary" style="padding: 0.25rem 0.75rem; margin: 0;">
          Logout
        </button>
      </form>
    </li>
  </>
);

// Dashboard
app.get('/', async (c) => {
  const session = c.get('session');
  const counts = await getTicketCounts(c.env.DB, session.orgId);
  const org = await getOrgById(c.env.DB, session.orgId!);
  const settings = await getAllSettings(c.env.DB);

  return c.html(
    <Layout title="Dashboard" nav={clientNav(session.email!)}>
      <h2>Welcome, {session.orgName}</h2>
      <p>Logged in as {session.email}</p>

      <div class="stats">
        <StatCard label="Open" value={counts.open} />
        <StatCard label="In Progress" value={counts.in_progress} />
        <StatCard label="Waiting" value={counts.waiting} />
        <StatCard label="Closed" value={counts.closed} />
      </div>

      <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
        <a href="/dashboard/tickets/new" role="button">Submit a Request</a>
        <a href="/dashboard/tickets" role="button" class="outline">View All Tickets</a>
      </div>

      <article>
        {(org?.about || settings.company_about) && (
          <>
            <h4>About {settings.company_name || 'Your Service Provider'}</h4>
            <p>{org?.about || settings.company_about}</p>
          </>
        )}
        {settings.communication_guide && (
          <>
            <h5>How to Reach Us</h5>
            <p>{settings.communication_guide}</p>
          </>
        )}
      </article>
    </Layout>
  );
});

// Ticket list
app.get('/tickets', async (c) => {
  const session = c.get('session');
  const msg = c.req.query('msg');
  const tickets = await getTicketsByOrg(c.env.DB, session.orgId!);

  return c.html(
    <Layout title="Your Tickets" nav={clientNav(session.email!)}>
      <h2>Your Tickets</h2>
      <Flash message={msg === 'created' ? 'Ticket submitted successfully!' : undefined} />
      <a href="/dashboard/tickets/new" role="button" style="margin-bottom: 1rem; display: inline-block;">
        New Request
      </a>
      <TicketTable tickets={tickets} basePath="/dashboard/tickets" />
    </Layout>
  );
});

// New ticket form
app.get('/tickets/new', async (c) => {
  const session = c.get('session');
  return c.html(
    <Layout title="New Request" nav={clientNav(session.email!)}>
      <h2>Submit a Request</h2>
      <form method="POST" action="/dashboard/tickets">
        <label>
          Subject
          <input type="text" name="subject" required placeholder="Brief description of your request" />
        </label>
        <label>
          Description
          <textarea name="description" required rows={6} placeholder="Provide details about what you need..."></textarea>
        </label>
        <label>
          Priority
          <select name="priority">
            <option value="low">Low</option>
            <option value="normal" selected>Normal</option>
            <option value="high">High</option>
          </select>
        </label>
        <button type="submit">Submit Request</button>
      </form>
    </Layout>
  );
});

// Create ticket
app.post('/tickets', async (c) => {
  const session = c.get('session');
  const body = await c.req.parseBody();
  const subject = (body.subject as string || '').trim();
  const description = (body.description as string || '').trim();
  const priority = (body.priority as string) || 'normal';

  if (!subject || !description) {
    return c.redirect('/dashboard/tickets/new');
  }

  await createTicket(
    c.env.DB,
    session.orgId!,
    subject,
    description,
    priority,
    session.email!
  );

  // Notify admin of new ticket
  c.executionCtx.waitUntil(
    (async () => {
      const adminEmail = await getAdminEmail(c.env.DB);
      if (adminEmail) {
        await sendEmail(c.env.DB, {
          to: adminEmail,
          subject: `New ticket: ${subject}`,
          message: `New ${priority} priority ticket from ${session.email} (${session.orgName}):\n\n${subject}\n\n${description}`,
          contact_email: session.email!,
          type: 'new_ticket',
        });
      }
    })()
  );

  return c.redirect('/dashboard/tickets?msg=created');
});

// Ticket detail
app.get('/tickets/:id', async (c) => {
  const session = c.get('session');
  const id = parseInt(c.req.param('id'));
  const ticket = await getTicketById(c.env.DB, id);

  if (!ticket || ticket.organization_id !== session.orgId) {
    return c.redirect('/dashboard/tickets');
  }

  const comments = await getCommentsByTicket(c.env.DB, id);
  const msg = c.req.query('msg');

  return c.html(
    <Layout title={ticket.subject} nav={clientNav(session.email!)}>
      <a href="/dashboard/tickets">&larr; Back to tickets</a>
      <h2>{ticket.subject}</h2>
      <Flash message={msg === 'commented' ? 'Comment added.' : undefined} />

      <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        <small style="color: var(--pico-muted-color)">
          Submitted by {ticket.submitted_by} on{' '}
          {new Date(ticket.created_at + 'Z').toLocaleDateString()}
        </small>
      </div>

      <article>
        <p>{ticket.description}</p>
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

      <form method="POST" action={`/dashboard/tickets/${id}/comments`} style="margin-top: 1rem;">
        <label>
          Add a comment
          <textarea name="body" required rows={3} placeholder="Type your message..."></textarea>
        </label>
        <button type="submit">Post Comment</button>
      </form>
    </Layout>
  );
});

// Add comment
app.post('/tickets/:id/comments', async (c) => {
  const session = c.get('session');
  const id = parseInt(c.req.param('id'));
  const body = await c.req.parseBody();
  const text = (body.body as string || '').trim();

  if (!text) return c.redirect(`/dashboard/tickets/${id}`);

  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket || ticket.organization_id !== session.orgId) {
    return c.redirect('/dashboard/tickets');
  }

  await createComment(c.env.DB, id, session.email!, text);

  // Notify admin of client comment
  c.executionCtx.waitUntil(
    (async () => {
      const adminEmail = await getAdminEmail(c.env.DB);
      if (adminEmail) {
        await sendEmail(c.env.DB, {
          to: adminEmail,
          subject: `New comment on: ${ticket.subject}`,
          message: `${session.email} commented on ticket "${ticket.subject}":\n\n${text}`,
          contact_email: session.email!,
          type: 'client_comment',
        });
      }
    })()
  );

  return c.redirect(`/dashboard/tickets/${id}?msg=commented`);
});

export default app;
