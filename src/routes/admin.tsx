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

const adminNav = (active: string) => (
  <>
    <div class="nav-section">
      <div class="nav-section-label">Admin</div>
      <a href="/admin" class={`nav-link ${active === 'dashboard' ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        Dashboard
      </a>
      <a href="/admin/orgs" class={`nav-link ${active === 'orgs' ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Organizations
      </a>
      <a href="/admin/tickets" class={`nav-link ${active === 'tickets' ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
        All Tickets
      </a>
      <a href="/admin/settings" class={`nav-link ${active === 'settings' ? 'active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Settings
      </a>
    </div>
    <div class="nav-footer">
      <small style="display:block; margin-bottom:0.4rem; color:var(--text-muted); padding:0 0.25rem;">Admin</small>
      <form method="POST" action="/auth/logout">
        <button type="submit">Sign out</button>
      </form>
    </div>
  </>
);

// Admin dashboard
app.get('/', async (c) => {
  const counts = await getTicketCounts(c.env.DB);
  const orgs = await getAllOrgs(c.env.DB);

  return c.html(
    <Layout title="Admin Dashboard" nav={adminNav('dashboard')}>
      <div class="page-header">
        <h2>Dashboard</h2>
        <p>Overview of all organizations and tickets.</p>
        <div class="page-actions">
          <a href="/admin/tickets" class="btn btn-primary">View All Tickets</a>
          <a href="/admin/orgs" class="btn btn-outline">Manage Organizations</a>
        </div>
      </div>

      <div class="stats">
        <StatCard label="Organizations" value={orgs.length} />
        <StatCard label="Open" value={counts.open} />
        <StatCard label="In Progress" value={counts.in_progress} />
        <StatCard label="Waiting" value={counts.waiting} />
        <StatCard label="Total" value={counts.total} />
      </div>
    </Layout>
  );
});

// Org list
app.get('/orgs', async (c) => {
  const orgs = await getAllOrgs(c.env.DB);
  const msg = c.req.query('msg');

  return c.html(
    <Layout title="Organizations" nav={adminNav('orgs')}>
      <div class="page-header">
        <h2>Organizations</h2>
      </div>
      <Flash message={msg === 'created' ? 'Organization created!' : undefined} />

      <div class="card">
        <div class="card-header">
          <h4>Add Organization</h4>
        </div>
        <form method="POST" action="/admin/orgs">
          <div class="grid-2">
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
          <button type="submit" class="btn btn-primary">Create Organization</button>
        </form>
      </div>

      {orgs.length === 0 ? (
        <div class="card" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          <p class="mb-0">No organizations yet.</p>
        </div>
      ) : (
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Domain</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr>
                  <td style="font-weight:500; color:var(--text);">{org.name}</td>
                  <td><code>{org.domain}</code></td>
                  <td>{new Date(org.created_at + 'Z').toLocaleDateString()}</td>
                  <td>
                    <a href={`/admin/orgs/${org.id}`} class="btn btn-outline btn-sm">View</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    <Layout title={org.name} nav={adminNav('orgs')}>
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
    <Layout title="All Tickets" nav={adminNav('tickets')}>
      <div class="page-header">
        <h2>All Tickets</h2>
      </div>

      <div class="filters">
        <a href="/admin/tickets" class={`filter-pill ${!statusFilter ? 'active' : ''}`}>All</a>
        <a href="/admin/tickets?status=open" class={`filter-pill ${statusFilter === 'open' ? 'active' : ''}`}>Open</a>
        <a href="/admin/tickets?status=in_progress" class={`filter-pill ${statusFilter === 'in_progress' ? 'active' : ''}`}>In Progress</a>
        <a href="/admin/tickets?status=waiting" class={`filter-pill ${statusFilter === 'waiting' ? 'active' : ''}`}>Waiting</a>
        <a href="/admin/tickets?status=closed" class={`filter-pill ${statusFilter === 'closed' ? 'active' : ''}`}>Closed</a>
      </div>

      <TicketTable tickets={filtered} basePath="/admin/tickets" showOrg={true} />
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
    <Layout title={ticket.subject} nav={adminNav('tickets')}>
      <a href="/admin/tickets" class="back-link">&larr; Back to tickets</a>
      <Flash
        message={
          msg === 'updated' ? 'Ticket updated.' :
          msg === 'commented' ? 'Comment added.' :
          undefined
        }
      />

      <div class="card" style="margin-bottom: 1rem;">
        <div style="display: flex; align-items: start; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h3 class="mb-0">{ticket.subject}</h3>
            <small>{ticket.org_name} — {ticket.submitted_by} — {new Date(ticket.created_at + 'Z').toLocaleDateString()}</small>
          </div>
          <div class="flex-row gap-sm">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>
        <hr />
        <p class="mb-0" style="color: var(--text);">{ticket.description}</p>
      </div>

      <div class="card" style="margin-bottom: 1.5rem;">
        <h4>Update Ticket</h4>
        <form method="POST" action={`/admin/tickets/${id}`}>
          <div class="grid-2">
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
          <button type="submit" class="btn btn-primary">Update</button>
        </form>
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
        <form method="POST" action={`/admin/tickets/${id}/comments`}>
          <label>
            Reply
            <textarea name="body" required rows={3} placeholder="Type your reply..."></textarea>
          </label>
          <button type="submit" class="btn btn-primary">Post Reply</button>
        </form>
      </div>
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
      (async () => {
        const s = await getAllSettings(c.env.DB);
        await sendEmail(c.env.DB, {
          to: ticket.submitted_by,
          subject: `Ticket update: ${ticket.subject}`,
          message: `Your ticket "${ticket.subject}" status has been updated from ${ticket.status.replace('_', ' ')} to ${status.replace('_', ' ')}.`,
          contact_email: ticket.submitted_by,
          from_name: s.company_name || 'HL Service Manager',
          type: 'status_update',
        });
      })()
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
      (async () => {
        const s = await getAllSettings(c.env.DB);
        await sendEmail(c.env.DB, {
          to: ticket.submitted_by,
          subject: `Reply on: ${ticket.subject}`,
          message: `Your service provider replied to "${ticket.subject}":\n\n${text}`,
          contact_email: ticket.submitted_by,
          from_name: s.company_name || 'HL Service Manager',
          type: 'admin_reply',
        });
      })()
    );
  }

  return c.redirect(`/admin/tickets/${id}?msg=commented`);
});

// ---- Settings ----

app.get('/settings', async (c) => {
  const settings = await getAllSettings(c.env.DB);
  const msg = c.req.query('msg');

  return c.html(
    <Layout title="Settings" nav={adminNav('settings')}>
      <h2>Settings</h2>
      <Flash
        message={
          msg === 'saved' ? 'Settings saved.' :
          msg === 'password_changed' ? 'Password changed successfully.' :
          msg === 'setup_sent' ? 'Setup payload sent to your webhook! Map the fields in GHL, then click Confirm.' :
          msg === 'confirmed' ? 'Email integration confirmed and ready!' :
          msg === 'test_sent' ? 'Test email sent! Check your inbox.' :
          msg === 'test_failed' ? undefined :
          msg === 'password_wrong' ? undefined :
          undefined
        }
      />
      <Flash
        message={
          msg === 'password_wrong' ? 'Current password is incorrect.' :
          msg === 'test_failed' ? 'Failed to send. Check your webhook URL and admin email.' :
          msg === 'setup_missing' ? 'Save your webhook URL and admin email first.' :
          undefined
        }
        type="error"
      />

      <div class="card">
        <div class="card-header"><h4>Company Profile</h4></div>
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

          <button type="submit" class="btn btn-primary">Save Settings</button>
        </form>
      </div>

      <div class="card">
        <div class="card-header"><h4>Email Integration Setup</h4></div>
        {(() => {
          const status = settings.email_setup_status || 'not_started';
          const hasConfig = settings.webhook_url && settings.admin_email;

          return (
            <>
              <div class="flex-row gap-sm mb-1">
                <span class={`step-num ${status !== 'not_started' ? 'complete' : ''}`}>1</span>
                <span class={`step-num ${status === 'confirmed' ? 'complete' : ''}`}>2</span>
                <span class={`step-num ${status === 'confirmed' ? 'complete' : ''}`}>3</span>
              </div>

              <div class={`step ${status !== 'not_started' ? 'done' : ''}`}>
                <div class="step-header">
                  <h5 class="mb-0">Send Setup Payload</h5>
                  {status !== 'not_started' && <span class="badge badge-closed">done</span>}
                </div>
                <p>Sends a sample webhook with all fields so you can map them in GoHighLevel.</p>
                <p><small>Fields: <code>from</code> <code>from_name</code> <code>to</code> <code>subject</code> <code>message</code> <code>contact_email</code> <code>type</code></small></p>
                <form method="POST" action="/admin/settings/email-setup" style="margin:0;">
                  <button type="submit" class="btn btn-primary btn-sm" disabled={!hasConfig}>
                    {status === 'not_started' ? 'Send Setup Payload' : 'Resend'}
                  </button>
                </form>
                {!hasConfig && <small style="color: var(--danger);">Save your webhook URL and admin email above first.</small>}
              </div>

              <div class={`step ${status === 'confirmed' ? 'done' : status === 'not_started' ? 'locked' : ''}`}>
                <div class="step-header">
                  <h5 class="mb-0">Confirm Mapping</h5>
                  {status === 'confirmed' && <span class="badge badge-closed">done</span>}
                </div>
                <p>After mapping the fields in your email provider, confirm the integration is ready.</p>
                <form method="POST" action="/admin/settings/email-confirm" style="margin:0;">
                  <button type="submit" class="btn btn-outline btn-sm" disabled={status === 'not_started'}>
                    Confirm Mapping Complete
                  </button>
                </form>
              </div>

              <div class={`step ${status !== 'confirmed' ? 'locked' : ''}`}>
                <div class="step-header">
                  <h5 class="mb-0">Test Each Email Type</h5>
                </div>
                <p>All tests go to <strong>{settings.admin_email || '(not set)'}</strong>.</p>
                <div class="grid-2">
                  <form method="POST" action="/admin/settings/test-email" style="margin:0;">
                    <input type="hidden" name="type" value="new_ticket" />
                    <button type="submit" class="btn btn-outline btn-sm" style="width:100%" disabled={status !== 'confirmed'}>Test: New Ticket</button>
                    <small>Client submits ticket</small>
                  </form>
                  <form method="POST" action="/admin/settings/test-email" style="margin:0;">
                    <input type="hidden" name="type" value="client_comment" />
                    <button type="submit" class="btn btn-outline btn-sm" style="width:100%" disabled={status !== 'confirmed'}>Test: Client Comment</button>
                    <small>Client comments</small>
                  </form>
                  <form method="POST" action="/admin/settings/test-email" style="margin:0;">
                    <input type="hidden" name="type" value="status_update" />
                    <button type="submit" class="btn btn-outline btn-sm" style="width:100%" disabled={status !== 'confirmed'}>Test: Status Update</button>
                    <small>Admin changes status</small>
                  </form>
                  <form method="POST" action="/admin/settings/test-email" style="margin:0;">
                    <input type="hidden" name="type" value="admin_reply" />
                    <button type="submit" class="btn btn-outline btn-sm" style="width:100%" disabled={status !== 'confirmed'}>Test: Admin Reply</button>
                    <small>Admin replies</small>
                  </form>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      <div class="card">
        <div class="card-header"><h4>Change Password</h4></div>
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
          <button type="submit" class="btn btn-primary">Change Password</button>
        </form>
      </div>
    </Layout>
  );
});

// Step 1: Send setup payload with all fields for mapping
app.post('/settings/email-setup', async (c) => {
  const settings = await getAllSettings(c.env.DB);
  if (!settings.webhook_url || !settings.admin_email) {
    return c.redirect('/admin/settings?msg=setup_missing');
  }

  try {
    const webhookUrl = settings.webhook_url;
    const fromEmail = settings.from_email || 'noreply@hlservicemanager.com';

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        from_name: settings.company_name || 'HL Service Manager',
        to: settings.admin_email,
        subject: 'HL Service Manager — Setup Payload (map these fields)',
        message: 'This is a setup payload from HL Service Manager. Map each field in your email automation:\n\n• from — sender address\n• from_name — display name of the sender (company name or contact email)\n• to — recipient address\n• subject — email subject line\n• message — email body\n• contact_email — the person this email is about\n• type — notification type (new_ticket, client_comment, status_update, admin_reply)',
        contact_email: settings.admin_email,
        type: 'setup',
      }),
    });

    await setSetting(c.env.DB, 'email_setup_status', 'setup_sent');
    return c.redirect('/admin/settings?msg=setup_sent');
  } catch {
    return c.redirect('/admin/settings?msg=test_failed');
  }
});

// Step 2: Confirm mapping is done
app.post('/settings/email-confirm', async (c) => {
  await setSetting(c.env.DB, 'email_setup_status', 'confirmed');
  return c.redirect('/admin/settings?msg=confirmed');
});

// Step 3: Test individual email types
app.post('/settings/test-email', async (c) => {
  const body = await c.req.parseBody();
  const type = body.type as string;
  const settings = await getAllSettings(c.env.DB);
  const adminEmail = settings.admin_email;

  if (!adminEmail || !settings.webhook_url || settings.email_setup_status !== 'confirmed') {
    return c.redirect('/admin/settings?msg=test_failed');
  }

  const companyName = settings.company_name || 'HL Service Manager';
  const tests: Record<string, { to: string; subject: string; message: string; contact_email: string; from_name: string; type: 'new_ticket' | 'client_comment' | 'status_update' | 'admin_reply' }> = {
    new_ticket: {
      to: adminEmail,
      subject: 'TEST: New ticket — Workflow automation request',
      message: 'New high priority ticket from jane@demoagency.com (Demo Agency):\n\nWorkflow automation request\n\nThis is a test email simulating a new ticket submission from a client.',
      contact_email: 'jane@demoagency.com',
      from_name: 'jane@demoagency.com',
      type: 'new_ticket',
    },
    client_comment: {
      to: adminEmail,
      subject: 'TEST: New comment on — Workflow automation request',
      message: 'jane@demoagency.com commented on ticket "Workflow automation request":\n\nThis is a test email simulating a client adding a comment to a ticket.',
      contact_email: 'jane@demoagency.com',
      from_name: 'jane@demoagency.com',
      type: 'client_comment',
    },
    status_update: {
      to: adminEmail,
      subject: 'TEST: Ticket update — Workflow automation request',
      message: 'Your ticket "Workflow automation request" status has been updated from open to in progress.\n\nThis is a test email simulating a status change notification sent to a client.',
      contact_email: 'jane@demoagency.com',
      from_name: companyName,
      type: 'status_update',
    },
    admin_reply: {
      to: adminEmail,
      subject: 'TEST: Reply on — Workflow automation request',
      message: 'Your service provider replied to "Workflow automation request":\n\nThis is a test email simulating an admin reply notification sent to a client.',
      contact_email: 'jane@demoagency.com',
      from_name: companyName,
      type: 'admin_reply',
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
