'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ToastProvider } from './ui';
import { GlobeMark } from './GlobeMark';
import { initialOf } from '@/lib/labels';
import { ACCOUNT_ROLE_LABELS, AccountRole } from '@tog/shared';

type Me = { name: string; role: string; member: string | null };

/* -------------------------------------------------------------------------
 * Page chrome context — pages set the topbar title / subtitle / action.
 * ---------------------------------------------------------------------- */
type Chrome = { title: string; subtitle?: string; action?: ReactNode };
const ChromeContext = createContext<(c: Chrome) => void>(() => {});

export function usePageChrome(chrome: Chrome, deps: unknown[] = []) {
  const set = useContext(ChromeContext);
  useEffect(() => {
    set(chrome);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* -------------------------------------------------------------------------
 * Navigation model
 * ---------------------------------------------------------------------- */
const NAV: {
  section: string;
  items: { href: string; label: string; icon: string }[];
}[] = [
  {
    section: '概览',
    items: [{ href: '/', label: '仪表盘', icon: '◎' }],
  },
  {
    section: '牧养',
    items: [
      { href: '/members', label: '成员目录', icon: '👥' },
      { href: '/groups', label: '小组管理', icon: '🔗' },
      { href: '/events', label: '聚会与出席', icon: '📅' },
      { href: '/donations', label: '奉献管理', icon: '🕊' },
    ],
  },
  {
    section: '造就',
    items: [
      { href: '/trainings', label: '培训课程', icon: '📖' },
      { href: '/discipleship', label: '四十天守望', icon: '✝' },
    ],
  },
  {
    section: '系统',
    items: [{ href: '/settings', label: '用户管理', icon: '⚙' }],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [chrome, setChrome] = useState<Chrome>({ title: '仪表盘' });
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // Require a valid session — otherwise send the user to the login page.
  useEffect(() => {
    let alive = true;
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((u) => {
        if (alive) setMe(u);
      })
      .catch(() => {
        window.location.href = '/login';
      });
    return () => {
      alive = false;
    };
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  if (!me) {
    return (
      <div className="loading" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        加载中…
      </div>
    );
  }

  return (
    <ToastProvider>
      <ChromeContext.Provider value={setChrome}>
        <div className={`app-shell ${navOpen ? 'nav-open' : ''}`}>
          <aside className="sidebar">
            <div className="brand-head">
              <div className="brand-mark">
                <GlobeMark size={24} />
              </div>
              <div className="brand-name">
                主恩堂
                <small>
                  TABERNACLE OF GRACE
                </small>
              </div>
            </div>

            {NAV.map((group) => (
              <div key={group.section}>
                <div className="nav-section">{group.section}</div>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link ${isActive(item.href) ? 'active' : ''}`}
                  >
                    <span className="ico">{item.icon}</span> {item.label}
                  </Link>
                ))}
              </div>
            ))}

            <div className="grow" />
            <div className="nav-user" onClick={logout} title="退出登录" style={{ cursor: 'pointer' }}>
              <div className="avatar">{initialOf(me.name)}</div>
              <div className="who">
                {me.name}
                <small>{ACCOUNT_ROLE_LABELS[me.role as AccountRole] ?? me.role} · 退出登录</small>
              </div>
            </div>
          </aside>

          <div className="scrim" onClick={() => setNavOpen(false)} />

          <div className="main">
            <div className="topbar">
              <div className="flex items-center gap-12" style={{ minWidth: 0 }}>
                <button
                  className="hamburger"
                  onClick={() => setNavOpen((o) => !o)}
                  aria-label="菜单"
                >
                  ☰
                </button>
                <div>
                  <h1>{chrome.title}</h1>
                  {chrome.subtitle && <div className="sub">{chrome.subtitle}</div>}
                </div>
              </div>
              <div className="flex items-center gap-10">
                {chrome.action}
              </div>
            </div>

            <div className="content view-anim" key={pathname}>
              {children}
            </div>
          </div>
        </div>
      </ChromeContext.Provider>
    </ToastProvider>
  );
}
