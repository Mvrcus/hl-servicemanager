import { Hono } from 'hono';
import type { Bindings, SessionData } from '../types';
import { Layout } from '../views/layout';
import { Flash } from '../views/components';
import { getOrgByDomain } from '../db/queries';
import { getAdminByUsername } from '../db/queries';
import { createSession, sessionCookie, clearSessionCookie, getTokenFromCookie, destroySession } from '../lib/session';
import { verifyPassword } from '../lib/password';

type Env = { Bindings: Bindings };

const app = new Hono<Env>();

// Landing page
app.get('/', (c) => {
  const error = c.req.query('error');
  return c.html(
    <Layout title="Welcome">
      <div class="hero">
        <h1>HL Service Manager</h1>
        <p>Submit requests, track progress, and collaborate with your service provider.</p>
      </div>
      <article style="max-width: 420px; margin: 0 auto;">
        <Flash
          message={error === 'not_found' ? 'No organization found for that email domain. Contact your service provider.' : error === 'invalid' ? 'Please enter a valid email address.' : undefined}
          type="error"
        />
        <h3>Client Login</h3>
        <form method="POST" action="/auth/login">
          <label>
            Email address
            <input
              type="email"
              name="email"
              placeholder="you@yourcompany.com"
              required
              autofocus
            />
          </label>
          <button type="submit">Access Dashboard</button>
        </form>
        <hr />
        <small>
          <a href="/admin/login">Admin login</a>
        </small>
      </article>
    </Layout>
  );
});

// Client email login
app.post('/auth/login', async (c) => {
  const body = await c.req.parseBody();
  const email = (body.email as string || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return c.redirect('/?error=invalid');
  }

  const domain = email.split('@')[1];
  const org = await getOrgByDomain(c.env.DB, domain);

  if (!org) {
    return c.redirect('/?error=not_found');
  }

  const session: SessionData = {
    role: 'client',
    email,
    orgId: org.id,
    orgName: org.name,
  };

  const token = await createSession(c.env.SESSIONS, session);
  c.header('Set-Cookie', sessionCookie(token));
  return c.redirect('/dashboard');
});

// Admin login page
app.get('/admin/login', (c) => {
  const error = c.req.query('error');
  return c.html(
    <Layout title="Admin Login">
      <article style="max-width: 420px; margin: 2rem auto;">
        <Flash
          message={error === 'invalid' ? 'Invalid username or password.' : undefined}
          type="error"
        />
        <h3>Admin Login</h3>
        <form method="POST" action="/admin/login">
          <label>
            Username
            <input type="text" name="username" required autofocus />
          </label>
          <label>
            Password
            <input type="password" name="password" required />
          </label>
          <button type="submit">Login</button>
        </form>
        <hr />
        <small>
          <a href="/">Back to client login</a>
        </small>
      </article>
    </Layout>
  );
});

// Admin login handler
app.post('/admin/login', async (c) => {
  const body = await c.req.parseBody();
  const username = (body.username as string || '').trim();
  const password = body.password as string || '';

  const admin = await getAdminByUsername(c.env.DB, username);
  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    return c.redirect('/admin/login?error=invalid');
  }

  const session: SessionData = { role: 'admin' };
  const token = await createSession(c.env.SESSIONS, session);
  c.header('Set-Cookie', sessionCookie(token));
  return c.redirect('/admin');
});

// Logout
app.post('/auth/logout', async (c) => {
  const token = getTokenFromCookie(c.req.header('cookie'));
  if (token) await destroySession(c.env.SESSIONS, token);
  c.header('Set-Cookie', clearSessionCookie());
  return c.redirect('/');
});

export default app;
