import 'server-only';

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'liba_admin_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function safeEqual(left: string, right: string) {
  const leftHash = createHash('sha256').update(left).digest();
  const rightHash = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function sign(payload: string) {
  return createHmac('sha256', env('SESSION_SECRET'))
    .update(payload)
    .digest('base64url');
}

export function validateCredentials(username: string, password: string) {
  return (
    safeEqual(username, env('LEADERBOARD_ADMIN_USER')) &&
    safeEqual(password, env('LEADERBOARD_ADMIN_PASSWORD'))
  );
}

export function createSessionToken(username: string) {
  const payload = Buffer.from(
    JSON.stringify({
      username,
      expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
    }),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined) {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;

  try {
    const session = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { username?: unknown; expiresAt?: unknown };
    return (
      typeof session.username === 'string' &&
      safeEqual(session.username, env('LEADERBOARD_ADMIN_USER')) &&
      typeof session.expiresAt === 'number' &&
      session.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: SESSION_DURATION_SECONDS,
};
