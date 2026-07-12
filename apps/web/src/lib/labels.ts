import {
  EnrollmentStatus,
  EventType,
  MEMBER_ROLE_LABELS,
  MemberRole,
} from '@tog/shared';

export function roleLabel(role: MemberRole | string): string {
  const l = MEMBER_ROLE_LABELS[role as MemberRole];
  return l ? `${l.zh} · ${l.en}` : String(role);
}

export function roleZh(role: MemberRole | string): string {
  const l = MEMBER_ROLE_LABELS[role as MemberRole];
  return l ? l.zh : String(role);
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
