'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LockKeyhole, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function login(event: { preventDefault: () => void }) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Login failed.');
      router.replace('/');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#080a10] px-5 py-10 text-[#f5ead0]">
      <div className="ambient-light" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#c9b98f] transition hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to leaderboard
        </Link>
        <section className="rounded-[1.75rem] border border-[#d5b765]/25 bg-[#11131d]/95 p-7 shadow-2xl shadow-black/40 sm:p-9">
          <div className="mb-7 flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-full border border-[#d5b765]/40 bg-[#d5b765]/10 text-[#f1d788]">
              <Trophy className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c9b98f]">
                LIBA House Cup
              </p>
              <h1 className="font-display text-3xl text-[#fff7e6]">Admin login</h1>
            </div>
          </div>
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#d5b765]/15 bg-black/20 p-4 text-sm leading-6 text-[#bdb49e]">
            <LockKeyhole className="mt-1 size-4 shrink-0 text-[#d9bd65]" aria-hidden="true" />
            <p>Sign in to award, deduct, or undo house points. Standings remain public.</p>
          </div>
          <form onSubmit={login} className="grid gap-5">
            <label htmlFor="admin-username" className="grid gap-2 text-sm font-semibold text-[#ddd2b9]">
              User ID
              <Input
                id="admin-username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                className="h-11 border-[#d5b765]/25 bg-black/20 px-4 text-[#fff7e6]"
              />
            </label>
            <label htmlFor="admin-password" className="grid gap-2 text-sm font-semibold text-[#ddd2b9]">
              Password
              <Input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="h-11 border-[#d5b765]/25 bg-black/20 px-4 text-[#fff7e6]"
              />
            </label>
            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="h-12 bg-[#d9bd65] text-base font-bold text-[#171208] hover:bg-[#f0d87f]"
            >
              <LockKeyhole className="size-4" aria-hidden="true" />
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
            <p className="min-h-5 text-sm text-[#efaaaa]" aria-live="polite">
              {message}
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
