'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useFetch } from '@/lib/hooks';
import { api } from '@/lib/api';
import { usePageChrome } from '@/components/AppShell';
import { ErrorBanner, Field, Loading, Modal, RoleBadge, Switch, useToast } from '@/components/ui';
import { AccountRow, MemberRow } from '@/lib/types';
import {
  ACCOUNT_ROLE_OPTIONS,
  ACCOUNT_ROLE_ZH,
  accountRoleClass,
  accountStatusClass,
  accountStatusLabel,
  formatDateTime,
  memberRoleZh,
} from '@/lib/labels';
import { AccountRole, AccountStatus, ACCOUNT_ROLE_LABELS } from '@tog/shared';

export default function SettingsPage() {
  const toast = useToast();
  const accounts = useFetch<AccountRow[]>('/accounts');
  const members = useFetch<MemberRow[]>('/members');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  usePageChrome({
    title: '用户管理',
    subtitle: '登录账户 · 权限角色 · 安全与偏好',
    action: (
      <button className="btn" onClick={() => setAddOpen(true)}>
        ＋ 新建账户
      </button>
    ),
  });

  const list = accounts.data ?? [];
  const selected = list.find((a) => a.id === detailId) ?? null;

  const reload = () => {
    accounts.reload();
  };

  if (accounts.loading) return <Loading />;

  if (selected) {
    return (
      <AccountDetail
        account={selected}
        onBack={() => setDetailId(null)}
        onSaved={() => {
          reload();
          toast('已保存账户设置');
        }}
      />
    );
  }

  return (
    <>
      <ErrorBanner message={accounts.error} />
      <div className="hint mb-14">
        💡 每个登录账户都<strong>关联一位成员档案</strong>。点右上角「＋ 新建账户」选择成员并授予权限；点任一账户可管理其权限、安全与偏好。<br />
        <span className="faint">注：v1 暂未启用登录鉴权，此处仅维护账户与权限模型，为日后接入 Supabase Auth 预留。</span>
      </div>
      <div className="card" style={{ padding: 6 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>账户 · 关联成员</th>
                <th>在组身份</th>
                <th>权限角色</th>
                <th>登录邮箱</th>
                <th>状态</th>
                <th>最近登录</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((u) => {
                const role = u.member ? memberRoleZh(u.member) : '未分组';
                return (
                  <tr key={u.id} className="row-click" onClick={() => setDetailId(u.id)}>
                    <td>
                      <strong>{u.member?.full_name ?? '—'}</strong>
                    </td>
                    <td>
                      <RoleBadge role={role} />
                    </td>
                    <td><span className={`badge ${accountRoleClass(u.account_role)}`}>{ACCOUNT_ROLE_ZH[u.account_role]}</span></td>
                    <td className="muted">{u.email}</td>
                    <td><span className={`badge ${accountStatusClass(u.status)}`}>{accountStatusLabel(u.status)}</span></td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{u.last_sign_in_at ? formatDateTime(u.last_sign_in_at) : '从未'}</td>
                    <td style={{ textAlign: 'right' }}><button className="btn ghost sm">管理</button></td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr><td colSpan={7} className="faint" style={{ textAlign: 'center', padding: 24 }}>尚无账户。</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen && (
        <AddAccountModal
          members={members.data ?? []}
          existing={list}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            reload();
            toast('已新建账户');
          }}
        />
      )}
    </>
  );
}

function AccountDetail({
  account,
  onBack,
  onSaved,
}: {
  account: AccountRow;
  onBack: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(account.email);
  const [role, setRole] = useState<AccountRole>(account.account_role);
  const [status, setStatus] = useState<AccountStatus>(account.status);
  const [twoFactor, setTwoFactor] = useState(account.two_factor);
  const [language, setLanguage] = useState(account.language);
  const [nDisc, setNDisc] = useState(account.notify_discipleship);
  const [nDon, setNDon] = useState(account.notify_donation);
  const [nWeekly, setNWeekly] = useState(account.notify_weekly);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const memberRole = account.member ? memberRoleZh(account.member) : '未分组';

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.patch(`/accounts/${account.id}`, {
        email,
        account_role: role,
        status,
        two_factor: twoFactor,
        language,
        notify_discipleship: nDisc,
        notify_donation: nDon,
        notify_weekly: nWeekly,
      });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const NotifyRow = ({ title, sub, on, set }: { title: string; sub: string; on: boolean; set: (v: boolean) => void }) => (
    <div className="flex-between" style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
        <div className="muted" style={{ fontSize: 11.5 }}>{sub}</div>
      </div>
      <Switch on={on} onToggle={() => set(!on)} />
    </div>
  );

  return (
    <div style={{ maxWidth: 720 }}>
      <button className="back-btn" onClick={onBack}>← 返回用户列表</button>
      {err && <ErrorBanner message={err} />}

      <div className="card">
        <div className="flex items-center gap-12 flex-wrap">
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 25, fontWeight: 600, flexShrink: 0, boxShadow: '0 0 0 4px var(--brand-soft)' }} className="serif">
            {account.member?.full_name?.slice(-2) ?? '?'}
          </div>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="flex items-center gap-10 flex-wrap">
              <h2 style={{ margin: 0, fontSize: 20 }} className="serif">{account.member?.full_name}</h2>
              <span className={`badge ${accountRoleClass(role)}`}>{ACCOUNT_ROLE_ZH[role]}</span>
              <RoleBadge role={memberRole} />
            </div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>账户已关联成员档案 · {account.email}</div>
          </div>
          {account.member && (
            <button className="btn ghost" onClick={() => router.push(`/members/${account.member!.id}`)}>查看成员档案 →</button>
          )}
        </div>

        <div className="grid g2" style={{ marginTop: 18 }}>
          <Field label="登录邮箱">
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="权限角色">
            <select value={role} onChange={(e) => setRole(e.target.value as AccountRole)}>
              {ACCOUNT_ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{ACCOUNT_ROLE_LABELS[r]}</option>
              ))}
            </select>
          </Field>
          <div style={{ gridColumn: '1 / -1' }} className="flex-between" >
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>账户状态</div>
                <div className="muted" style={{ fontSize: 11.5 }}>停用后该成员无法登录后台</div>
              </div>
              <Switch
                on={status === AccountStatus.Active}
                onToggle={() => setStatus(status === AccountStatus.Active ? AccountStatus.Disabled : AccountStatus.Active)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid g2 mt-16">
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>安全</h3>
          <Field label="当前密码">
            <input type="password" defaultValue="password" placeholder="••••••••" />
          </Field>
          <Field label="新密码">
            <input type="password" placeholder="至少 8 位" />
          </Field>
          <div className="flex-between" style={{ paddingTop: 6, borderTop: '1px solid var(--border)', marginTop: 4 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>两步验证（2FA）</div>
              <div className="muted" style={{ fontSize: 11.5 }}>登录时需短信验证码</div>
            </div>
            <Switch on={twoFactor} onToggle={() => setTwoFactor(!twoFactor)} />
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 14 }}>偏好</h3>
          <Field label="界面语言">
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="zh-CN">简体中文</option>
              <option value="zh-TW">繁體中文</option>
              <option value="en">English</option>
              <option value="ms">Bahasa Melayu</option>
            </select>
          </Field>
          <Field label="操作">
            <button className="btn ghost block">发送重置密码邮件</button>
          </Field>
        </div>
      </div>

      <div className="card mt-16">
        <h3 style={{ marginBottom: 6 }}>通知</h3>
        <NotifyRow title="门训进度更新" sub="带领者提交每日守望时通知" on={nDisc} set={setNDisc} />
        <NotifyRow title="奉献记录" sub="有新奉献录入时通知" on={nDon} set={setNDon} />
        <div className="flex-between" style={{ padding: '11px 0' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>每周概览邮件</div>
            <div className="muted" style={{ fontSize: 11.5 }}>每周一早晨发送牧养摘要</div>
          </div>
          <Switch on={nWeekly} onToggle={() => setNWeekly(!nWeekly)} />
        </div>
      </div>

      <div className="flex-between flex-wrap mt-16">
        <button className="btn ghost" onClick={onBack}>取消</button>
        <button className="btn" onClick={save} disabled={busy}>{busy ? '保存中…' : '保存账户设置'}</button>
      </div>
    </div>
  );
}

function AddAccountModal({
  members,
  existing,
  onClose,
  onSaved,
}: {
  members: MemberRow[];
  existing: AccountRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const takenMembers = new Set(existing.map((a) => a.member_id));
  const [memberId, setMemberId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AccountRole>(AccountRole.Coworker);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!memberId || !email.trim()) {
      setErr('请选择成员并填写登录邮箱');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await api.post('/accounts', {
        member_id: memberId,
        email: email.trim(),
        account_role: role,
      });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="新建账户" onClose={onClose}>
      {err && <ErrorBanner message={err} />}
      <p className="muted" style={{ margin: '0 0 14px', fontSize: 12.5, lineHeight: 1.6 }}>
        登录账户必须<strong style={{ color: 'var(--ink)' }}>关联一位成员</strong>。先选择成员，再设定登录邮箱与权限角色。
      </p>
      <Field label="关联成员（已有账户者不显示）">
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">选择成员…</option>
          {members
            .filter((m) => !takenMembers.has(m.id))
            .map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}（{memberRoleZh(m)}）</option>
            ))}
        </select>
      </Field>
      <div className="form-row">
        <Field label="登录邮箱">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@grace.org" />
        </Field>
        <Field label="权限角色">
          <select value={role} onChange={(e) => setRole(e.target.value as AccountRole)}>
            {ACCOUNT_ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{ACCOUNT_ROLE_LABELS[r]}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>取消</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? '保存中…' : '创建账户'}</button>
      </div>
    </Modal>
  );
}
