import type { Organization, Ticket, Comment } from '../types';

// ---- Organizations ----

export async function getOrgByDomain(
  db: D1Database,
  domain: string
): Promise<Organization | null> {
  return db
    .prepare('SELECT * FROM organizations WHERE domain = ?')
    .bind(domain)
    .first<Organization>();
}

export async function getAllOrgs(db: D1Database): Promise<Organization[]> {
  const result = await db
    .prepare('SELECT * FROM organizations ORDER BY name')
    .all<Organization>();
  return result.results;
}

export async function getOrgById(
  db: D1Database,
  id: number
): Promise<Organization | null> {
  return db
    .prepare('SELECT * FROM organizations WHERE id = ?')
    .bind(id)
    .first<Organization>();
}

export async function createOrg(
  db: D1Database,
  name: string,
  domain: string,
  about: string
): Promise<void> {
  await db
    .prepare('INSERT INTO organizations (name, domain, about) VALUES (?, ?, ?)')
    .bind(name, domain.toLowerCase(), about)
    .run();
}

// ---- Tickets ----

export async function getTicketsByOrg(
  db: D1Database,
  orgId: number
): Promise<Ticket[]> {
  const result = await db
    .prepare(
      'SELECT * FROM tickets WHERE organization_id = ? ORDER BY created_at DESC'
    )
    .bind(orgId)
    .all<Ticket>();
  return result.results;
}

export async function getAllTickets(db: D1Database): Promise<Ticket[]> {
  const result = await db
    .prepare(
      `SELECT t.*, o.name as org_name FROM tickets t
       JOIN organizations o ON t.organization_id = o.id
       ORDER BY t.created_at DESC`
    )
    .all<Ticket>();
  return result.results;
}

export async function getTicketById(
  db: D1Database,
  id: number
): Promise<Ticket | null> {
  return db
    .prepare(
      `SELECT t.*, o.name as org_name FROM tickets t
       JOIN organizations o ON t.organization_id = o.id
       WHERE t.id = ?`
    )
    .bind(id)
    .first<Ticket>();
}

export async function createTicket(
  db: D1Database,
  orgId: number,
  subject: string,
  description: string,
  priority: string,
  submittedBy: string
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO tickets (organization_id, subject, description, priority, submitted_by)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(orgId, subject, description, priority, submittedBy)
    .run();
}

export async function updateTicket(
  db: D1Database,
  id: number,
  status: string,
  priority: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE tickets SET status = ?, priority = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .bind(status, priority, id)
    .run();
}

export async function getTicketCounts(
  db: D1Database,
  orgId?: number
): Promise<{ open: number; in_progress: number; waiting: number; closed: number; total: number }> {
  const where = orgId ? 'WHERE organization_id = ?' : '';
  const stmt = db.prepare(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
       SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
       SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
       SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed
     FROM tickets ${where}`
  );
  const row = orgId
    ? await stmt.bind(orgId).first<any>()
    : await stmt.first<any>();
  return {
    total: row?.total ?? 0,
    open: row?.open ?? 0,
    in_progress: row?.in_progress ?? 0,
    waiting: row?.waiting ?? 0,
    closed: row?.closed ?? 0,
  };
}

// ---- Comments ----

export async function getCommentsByTicket(
  db: D1Database,
  ticketId: number
): Promise<Comment[]> {
  const result = await db
    .prepare(
      'SELECT * FROM comments WHERE ticket_id = ? ORDER BY created_at ASC'
    )
    .bind(ticketId)
    .all<Comment>();
  return result.results;
}

export async function createComment(
  db: D1Database,
  ticketId: number,
  author: string,
  body: string
): Promise<void> {
  await db
    .prepare('INSERT INTO comments (ticket_id, author, body) VALUES (?, ?, ?)')
    .bind(ticketId, author, body)
    .run();
}

// ---- Admin ----

export async function getAdminByUsername(
  db: D1Database,
  username: string
): Promise<{ id: number; username: string; password_hash: string } | null> {
  return db
    .prepare('SELECT * FROM admins WHERE username = ?')
    .bind(username)
    .first();
}

export async function updateAdminPassword(
  db: D1Database,
  id: number,
  passwordHash: string
): Promise<void> {
  await db
    .prepare('UPDATE admins SET password_hash = ? WHERE id = ?')
    .bind(passwordHash, id)
    .run();
}

// ---- Settings ----

export async function getSetting(
  db: D1Database,
  key: string
): Promise<string | null> {
  const row = await db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? null;
}

export async function getAllSettings(
  db: D1Database
): Promise<Record<string, string>> {
  const result = await db.prepare('SELECT key, value FROM settings').all<{
    key: string;
    value: string;
  }>();
  const settings: Record<string, string> = {};
  for (const row of result.results) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function setSetting(
  db: D1Database,
  key: string,
  value: string
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    .bind(key, value)
    .run();
}
