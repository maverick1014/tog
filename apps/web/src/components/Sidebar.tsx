'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { section: 'Overview', items: [{ href: '/', label: '🏠 Dashboard' }] },
  {
    section: 'People',
    items: [
      { href: '/members', label: '👥 Members' },
      { href: '/groups', label: '🔗 Groups' },
    ],
  },
  {
    section: 'Gatherings',
    items: [
      { href: '/events', label: '📅 Events & Attendance' },
      { href: '/donations', label: '💝 Donations' },
    ],
  },
  {
    section: 'Growth',
    items: [
      { href: '/trainings', label: '📚 Trainings' },
      { href: '/discipleship', label: '🕊️ 四十天守望' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside className="sidebar">
      <div className="brand">
        TOG
        <small>Church Management</small>
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
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  );
}
