'use client';

import { useParams, useRouter } from 'next/navigation';
import { useFetch } from '@/lib/hooks';
import { usePageChrome } from '@/components/AppShell';
import { ErrorBanner, Loading, useToast } from '@/components/ui';
import { PairDetail, PairRow } from '@/lib/types';
import { memberRoleZh, PAIR_STATUS_LABELS, pairStatusClass } from '@/lib/labels';

export default function PairDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const pair = useFetch<PairDetail>(`/discipleship/pairs/${id}`);
  const allPairs = useFetch<PairRow[]>('/discipleship/pairs');

  usePageChrome({ title: '对子进度', subtitle: '四十天一对一守望 · 40 天守望格与培育谱系' }, [id]);

  if (pair.loading) return <Loading />;
  if (pair.error || !pair.data) return <ErrorBanner message={pair.error ?? '找不到对子'} />;

  const p = pair.data;
  const total = p.program?.total_days ?? 40;
  const doneDays = new Set(p.progress.filter((r) => r.completed).map((r) => r.day_number));
  const done = doneDays.size;
  const pct = Math.round((done / total) * 100);

  // Walk the lineage up to the root.
  const byId = new Map((allPairs.data ?? []).map((x) => [x.id, x]));
  const lineage: PairRow[] = [];
  let cur: PairRow | undefined = allPairs.data?.find((x) => x.id === p.id);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    lineage.unshift(cur);
    cur = cur.parent_pair_id ? byId.get(cur.parent_pair_id) : undefined;
  }

  const link = typeof window !== 'undefined' ? `${window.location.origin}/d/${p.form_token}` : '';

  const copy = () => {
    navigator.clipboard?.writeText(link).then(() => toast('链接已复制'), () => toast(link));
  };

  return (
    <>
      <button className="back-btn" onClick={() => router.push('/discipleship')}>← 返回四十天守望</button>

      <div className="card">
        <div className="flex-between flex-wrap">
          <div className="flex items-center gap-10 flex-wrap">
            <span className="badge b-brand">带领者</span>
            <strong className="serif" style={{ fontSize: 18 }}>{p.mentor?.full_name}</strong>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>➜</span>
            <span className="badge b-accent">被带领</span>
            <strong className="serif" style={{ fontSize: 18 }}>{p.trainee?.full_name}</strong>
          </div>
          <span className={`badge ${pairStatusClass(p.status)}`}>{PAIR_STATUS_LABELS[p.status] ?? p.status}</span>
        </div>

        <div className="progress-row mt-16">
          <div className="bar"><span style={{ width: `${pct}%` }} /></div>
          <span className="pct">{pct}%</span>
        </div>
        <div className="muted" style={{ fontSize: 13, margin: '16px 0 8px' }}>40 天守望格 · 已完成 {done} / {total} 天</div>
        <div className="day-grid" style={{ maxWidth: 560 }}>
          {Array.from({ length: total }, (_, i) => (
            <div key={i} className={`day-cell ${doneDays.has(i + 1) ? 'done' : ''}`}>{i + 1}</div>
          ))}
        </div>

        <div className="field mt-16">
          <label className="field-label">带领者专属填写链接</label>
          <input readOnly value={link} style={{ background: 'var(--surface-2)', color: 'var(--muted)' }} />
        </div>
        <div className="flex gap-8">
          <button className="btn" onClick={copy}>复制链接</button>
          <button className="btn accent" onClick={() => window.open(`/d/${p.form_token}`, '_blank')}>打开表单</button>
        </div>
      </div>

      <div className="card mt-16">
        <div className="card-head"><h3>培育谱系 · 接棒链</h3></div>
        <div className="flex items-center gap-8 flex-wrap">
          {lineage.map((x, i) => (
            <div key={x.id} className="flex items-center gap-8">
              {i === 0 && <span className="badge b-brand">{x.mentor?.full_name}</span>}
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>➜</span>
              <span
                className={`badge ${x.id === p.id ? 'b-accent' : 'b-gray'}`}
                style={{ cursor: 'pointer' }}
                onClick={() => router.push(`/discipleship/pairs/${x.id}`)}
              >
                {x.trainee?.full_name}
              </span>
            </div>
          ))}
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          第 {lineage.length} 棒 · {p.trainee ? memberRoleZh(p.trainee) : ''}
        </div>
      </div>
    </>
  );
}
