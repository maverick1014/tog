'use client';

import { useParams, useRouter } from 'next/navigation';
import { useFetch } from '@/lib/hooks';
import { usePageChrome } from '@/components/AppShell';
import { Avatar, ErrorBanner, Loading, ProgressBar, RoleBadge } from '@/components/ui';
import { EnrollmentRow, MemberRow, PairRow } from '@/lib/types';
import {
  categoryBadgeClass,
  ENROLLMENT_STATUS_LABELS,
  enrollmentStatusClass,
  formatDate,
  GENDER_LABELS,
  memberRoleZh,
  memberStatusLabel,
} from '@/lib/labels';

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const member = useFetch<MemberRow>(`/members/${id}`);
  const record = useFetch<EnrollmentRow[]>(`/members/${id}/trainings`);
  const allPairs = useFetch<PairRow[]>('/discipleship/pairs');

  usePageChrome({ title: '成员详情', subtitle: '档案 · 个人培训记录 · 门训对子' }, [id]);

  if (member.loading) return <Loading />;
  if (member.error || !member.data) return <ErrorBanner message={member.error ?? '找不到成员'} />;

  const m = member.data;
  const role = memberRoleZh(m);
  const records = record.data ?? [];
  const pairs = (allPairs.data ?? []).filter(
    (p) => p.mentor_id === m.id || p.trainee_id === m.id,
  );

  const facts = [
    { k: '邮箱', v: m.email ?? '—' },
    { k: '电话', v: m.phone ?? '—' },
    { k: '性别', v: m.gender ? GENDER_LABELS[m.gender] ?? '—' : '—' },
    { k: '所属小组', v: m.group?.name ?? '未分组' },
    { k: '状态', v: memberStatusLabel(m.status) },
    { k: '加入日期', v: formatDate(m.joined_at) },
    { k: '生日', v: formatDate(m.date_of_birth) },
    { k: '家庭', v: m.household?.name ?? '—' },
  ];

  return (
    <>
      <button className="back-btn" onClick={() => router.push('/members')}>
        ← 返回成员目录
      </button>

      <div className="card">
        <div className="flex-between flex-wrap">
          <div className="flex items-center gap-12">
            <Avatar name={m.full_name} size="lg" />
            <div>
              <div className="flex items-center gap-10 flex-wrap">
                <h2 style={{ margin: 0, fontSize: 22 }} className="serif">{m.full_name}</h2>
                <RoleBadge role={role} />
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                {m.chinese_name ? `${m.chinese_name} · ` : ''}
                {m.group?.name ?? '未分组'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid g4" style={{ marginTop: 18 }}>
          {facts.map((f) => (
            <div key={f.k} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
              <div className="muted" style={{ fontSize: 11.5 }}>{f.k}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>{f.v}</div>
            </div>
          ))}
        </div>

        <div className="section-label" style={{ margin: '24px 0 12px' }}>个人培训档案</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>课程</th>
                <th>类别</th>
                <th>状态</th>
                <th style={{ width: 200 }}>进度</th>
                <th>完成日期</th>
              </tr>
            </thead>
            <tbody>
              {records.map((t) => (
                <tr key={t.id}>
                  <td><strong>{t.training?.name ?? '—'}</strong></td>
                  <td>
                    <span className={`badge ${categoryBadgeClass(t.training?.category ?? null)}`}>
                      {t.training?.category ?? '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${enrollmentStatusClass(t.status)}`}>
                      {ENROLLMENT_STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </td>
                  <td><ProgressBar percent={t.progress} /></td>
                  <td className="muted tnum">{formatDate(t.completed_at)}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="faint" style={{ textAlign: 'center', padding: 24 }}>
                    尚无培训记录。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="section-label" style={{ margin: '24px 0 12px' }}>门训对子</div>
        {pairs.length === 0 ? (
          <div className="faint" style={{ fontSize: 13 }}>尚未参与四十天守望。</div>
        ) : (
          pairs.map((p) => {
            const asMentor = p.mentor_id === m.id;
            const other = asMentor ? p.trainee?.full_name : p.mentor?.full_name;
            return (
              <div
                key={p.id}
                className="flex items-center gap-12 flex-wrap"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 8, cursor: 'pointer' }}
                onClick={() => router.push(`/discipleship/pairs/${p.id}`)}
              >
                <span className="badge b-brand">{asMentor ? '带领者' : '被带领'}</span>
                <strong>{other}</strong>
                <div className="grow" />
                <span className="badge b-warn">查看进度 →</span>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
