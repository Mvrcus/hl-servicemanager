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
  getAllSettings,
  setSetting,
  getAdminByUsername,
  updateAdminPassword,
} from '../db/queries';
import { sendEmail } from '../lib/email';
import { hashPassword, verifyPassword } from '../lib/password';

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
    <li><a href="/admin/settings">Settings</a></li>
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

  const ticket = await getTicketById(c.env.DB, id);
  await updateTicket(c.env.DB, id, status, priority);

  // Notify client of status change
  if (ticket && ticket.status !== status) {
    c.executionCtx.waitUntil(
      sendEmail(c.env.DB, {
        to: ticket.submitted_by,
        subject: `Ticket update: ${ticket.subject}`,
        message: `Your ticket "${ticket.subject}" status has been updated from ${ticket.status.replace('_', ' ')} to ${status.replace('_', ' ')}.`,
        contact_email: ticket.submitted_by,
      })
    );
  }

  return c.redirect(`/admin/tickets/${id}?msg=updated`);
});

// Admin comment
app.post('/tickets/:id/comments', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.parseBody();
  const text = (body.body as string || '').trim();

  if (!text) return c.redirect(`/admin/tickets/${id}`);

  const ticket = await getTicketById(c.env.DB, id);
  await createComment(c.env.DB, id, 'admin', text);

  // Notify client of admin reply
  if (ticket) {
    c.executionCtx.waitUntil(
      sendEmail(c.env.DB, {
        to: ticket.submitted_by,
        subject: `Reply on: ${ticket.subject}`,
        message: `Your service provider replied to "${ticket.subject}":\n\n${text}`,
        contact_email: ticket.submitted_by,
      })
    );
  }

  return c.redirect(`/admin/tickets/${id}?msg=commented`);
});

// ---- Settings ----

app.get('/settings', async (c) => {
  const settings = await getAllSettings(c.env.DB);
  const msg = c.req.query('msg');

  return c.html(
    <Layout title="Settings" nav={adminNav}>
      <h2>Settings</h2>
      <Flash
        message={
          msg === 'saved' ? 'Settings saved.' :
          msg === 'password_changed' ? 'Password changed successfully.' :
          msg === 'test_sent' ? 'Test email sent! Check your inbox.' :
          msg === 'test_failed' ? undefined :
          msg === 'password_wrong' ? undefined :
          undefined
        }
      />
      <Flash
        message={
          msg === 'password_wrong' ? 'Current password is incorrect.' :
          msg === 'test_failed' ? 'Failed to send test email. Check your webhook URL and admin email.' :
          undefined
        }
        type="error"
      />

      <article>
        <h4>Company Profile</h4>
        <form method="POST" action="/admin/settings">
          <label>
            Company Name
            <input type="text" name="company_name" value={settings.company_name || ''} placeholder="Your Company Name" />
          </label>
          <label>
            About Your Company
            <textarea name="company_about" rows={3} placeholder="Brief description shown to clients...">{settings.company_about || ''}</textarea>
          </label>
          <label>
            Communication Guide
            <textarea name="communication_guide" rows={3} placeholder="How clients should reach you...">{settings.communication_guide || ''}</textarea>
          </label>

          <h4>Email Notifications</h4>
          <label>
            Admin Email
            <input type="email" name="admin_email" value={settings.admin_email || ''} placeholder="you@example.com" />
            <small>Where ticket notifications are sent</small>
          </label>
          <label>
            From Email
            <input type="email" name="from_email" value={settings.from_email || ''} placeholder="noreply@yourdomain.com" />
            <small>Sender address for outgoing emails</small>
          </label>

          <h4>Integrations</h4>
          <label>
            Email Webhook URL
            <input type="url" name="webhook_url" value={settings.webhook_url || ''} placeholder="https://..." />
            <small>GoHighLevel or other webhook endpoint for sending emails</small>
          </label>

          <button type="submit">Save Settings</button>
        </form>
      </article>

      <article>
        <h4>Test Email Notifications</h4>
        <p>Send a test for each email type to verify your webhook is working. Emails go to <strong>{settings.admin_email || '(no admin email set)'}</strong>.</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <form method="POST" action="/admin/settings/test-email">
            <input type="hidden" name="type" value="new_ticket" />
            <button type="submit" class="outline" style="width:100%">Test: New Ticket</button>
            <small>Sent to admin when a client submits a ticket</small>
          </form>
          <form method="POST" action="/admin/settings/test-email">
            <input type="hidden" name="type" value="client_comment" />
            <button type="submit" class="outline" style="width:100%">Test: Client Comment</button>
            <small>Sent to admin when a client comments</small>
          </form>
          <form method="POST" action="/admin/settings/test-email">
            <input type="hidden" name="type" value="status_update" />
            <button type="submit" class="outline" style="width:100%">Test: Status Update</button>
            <small>Sent to client when admin changes ticket status</small>
          </form>
          <form method="POST" action="/admin/settings/test-email">
            <input type="hidden" name="type" value="admin_reply" />
            <button type="submit" class="outline" style="width:100%">Test: Admin Reply</button>
            <small>Sent to client when admin replies to a ticket</small>
          </form>
        </div>
      </article>

      <article>
        <h4>Change Password</h4>
        <form method="POST" action="/admin/settings/password">
          <label>
            Current Password
            <input type="password" name="current_password" required />
          </label>
          <label>
            New Password
            <input type="password" name="new_password" required minlength={6} />
          </label>
          <label>
            Confirm New Password
            <input type="password" name="confirm_password" required minlength={6} />
          </label>
          <button type="submit">Change Password</button>
        </form>
      </article>
    </Layout>
  );
});

// Test email
app.post('/settings/test-email', async (c) => {
  const body = await c.req.parseBody();
  const type = body.type as string;
  const settings = await getAllSettings(c.env.DB);
  const adminEmail = settings.admin_email;

  if (!adminEmail || !settings.webhook_url) {
    return c.redirect('/admin/settings?msg=test_failed');
  }

  const tests: Record<string, { to: string; subject: string; message: string; contact_email: string }> = {
    new_ticket: {
      to: adminEmail,
      subject: 'TEST: New ticket — Workflow automation request',
      message: 'New high priority ticket from jane@demoagency.com (Demo Agency):\n\nWorkflow automation request\n\nThis is a test email simulating a new ticket submission from a client.',
      contact_email: 'jane@demoagency.com',
    },
    client_comment: {
      to: adminEmail,
      subject: 'TEST: New comment on — Workflow automation request',
      message: 'jane@demoagency.com commented on ticket "Workflow automation request":\n\nThis is a test email simulating a client adding a comment to a ticket.',
      contact_email: 'jane@demoagency.com',
    },
    status_update: {
      to: adminEmail,
      subject: 'TEST: Ticket update — Workflow automation request',
      message: 'Your ticket "Workflow automation request" status has been updated from open to in progress.\n\nThis is a test email simulating a status change notification sent to a client.',
      contact_email: 'jane@demoagency.com',
    },
    admin_reply: {
      to: adminEmail,
      subject: 'TEST: Reply on — Workflow automation request',
      message: 'Your service provider replied to "Workflow automation request":\n\nThis is a test email simulating an admin reply notification sent to a client.',
      contact_email: 'jane@demoagency.com',
    },
  };

  const test = tests[type];
  if (!test) return c.redirect('/admin/settings?msg=test_failed');

  try {
    await sendEmail(c.env.DB, test);
    return c.redirect('/admin/settings?msg=test_sent');
  } catch {
    return c.redirect('/admin/settings?msg=test_failed');
  }
});

// Save settings
app.post('/settings', async (c) => {
  const body = await c.req.parseBody();
  const keys = ['company_name', 'company_about', 'communication_guide', 'admin_email', 'from_email', 'webhook_url'];

  for (const key of keys) {
    const value = (body[key] as string || '').trim();
    await setSetting(c.env.DB, key, value);
  }

  return c.redirect('/admin/settings?msg=saved');
});

// Change password
app.post('/settings/password', async (c) => {
  const body = await c.req.parseBody();
  const currentPassword = body.current_password as string || '';
  const newPassword = body.new_password as string || '';
  const confirmPassword = body.confirm_password as string || '';

  if (newPassword !== confirmPassword || newPassword.length < 6) {
    return c.redirect('/admin/settings?msg=password_wrong');
  }

  const admin = await getAdminByUsername(c.env.DB, 'admin');
  if (!admin || !(await verifyPassword(currentPassword, admin.password_hash))) {
    return c.redirect('/admin/settings?msg=password_wrong');
  }

  const hash = await hashPassword(newPassword);
  await updateAdminPassword(c.env.DB, admin.id, hash);

  return c.redirect('/admin/settings?msg=password_changed');
});

export default app;
