'use client';

import { useEffect, useState } from 'react';
import { useFetch } from '@/lib/hooks';
import { api } from '@/lib/api';
import { usePageChrome } from '@/components/AppShell';
import { Avatar, ErrorBanner, Field, Loading, Modal, useToast } from '@/components/ui';
import { EventDetail, EventRow, MemberRow } from '@/lib/types';
import {
  ATTENDANCE_LABELS,
  eventBadgeClass,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_OPTIONS,
  formatDateTime,
} from '@/lib/labels';
import { AttendanceStatus, EventType, MemberStatus } from '@tog/shared';

export default function EventsPage() {
  const toast = useToast();
  const events = useFetch<EventRow[]>('/events');
  const members = useFetch<MemberRow[]>('/members');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  usePageChrome({
    title: '聚会与出席',
    subtitle: '崇拜 · 祷告会 · 团契 · 逐一点名',
    action: (
      <button className="btn" onClick={() => setAddOpen(true)}>
        ＋ 新增聚会
      </button>
    ),
  });

  const list = events.data ?? [];
  const now = new Date();
  const sorted = [...list].sort((a, b) => +new Date(b.starts_at) - +new Date(a.starts_at));

  useEffect(() => {
    if (!activeId && sorted.length) setActiveId(sorted[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.data]);

  if (events.loading) return <Loading />;

  return (
    <>
      <ErrorBanner message={events.error} />

      <div className="grid g3">
        {sorted.map((e) => {
          const upcoming = new Date(e.starts_at) >= now;
          return (
            <div className="card" key={e.id}>
              <div className="flex-between">
                <span className={`badge ${eventBadgeClass(e.event_type)}`}>
                  {EVENT_TYPE_LABELS[e.event_type] ?? e.event_type}
                </span>
                <span className="muted" style={{ fontSize: 12 }}>{upcoming ? '即将' : '已结束'}</span>
              </div>
              <h3 style={{ margin: '12px 0 2px', fontSize: 16 }} className="serif">{e.title}</h3>
              <div className="muted" style={{ fontSize: 12.5 }}>
                {formatDateTime(e.starts_at)}{e.location ? ` · ${e.location}` : ''}
              </div>
              <div className="flex-between mt-14">
                <span className="muted" style={{ fontSize: 12 }}>{e.description ?? ''}</span>
                <button
                  className={`btn sm ${activeId === e.id ? '' : 'ghost'}`}
                  onClick={() => setActiveId(e.id)}
                >
                  点名
                </button>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && <div className="empty">尚无聚会，点右上角「＋ 新增聚会」创建。</div>}
      </div>

      {activeId && (
        <AttendancePanel
          key={activeId}
          eventId={activeId}
          members={(members.data ?? []).filter((m) => m.status === MemberStatus.Active)}
          onSaved={() => toast('已保存点名')}
        />
      )}

      {addOpen && (
        <AddEventModal
          onClose={() => setAddOpen(false)}
          onSaved={(id) => {
            setAddOpen(false);
            events.reload();
            setActiveId(id);
            toast('已新增聚会');
          }}
        />
      )}
    </>
  );
}

function AttendancePanel({
  eventId,
  members,
  onSaved,
}: {
  eventId: string;
  members: MemberRow[];
  onSaved: () => void;
}) {
  const detail = useFetch<EventDetail>(`/events/${eventId}`);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!detail.data) return;
    const init: Record<string, AttendanceStatus> = {};
    for (const a of detail.data.attendance) init[a.member_id] = a.status;
    setMarks(init);
  }, [detail.data]);

  const set = (memberId: string, status: AttendanceStatus) =>
    setMarks((m) => ({ ...m, [memberId]: status }));

  const marked = Object.keys(marks).length;

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      const records = members
        .filter((m) => marks[m.id])
        .map((m) => ({ member_id: m.id, status: marks[m.id] }));
      await api.post(`/events/${eventId}/attendance`, { records });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (detail.loading) return <div className="card mt-16"><Loading /></div>;

  return (
    <div className="card mt-16">
      {err && <ErrorBanner message={err} />}
      <div className="card-head">
        <div>
          <h3>{detail.data?.title} · 出席点名</h3>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            逐一标记出席 / 请假 / 缺席，完成后一次保存
          </div>
        </div>
        <button className="btn accent" onClick={save} disabled={saving}>
          保存点名（{marked}）
        </button>
      </div>
      {members.map((m) => {
        const cur = marks[m.id];
        return (
          <div key={m.id} className="flex-between" style={{ padding: '10px 4px', borderBottom: '1px solid var(--border)' }}>
            <div className="name-cell">
              <Avatar name={m.full_name} />
              <strong>{m.full_name}</strong>
            </div>
            <div className="seg">
              <button
                className={cur === AttendanceStatus.Present ? 'on-good' : ''}
                onClick={() => set(m.id, AttendanceStatus.Present)}
              >
                {ATTENDANCE_LABELS[AttendanceStatus.Present]}
              </button>
              <button
                className={cur === AttendanceStatus.Excused ? 'on-warn' : ''}
                onClick={() => set(m.id, AttendanceStatus.Excused)}
              >
                {ATTENDANCE_LABELS[AttendanceStatus.Excused]}
              </button>
              <button
                className={cur === AttendanceStatus.Absent ? 'on-crit' : ''}
                onClick={() => set(m.id, AttendanceStatus.Absent)}
              >
                {ATTENDANCE_LABELS[AttendanceStatus.Absent]}
              </button>
            </div>
          </div>
        );
      })}
      {members.length === 0 && <div className="faint" style={{ textAlign: 'center', padding: 20 }}>暂无在册成员可点名。</div>}
    </div>
  );
}

function AddEventModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [form, setForm] = useState({
    title: '',
    event_type: EventType.Service as EventType,
    location: '',
    starts_at: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!form.title.trim() || !form.starts_at) {
      setErr('请填写标题与开始时间');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const ev = await api.post<EventRow>('/events', {
        title: form.title.trim(),
        event_type: form.event_type,
        location: form.location || undefined,
        starts_at: new Date(form.starts_at).toISOString(),
      });
      onSaved(ev.id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="新增聚会" onClose={onClose}>
      {err && <ErrorBanner message={err} />}
      <Field label="标题">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例如：周三祷告会" />
      </Field>
      <div className="form-row">
        <Field label="类型">
          <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value as EventType })}>
            {EVENT_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </Field>
        <Field label="地点">
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="大堂 / 副堂" />
        </Field>
      </div>
      <Field label="开始时间">
        <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
      </Field>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>取消</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
      </div>
    </Modal>
  );
}
