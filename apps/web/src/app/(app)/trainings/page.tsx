'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useFetch } from '@/lib/hooks';
import { api } from '@/lib/api';
import { usePageChrome, useMe } from '@/components/AppShell';
import { ErrorBanner, Loading, useConfirm, useToast } from '@/components/ui';
import { TrainingModal } from '@/components/TrainingModal';
import { can } from '@/lib/perms';
import { MemberRow, TrainingRow } from '@/lib/types';
import { categoryBadgeClass, formatDate } from '@/lib/labels';

export default function TrainingsPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const perms = can(useMe().role);
  const trainings = useFetch<TrainingRow[]>('/trainings');
  const members = useFetch<MemberRow[]>('/members');
  const [addOpen, setAddOpen] = useState(false);

  usePageChrome(
    {
      title: '培训课程',
      subtitle: '课程目录 · 报名审核 · 核对名单',
      action: perms.write ? (
        <button className="btn" onClick={() => setAddOpen(true)}>
          ＋ 新增课程
        </button>
      ) : undefined,
    },
    [perms.write],
  );

  const now = new Date();
  const list = trainings.data ?? [];
  const { active, ended } = useMemo(() => {
    const a: TrainingRow[] = [];
    const e: TrainingRow[] = [];
    for (const t of list) {
      const isEnded = t.ends_on && new Date(t.ends_on) < now;
      if (isEnded || !t.is_enrollable) e.push(t);
      else a.push(t);
    }
    return { active: a, ended: e };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  const del = async (t: TrainingRow) => {
    const ok = await confirm({
      title: '删除课程',
      message: `删除「${t.name}」？报名与名单记录将一并移除。`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    await api.delete(`/trainings/${t.id}`);
    trainings.reload();
    toast('已删除课程');
  };

  const renderCards = (items: TrainingRow[], faded?: boolean) => (
    <div className="grid g3">
      {items.map((t) => (
        <div className="card" key={t.id} style={{ display: 'flex', flexDirection: 'column', opacity: faded ? 0.86 : 1 }}>
          <div className="flex-between">
            <span className={`badge ${categoryBadgeClass(t.category)}`}>{t.category ?? '课程'}</span>
            <span className={`badge ${t.is_enrollable ? 'b-good' : 'b-gray'}`}>
              {t.is_enrollable ? '开放报名' : '已截止'}
            </span>
          </div>
          <h3 style={{ margin: '12px 0 2px', fontSize: 16, cursor: 'pointer' }} className="serif" onClick={() => router.push(`/trainings/${t.id}`)}>
            {t.name}
          </h3>
          <div className="muted" style={{ fontSize: 12.5 }}>
            讲师：{t.trainer?.full_name ?? '待定'} · {t.total_sessions} 场次
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            {formatDate(t.starts_on)} 至 {formatDate(t.ends_on)}
          </div>
          <div className="grow" />
          <div className="flex gap-8 mt-14">
            <button className="btn sm grow" onClick={() => router.push(`/trainings/${t.id}`)}>名单</button>
            {perms.write && <button className="btn ghost sm" onClick={() => router.push(`/trainings/${t.id}`)}>编辑</button>}
            {perms.delete && <button className="btn ghost sm" style={{ color: 'var(--crit)' }} onClick={() => del(t)}>删除</button>}
          </div>
        </div>
      ))}
    </div>
  );

  if (trainings.initialLoading) return <Loading />;

  return (
    <>
      <ErrorBanner message={trainings.error} />

      <div className="section-label mb-14">
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--good)', display: 'inline-block' }} />
        进行中课程 <span className="faint" style={{ fontWeight: 400 }}>· 开放报名</span>
      </div>
      {active.length ? renderCards(active) : <div className="empty">暂无进行中的课程 · 点右上角「＋ 新增课程」开设</div>}

      <div className="section-label" style={{ margin: '28px 0 14px' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--faint)', display: 'inline-block' }} />
        已结束 / 已截止 <span className="faint" style={{ fontWeight: 400 }}>· 已完成的课程</span>
      </div>
      {ended.length ? renderCards(ended, true) : <div className="empty">暂无已结束的课程</div>}

      {addOpen && (
        <TrainingModal
          members={members.data ?? []}
          onClose={() => setAddOpen(false)}
          onSaved={(id) => {
            setAddOpen(false);
            trainings.reload();
            toast('已新增课程');
            router.push(`/trainings/${id}`);
          }}
        />
      )}
    </>
  );
}

