import {
  ChurchRole,
  displayRoleZh,
  EnrollmentStatus,
  EventType,
  GROUP_POSITION_LABELS,
  GroupPosition,
} from '@tog/shared';

/** Chinese label for a group position (小组长/副组长/…). */
export function positionZh(pos: GroupPosition | string | null): string {
  if (!pos) return '未分组';
  const l = GROUP_POSITION_LABELS[pos as GroupPosition];
  return l ? l.zh : String(pos);
}

/** The role shown for a member: 牧师 if pastor, else their group position. */
export function memberRoleZh(m: {
  church_role: ChurchRole;
  group_position: GroupPosition | null;
}): string {
  return displayRoleZh(m);
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  [EventType.Service]: '主日崇拜 Service',
  [EventType.Meeting]: '聚会 Meeting',
  [EventType.Prayer]: '祷告会 Prayer',
  [EventType.Fellowship]: '团契 Fellowship',
  [EventType.Other]: '其他 Other',
};

export const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  [EnrollmentStatus.Pending]: 'Pending',
  [EnrollmentStatus.Approved]: 'Approved',
  [EnrollmentStatus.InProgress]: 'In Progress',
  [EnrollmentStatus.Completed]: 'Completed',
  [EnrollmentStatus.Dropped]: 'Dropped',
};

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
