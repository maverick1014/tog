'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useFetch } from '@/lib/hooks';
import { api } from '@/lib/api';
import { usePageChrome } from '@/components/AppShell';
import { ErrorBanner, Field, Loading, Modal, RoleBadge, useToast } from '@/components/ui';
import { exportRows } from '@/lib/export';
import { MemberRow } from '@/lib/types';
import {
  formatDate,
  GENDER_LABELS,
  MEMBER_ROLE_FILTERS,
  memberRoleZh,
  memberStatusClass,
  memberStatusLabel,
} from '@/lib/labels';
import { ChurchRole, MemberStatus } from '@tog/shared';

export default function MembersPage() {
  const router = useRouter();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<MemberRow[]>('/members');
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);

  usePageChrome({
    title: '成员目录',
    subtitle: '身份只读，在「小组管理」逐人设定',
    action: (
      <button className="btn" onClick={() => setAddOpen(true)}>
        ＋ 新增成员
      </button>
    ),
  });

  const members = data ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: members.length };
    MEMBER_ROLE_FILTERS.forEach((r) => (c[r] = 0));
    for (const m of members) {
      const r = memberRoleZh(m);
      if (c[r] != null) c[r]++;
    }
    return c;
  }, [members]);

  const rows = useMemo(() => {
    const term = q.trim();
    return members.filter((m) => {
      const role = memberRoleZh(m);
      if (roleFilter !== 'all' && role !== roleFilter) return false;
      if (term && !`${m.full_name}${m.chinese_name ?? ''}`.includes(term)) return false;
      return true;
    });
  }, [members, q, roleFilter]);

  const exportMembers = () => {
    exportRows(
      '成员目录',
      '成员',
      rows.map((m) => ({
        姓名: m.full_name,
        身份: memberRoleZh(m),
        所属小组: m.group?.name ?? '未分组',
        邮箱: m.email ?? '',
        电话: m.phone ?? '',
        性别: m.gender ? GENDER_LABELS[m.gender] ?? '' : '',
        状态: memberStatusLabel(m.status),
        加入日期: formatDate(m.joined_at),
      })),
    );
  };

  if (loading) return <Loading />;

  return (
    <>
      <ErrorBanner message={error} />

      <div className="flex gap-8 flex-wrap mb-12">
        <button
          className={`chip ${roleFilter === 'all' ? 'on' : ''}`}
          onClick={() => setRoleFilter('all')}
        >
          全部 {counts.all}
        </button>
        {MEMBER_ROLE_FILTERS.map((r) => (
          <button
            key={r}
            className={`chip ${roleFilter === r ? 'on' : ''}`}
            onClick={() => setRoleFilter(r)}
          >
            {r} {counts[r] ?? 0}
          </button>
        ))}
      </div>

      <div className="flex-between flex-wrap gap-8 mb-16">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 搜索姓名…"
          style={{ maxWidth: 280, flex: 1 }}
        />
        <button className="btn ghost sm" onClick={exportMembers} disabled={rows.length === 0}>
          ⬇ 导出 Excel
        </button>
      </div>

      {/* Desktop — table */}
      <div className="card only-desktop" style={{ padding: 6 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>成员</th>
                <th>身份</th>
                <th>所属小组</th>
                <th>联系方式</th>
                <th>状态</th>
                <th>加入日期</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const role = memberRoleZh(m);
                return (
                  <tr key={m.id} className="row-click" onClick={() => router.push(`/members/${m.id}`)}>
                    <td>
                      <strong>{m.full_name}</strong>
                    </td>
                    <td>
                      <RoleBadge role={role} />
                    </td>
                    <td className="muted">{m.group?.name ?? '未分组'}</td>
                    <td className="muted tnum">{m.phone ?? '—'}</td>
                    <td>
                      <span className={`badge ${memberStatusClass(m.status)}`}>
                        {memberStatusLabel(m.status)}
                      </span>
                    </td>
                    <td className="muted tnum">{formatDate(m.joined_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn ghost sm">档案 →</button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="faint" style={{ textAlign: 'center', padding: 28 }}>
                    没有符合条件的成员。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile — list tiles: name + 档案, 身份·小组, 联系方式, 状态·加入日期 */}
      <div className="only-mobile">
        {rows.map((m) => {
          const role = memberRoleZh(m);
          return (
            <div key={m.id} className="mtile" onClick={() => router.push(`/members/${m.id}`)}>
              <div className="mtile-row1">
                <div className="flex items-center gap-8 flex-wrap" style={{ minWidth: 0 }}>
                  <strong>{m.full_name}</strong>
                  <span className="muted" style={{ fontSize: 12.5 }}>· {m.group?.name ?? '未分组'}</span>
                  <RoleBadge role={role} />
                </div>
                <span className="mtile-cta">档案 →</span>
              </div>
              <div className="mtile-line">{m.phone ?? '—'}</div>
              <div className="mtile-line">
                <span className={`badge ${memberStatusClass(m.status)}`}>
                  {memberStatusLabel(m.status)}
                </span>
                <span>· {formatDate(m.joined_at)}</span>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="faint" style={{ textAlign: 'center', padding: 28 }}>
            没有符合条件的成员。
          </div>
        )}
      </div>

      <div className="hint mt-14">
        💡 点击任意成员可查看<strong>个人培训档案</strong>（参加过的课程与进度）与门训配对。身份只读；在「小组管理」逐人设定。
      </div>

      {addOpen && (
        <AddMemberModal
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            toast('已新增成员');
            reload();
          }}
        />
      )}
    </>
  );
}

function AddMemberModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    status: MemberStatus.Active as MemberStatus,
    joined_at: '',
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
      await api.post('/members', {
        full_name: form.full_name.trim(),
        church_role: ChurchRole.Member,
        status: form.status,
        phone: form.phone || undefined,
        email: form.email || undefined,
        joined_at: form.joined_at || undefined,
      });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="新增成员" onClose={onClose}>
      {err && <ErrorBanner message={err} />}
      <Field label="姓名">
        <input
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          placeholder="中文姓名"
        />
      </Field>
      <div className="form-row">
        <Field label="电话">
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="012-000 0000"
          />
        </Field>
        <Field label="状态">
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as MemberStatus })}
          >
            <option value={MemberStatus.Active}>在册</option>
            <option value={MemberStatus.Inactive}>停止聚会</option>
          </select>
        </Field>
      </div>
      <div className="form-row">
        <Field label="加入日期">
          <input
            type="date"
            value={form.joined_at}
            onChange={(e) => setForm({ ...form, joined_at: e.target.value })}
          />
        </Field>
        <Field label="邮箱">
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="name@grace.org"
          />
        </Field>
      </div>
      <div className="hint" style={{ marginBottom: 6 }}>
        💡 身份（组长 / 成员等）在「小组管理」逐人设定，此处不填写。
      </div>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>取消</button>
        <button className="btn" onClick={save} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </Modal>
  );
}
