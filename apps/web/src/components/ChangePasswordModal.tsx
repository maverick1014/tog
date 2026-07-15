'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { ErrorBanner, Field, Modal, PasswordInput } from './ui';

/** Self-service password change — any logged-in user; verifies the current password. */
export function ChangePasswordModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (next.length < 8) return setErr('新密码至少 8 位');
    if (next !== confirmPw) return setErr('两次输入的新密码不一致');
    setSaving(true);
    setErr(null);
    try {
      await api.post('/auth/password', { current, password: next });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="修改我的密码" onClose={onClose}>
      {err && <ErrorBanner message={err} />}
      <Field label="当前密码">
        <PasswordInput value={current} onChange={setCurrent} autoComplete="current-password" />
      </Field>
      <Field label="新密码">
        <PasswordInput value={next} onChange={setNext} placeholder="至少 8 位" autoComplete="new-password" />
      </Field>
      <Field label="确认新密码">
        <PasswordInput value={confirmPw} onChange={setConfirmPw} autoComplete="new-password" />
      </Field>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>取消</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? '保存中…' : '更新密码'}</button>
      </div>
    </Modal>
  );
}
