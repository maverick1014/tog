'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useFetch } from '@/lib/hooks';
import { api } from '@/lib/api';
import { usePageChrome } from '@/components/AppShell';
import { ErrorBanner, Field, Loading, Modal, useToast } from '@/components/ui';
import { MemberRow, OverviewRow, PairRow, ProgramRow } from '@/lib/types';
import { memberRoleZh, PAIR_STATUS_LABELS, pairStatusClass, ROLE_DOT } from '@/lib/labels';
import { PairStatus } from '@tog/shared';

type Filter = 'active' | 'done' | 'pending';

interface Node {
  pair: PairRow;
  ov?: OverviewRow;
  depth: number;
  pct: number;
  days: number;
  total: number;
}

export default function DiscipleshipPage() {
  const router = useRouter();
  const toast = useToast();
  const programs = useFetch<ProgramRow[]>('/discipleship/programs');
  const programId = programs.data?.[0]?.id;
  const pairs = useFetch<PairRow[]>('/discipleship/pairs');
  const overview = useFetch<OverviewRow[]>(
    programId ? `/discipleship/programs/${programId}/overview` : null,
  );
  const members = useFetch<MemberRow[]>('/members');

  const [filter, setFilter] = useState<Filter>('active');
  const [popup, setPopup] = useState<Node | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  usePageChrome({
    title: '四十天守望',
    subtitle: '四十天一对一守望 · 世代培育 · 牧者实时总览',
    action: (
      <button className="btn" onClick={() => setAddOpen(true)} disabled={!programId}>
        ＋ 新增对子
      </button>
    ),
  });

  const ovByPair = useMemo(() => {
    const m = new Map<string, OverviewRow>();
    (overview.data ?? []).forEach((o) => m.set(o.pair_id, o));
    return m;
  }, [overview.data]);

  const nodes = useMemo<Node[]>(() => {
    const list = pairs.data ?? [];
    const byId = new Map(list.map((p) => [p.id, p]));
    const depthOf = (p: PairRow): number => {
      let d = 0;
      let cur: PairRow | undefined = p;
      const seen = new Set<string>();
      while (cur?.parent_pair_id && !seen.has(cur.id)) {
        seen.add(cur.id);
        cur = byId.get(cur.parent_pair_id);
        d++;
        if (d > 20) break;
      }
      return d;
    };
    return list.map((p) => {
      const ov = ovByPair.get(p.id);
      const total = ov?.total_days ?? 40;
      const days = ov?.days_completed ?? 0;
      return { pair: p, ov, depth: depthOf(p), pct: Number(ov?.percent_complete ?? 0), days, total };
    });
  }, [pairs.data, ovByPair]);

  const classify = (n: Node): Filter =>
    n.pct >= 100 ? 'done' : n.days > 0 ? 'active' : 'pending';

  const counts = {
    active: nodes.filter((n) => classify(n) === 'active').length,
    done: nodes.filter((n) => classify(n) === 'done').length,
    pending: nodes.filter((n) => classify(n) === 'pending').length,
  };

  const filtered = nodes.filter((n) => classify(n) === filter);
  const maxDepth = Math.max(0, ...filtered.map((n) => n.depth));
  const generations = Array.from({ length: maxDepth + 1 }, (_, d) =>
    filtered.filter((n) => n.depth === d),
  );

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/d/${token}`;
    navigator.clipboard?.writeText(link).then(
      () => toast('链接已复制'),
      () => toast(link),
    );
  };

  if (pairs.loading || programs.loading) return <Loading />;

  if (!programId) {
    return <div className="empty">尚未建立守望计划。请先在数据库中创建 discipleship_programs 记录。</div>;
  }

  return (
    <>
      <ErrorBanner message={pairs.error || overview.error} />

      <div className="hint mb-16">
        ✝ <strong>四十天一对一守望</strong>：牧者先带领小组长，小组长再带领副组长，被带领过的人接续带下一位，直到人人都走过这段旅程。带领者每日填表更新，牧者可<strong>实时掌握全局</strong>。
      </div>

      {/* Cascade / relay chart */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3>培育链 · 接棒图</h3>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>世代培育树 · 出师者自成起点 · <strong style={{ color: 'var(--ink)' }}>点标签筛选状态</strong></div>
          </div>
          <div className="flex gap-6 flex-wrap">
            {(['active', 'done', 'pending'] as Filter[]).map((f) => (
              <button key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
                {f === 'active' ? '在训' : f === 'done' ? '已出师' : '待开始'} {counts[f]}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">目前没有符合条件的对子。点右上角「＋ 新增对子」开始接棒。</div>
        ) : (
          <div className="table-wrap">
            <div className="flex gap-12" style={{ minWidth: 'min-content', alignItems: 'flex-start', paddingBottom: 4 }}>
              {generations.map((gen, d) => (
                <div key={d} style={{ minWidth: 190 }}>
                  <div className="muted" style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 8, letterSpacing: 1 }}>
                    第 {d + 1} 棒
                  </div>
                  <div className="flex" style={{ flexDirection: 'column', gap: 10 }}>
                    {gen.map((n) => {
                      const role = n.pair.trainee ? memberRoleZh(n.pair.trainee) : '';
                      return (
                        <div
                          key={n.pair.id}
                          className="card"
                          style={{ padding: '9px 12px', cursor: 'pointer', boxShadow: 'var(--shadow)' }}
                          onClick={() => setPopup(n)}
                        >
                          <div className="flex-between gap-6">
                            <strong className="serif" style={{ fontSize: 13.5 }}>{n.pair.trainee?.full_name}</strong>
                            <span className="dot" style={{ background: ROLE_DOT[role] ?? 'var(--faint)' }} />
                          </div>
                          <span className="badge b-accent" style={{ fontSize: 10.5, marginTop: 3 }}>{role}</span>
                          <div className="flex items-center gap-6" style={{ marginTop: 7 }}>
                            <div className="bar thin"><span style={{ width: `${n.pct}%` }} /></div>
                            <span className="faint" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{n.days}/{n.total}</span>
                          </div>
                          <div className="faint" style={{ fontSize: 10.5, marginTop: 4 }}>由 {n.pair.mentor?.full_name} 带领</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pastor overview */}
      <div className="card mt-16">
        <div className="card-head">
          <div>
            <h3>牧者总览</h3>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>点「进度」查看 40 天详情 · 点「表单」复制带领者填写链接</div>
          </div>
          <span className="badge b-good">● 实时</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>对子（被带领 ← 带领）</th>
                <th style={{ width: 200 }}>进度</th>
                <th>状态</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {nodes.map((n) => (
                <tr key={n.pair.id}>
                  <td>
                    <strong>{n.pair.trainee?.full_name}</strong>
                    <span className="faint"> ← {n.pair.mentor?.full_name}</span>
                  </td>
                  <td>
                    <div className="progress-row">
                      <div className="bar"><span style={{ width: `${n.pct}%` }} /></div>
                      <span className="pct">{n.days}/{n.total}</span>
                    </div>
                  </td>
                  <td><span className={`badge ${pairStatusClass(n.pair.status)}`}>{PAIR_STATUS_LABELS[n.pair.status] ?? n.pair.status}</span></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn ghost sm" style={{ marginRight: 6 }} onClick={() => router.push(`/discipleship/pairs/${n.pair.id}`)}>进度</button>
                    <button className="btn ghost sm" style={{ color: 'var(--brand)' }} onClick={() => setPopup(n)}>🔗 表单</button>
                  </td>
                </tr>
              ))}
              {nodes.length === 0 && (
                <tr><td colSpan={4} className="faint" style={{ textAlign: 'center', padding: 24 }}>尚无对子。</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {popup && (
        <ProgressPopup node={popup} onClose={() => setPopup(null)} onCopy={copyLink} onOpenForm={(tk) => window.open(`/d/${tk}`, '_blank')} onDetail={(id) => router.push(`/discipleship/pairs/${id}`)} />
      )}

      {addOpen && programId && (
        <AddPairModal
          programId={programId}
          members={members.data ?? []}
          existing={pairs.data ?? []}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            pairs.reload();
            overview.reload();
            toast('已新增对子');
          }}
        />
      )}
    </>
  );
}

function ProgressPopup({
  node,
  onClose,
  onCopy,
  onOpenForm,
  onDetail,
}: {
  node: Node;
  onClose: () => void;
  onCopy: (token: string) => void;
  onOpenForm: (token: string) => void;
  onDetail: (id: string) => void;
}) {
  const { pair, days, total, pct } = node;
  const link = typeof window !== 'undefined' ? `${window.location.origin}/d/${pair.form_token}` : '';
  const role = pair.trainee ? memberRoleZh(pair.trainee) : '';

  return (
    <Modal onClose={onClose} size="wide">
      <div className="flex-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="flex items-center gap-8 flex-wrap">
            <span className="badge b-accent">被带领</span>
            <strong className="serif" style={{ fontSize: 18 }}>{pair.trainee?.full_name}</strong>
            <span className="muted" style={{ fontSize: 12.5 }}>{role}</span>
          </div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>带领者：{pair.mentor?.full_name} · 四十天一对一守望</div>
        </div>
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>

      <div className="progress-row mt-14">
        <div className="bar"><span style={{ width: `${pct}%` }} /></div>
        <span className="pct">{pct}%</span>
      </div>
      <div className="muted" style={{ fontSize: 13, margin: '16px 0 8px' }}>40 天守望格 · 已完成 {days} / {total} 天</div>
      <div className="day-grid">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`day-cell ${i < days ? 'done' : ''}`}>{i + 1}</div>
        ))}
      </div>

      <div className="field mt-16">
        <label className="field-label">专属填写链接</label>
        <input readOnly value={link} style={{ background: 'var(--surface-2)', color: 'var(--muted)' }} />
      </div>
      <div className="flex gap-8">
        <button className="btn grow" onClick={() => onCopy(pair.form_token)}>复制链接</button>
        <button className="btn accent grow" onClick={() => onOpenForm(pair.form_token)}>打开表单</button>
        <button className="btn ghost" onClick={() => onDetail(pair.id)}>详情</button>
      </div>
    </Modal>
  );
}

function AddPairModal({
  programId,
  members,
  existing,
  onClose,
  onSaved,
}: {
  programId: string;
  members: MemberRow[];
  existing: PairRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mentorId, setMentorId] = useState('');
  const [traineeId, setTraineeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const takenTrainees = new Set(existing.map((p) => p.trainee_id));

  const save = async () => {
    if (!mentorId || !traineeId) {
      setErr('请选择带领者与被带领者');
      return;
    }
    if (mentorId === traineeId) {
      setErr('带领者与被带领者不能是同一人');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      // Link into the cascade: the mentor's own pair (as trainee) becomes parent.
      const parent = existing.find((p) => p.trainee_id === mentorId);
      await api.post('/discipleship/pairs', {
        program_id: programId,
        mentor_id: mentorId,
        trainee_id: traineeId,
        parent_pair_id: parent?.id,
      });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="新增守望对子" onClose={onClose}>
      {err && <ErrorBanner message={err} />}
      <p className="muted" style={{ margin: '0 0 14px', fontSize: 12.5, lineHeight: 1.6 }}>
        建立一个新的四十天守望对子。选择<strong style={{ color: 'var(--ink)' }}>带领者</strong>与<strong style={{ color: 'var(--ink)' }}>被带领者</strong>，系统会依带领者已有的对子自动接入接棒图。
      </p>
      <Field label="带领者">
        <select value={mentorId} onChange={(e) => setMentorId(e.target.value)}>
          <option value="">选择成员…</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name}（{memberRoleZh(m)}）</option>
          ))}
        </select>
      </Field>
      <div style={{ textAlign: 'center', color: 'var(--accent)', fontSize: 16, fontWeight: 700, margin: '-2px 0 8px' }}>↓</div>
      <Field label="被带领者（已在对子中的不显示）">
        <select value={traineeId} onChange={(e) => setTraineeId(e.target.value)}>
          <option value="">选择成员…</option>
          {members
            .filter((m) => !takenTrainees.has(m.id) && m.id !== mentorId)
            .map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}（{memberRoleZh(m)}）</option>
            ))}
        </select>
      </Field>
      <div className="hint" style={{ marginBottom: 6 }}>🕊 新对子从第 1 天开始（进度 0 / 40）。开始填写后即出现在接棒图中。</div>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>取消</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? '保存中…' : '建立对子'}</button>
      </div>
    </Modal>
  );
}
