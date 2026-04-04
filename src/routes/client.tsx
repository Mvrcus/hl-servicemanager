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

const clientNav = (email: string, active: string) => (
  <>
    <div class="nav-section">
      <div class="nav-section-label">Menu</div>
      <a href="/dashboard" class={`nav-link ${active === 'dashboard' ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        Dashboard
      </a>
      <a href="/dashboard/tickets" class={`nav-link ${active === 'tickets' ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
        Tickets
      </a>
      <a href="/dashboard/tickets/new" class={`nav-link ${active === 'new' ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        New Request
      </a>
    </div>
    <div class="nav-footer">
      <small style="display:block; margin-bottom:0.4rem; color:var(--text-muted); padding:0 0.25rem;">{email}</small>
      <form method="POST" action="/auth/logout">
        <button type="submit">Sign out</button>
      </form>
    </div>
  </>
);

// Dashboard
app.get('/', async (c) => {
  const session = c.get('session');
  const counts = await getTicketCounts(c.env.DB, session.orgId);
  const org = await getOrgById(c.env.DB, session.orgId!);
  const settings = await getAllSettings(c.env.DB);

  return c.html(
    <Layout title="Dashboard" nav={clientNav(session.email!, 'dashboard')}>
      <div class="page-header">
        <h2>Welcome back, {session.orgName}</h2>
        <p>Here's an overview of your requests.</p>
      </div>

      <div class="stats">
        <StatCard label="Open" value={counts.open} />
        <StatCard label="In Progress" value={counts.in_progress} />
        <StatCard label="Waiting" value={counts.waiting} />
        <StatCard label="Closed" value={counts.closed} />
      </div>

      <div class="page-actions" style="margin-bottom: 1.5rem;">
        <a href="/dashboard/tickets/new" class="btn btn-primary">Submit a Request</a>
        <a href="/dashboard/tickets" class="btn btn-outline">View All Tickets</a>
      </div>

      {(org?.about || settings.company_about || settings.communication_guide) && (
        <div class="card">
          {(org?.about || settings.company_about) && (
            <div class="card-header">
              <h4>About {settings.company_name || 'Your Service Provider'}</h4>
              <p>{org?.about || settings.company_about}</p>
            </div>
          )}
          {settings.communication_guide && (
            <>
              <h5>How to Reach Us</h5>
              <p class="mb-0">{settings.communication_guide}</p>
            </>
          )}
        </div>
      )}
    </Layout>
  );
});

// Ticket list
app.get('/tickets', async (c) => {
  const session = c.get('session');
  const msg = c.req.query('msg');
  const tickets = await getTicketsByOrg(c.env.DB, session.orgId!);

  return c.html(
    <Layout title="Your Tickets" nav={clientNav(session.email!, 'tickets')}>
      <div class="page-header">
        <h2>Your Tickets</h2>
        <div class="page-actions">
          <a href="/dashboard/tickets/new" class="btn btn-primary">New Request</a>
        </div>
      </div>
      <Flash message={msg === 'created' ? 'Ticket submitted successfully!' : undefined} />
      <TicketTable tickets={tickets} basePath="/dashboard/tickets" />
    </Layout>
  );
});

// New ticket form
app.get('/tickets/new', async (c) => {
  const session = c.get('session');
  return c.html(
    <Layout title="New Request" nav={clientNav(session.email!, 'new')}>
      <a href="/dashboard/tickets" class="back-link">&larr; Back to tickets</a>
      <div class="card">
        <div class="card-header">
          <h3>Submit a Request</h3>
          <p>Describe what you need and we'll get back to you.</p>
        </div>
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
          <button type="submit" class="btn btn-primary">Submit Request</button>
        </form>
      </div>
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

  c.executionCtx.waitUntil(
    (async () => {
      const adminEmail = await getAdminEmail(c.env.DB);
      if (adminEmail) {
        await sendEmail(c.env.DB, {
          to: adminEmail,
          subject: `New ticket: ${subject}`,
          message: `New ${priority} priority ticket from ${session.email} (${session.orgName}):\n\n${subject}\n\n${description}`,
          contact_email: session.email!,
          from_name: session.email!,
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
    <Layout title={ticket.subject} nav={clientNav(session.email!, 'tickets')}>
      <a href="/dashboard/tickets" class="back-link">&larr; Back to tickets</a>
      <Flash message={msg === 'commented' ? 'Comment added.' : undefined} />

      <div class="card" style="margin-bottom: 1rem;">
        <div style="display: flex; align-items: start; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h3 class="mb-0">{ticket.subject}</h3>
            <small>
              Submitted by {ticket.submitted_by} on{' '}
              {new Date(ticket.created_at + 'Z').toLocaleDateString()}
            </small>
          </div>
          <div class="flex-row gap-sm">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>
        <hr />
        <p class="mb-0" style="color: var(--text);">{ticket.description}</p>
      </div>

      <h4>Comments</h4>
      {comments.length === 0 && <p>No comments yet.</p>}
      {comments.map((comment) => (
        <div class={`comment ${comment.author === 'admin' ? 'comment-admin' : ''}`}>
          <div class="comment-meta">
            <strong>{comment.author === 'admin' ? 'Service Provider' : comment.author}</strong>
            <span>{new Date(comment.created_at + 'Z').toLocaleString()}</span>
          </div>
          <p>{comment.body}</p>
        </div>
      ))}

      <div class="card mt-1">
        <form method="POST" action={`/dashboard/tickets/${id}/comments`}>
          <label>
            Add a comment
            <textarea name="body" required rows={3} placeholder="Type your message..."></textarea>
          </label>
          <button type="submit" class="btn btn-primary">Post Comment</button>
        </form>
      </div>
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

  c.executionCtx.waitUntil(
    (async () => {
      const adminEmail = await getAdminEmail(c.env.DB);
      if (adminEmail) {
        await sendEmail(c.env.DB, {
          to: adminEmail,
          subject: `New comment on: ${ticket.subject}`,
          message: `${session.email} commented on ticket "${ticket.subject}":\n\n${text}`,
          contact_email: session.email!,
          from_name: session.email!,
          type: 'client_comment',
        });
      }
    })()
  );

  return c.redirect(`/dashboard/tickets/${id}?msg=commented`);
});

export default app;
