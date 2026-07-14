'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { ErrorBanner, Field, Modal } from '@/components/ui';
import { MemberRow, TrainingRow } from '@/lib/types';
import { TRAINING_CATEGORIES } from '@/lib/labels';

export function TrainingModal({
  members,
  initial,
  onClose,
  onSaved,
}: {
  members: MemberRow[];
  initial?: TrainingRow;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    category: initial?.category ?? TRAINING_CATEGORIES[0],
    total_sessions: initial?.total_sessions ?? 3,
    trainer_id: initial?.trainer_id ?? '',
    starts_on: initial?.starts_on?.slice(0, 10) ?? '',
    ends_on: initial?.ends_on?.slice(0, 10) ?? '',
    is_enrollable: initial?.is_enrollable ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!form.name.trim()) {
      setErr('请填写课程名称');
      return;
    }
    setSaving(true);
    setErr(null);
    const body = {
      name: form.name.trim(),
      category: form.category,
      total_sessions: Number(form.total_sessions) || 1,
      trainer_id: form.trainer_id || undefined,
      starts_on: form.starts_on || undefined,
      ends_on: form.ends_on || undefined,
      is_enrollable: form.is_enrollable,
    };
    try {
      const t = initial
        ? await api.patch<TrainingRow>(`/trainings/${initial.id}`, body)
        : await api.post<TrainingRow>('/trainings', body);
      onSaved(t.id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={initial ? '编辑课程' : '新增课程'} onClose={onClose}>
      {err && <ErrorBanner message={err} />}
      <Field label="课程名称">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例如：门徒训练 101" />
      </Field>
      <div className="form-row">
        <Field label="类别">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {TRAINING_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="场次数">
          <input type="number" value={form.total_sessions} onChange={(e) => setForm({ ...form, total_sessions: Number(e.target.value) })} />
        </Field>
      </div>
      <Field label="讲师">
        <select value={form.trainer_id} onChange={(e) => setForm({ ...form, trainer_id: e.target.value })}>
          <option value="">待定</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name}</option>
          ))}
        </select>
      </Field>
      <div className="form-row">
        <Field label="开始日期">
          <input type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} />
        </Field>
        <Field label="结束日期">
          <input type="date" value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} />
        </Field>
      </div>
      <label className="flex items-center gap-8" style={{ fontSize: 13, fontWeight: 500, margin: '4px 0 18px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={form.is_enrollable}
          onChange={(e) => setForm({ ...form, is_enrollable: e.target.checked })}
          style={{ width: 16, height: 16, accentColor: 'var(--brand)' }}
        />
        开放报名（成员可自助报名，待审核）
      </label>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>取消</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
      </div>
    </Modal>
  );
}
