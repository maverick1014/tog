'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFetch } from '@/lib/hooks';
import { api } from '@/lib/api';
import { usePageChrome } from '@/components/AppShell';
import { ErrorBanner, Field, Loading, Modal, useConfirm, useToast } from '@/components/ui';
import { exportMatrix } from '@/lib/export';
import { GroupAttendanceResponse, GroupDetail, GroupRow, MemberRow } from '@/lib/types';
import { ATTENDANCE_LABELS, positionZh, roleDot, roleTagStyle } from '@/lib/labels';
import {
  AttendanceStatus,
  canPromoteToLeadership,
  GroupPosition,
  LEADERSHIP_POSITIONS,
} from '@tog/shared';

const POSITION_OPTIONS: GroupPosition[] = [
  GroupPosition.Leader,
  GroupPosition.AssistantLeader,
  GroupPosition.InternLeader,
  GroupPosition.CoreMember,
  GroupPosition.RegularMember,
  GroupPosition.NewMember,
];

export default function GroupsPage() {
  const toast = useToast();
  const groups = useFetch<GroupRow[]>('/groups');
  const members = useFetch<MemberRow[]>('/members');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  usePageChrome({
    title: '小组管理',
    subtitle: '身份分配中心 · 每组各一位组长 / 副组长 / 实习组长',
    action: (
      <button className="btn" onClick={() => setAddOpen(true)}>
        ＋ 新增小组
      </button>
    ),
  });

  const groupList = groups.data ?? [];

  useEffect(() => {
    if (!activeId && groupList.length) setActiveId(groupList[0].id);
  }, [groupList, activeId]);

  const detail = useFetch<GroupDetail>(activeId ? `/groups/${activeId}` : null);

  const refreshAll = () => {
    groups.reload();
    members.reload();
    detail.reload();
  };

  if (groups.loading) return <Loading />;

  return (
    <>
      <ErrorBanner message={groups.error || members.error} />

      <div className="flex items-center gap-8 flex-wrap mb-16">
        {groupList.map((g) => {
          const count = (members.data ?? []).filter((m) => m.group_id === g.id).length;
          return (
            <button
              key={g.id}
              className={`chip ${activeId === g.id ? 'on' : ''}`}
              onClick={() => setActiveId(g.id)}
            >
              {g.name} · {count}
            </button>
          );
        })}
        {groupList.length === 0 && <div className="faint">尚无小组，点右上角「＋ 新增小组」创建。</div>}
      </div>

      {activeId && detail.data && (
        <GroupPanel
          key={activeId}
          group={detail.data}
          allMembers={members.data ?? []}
          onChanged={refreshAll}
          onDeleted={() => {
            setActiveId(null);
            refreshAll();
            toast('已删除小组');
          }}
          toast={toast}
        />
      )}

      {addOpen && (
        <AddGroupModal
          onClose={() => setAddOpen(false)}
          onSaved={(id) => {
            setAddOpen(false);
            setActiveId(id);
            refreshAll();
            toast('已新增小组');
          }}
        />
      )}
    </>
  );
}

function GroupPanel({
  group,
  allMembers,
  onChanged,
  onDeleted,
  toast,
}: {
  group: GroupDetail;
  allMembers: MemberRow[];
  onChanged: () => void;
  onDeleted: () => void;
  toast: (m: string) => void;
}) {
  const confirm = useConfirm();
  const [name, setName] = useState(group.name);
  const [desc, setDesc] = useState(group.description ?? '');
  const [addSel, setAddSel] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const groupMembers = group.members;

  const leadOf = (pos: GroupPosition) =>
    groupMembers.find((m) => m.group_position === pos)?.full_name ?? '空缺';

  const leadFilled = LEADERSHIP_POSITIONS.filter((p) =>
    groupMembers.some((m) => m.group_position === p),
  ).length;

  const unassigned = useMemo(
    () => allMembers.filter((m) => m.group_id !== group.id),
    [allMembers, group.id],
  );

  const saveGroup = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.patch(`/groups/${group.id}`, { name, description: desc });
      toast('已保存设定');
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const deleteGroup = async () => {
    const ok = await confirm({
      title: '删除小组',
      message: `删除「${group.name}」？组员将变为未分组。`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/groups/${group.id}`);
      onDeleted();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const addMember = async () => {
    if (!addSel) return;
    try {
      await api.patch(`/members/${addSel}`, {
        group_id: group.id,
        group_position: GroupPosition.NewMember,
      });
      setAddSel('');
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const removeMember = async (memberId: string) => {
    const name = groupMembers.find((m) => m.id === memberId)?.full_name ?? '该成员';
    const ok = await confirm({
      title: '移出小组',
      message: `将 ${name} 移出本组？其身份与在组职位会一并清除。`,
      confirmText: '移出',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.patch(`/members/${memberId}`, { group_id: null, group_position: null });
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const changePosition = async (memberId: string, next: GroupPosition) => {
    setErr(null);
    try {
      // Rule 2: one holder per leadership position — auto-demote the incumbent.
      if (LEADERSHIP_POSITIONS.includes(next)) {
        const incumbent = groupMembers.find(
          (m) => m.group_position === next && m.id !== memberId,
        );
        if (incumbent) {
          await api.patch(`/members/${incumbent.id}`, {
            group_position: GroupPosition.CoreMember,
          });
        }
      }
      await api.patch(`/members/${memberId}`, { group_position: next });
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const TriNode = ({ pos, style }: { pos: GroupPosition; style: React.CSSProperties }) => {
    const filled = groupMembers.some((m) => m.group_position === pos);
    const roleZh = positionZh(pos);
    return (
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'var(--surface)', padding: '3px 8px', borderRadius: 8, ...style }}>
        <span
          className={`badge ${filled ? '' : 'b-gray'}`}
          style={filled ? { ...roleTagStyle(roleZh), fontWeight: 700 } : { fontWeight: 700 }}
        >
          {filled && <i className="dot" style={{ background: roleDot(roleZh) }} />}
          {roleZh}
        </span>
        <strong style={{ fontSize: 13, color: filled ? 'var(--ink)' : 'var(--faint)' }}>
          {leadOf(pos)}
        </strong>
      </div>
    );
  };

  return (
    <>
      {err && <ErrorBanner message={err} />}
      <div className="grid" style={{ gridTemplateColumns: '360px 1fr', gap: 16, alignItems: 'start' }} data-glayout>
        {/* Left — group info + 铁三角 */}
        <div className="card">
          <div className="card-head">
            <h3>小组资料 · 带领团队</h3>
          </div>
          <Field label="小组名称">
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="简介 / 聚会时间">
            <input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </Field>

          <div className="flex-between" style={{ margin: '16px 0 4px' }}>
            <div className="section-label">
              铁三角 <span style={{ fontWeight: 400, fontSize: 12 }} className="muted">· 带领团队</span>
            </div>
            <span className="faint" style={{ fontSize: 11.5 }}>{leadFilled} / 3 就位</span>
          </div>
          <div style={{ position: 'relative', height: 150, margin: '2px 0 4px' }}>
            <svg viewBox="0 0 300 150" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
              <path d="M150 28 L54 122 L246 122 Z" fill="var(--brand)" fillOpacity="0.04" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="5 5" />
            </svg>
            <TriNode pos={GroupPosition.Leader} style={{ top: 8, left: '50%', transform: 'translateX(-50%)' }} />
            <TriNode pos={GroupPosition.AssistantLeader} style={{ bottom: 6, left: 0 }} />
            <TriNode pos={GroupPosition.InternLeader} style={{ bottom: 6, right: 0 }} />
          </div>

          <div className="hint" style={{ margin: '12px 0 14px' }}>
            💡 身份在右侧「组员分配」逐人设定。<strong>小组长 / 副组长 / 实习组长每组各一人</strong>，且须先晋升为<strong>核心成员</strong>方可担任。
          </div>
          <div className="flex gap-8">
            <button className="btn" onClick={saveGroup} disabled={busy}>保存设定</button>
            <button className="btn ghost" onClick={deleteGroup}>删除小组</button>
          </div>
        </div>

        {/* Right — member allocation */}
        <div className="card">
          <div className="card-head">
            <h3>组员分配 <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>（{groupMembers.length} 人）</span></h3>
          </div>
          <div className="flex gap-8 mb-14">
            <select value={addSel} onChange={(e) => setAddSel(e.target.value)} style={{ flex: 1 }}>
              <option value="">选择成员加入本组…</option>
              {unassigned.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                  {m.group ? `（${m.group.name}）` : ''}
                </option>
              ))}
            </select>
            <button className="btn accent" onClick={addMember} disabled={!addSel}>＋ 添加成员</button>
          </div>
          <div className="table-wrap">
            <table>
              <tbody>
                {groupMembers.map((m) => {
                  const cur = m.group_position;
                  return (
                    <tr key={m.id}>
                      <td>
                        <strong>{m.full_name}</strong>
                      </td>
                      <td>
                        <select
                          value={cur ?? GroupPosition.NewMember}
                          onChange={(e) => changePosition(m.id, e.target.value as GroupPosition)}
                          style={{ minWidth: 120 }}
                        >
                          {POSITION_OPTIONS.map((p) => {
                            const isLeadership = LEADERSHIP_POSITIONS.includes(p);
                            // Rule 3: leadership only for those already core-or-above.
                            const disabled = isLeadership && !canPromoteToLeadership(cur);
                            return (
                              <option key={p} value={p} disabled={disabled && p !== cur}>
                                {positionZh(p)}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn ghost sm" onClick={() => removeMember(m.id)}>移除</button>
                      </td>
                    </tr>
                  );
                })}
                {groupMembers.length === 0 && (
                  <tr>
                    <td className="faint" style={{ textAlign: 'center', padding: 24 }}>
                      本组暂无成员，从上方选择加入。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="hint mt-14">
            💡 只有<strong>核心成员</strong>可晋升为小组长 / 副组长 / 实习组长；指派新的领袖会自动将原领袖降为核心成员。
          </div>
        </div>
      </div>

      <WeeklyAttendance groupId={group.id} />
    </>
  );
}

function WeeklyAttendance({ groupId }: { groupId: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, reload } = useFetch<GroupAttendanceResponse>(
    `/groups/${groupId}/attendance`,
  );

  const toggle = async (meetingId: string, memberId: string, cur: AttendanceStatus | null) => {
    const next =
      cur === AttendanceStatus.Present ? AttendanceStatus.Absent : AttendanceStatus.Present;
    await api.post(`/groups/meetings/${meetingId}/attendance`, {
      records: [{ member_id: memberId, status: next }],
    });
    reload();
  };

  const addWeek = async () => {
    // Weeks are recorded as 第1周 / 第2周 …; we still store a date under the
    // hood (last week + 7 days, or today) purely to keep a stable order.
    const last = data?.meetings[data.meetings.length - 1]?.meeting_date;
    const base = last ? new Date(last) : new Date();
    if (last) base.setDate(base.getDate() + 7);
    const iso = base.toISOString().slice(0, 10);
    try {
      await api.post(`/groups/${groupId}/meetings`, { meeting_date: iso });
      reload();
      toast('已添加一周');
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const delWeek = async (meetingId: string) => {
    const ok = await confirm({
      title: '删除本周聚会',
      message: '删除本周聚会及其出席记录？',
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    await api.delete(`/groups/meetings/${meetingId}`);
    reload();
  };

  const exportGrid = () => {
    if (!data) return;
    const headers = ['成员', ...data.meetings.map((_, i) => `第${i + 1}周`), '出席次数'];
    const matrix = data.rows.map((r) => [
      r.member.full_name,
      ...r.cells.map((c) => (c.status ? ATTENDANCE_LABELS[c.status] : '')),
      r.cells.filter((c) => c.status === AttendanceStatus.Present).length,
    ]);
    exportMatrix('小组每周出席', '出席', headers, matrix);
  };

  return (
    <div className="card mt-16">
      <div className="card-head">
        <div>
          <h3>每周出席</h3>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            勾选表示当周出席
          </div>
        </div>
        <div className="flex gap-8">
          <button className="btn ghost sm" onClick={exportGrid} disabled={!data || data.meetings.length === 0}>
            ⬇ 导出
          </button>
          <button className="btn sm" onClick={addWeek}>＋ 添加一周</button>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : !data || data.meetings.length === 0 ? (
        <div className="empty">尚无每周聚会记录，点「＋ 添加本周」开始。</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>成员</th>
                {data.meetings.map((m, i) => (
                  <th key={m.id} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    第{i + 1}周
                    <button
                      onClick={() => delWeek(m.id)}
                      title="删除本周"
                      style={{ marginLeft: 6, border: 'none', background: 'transparent', color: 'var(--faint)', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </th>
                ))}
                <th style={{ textAlign: 'center' }}>出席</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.member.id}>
                  <td><strong>{r.member.full_name}</strong></td>
                  {r.cells.map((c) => (
                    <td key={c.meeting_id} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={c.status === AttendanceStatus.Present}
                        onChange={() => toggle(c.meeting_id, r.member.id, c.status)}
                        style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--brand)' }}
                        title={c.status === AttendanceStatus.Present ? '出席' : '未出席'}
                      />
                    </td>
                  ))}
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>
                    {r.cells.filter((c) => c.status === AttendanceStatus.Present).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
      <Field label="简介 / 聚会时间">
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="新家庭小组 · 周日 14:00" />
      </Field>
      <div className="modal-actions">
        <button className="btn ghost" onClick={onClose}>取消</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</button>
      </div>
    </Modal>
  );
}
