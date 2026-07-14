'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlobeMark } from '@/components/GlobeMark';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.message ?? '登录失败');
      }
      router.push('/');
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--paper)',
        padding: 20,
      }}
    >
      <form
        onSubmit={submit}
        className="card"
        style={{ width: '100%', maxWidth: 380, padding: 26 }}
      >
        <div className="flex items-center gap-10" style={{ marginBottom: 6 }}>
          <span
            style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--brand)', display: 'grid', placeItems: 'center', flexShrink: 0 }}
          >
            <GlobeMark size={24} />
          </span>
          <div className="serif" style={{ fontSize: 19, fontWeight: 600 }}>
            主恩堂
            <div className="muted" style={{ fontSize: 11, fontWeight: 500, letterSpacing: 1 }}>
              教会管理系统
            </div>
          </div>
        </div>
        <h2 className="serif" style={{ fontSize: 18, margin: '14px 0 4px' }}>登录</h2>
        <p className="muted" style={{ fontSize: 12.5, margin: '0 0 16px' }}>
          请使用管理员分配的账户登录。
        </p>

        {err && <div className="error-banner">⚠️ {err}</div>}

        <div className="field">
          <label className="field-label">登录邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@grace.org"
            autoComplete="username"
            required
          />
        </div>
        <div className="field">
          <label className="field-label">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>
        <button className="btn block" type="submit" disabled={busy} style={{ marginTop: 6 }}>
          {busy ? '登录中…' : '登录'}
        </button>
      </form>
    </div>
  );
}
