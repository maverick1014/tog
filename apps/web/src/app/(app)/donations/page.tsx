'use client';

import { useState } from 'react';
import { useFetch } from '@/lib/hooks';
import { api } from '@/lib/api';
import { usePageChrome, useMe } from '@/components/AppShell';
import { ErrorBanner, Field, Loading, Modal, useConfirm, useToast } from '@/components/ui';
import { can } from '@/lib/perms';
import { exportRows } from '@/lib/export';
import { DonationRow, DonationSummary, MemberRow } from '@/lib/types';
import {
  DONATION_FUNDS,
  DONATION_METHOD_LABELS,
  DONATION_METHOD_OPTIONS,
  formatDate,
  formatMoney,
  formatMoneyShort,
  fundBadgeClass,
} from '@/lib/labels';
import { DonationMethod } from '@tog/shared';

const TILE_FUNDS = ['十一奉献', '主日奉献', '建堂', '宣教'];

export default function DonationsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const perms = can(useMe().role);
  const summary = useFetch<DonationSummary>('/donations/summary');
  const donations = useFetch<DonationRow[]>('/donations');
  const members = useFetch<MemberRow[]>('/members');
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<DonationRow | null>(null);

  usePageChrome(
    {
      title: '奉献管理',
      subtitle: '按类别汇总 · 记录明细',
      action: perms.write ? (
        <button className="btn" onClick={() => setAddOpen(true)}>
          ＋ 录入奉献
        </button>
      ) : undefined,
    },
    [perms.write],
  );

  const byFund = summary.data?.byFund ?? {};
  const list = donations.data ?? [];
  const showActions = perms.write || perms.delete;

  const reload = () => {
    donations.reload();
    summary.reload();
  };

  const del = async (d: DonationRow) => {
    const ok = await confirm({
      title: '删除奉献记录',
      message: `删除 ${formatDate(d.donated_at)} · ${d.member?.full_name ?? '（匿名）'} · ${d.fund} 的记录？`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/donations/${d.id}`);
      reload();
      toast('已删除奉献记录');
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const exportDonations = () => {
    exportRows(
      '奉献记录',
      '奉献',
      list.map((d) => ({
        日期: formatDate(d.donated_at),
        奉献人: d.member?.full_name ?? '（匿名）',
        类别: d.fund,
        方式: DONATION_METHOD_LABELS[d.method] ?? d.method,
        '金额(RM)': Number(d.amount),
      })),
    );
  };

  if (donations.loading) return <Loading />;

  return (
    <>
      <ErrorBanner message={donations.error || summary.error} />

      <div className="grid g4">
        {TILE_FUNDS.map((f) => (
          <div className="stat" key={f}>
            <div className="label">{f}</div>
            <div className="value">
              <span className="unit">RM </span>
              {formatMoneyShort(byFund[f] ?? 0)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-between mt-16 mb-14">
        <div className="section-label">
          奉献记录 <span className="muted" style={{ fontWeight: 400 }}>· 共 {list.length} 笔</span>
        </div>
        <button className="btn ghost sm" onClick={exportDonations} disabled={!list.length}>
          ⬇ 导出 Excel
        </button>
      </div>
      <div className="card" style={{ padding: 6 }}>
        <div className="table-wrap">
          <table className="stack">
            <thead>
              <tr>
                <th>日期</th>
                <th>奉献人</th>
                <th>类别</th>
                <th>方式</th>
                <th style={{ textAlign: 'right' }}>金额（RM）</th>
                {showActions && <th />}
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id}>
                  <td className="muted tnum" data-label="日期">{formatDate(d.donated_at)}</td>
                  <td data-label="奉献人"><strong>{d.member?.full_name ?? '（匿名）'}</strong></td>
                  <td data-label="类别"><span className={`badge ${fundBadgeClass(d.fund)}`}>{d.fund}</span></td>
                  <td className="muted" data-label="方式">{DONATION_METHOD_LABELS[d.method] ?? d.method}</td>
                  <td style={{ textAlign: 'right' }} className="tnum" data-label="金额（RM）"><strong>{formatMoney(d.amount)}</strong></td>
                  {showActions && (
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {perms.write && <button className="btn ghost sm" style={{ marginRight: 6 }} onClick={() => setEditing(d)}>编辑</button>}
                      {perms.delete && <button className="btn ghost sm" style={{ color: 'var(--crit)' }} onClick={() => del(d)}>删除</button>}
                    </td>
                  )}
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={showActions ? 6 : 5} className="faint" style={{ textAlign: 'center', padding: 24 }}>
                    尚无奉献记录。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(addOpen || editing) && (
        <DonationModal
          members={members.data ?? []}
          donation={editing}
          onClose={() => {
            setAddOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setAddOpen(false);
            setEditing(null);
            reload();
            toast(editing ? '已更新奉献' : '已录入奉献');
          }}
        />
      )}
    </>
  );
}

function DonationModal({
  members,
  donation,
  onClose,
  onSaved,
}: {
  members: MemberRow[];
  donation: DonationRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    member_id: donation?.member_id ?? '',
    donated_at: donation?.donated_at ? donation.donated_at.slice(0, 10) : '',
    fund: donation?.fund ?? DONATION_FUNDS[0],
    method: (donation?.method ?? DonationMethod.Cash) as DonationMethod,
    amount: donation ? String(donation.amount) : '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setErr('请填写有效金额');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        member_id: form.member_id || null,
        amount,
        currency: 'MYR',
        fund: form.fund,
        method: form.method,
        donated_at: form.donated_at ? new Date(form.donated_at).toISOString() : undefined,
      };
      if (donation) await api.patch(`/donations/${donation.id}`, payload);
      else await api.post('/donations', payload);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={donation ? '编辑奉献' : '录入奉献'} onClose={onClose}>
      {err && <ErrorBanner message={err} />}
      <div className="form-row">
        <Field label="奉献人">
          <select value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })}>
            <option value="">（匿名）</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </Field>
        <Field label="日期">
          <input type="date" value={form.donated_at} onChange={(e) => setForm({ ...form, donated_at: e.target.value })} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="类别">
          <select value={form.fund} onChange={(e) => setForm({ ...form, fund: e.target.value })}>
            {DONATION_FUNDS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field label="方式">
          <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as DonationMethod })}>
            {DONATION_METHOD_OPTIONS.map((m) => (
              <option key={m} value={m}>{DONATION_METHOD_LABELS[m]}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="金额（RM）">
        <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
      </Field>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>取消</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
      </div>
    </Modal>
  );
}
