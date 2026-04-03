import { createMiddleware } from 'hono/factory';
import type { Bindings, SessionData } from '../types';
import { getSession, getTokenFromCookie } from '../lib/session';

type Env = {
  Bindings: Bindings;
  Variables: {
    session: SessionData;
  };
};

export const clientAuth = createMiddleware<Env>(async (c, next) => {
  const token = getTokenFromCookie(c.req.header('cookie'));
  if (!token) return c.redirect('/');
  const session = await getSession(c.env.SESSIONS, token);
  if (!session || session.role !== 'client') return c.redirect('/');
  c.set('session', session);
  await next();
});

export const adminAuth = createMiddleware<Env>(async (c, next) => {
  const token = getTokenFromCookie(c.req.header('cookie'));
  if (!token) return c.redirect('/admin/login');
  const session = await getSession(c.env.SESSIONS, token);
  if (!session || session.role !== 'admin') return c.redirect('/admin/login');
  c.set('session', session);
  await next();
});
