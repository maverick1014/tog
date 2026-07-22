'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFetch } from '@/lib/hooks';
import { useSortableRows } from '@/lib/sort';
import { api } from '@/lib/api';
import { usePageChrome, useMe } from '@/components/AppShell';
import { ErrorBanner, Field, Loading, Modal, SortTh, useToast } from '@/components/ui';
import { can } from '@/lib/perms';
import { GroupRow, MemberRow } from '@/lib/types';
import { meetingScheduleZh, WEEKDAY_LABELS, WEEKDAY_OPTIONS } from '@/lib/labels';
import { GroupPosition, Weekday } from '@tog/shared';

export default function GroupsPage() {
  const router = useRouter();
  const toast = useToast();
  const perms = can(useMe().role);
  const groups = useFetch<GroupRow[]>('/groups');
  const members = useFetch<MemberRow[]>('/members');
  const [addOpen, setAddOpen] = useState(false);
  const [q, setQ] = useState('');

  usePageChrome(
    {
      title: '小组管理',
      subtitle: '全部小组一览 · 点击查看详情',
      action: perms.write ? (
        <button className="btn" onClick={() => setAddOpen(true)}>
          ＋ 新增小组
        </button>
      ) : undefined,
    },
    [perms.write],
  );

  // Leader + member count derived once from the already-fetched member list
  // (G5: no extra request just to know who leads each group).
  const rows = useMemo(() => {
    const groupList = groups.data ?? [];
    const memberList = members.data ?? [];
    return groupList.map((g) => {
      const inGroup = memberList.filter((m) => m.group_id === g.id);
      const leader = inGroup.find((m) => m.group_position === GroupPosition.Leader);
      return {
        id: g.id,
        name: g.name,
        schedule: meetingScheduleZh(g),
        leaderName: leader?.full_name ?? null,
        memberCount: inGroup.length,
      };
    });
  }, [groups.data, members.data]);

  const filteredRows = useMemo(() => {
    const term = q.trim();
    if (!term) return rows;
    return rows.filter((g) => `${g.name}${g.leaderName ?? ''}${g.schedule}`.includes(term));
  }, [rows, q]);

  const { sorted, sortKey, sortDir, toggleSort } = useSortableRows(
    filteredRows,
    (g, key) => {
      switch (key) {
        case 'leader':
          return g.leaderName ?? undefined;
        case 'count':
          return g.memberCount;
        default:
          return g.name;
      }
    },
    { key: 'name', dir: 'asc' },
  );

  if (groups.initialLoading) return <Loading />;

  return (
    <>
      <ErrorBanner message={groups.error || members.error} />

      <div className="flex-between flex-wrap gap-8 mb-16">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 搜索小组 / 组长…"
          style={{ maxWidth: 240, flex: 1, minWidth: 140 }}
        />
      </div>

      {/* Desktop — table */}
      <div className="card only-desktop" style={{ padding: 6 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh sortKey="name" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>小组名称</SortTh>
                <SortTh sortKey="leader" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>组长</SortTh>
                <SortTh sortKey="count" activeKey={sortKey} dir={sortDir} onSort={toggleSort}>组员人数</SortTh>
                <th>聚会时间 / 地点</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((g) => (
                <tr key={g.id}>
                  <td>{g.name}</td>
                  <td>
                    {g.leaderName ? <strong>{g.leaderName}</strong> : <span className="faint">空缺</span>}
                  </td>
                  <td className="muted tnum">{g.memberCount}</td>
                  <td className="muted">{g.schedule || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-btn" title="查看详情" onClick={() => router.push(`/groups/${g.id}`)}>›</button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="faint" style={{ textAlign: 'center', padding: 28 }}>
                    {q.trim() ? '没有符合条件的小组。' : '尚无小组，点右上角「＋ 新增小组」创建。'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile — list tiles */}
      <div className="only-mobile">
        {sorted.map((g) => (
          <div key={g.id} className="mtile" onClick={() => router.push(`/groups/${g.id}`)}>
            <div className="mtile-row1">
              <div style={{ minWidth: 0 }}>
                <strong>{g.name}</strong>
                <span className="muted" style={{ fontSize: 12.5 }}> · 组长 {g.leaderName ?? '空缺'}</span>
              </div>
              <span className="mtile-cta">详情 →</span>
            </div>
            <div className="mtile-line">
              {g.memberCount} 位组员{g.schedule ? ` · ${g.schedule}` : ''}
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="faint" style={{ textAlign: 'center', padding: 28 }}>
            {q.trim() ? '没有符合条件的小组。' : '尚无小组，点右上角「＋ 新增小组」创建。'}
          </div>
        )}
      </div>

      {addOpen && (
        <AddGroupModal
          onClose={() => setAddOpen(false)}
          onSaved={(id) => {
            setAddOpen(false);
            groups.reload();
            toast('已新增小组');
            router.push(`/groups/${id}`);
          }}
        />
      )}
    </>
  );
}

function AddGroupModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [meetingDay, setMeetingDay] = useState<Weekday | ''>('');
  const [meetingTime, setMeetingTime] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) {
      setErr('请填写小组名称');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const g = await api.post<GroupRow>('/groups', {
        name: name.trim(),
        description: desc || undefined,
        meeting_day: meetingDay || undefined,
        meeting_time: meetingTime || undefined,
        location: location || undefined,
      });
      onSaved(g.id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="新增小组" onClose={onClose}>
      {err && <ErrorBanner message={err} />}
      <Field label="小组名称">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：迦南小组" />
      </Field>
      <Field label="简介">
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="新家庭小组" />
      </Field>
      <div className="form-row">
        <Field label="聚会日">
          <select value={meetingDay} onChange={(e) => setMeetingDay(e.target.value as Weekday | '')}>
            <option value="">未定</option>
            {WEEKDAY_OPTIONS.map((d) => (
              <option key={d} value={d}>{WEEKDAY_LABELS[d]}</option>
            ))}
          </select>
        </Field>
        <Field label="聚会时间">
          <input type="time" className={meetingTime ? undefined : 'date-empty'} value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} />
        </Field>
      </div>
      <Field label="地点">
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Emily家" />
      </Field>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>取消</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
      </div>
    </Modal>
  );
}
