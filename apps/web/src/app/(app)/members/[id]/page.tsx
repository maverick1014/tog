'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useFetch } from '@/lib/hooks';
import { api } from '@/lib/api';
import { usePageChrome } from '@/components/AppShell';
import { Avatar, ErrorBanner, Field, Loading, Modal, ProgressBar, RoleBadge, useToast } from '@/components/ui';
import { PairProgressModal } from '@/components/PairProgressModal';
import { EnrollmentRow, MemberRow, PairRow } from '@/lib/types';
import { Gender, MemberStatus } from '@tog/shared';
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
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [popupPair, setPopupPair] = useState<string | null>(null);

  usePageChrome({ title: '成员详情', subtitle: '档案 · 个人培训记录 · 四十天守望' }, [id]);

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.upload(`/members/${id}/avatar`, fd);
      toast('头像已更新');
      member.reload();
    } catch (err) {
      toast((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

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
            <Avatar name={m.full_name} url={m.avatar_url} size="lg" />
            <div>
              <div className="flex items-center gap-10 flex-wrap">
                <h2 style={{ margin: 0, fontSize: 22 }} className="serif">{m.full_name}</h2>
                <RoleBadge role={role} />
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                {m.chinese_name ? `${m.chinese_name} · ` : ''}
                {m.group?.name ?? '未分组'}
              </div>
              <button
                className="btn ghost sm"
                style={{ marginTop: 8 }}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? '上传中…' : m.avatar_url ? '更换头像' : '上传头像'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onPickAvatar}
                style={{ display: 'none' }}
              />
            </div>
          </div>
          <button className="btn" onClick={() => setEditOpen(true)}>编辑资料</button>
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

        <div className="section-label" style={{ margin: '24px 0 12px' }}>四十天守望</div>
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
                onClick={() => setPopupPair(p.id)}
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

      {editOpen && (
        <EditMemberModal
          member={m}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            member.reload();
            toast('已保存资料');
          }}
        />
      )}

      {popupPair && <PairProgressModal pairId={popupPair} onClose={() => setPopupPair(null)} />}
    </>
  );
}

function EditMemberModal({
  member,
  onClose,
  onSaved,
}: {
  member: MemberRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    full_name: member.full_name ?? '',
    chinese_name: member.chinese_name ?? '',
    phone: member.phone ?? '',
    email: member.email ?? '',
    gender: member.gender ?? '',
    date_of_birth: member.date_of_birth ?? '',
    joined_at: member.joined_at ?? '',
    status: member.status,
    notes: member.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!form.full_name.trim()) {
      setErr('请填写姓名');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await api.patch(`/members/${member.id}`, {
        full_name: form.full_name.trim(),
        chinese_name: form.chinese_name || null,
        phone: form.phone || null,
        email: form.email || null,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        joined_at: form.joined_at || null,
        status: form.status,
        notes: form.notes || null,
      });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="编辑成员资料" onClose={onClose}>
      {err && <ErrorBanner message={err} />}
      <div className="form-row">
        <Field label="姓名">
          <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label="英文名 / 别名">
          <input value={form.chinese_name} onChange={(e) => setForm({ ...form, chinese_name: e.target.value })} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="电话">
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="012-000 0000" />
        </Field>
        <Field label="邮箱">
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@grace.org" />
        </Field>
      </div>
      <div className="form-row">
        <Field label="性别">
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Gender | '' })}>
            <option value="">未填写</option>
            <option value={Gender.Male}>{GENDER_LABELS[Gender.Male]}</option>
            <option value={Gender.Female}>{GENDER_LABELS[Gender.Female]}</option>
          </select>
        </Field>
        <Field label="状态">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MemberStatus })}>
            <option value={MemberStatus.Active}>在册</option>
            <option value={MemberStatus.Inactive}>停止聚会</option>
          </select>
        </Field>
      </div>
      <div className="form-row">
        <Field label="生日">
          <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
        </Field>
        <Field label="加入日期">
          <input type="date" value={form.joined_at} onChange={(e) => setForm({ ...form, joined_at: e.target.value })} />
        </Field>
      </div>
      <Field label="备注">
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
      <div className="hint" style={{ marginBottom: 6 }}>
        💡 身份（组长 / 成员等）与所属小组在「小组管理」逐人设定，此处不修改。
      </div>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>取消</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
      </div>
    </Modal>
  );
}
