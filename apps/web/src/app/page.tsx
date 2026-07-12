'use client';

import Link from 'next/link';
import { useFetch } from '@/lib/hooks';
import { PageHeader, Loading, ErrorBanner } from '@/components/ui';
import { roleZh, formatDateTime } from '@/lib/labels';
import { MEMBER_ROLE_ORDER, MemberRole } from '@tog/shared';

type Member = { id: string; role: string; status: string };
type Event = { id: string; title: string; starts_at: string; event_type: string };
type DonationSummary = { total: number; byFund: Record<string, number> };

export default function DashboardPage() {
  const members = useFetch<Member[]>('/members');
  const events = useFetch<Event[]>('/events');
  const donations = useFetch<DonationSummary>('/donations/summary');

  const loading = members.loading || events.loading || donations.loading;
  const error = members.error || events.error || donations.error;

  const memberList = members.data ?? [];
  const byRole = MEMBER_ROLE_ORDER.map((role) => ({
    role,
    count: memberList.filter((m) => m.role === role).length,
  }));
  const activeCount = memberList.filter((m) => m.status === 'active').length;

  const upcoming = (events.data ?? [])
    .filter((e) => new Date(e.starts_at) >= new Date())
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="A snapshot of your church community"
      />
      <ErrorBanner message={error} />
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="grid cols-4" style={{ marginBottom: 18 }}>
            <div className="stat">
              <div className="label">Total Members</div>
              <div className="value">{memberList.length}</div>
            </div>
            <div className="stat">
              <div className="label">Active</div>
              <div className="value">{activeCount}</div>
            </div>
            <div className="stat">
              <div className="label">Upcoming Events</div>
              <div className="value">{upcoming.length}</div>
            </div>
            <div className="stat">
              <div className="label">Total Giving</div>
              <div className="value">
                {donations.data?.total?.toLocaleString() ?? 0}
              </div>
            </div>
          </div>

          <div className="grid cols-2">
            <div className="card">
              <h3>Members by Role</h3>
              <div className="table-wrap">
                <table>
                  <tbody>
                    {byRole.map(({ role, count }) => (
                      <tr key={role}>
                        <td>{roleZh(role as MemberRole)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="flex-between" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Upcoming Events</h3>
                <Link className="btn ghost sm" href="/events">
                  View all →
                </Link>
              </div>
              {upcoming.length === 0 ? (
                <p className="muted">No upcoming events.</p>
              ) : (
                upcoming.map((e) => (
                  <Link
                    key={e.id}
                    href={`/events/${e.id}`}
                    className="flex-between"
                    style={{
                      padding: '9px 0',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{e.title}</span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {formatDateTime(e.starts_at)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
