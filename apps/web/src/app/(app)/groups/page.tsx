'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFetch } from '@/lib/hooks';
import { api } from '@/lib/api';
import { usePageChrome } from '@/components/AppShell';
import { ErrorBanner, Field, Loading, Modal, useToast } from '@/components/ui';
import { GroupDetail, GroupRow, MemberRow } from '@/lib/types';
import { positionZh } from '@/lib/labels';
import { canPromoteToLeadership, GroupPosition, LEADERSHIP_POSITIONS } from '@tog/shared';

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
    if (!confirm(`删除「${group.name}」？组员将变为未分组。`)) return;
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
    return (
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'var(--surface)', padding: '3px 8px', borderRadius: 8, ...style }}>
        <span className={`badge ${filled ? 'b-brand' : 'b-gray'}`} style={{ fontWeight: 700 }}>
          {positionZh(pos)}
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
              铁三角 <span style={{ fontWeight: 400, fontSize: 12 }} className="muted">· 带领团队（推导）</span>
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
