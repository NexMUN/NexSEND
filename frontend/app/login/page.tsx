'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const setup = await api.setupStatus();
        if (!setup.setupComplete) {
          router.replace('/setup');
          return;
        }
        const session = await api.session();
        if (session.authenticated) {
          router.replace('/dashboard');
        }
      } catch (err) {
        if (err instanceof Error) {
          const message = err.message.toLowerCase();
          // Unauthenticated session is expected on login page; only show connectivity errors.
          if (
            message.includes('admin session missing') ||
            message.includes('unauthorized') ||
            message.includes('request failed (401)')
          ) {
            return;
          }
        }
        setError('Cannot connect to NextSend Backend. Ensure it is running.');
      }
    })();
  }, [router]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell page-animate min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="surface hidden rounded-[var(--radius)] p-8 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-4">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--secondary)] px-4 py-1.5 text-xs font-bold tracking-[0.1em] text-[var(--secondary-foreground)] uppercase shadow-sm">
              <Send className="h-3.5 w-3.5" />
              NexSend
            </p>
            <h1 className="text-4xl sm:text-5xl font-medium tracking-tight mt-6">The elegant control plane for your emails.</h1>
            <p className="max-w-lg text-lg text-[var(--muted)] mt-2">
              A premium, streamlined studio to secure domains, manage service keys, and keep every outbound channel perfectly orchestrated.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background-elevated)] p-4">
              <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)] uppercase">Domain trust</p>
              <p className="mt-2 text-sm">Protect reputation with structured DNS verification flows.</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background-elevated)] p-4">
              <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)] uppercase">Access control</p>
              <p className="mt-2 text-sm">Issue service keys with explicit lifecycle controls.</p>
            </div>
          </div>
        </section>

        <section className="grid place-items-center">
          <Card className="w-full max-w-md glass-card border-t border-[var(--primary)]/30 backdrop-blur-xl shadow-[var(--shadow-strong)]">
            <CardHeader className="space-y-3 pb-6 border-b border-[var(--border)]/50">
              <div className="flex justify-center mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white shadow-md ring-1 ring-[var(--primary)]/20 shadow-[color:var(--primary)]/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>
              <CardTitle className="text-center text-2xl font-bold">Sign in to NexSend</CardTitle>
              <p className="text-center text-sm text-[var(--muted)]">Enter the administrator credentials created during setup.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                {error && <p className="rounded-xl border border-[color:var(--danger)]/40 bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p>}
                <Button type="submit" className="w-full h-11 text-base font-medium shadow-md transition-all hover:translate-y-[-1px] hover:shadow-lg" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
              <div className="mt-8 text-center border-t border-[var(--border)] pt-6">
                <p className="text-sm text-[var(--muted)]">
                  Need first-time setup?{' '}
                  <Link href="/setup" className="font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors hover:underline underline-offset-4">
                    Create admin account
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
