'use client';

import { useFetch } from '@/lib/hooks';
import { PairDetail, PairRow } from '@/lib/types';
import { memberRoleZh, PAIR_STATUS_LABELS, pairStatusClass } from '@/lib/labels';
import { ErrorBanner, Loading, Modal, useToast } from './ui';

/**
 * Self-contained 40-day progress dialog for a discipleship pair. Fetches the
 * pair detail (and the pair list for the 培育谱系 lineage) so any page can open
 * it with just a pairId — no shared page navigation required.
 */
export function PairProgressModal({
  pairId,
  onClose,
}: {
  pairId: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const pair = useFetch<PairDetail>(`/discipleship/pairs/${pairId}`);
  const allPairs = useFetch<PairRow[]>('/discipleship/pairs');

  const p = pair.data;
  const total = p?.program?.total_days ?? 40;
  const doneDays = new Set((p?.progress ?? []).filter((r) => r.completed).map((r) => r.day_number));
  const done = doneDays.size;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const link = p && typeof window !== 'undefined' ? `${window.location.origin}/d/${p.form_token}` : '';
  const copy = () =>
    navigator.clipboard?.writeText(link).then(() => toast('链接已复制'), () => toast(link));

  // Walk the lineage up to the root of the relay chain.
  const byId = new Map((allPairs.data ?? []).map((x) => [x.id, x]));
  const lineage: PairRow[] = [];
  let cur: PairRow | undefined = allPairs.data?.find((x) => x.id === pairId);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    lineage.unshift(cur);
    cur = cur.parent_pair_id ? byId.get(cur.parent_pair_id) : undefined;
  }

  return (
    <Modal onClose={onClose} size="wide">
      {pair.loading || !p ? (
        pair.error ? <ErrorBanner message={pair.error} /> : <div style={{ padding: 24 }}><Loading /></div>
      ) : (
        <>
          <div className="flex-between flex-wrap" style={{ alignItems: 'flex-start' }}>
            <div className="flex items-center gap-8 flex-wrap">
              <span className="badge b-brand">带领者</span>
              <strong className="serif" style={{ fontSize: 17 }}>{p.mentor?.full_name}</strong>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>➜</span>
              <span className="badge b-accent">被带领</span>
              <strong className="serif" style={{ fontSize: 17 }}>{p.trainee?.full_name}</strong>
            </div>
            <button className="icon-btn" onClick={onClose} title="关闭">✕</button>
          </div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
            四十天一对一守望 · {p.trainee ? memberRoleZh(p.trainee) : ''}
            <span className={`badge ${pairStatusClass(p.status)}`} style={{ marginLeft: 8 }}>
              {PAIR_STATUS_LABELS[p.status] ?? p.status}
            </span>
          </div>

          <div className="progress-row mt-14">
            <div className="bar"><span style={{ width: `${pct}%` }} /></div>
            <span className="pct">{pct}%</span>
          </div>
          <div className="muted" style={{ fontSize: 13, margin: '16px 0 8px' }}>
            40 天守望格 · 已完成 {done} / {total} 天
          </div>
          <div className="day-grid">
            {Array.from({ length: total }, (_, i) => (
              <div key={i} className={`day-cell ${doneDays.has(i + 1) ? 'done' : ''}`}>{i + 1}</div>
            ))}
          </div>

          {lineage.length > 1 && (
            <div style={{ marginTop: 18 }}>
              <div className="section-label" style={{ marginBottom: 8 }}>培育谱系 · 接棒链</div>
              <div className="flex items-center gap-8 flex-wrap">
                {lineage.map((x, i) => (
                  <div key={x.id} className="flex items-center gap-8">
                    {i === 0 && <span className="badge b-brand">{x.mentor?.full_name}</span>}
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>➜</span>
                    <span className={`badge ${x.id === pairId ? 'b-accent' : 'b-gray'}`}>
                      {x.trainee?.full_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="field mt-16">
            <label className="field-label">带领者专属填写链接</label>
            <input readOnly value={link} style={{ background: 'var(--surface-2)', color: 'var(--muted)' }} />
          </div>
          <div className="flex gap-8">
            <button className="btn grow" onClick={copy}>复制链接</button>
            <button className="btn accent grow" onClick={() => window.open(`/d/${p.form_token}`, '_blank')}>
              打开表单
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
