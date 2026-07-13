'use client';

import { useState } from 'react';
import { useFetch } from '@/lib/hooks';
import { api } from '@/lib/api';
import { usePageChrome } from '@/components/AppShell';
import { ErrorBanner, Field, Loading, Modal, useToast } from '@/components/ui';
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
  const summary = useFetch<DonationSummary>('/donations/summary');
  const donations = useFetch<DonationRow[]>('/donations');
  const members = useFetch<MemberRow[]>('/members');
  const [addOpen, setAddOpen] = useState(false);

  usePageChrome({
    title: '奉献管理',
    subtitle: '按类别汇总 · 记录明细',
    action: (
      <button className="btn" onClick={() => setAddOpen(true)}>
        ＋ 录入奉献
      </button>
    ),
  });

  const byFund = summary.data?.byFund ?? {};
  const list = donations.data ?? [];

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

      <div className="card mt-16" style={{ padding: 6 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>奉献人</th>
                <th>类别</th>
                <th>方式</th>
                <th style={{ textAlign: 'right' }}>金额（RM）</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id}>
                  <td className="muted tnum">{formatDate(d.donated_at)}</td>
                  <td><strong>{d.member?.full_name ?? '（匿名）'}</strong></td>
                  <td><span className={`badge ${fundBadgeClass(d.fund)}`}>{d.fund}</span></td>
                  <td className="muted">{DONATION_METHOD_LABELS[d.method] ?? d.method}</td>
                  <td style={{ textAlign: 'right' }} className="tnum"><strong>{formatMoney(d.amount)}</strong></td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5} className="faint" style={{ textAlign: 'center', padding: 24 }}>
                    尚无奉献记录。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen && (
        <AddDonationModal
          members={members.data ?? []}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            donations.reload();
            summary.reload();
            toast('已录入奉献');
          }}
        />
      )}
    </>
  );
}

function AddDonationModal({
  members,
  onClose,
  onSaved,
}: {
  members: MemberRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    member_id: '',
    donated_at: '',
    fund: DONATION_FUNDS[0],
    method: DonationMethod.Cash as DonationMethod,
    amount: '',
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
      await api.post('/donations', {
        member_id: form.member_id || undefined,
        amount,
        currency: 'MYR',
        fund: form.fund,
        method: form.method,
        donated_at: form.donated_at ? new Date(form.donated_at).toISOString() : undefined,
      });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="录入奉献" onClose={onClose}>
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
