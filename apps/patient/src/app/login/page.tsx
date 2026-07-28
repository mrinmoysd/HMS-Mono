'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeartPulse, Loader2 } from 'lucide-react';
import { portalRegisterSchema, loginSchema } from '@smart-hospital/shared';
import { login, register, ApiRequestError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let res;
      if (mode === 'login') {
        const parsed = loginSchema.safeParse({ username: f.username, password: f.password });
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
        res = await login(f.username, f.password);
      } else {
        const parsed = portalRegisterSchema.safeParse({
          name: f.name, username: f.username, password: f.password, phone: f.phone, email: f.email, age: f.age, gender: f.gender || undefined,
        });
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
        res = await register(parsed.data);
      }
      setSession(res.user, res.tokens.accessToken, res.tokens.refreshToken);
      router.replace('/home');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  const input = 'w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-fg"><HeartPulse className="h-7 w-7" /></div>
          <h1 className="text-lg font-semibold">Smart Hospital</h1>
          <p className="text-sm text-fg-muted">Patient Portal</p>
        </div>

        <div className="mb-4 flex rounded-lg bg-bg p-1 text-sm">
          {(['login', 'register'] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(null); }}
              className={`flex-1 rounded-md py-1.5 font-medium capitalize transition ${mode === m ? 'bg-surface text-primary shadow-sm' : 'text-fg-muted'}`}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && <input placeholder="Full name" value={f.name ?? ''} onChange={(e) => set('name', e.target.value)} className={input} />}
          <input placeholder="Username" value={f.username ?? ''} onChange={(e) => set('username', e.target.value)} autoComplete="username" className={input} />
          <input type="password" placeholder="Password" value={f.password ?? ''} onChange={(e) => set('password', e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className={input} />
          {mode === 'register' && (
            <>
              <div className="flex gap-3">
                <input placeholder="Age (yy-mm-dd)" value={f.age ?? ''} onChange={(e) => set('age', e.target.value)} className={input} />
                <select value={f.gender ?? ''} onChange={(e) => set('gender', e.target.value)} className={input}>
                  <option value="">Gender</option><option value="male">male</option><option value="female">female</option><option value="other">other</option>
                </select>
              </div>
              <input placeholder="Phone" value={f.phone ?? ''} onChange={(e) => set('phone', e.target.value)} className={input} />
            </>
          )}
          {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-fg transition hover:opacity-90 disabled:opacity-60">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </main>
  );
}
