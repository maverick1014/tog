'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useFetch } from '@/lib/hooks';
import { api } from '@/lib/api';
import { usePageChrome, useMe } from '@/components/AppShell';
import { ErrorBanner, Field, Loading, Modal, useConfirm, useToast } from '@/components/ui';
import { can } from '@/lib/perms';
import { exportMatrix } from '@/lib/export';
import { MemberRow, NamelistResponse, TrainingDetail } from '@/lib/types';
import {
  categoryBadgeClass,
  ENROLLMENT_STATUS_LABELS,
  enrollmentStatusClass,
  formatDate,
  formatDateTime,
  memberRoleZh,
} from '@/lib/labels';
import { EnrollmentStatus } from '@tog/shared';
import { TrainingModal } from '@/components/TrainingModal';

export default function TrainingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const perms = can(useMe().role);

  const detail = useFetch<TrainingDetail>(`/trainings/${id}`);
  const namelist = useFetch<NamelistResponse>(`/trainings/${id}/namelist`);
  const members = useFetch<MemberRow[]>('/members');

  const [editOpen, setEditOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);

  usePageChrome({ title: '培训详情', subtitle: '场次 · 报名审核 · 核对名单' }, [id]);

  if (detail.loading) return <Loading />;
  if (detail.error || !detail.data) return <ErrorBanner message={detail.error ?? '找不到课程'} />;

  const t = detail.data;
  const pending = t.enrollments.filter((e) => e.status === EnrollmentStatus.Pending).length;

  const approve = async (enrollmentId: string) => {
    await api.patch(`/trainings/enrollments/${enrollmentId}`, {
      status: EnrollmentStatus.Approved,
    });
    detail.reload();
    namelist.reload();
    toast('已通过报名');
  };

  const enrollMember = async (memberId: string) => {
    if (!memberId) return;
    try {
      await api.post(`/trainings/${id}/enroll`, { member_id: memberId });
      detail.reload();
      toast('已加入报名');
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const toggleTick = async (sessionId: string, memberId: string, attended: boolean) => {
    await api.post(`/trainings/sessions/${sessionId}/attendance`, {
      records: [{ member_id: memberId, attended }],
    });
    namelist.reload();
  };

  const del = async () => {
    const ok = await confirm({
      title: '删除课程',
      message: `删除「${t.name}」？报名与名单记录将一并移除。`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    await api.delete(`/trainings/${id}`);
    router.push('/trainings');
  };

  const nl = namelist.data;

  const exportNamelist = () => {
    if (!nl) return;
    const headers = [
      '报名成员',
      '身份',
      ...nl.sessions.map((s) => `第${s.session_number}课 ${s.title ?? ''}`.trim()),
      '出席场次',
    ];
    const matrix = nl.rows.map((r) => [
      r.member.full_name,
      memberRoleZh(r.member),
      ...r.attendance.map((a) => (a.attended ? '出席' : '缺席')),
      r.attendance.filter((a) => a.attended).length,
    ]);
    exportMatrix(`${t.name}_核对名单`, '名单', headers, matrix);
  };

  return (
    <>
      <button className="back-btn" onClick={() => router.push('/trainings')}>← 返回课程目录</button>

      <div className="card">
        <div className="flex-between flex-wrap">
          <div>
            <div className="flex items-center gap-10 flex-wrap">
              <span className={`badge ${categoryBadgeClass(t.category)}`}>{t.category ?? '课程'}</span>
              <span className={`badge ${t.is_enrollable ? 'b-good' : 'b-gray'}`}>{t.is_enrollable ? '开放报名' : '已截止'}</span>
            </div>
            <h2 style={{ margin: '10px 0 3px', fontSize: 22 }} className="serif">{t.name}</h2>
            <div className="muted" style={{ fontSize: 12.5 }}>
              讲师：{t.trainer?.full_name ?? '待定'} · 共 {t.total_sessions} 场次 · {formatDate(t.starts_on)} 至 {formatDate(t.ends_on)}
            </div>
          </div>
          <div className="flex gap-8">
            {perms.write && <button className="btn ghost" onClick={() => setEditOpen(true)}>编辑课程</button>}
            {perms.delete && <button className="btn ghost" style={{ color: 'var(--crit)' }} onClick={del}>删除</button>}
          </div>
        </div>
      </div>

      <div className="grid g2 mt-16">
        {/* Sessions */}
        <div className="card">
          <div className="card-head">
            <h3>课程场次</h3>
            {perms.write && <button className="btn ghost sm" onClick={() => setSessionOpen(true)}>＋ 加场次</button>}
          </div>
          {t.sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-12" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--brand-soft)', color: 'var(--brand)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }} className="serif">
                {s.session_number}
              </div>
              <div className="grow">
                <strong style={{ fontSize: 13 }}>{s.title ?? `第 ${s.session_number} 课`}</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  {s.scheduled_at ? formatDateTime(s.scheduled_at) : '待定'} · {s.location ?? '—'}
                </div>
              </div>
            </div>
          ))}
          {t.sessions.length === 0 && (
            <div className="faint" style={{ textAlign: 'center', padding: 24, fontSize: 13 }}>尚无场次，点「＋ 加场次」开始安排。</div>
          )}
        </div>

        {/* Enrollment approval */}
        <div className="card">
          <div className="card-head">
            <h3>报名审核</h3>
            <span className="muted" style={{ fontSize: 12 }}>{t.enrollments.length} 报名 · {pending} 待审</span>
          </div>
          {perms.write && (
            <div className="flex gap-8 mb-14">
              <select defaultValue="" onChange={(e) => { enrollMember(e.target.value); e.target.value = ''; }} style={{ flex: 1 }}>
                <option value="">加入报名成员…</option>
                {(members.data ?? [])
                  .filter((m) => !t.enrollments.some((e) => e.member_id === m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
              </select>
            </div>
          )}
          <div style={{ maxHeight: 296, overflowY: 'auto' }}>
            {t.enrollments.map((e) => (
              <div key={e.id} className="flex items-center gap-10" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: 13 }}>{e.member?.full_name ?? '—'}</strong>
                  <div className="muted" style={{ fontSize: 11.5 }}>{e.member ? memberRoleZh(e.member) : ''}</div>
                </div>
                <div className="bar thin" style={{ width: 80, flex: 'none' }}>
                  <span style={{ width: `${e.progress}%` }} />
                </div>
                <span className={`badge ${enrollmentStatusClass(e.status)}`} style={{ flexShrink: 0 }}>
                  {ENROLLMENT_STATUS_LABELS[e.status] ?? e.status}
                </span>
                {perms.write && e.status === EnrollmentStatus.Pending && (
                  <button className="btn good sm" style={{ flexShrink: 0 }} onClick={() => approve(e.id)}>通过</button>
                )}
              </div>
            ))}
            {t.enrollments.length === 0 && (
              <div className="faint" style={{ textAlign: 'center', padding: 20, fontSize: 13 }}>尚无报名。</div>
            )}
          </div>
        </div>
      </div>

      {/* Namelist grid */}
      <div className="card mt-16">
        <div className="card-head">
          <div>
            <h3>核对名单</h3>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>逐场次核对出席，点击方格切换 ✓ · 空 缺席</div>
          </div>
          <button className="btn accent sm" onClick={exportNamelist} disabled={!nl || nl.rows.length === 0}>
            ⬇ 导出名单
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>报名成员</th>
                <th>身份</th>
                {(nl?.sessions ?? []).map((s) => (
                  <th key={s.id} style={{ textAlign: 'center' }}>
                    第 {s.session_number} 课<br /><span style={{ fontWeight: 400 }}>{s.title ?? ''}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(nl?.rows ?? []).map((r) => (
                <tr key={r.member.id}>
                  <td>
                    <strong>{r.member.full_name}</strong>
                  </td>
                  <td className="muted">{memberRoleZh(r.member)}</td>
                  {r.attendance.map((a) => (
                    <td key={a.session_id} style={{ textAlign: 'center' }}>
                      <span
                        className={`tick ${a.attended ? 'on' : 'off'}`}
                        onClick={perms.write ? () => toggleTick(a.session_id, r.member.id, !a.attended) : undefined}
                        style={{ cursor: perms.write ? 'pointer' : 'default' }}
                      >
                        {a.attended ? '✓' : ''}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
              {(nl?.rows.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={2 + (nl?.sessions.length ?? 0)} className="faint" style={{ textAlign: 'center', padding: 24 }}>
                    通过报名后，成员将出现在核对名单中。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex gap-12 flex-wrap muted mt-14" style={{ fontSize: 12 }}>
          <span className="flex items-center gap-6"><i style={{ width: 12, height: 12, borderRadius: 3, display: 'inline-block', background: 'var(--good)' }} /> 已出席</span>
          <span className="flex items-center gap-6"><i style={{ width: 12, height: 12, borderRadius: 3, display: 'inline-block', background: 'var(--surface-2)', border: '1px dashed var(--border)' }} /> 缺席</span>
        </div>
      </div>

      {editOpen && (
        <TrainingModal
          members={members.data ?? []}
          initial={t}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            detail.reload();
            toast('已更新课程');
          }}
        />
      )}
      {sessionOpen && (
        <SessionModal
          trainingId={id}
          nextNumber={(t.sessions[t.sessions.length - 1]?.session_number ?? 0) + 1}
          onClose={() => setSessionOpen(false)}
          onSaved={() => {
            setSessionOpen(false);
            detail.reload();
            namelist.reload();
            toast('已加入场次');
          }}
        />
      )}
    </>
  );
}

function SessionModal({
  trainingId,
  nextNumber,
  onClose,
  onSaved,
}: {
  trainingId: string;
  nextNumber: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    session_number: nextNumber,
    title: '',
    scheduled_at: '',
    location: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await api.post(`/trainings/${trainingId}/sessions`, {
        session_number: Number(form.session_number),
        title: form.title || undefined,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : undefined,
        location: form.location || undefined,
      });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="新增场次" onClose={onClose}>
      {err && <ErrorBanner message={err} />}
      <div className="form-row">
        <Field label="第几课">
          <input type="number" value={form.session_number} onChange={(e) => setForm({ ...form, session_number: Number(e.target.value) })} />
        </Field>
        <Field label="标题">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="得救确据" />
        </Field>
      </div>
      <div className="form-row">
        <Field label="时间">
          <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
        </Field>
        <Field label="地点">
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="副堂" />
        </Field>
      </div>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>取消</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
      </div>
    </Modal>
  );
}
