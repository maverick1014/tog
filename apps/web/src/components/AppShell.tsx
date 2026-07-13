'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ToastProvider } from './ui';
import { GlobeMark } from './GlobeMark';

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

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const saved = (localStorage.getItem('tog-theme') as 'light' | 'dark') || 'light';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('tog-theme', next);
      return next;
    });
  }, []);
  return { theme, toggle };
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [chrome, setChrome] = useState<Chrome>({ title: '仪表盘' });
  const { theme, toggle } = useTheme();

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

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
            <Link href="/settings" className="nav-user">
              <div className="avatar">约翰</div>
              <div className="who">
                陈约翰
                <small>牧师 · 管理员</small>
              </div>
            </Link>
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
                <button
                  className="icon-btn"
                  onClick={toggle}
                  aria-label="切换主题"
                  title="切换深色 / 浅色"
                >
                  {theme === 'dark' ? '☀' : '☾'}
                </button>
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
