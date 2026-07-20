'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFetch } from '@/lib/hooks';
import { api } from '@/lib/api';
import { usePageChrome, useMe } from '@/components/AppShell';
import { ErrorBanner, Field, Loading, Modal, useConfirm, useToast } from '@/components/ui';
import { can } from '@/lib/perms';
import { exportMatrix } from '@/lib/export';
import { GroupAttendanceResponse, GroupDetail, GroupRow, MemberRow } from '@/lib/types';
import {
  ATTENDANCE_LABELS,
  GROUP_POSITION_OPTIONS as POSITION_OPTIONS,
  positionZh,
  roleDot,
  roleTagStyle,
} from '@/lib/labels';
import { AttendanceStatus, GroupPosition, LEADERSHIP_POSITIONS } from '@tog/shared';

export default function GroupsPage() {
  const toast = useToast();
  const perms = can(useMe().role);
  const groups = useFetch<GroupRow[]>('/groups');
  const members = useFetch<MemberRow[]>('/members');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  usePageChrome(
    {
      title: '小组管理',
      subtitle: '身份分配中心 · 每组各一位组长 / 副组长 / 实习组长',
      action: perms.write ? (
        <button className="btn" onClick={() => setAddOpen(true)}>
          ＋ 新增小组
        </button>
      ) : undefined,
    },
    [perms.write],
  );

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

  if (groups.initialLoading) return <Loading />;

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
  const perms = can(useMe().role);
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

  const renderTriNode = (pos: GroupPosition, style: React.CSSProperties) => {
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
            {renderTriNode(GroupPosition.Leader, { top: 8, left: '50%', transform: 'translateX(-50%)' })}
            {renderTriNode(GroupPosition.AssistantLeader, { bottom: 6, left: 0 })}
            {renderTriNode(GroupPosition.InternLeader, { bottom: 6, right: 0 })}
          </div>

          <div className="hint" style={{ margin: '12px 0 14px' }}>
            💡 身份在右侧「组员分配」逐人设定。指派新的领袖会自动将原领袖降为核心成员。
          </div>
          {perms.write && (
            <div className="flex gap-8">
              <button className="btn" onClick={saveGroup} disabled={busy}>保存设定</button>
              {perms.delete && <button className="btn ghost" onClick={deleteGroup}>删除小组</button>}
            </div>
          )}
        </div>

        {/* Right — member allocation */}
        <div className="card">
          <div className="card-head">
            <h3>组员分配 <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>（{groupMembers.length} 人）</span></h3>
          </div>
          {perms.write && (
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
          )}
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
                          disabled={!perms.write}
                        >
                          {POSITION_OPTIONS.map((p) => (
                            <option key={p} value={p}>{positionZh(p)}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {perms.write && (
                          <button className="btn ghost" onClick={() => removeMember(m.id)}>移除</button>
                        )}
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

/** The Sundays of a given month — the fixed weeks for that year/month combo. */
function weeksOfMonth(year: number, month1to12: number) {
  const out: { no: number; date: string; day: number }[] = [];
  const d = new Date(year, month1to12 - 1, 1);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1); // first Sunday
  let n = 1;
  while (d.getMonth() === month1to12 - 1) {
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    out.push({ no: n, date, day: d.getDate() });
    d.setDate(d.getDate() + 7);
    n++;
  }
  return out;
}

function WeeklyAttendance({ groupId }: { groupId: string }) {
  const toast = useToast();
  const perms = can(useMe().role);
  const { data, initialLoading, reload } = useFetch<GroupAttendanceResponse>(
    `/groups/${groupId}/attendance`,
  );

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Weeks are fixed by the year+month (each Sunday of that month) — not editable.
  const weeks = useMemo(() => weeksOfMonth(year, month), [year, month]);

  // Year options: this year, last year, plus any year that already has records.
  const years = useMemo(() => {
    const set = new Set<number>([now.getFullYear(), now.getFullYear() - 1]);
    (data?.meetings ?? []).forEach((m) => set.add(Number(m.meeting_date.slice(0, 4))));
    return [...set].filter((y) => y > 0).sort((a, b) => b - a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // date → meeting id, and member → (date → status), so a week column can look
  // up its cell regardless of which meetings currently exist.
  const meetingIdByDate = useMemo(() => {
    const m = new Map<string, string>();
    (data?.meetings ?? []).forEach((mt) => m.set(mt.meeting_date.slice(0, 10), mt.id));
    return m;
  }, [data]);

  const statusByMemberDate = useMemo(() => {
    const dateOf = new Map<string, string>();
    (data?.meetings ?? []).forEach((mt) => dateOf.set(mt.id, mt.meeting_date.slice(0, 10)));
    const map = new Map<string, Map<string, AttendanceStatus | null>>();
    (data?.rows ?? []).forEach((r) => {
      const inner = new Map<string, AttendanceStatus | null>();
      r.cells.forEach((c) => {
        const ds = dateOf.get(c.meeting_id);
        if (ds) inner.set(ds, c.status);
      });
      map.set(r.member.id, inner);
    });
    return map;
  }, [data]);

  const toggle = async (dateStr: string, memberId: string, present: boolean) => {
    const next = present ? AttendanceStatus.Absent : AttendanceStatus.Present;
    try {
      let mid = meetingIdByDate.get(dateStr);
      if (!mid) {
        // The week's meeting row is created lazily the first time it's marked.
        const meeting = await api.post<{ id: string }>(`/groups/${groupId}/meetings`, {
          meeting_date: dateStr,
        });
        mid = meeting.id;
      }
      await api.post(`/groups/meetings/${mid}/attendance`, {
        records: [{ member_id: memberId, status: next }],
      });
      reload();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const exportGrid = () => {
    if (!data) return;
    const headers = ['成员', ...weeks.map((w) => `第${w.no}周(${w.day}日)`), '出席次数'];
    const matrix = (data.rows ?? []).map((r) => {
      const inner = statusByMemberDate.get(r.member.id);
      const cells = weeks.map((w) => {
        const s = inner?.get(w.date);
        return s ? ATTENDANCE_LABELS[s] : '';
      });
      const count = weeks.filter((w) => inner?.get(w.date) === AttendanceStatus.Present).length;
      return [r.member.full_name, ...cells, count];
    });
    exportMatrix(`小组每周出席_${year}年${month}月`, '出席', headers, matrix);
  };

  return (
    <div className="card mt-16">
      <div className="card-head">
        <div>
          <h3>每周出席</h3>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            按年 / 月查看 · 每周固定为当月主日 · 勾选表示当周出席
          </div>
        </div>
        <button className="btn ghost sm" onClick={exportGrid} disabled={!data}>
          ⬇ 导出
        </button>
      </div>

      <div className="flex gap-8 mb-14 flex-wrap">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 'auto' }}>
          {years.map((y) => (
            <option key={y} value={y}>{y} 年</option>
          ))}
        </select>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 'auto' }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((mo) => (
            <option key={mo} value={mo}>{mo} 月</option>
          ))}
        </select>
      </div>

      {initialLoading ? (
        <Loading />
      ) : !data || data.rows.length === 0 ? (
        <div className="empty">本组暂无成员。</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>成员</th>
                {weeks.map((w) => (
                  <th key={w.date} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    第{w.no}周
                    <div className="faint" style={{ fontSize: 10.5, fontWeight: 400 }}>{w.day}日</div>
                  </th>
                ))}
                <th style={{ textAlign: 'center' }}>出席</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => {
                const inner = statusByMemberDate.get(r.member.id);
                return (
                  <tr key={r.member.id}>
                    <td><strong>{r.member.full_name}</strong></td>
                    {weeks.map((w) => {
                      const present = inner?.get(w.date) === AttendanceStatus.Present;
                      return (
                        <td key={w.date} style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={present}
                            onChange={() => toggle(w.date, r.member.id, present)}
                            disabled={!perms.write}
                            style={{ width: 18, height: 18, cursor: perms.write ? 'pointer' : 'default', accentColor: 'var(--brand)' }}
                            title={present ? '出席' : '未出席'}
                          />
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>
                      {weeks.filter((w) => inner?.get(w.date) === AttendanceStatus.Present).length}
                    </td>
                  </tr>
                );
              })}
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
