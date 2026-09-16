import { NextResponse } from 'next/server';

import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  validateCredentials,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as {
      username?: unknown;
      password?: unknown;
    };
    const username = typeof input.username === 'string' ? input.username : '';
    const password = typeof input.password === 'string' ? input.password : '';

    if (!validateCredentials(username, password)) {
      return NextResponse.json(
        { error: 'The user ID or password is incorrect.' },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken(username),
      sessionCookieOptions,
    );
    return response;
  } catch (error) {
    console.error('Login failed', error);
    return NextResponse.json(
      { error: 'Login is temporarily unavailable.' },
      { status: 503 },
    );
  }
}
