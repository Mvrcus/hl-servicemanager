import type { SessionData } from '../types';

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createSession(
  kv: KVNamespace,
  data: SessionData
): Promise<string> {
  const token = generateToken();
  await kv.put(`session:${token}`, JSON.stringify(data), {
    expirationTtl: SESSION_TTL,
  });
  return token;
}

export async function getSession(
  kv: KVNamespace,
  token: string
): Promise<SessionData | null> {
  const raw = await kv.get(`session:${token}`);
  if (!raw) return null;
  return JSON.parse(raw) as SessionData;
}

export async function destroySession(
  kv: KVNamespace,
  token: string
): Promise<void> {
  await kv.delete(`session:${token}`);
}

export function sessionCookie(token: string, maxAge = SESSION_TTL): string {
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function getTokenFromCookie(cookie: string | undefined): string | null {
  if (!cookie) return null;
  const match = cookie.match(/session=([a-f0-9]+)/);
  return match ? match[1] : null;
}
