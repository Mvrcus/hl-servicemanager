export type Bindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
};

export type SessionData = {
  role: 'client' | 'admin';
  email?: string;
  orgId?: number;
  orgName?: string;
};

export type Organization = {
  id: number;
  name: string;
  domain: string;
  about: string | null;
  created_at: string;
};

export type Ticket = {
  id: number;
  organization_id: number;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting' | 'closed';
  priority: 'low' | 'normal' | 'high';
  submitted_by: string;
  created_at: string;
  updated_at: string;
  org_name?: string;
};

export type Comment = {
  id: number;
  ticket_id: number;
  author: string;
  body: string;
  created_at: string;
};
