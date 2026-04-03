import { Hono } from 'hono';
import type { Bindings } from './types';
import publicRoutes from './routes/public';
import clientRoutes from './routes/client';
import adminRoutes from './routes/admin';
import { hashPassword } from './lib/password';

type Env = { Bindings: Bindings };

const app = new Hono<Env>();

// Mount routes
app.route('/', publicRoutes);
app.route('/dashboard', clientRoutes);
app.route('/admin', adminRoutes);

// Setup endpoint — creates tables and seeds admin (hit once, then remove or protect)
app.get('/setup', async (c) => {
  const db = c.env.DB;

  // Create tables
  await db.prepare("CREATE TABLE IF NOT EXISTS organizations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, domain TEXT NOT NULL UNIQUE, about TEXT, created_at TEXT DEFAULT (datetime('now')))").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER NOT NULL REFERENCES organizations(id), subject TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', priority TEXT NOT NULL DEFAULT 'normal', submitted_by TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL REFERENCES tickets(id), author TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL)").run();

  // Create default admin (admin/admin — change this!)
  const existing = await db
    .prepare('SELECT id FROM admins WHERE username = ?')
    .bind('admin')
    .first();

  if (!existing) {
    const hash = await hashPassword('admin');
    await db
      .prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)')
      .bind('admin', hash)
      .run();
  }

  // Seed sample org
  const existingOrg = await db
    .prepare('SELECT id FROM organizations WHERE domain = ?')
    .bind('demoagency.com')
    .first();

  if (!existingOrg) {
    await db
      .prepare(
        'INSERT INTO organizations (name, domain, about) VALUES (?, ?, ?)'
      )
      .bind(
        'Demo Agency',
        'demoagency.com',
        'A demo agency account for testing. Your GoHighLevel service provider will help you build out workflows, automations, and custom solutions.'
      )
      .run();
  }

  return c.html(
    <html>
      <body style="font-family: sans-serif; max-width: 600px; margin: 2rem auto; padding: 1rem;">
        <h1>Setup Complete</h1>
        <p>Database tables created. Default admin account:</p>
        <ul>
          <li>Username: <code>admin</code></li>
          <li>Password: <code>admin</code></li>
        </ul>
        <p>Demo organization created: <code>demoagency.com</code></p>
        <p>Test client login with any <code>@demoagency.com</code> email.</p>
        <p><strong>Change the admin password after first login!</strong></p>
        <p><a href="/">Go to app</a> | <a href="/admin/login">Admin login</a></p>
      </body>
    </html>
  );
});

export default app;
