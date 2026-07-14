'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useFetch } from '@/lib/hooks';
import { usePageChrome } from '@/components/AppShell';
import { Card, ErrorBanner, Loading } from '@/components/ui';
import {
  DonationRow,
  EventRow,
  MemberRow,
  OverviewRow,
  ProgramRow,
} from '@/lib/types';
import {
  formatDateTime,
  formatMoneyShort,
  memberRoleZh,
  roleDot,
  ROLE_ORDER,
} from '@/lib/labels';
import { MemberStatus } from '@tog/shared';

function buildSparkline(donations: DonationRow[]) {
  // Sum donations into 8 weekly buckets ending this week.
  const now = new Date();
  const weekMs = 7 * 24 * 3600 * 1000;
  const buckets = new Array(8).fill(0);
  for (const d of donations) {
    const t = new Date(d.donated_at).getTime();
    if (Number.isNaN(t)) continue;
    const weeksAgo = Math.floor((now.getTime() - t) / weekMs);
    if (weeksAgo >= 0 && weeksAgo < 8) buckets[7 - weeksAgo] += Number(d.amount);
  }
  const max = Math.max(1, ...buckets);
  const pts = buckets.map((v, i) => {
    const x = 6 + (i * (294 - 6)) / 7;
    const y = 84 - (v / max) * 68;
    return [x, y];
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L294 84 L6 84 Z`;
  return { line, area, last: pts[pts.length - 1], hasData: buckets.some((b) => b > 0) };
}

export default function DashboardPage() {
  usePageChrome({ title: '仪表盘', subtitle: '主恩堂教会 · 牧养全貌一览' });

  const members = useFetch<MemberRow[]>('/members');
  const events = useFetch<EventRow[]>('/events');
  const donations = useFetch<DonationRow[]>('/donations');
  const programs = useFetch<ProgramRow[]>('/discipleship/programs');
  const firstProgram = programs.data?.[0]?.id;
  const overview = useFetch<OverviewRow[]>(
    firstProgram ? `/discipleship/programs/${firstProgram}/overview` : null,
  );

  const loading = members.loading || events.loading || donations.loading;
  const error = members.error || events.error || donations.error;

  const memberList = members.data ?? [];
  const donationList = donations.data ?? [];
  const overviewList = overview.data ?? [];

  const activeCount = memberList.filter((m) => m.status === MemberStatus.Active).length;

  const upcoming = useMemo(
    () =>
      (events.data ?? [])
        .filter((e) => new Date(e.starts_at) >= new Date())
        .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)),
    [events.data],
  );

  const thisMonthTotal = useMemo(() => {
    const now = new Date();
    return donationList
      .filter((d) => {
        const t = new Date(d.donated_at);
        return t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth();
      })
      .reduce((s, d) => s + Number(d.amount), 0);
  }, [donationList]);

  const activePairs = overviewList.filter((o) => Number(o.percent_complete) < 100).length;

  const roleChart = useMemo(() => {
    const counts: Record<string, number> = {};
    ROLE_ORDER.forEach((r) => (counts[r] = 0));
    for (const m of memberList) {
      const r = memberRoleZh(m);
      if (counts[r] != null) counts[r]++;
    }
    const max = Math.max(1, ...Object.values(counts));
    return ROLE_ORDER.map((r) => ({
      label: r,
      count: counts[r],
      width: `${(counts[r] / max) * 100}%`,
      color: roleDot(r),
    }));
  }, [memberList]);

  const spark = useMemo(() => buildSparkline(donationList), [donationList]);

  const discFocus = useMemo(
    () =>
      [...overviewList]
        .sort((a, b) => Number(a.percent_complete) - Number(b.percent_complete))
        .slice(0, 5),
    [overviewList],
  );

  const kpis = [
    { label: '成员总数', value: memberList.length, unit: '', suffix: ' 位' },
    { label: '在册成员', value: activeCount, unit: '', suffix: ' 位' },
    { label: '即将聚会', value: upcoming.length, unit: '', suffix: ' 场' },
    { label: '本月奉献', value: formatMoneyShort(thisMonthTotal), unit: 'RM ', suffix: '' },
    { label: '门训进行中', value: activePairs, unit: '', suffix: ' 对' },
  ];

  if (loading) return <Loading />;

  return (
    <>
      <ErrorBanner message={error} />

      <div className="grid g4">
        {kpis.map((k) => (
          <div className="stat" key={k.label}>
            <div className="label">{k.label}</div>
            <div className="value">
              {k.unit && <span className="unit">{k.unit}</span>}
              {k.value}
              {k.suffix && <span className="unit">{k.suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid g2-wide mt-16">
        <Card
          title="成员身份分布"
          right={<span className="muted" style={{ fontSize: 12 }}>共 {memberList.length} 位</span>}
        >
          {roleChart.map((r) => (
            <div
              key={r.label}
              style={{
                display: 'grid',
                gridTemplateColumns: '96px 1fr 34px',
                alignItems: 'center',
                gap: 12,
                padding: '5px 0',
              }}
            >
              <div style={{ fontSize: 12.5 }}>{r.label}</div>
              <div style={{ height: 22, borderRadius: 6, background: 'var(--surface-2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 6, width: r.width, background: r.color }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }} className="tnum">
                {r.count}
              </div>
            </div>
          ))}
        </Card>

        <Card
          title="近八周奉献趋势"
          right={<span className="badge b-good">▲ RM</span>}
        >
          <svg viewBox="0 0 300 96" width="100%" height="104" preserveAspectRatio="none" role="img" aria-label="奉献趋势">
            <defs>
              <linearGradient id="gv" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--brand)" stopOpacity="0.24" />
                <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="6" y1="84" x2="294" y2="84" stroke="var(--border)" strokeWidth="1" />
            {spark.hasData && (
              <>
                <path d={spark.area} fill="url(#gv)" />
                <path d={spark.line} fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={spark.last[0]} cy={spark.last[1]} r="4" fill="var(--brand)" stroke="var(--surface)" strokeWidth="2" />
              </>
            )}
          </svg>
          <div className="flex gap-12 flex-wrap muted" style={{ fontSize: 12, marginTop: 8 }}>
            <span className="flex items-center gap-6">
              <i style={{ width: 12, height: 12, borderRadius: 3, display: 'inline-block', background: 'var(--brand)' }} />
              每周奉献总额（RM）
            </span>
          </div>
        </Card>
      </div>

      <div className="grid g2-wide mt-16">
        <Card
          title="即将到来的聚会"
          right={
            <Link className="muted" href="/events" style={{ fontSize: 12, fontWeight: 600 }}>
              查看全部 →
            </Link>
          }
        >
          {upcoming.length === 0 ? (
            <p className="faint" style={{ fontSize: 13 }}>暂无即将到来的聚会。</p>
          ) : (
            upcoming.slice(0, 4).map((e) => (
              <div key={e.id} className="flex-between" style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                <span className={`badge ${e.event_type === 'service' ? 'b-brand' : 'b-accent'}`}>
                  {e.title}
                </span>
                <div className="grow muted" style={{ fontSize: 13 }}>{formatDateTime(e.starts_at)}</div>
                <span className="muted" style={{ fontSize: 12 }}>{e.location ?? ''}</span>
              </div>
            ))
          )}
        </Card>

        <Card
          title="门训进度关注"
          right={
            <Link className="muted" href="/discipleship" style={{ fontSize: 12, fontWeight: 600 }}>
              牧者总览 →
            </Link>
          }
        >
          {discFocus.length === 0 ? (
            <p className="faint" style={{ fontSize: 13 }}>暂无进行中的门训对子。</p>
          ) : (
            discFocus.map((d) => (
              <div key={d.pair_id} className="flex items-center gap-12" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="grow" style={{ fontSize: 13 }}>
                  {d.trainee_name} <span className="faint">← {d.mentor_name}</span>
                </div>
                <div className="flex items-center gap-10" style={{ width: 150 }}>
                  <div className="bar thin">
                    <span style={{ width: `${d.percent_complete}%` }} />
                  </div>
                  <span className="muted tnum" style={{ fontSize: 12, minWidth: 34 }}>
                    {d.days_completed}/{d.total_days}
                  </span>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </>
  );
}
