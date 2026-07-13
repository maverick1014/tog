import {
  AccountRole,
  ACCOUNT_ROLE_LABELS,
  AccountStatus,
  AttendanceStatus,
  ChurchRole,
  DonationMethod,
  EnrollmentStatus,
  EventType,
  Gender,
  GROUP_POSITION_LABELS,
  GroupPosition,
  MemberStatus,
  PairStatus,
  displayRoleZh,
} from '@tog/shared';

/* -------------------------------------------------------------------------
 * Members & derived identity
 * ---------------------------------------------------------------------- */

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

/** Full display order for the seven ranks, for filter chips + charts. */
export const ROLE_ORDER = [
  '牧师',
  '小组长',
  '副组长',
  '实习组长',
  '核心成员',
  '普通成员',
  '新成员',
] as const;

/** Dot colours forming a crimson→charcoal→faint ramp (from the brand). */
export const ROLE_DOT: Record<string, string> = {
  牧师: '#9e1c1f',
  小组长: '#b23530',
  副组长: '#c15a4c',
  实习组长: '#d08375',
  核心成员: '#57514e',
  普通成员: '#837c79',
  新成员: '#b0a9a6',
  未分组: '#b0a9a6',
};

/** Badge tone class for a derived role. */
export function roleBadgeClass(role: string): string {
  if (role === '牧师') return 'b-brand';
  if (role === '小组长' || role === '副组长' || role === '实习组长') return 'b-accent';
  return 'b-gray';
}

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  [MemberStatus.Active]: '在册',
  [MemberStatus.Inactive]: '停止聚会',
};

export function memberStatusLabel(status: string): string {
  return MEMBER_STATUS_LABELS[status as MemberStatus] ?? status;
}

export function memberStatusClass(status: string): string {
  if (status === MemberStatus.Active) return 'b-good';
  return 'b-gray';
}

export const GENDER_LABELS: Record<string, string> = {
  [Gender.Male]: '男',
  [Gender.Female]: '女',
  [Gender.Other]: '其他',
};

/* -------------------------------------------------------------------------
 * Events & attendance
 * ---------------------------------------------------------------------- */

export const EVENT_TYPE_LABELS: Record<string, string> = {
  [EventType.Service]: '主日崇拜',
  [EventType.Meeting]: '聚会',
  [EventType.Prayer]: '祷告会',
  [EventType.Fellowship]: '团契',
  [EventType.Other]: '其他',
};

export const EVENT_TYPE_OPTIONS = [
  EventType.Service,
  EventType.Meeting,
  EventType.Prayer,
  EventType.Fellowship,
  EventType.Other,
];

export function eventBadgeClass(type: string): string {
  if (type === EventType.Service) return 'b-brand';
  if (type === EventType.Prayer) return 'b-accent';
  if (type === EventType.Fellowship) return 'b-good';
  if (type === EventType.Meeting) return 'b-warn';
  return 'b-gray';
}

export const ATTENDANCE_LABELS: Record<string, string> = {
  [AttendanceStatus.Present]: '出席',
  [AttendanceStatus.Excused]: '请假',
  [AttendanceStatus.Absent]: '缺席',
};

/* -------------------------------------------------------------------------
 * Donations
 * ---------------------------------------------------------------------- */

export const DONATION_FUNDS = ['十一奉献', '主日奉献', '建堂', '宣教', '感恩'];

export function fundBadgeClass(fund: string): string {
  switch (fund) {
    case '十一奉献':
      return 'b-brand';
    case '主日奉献':
      return 'b-accent';
    case '建堂':
      return 'b-good';
    case '宣教':
      return 'b-warn';
    default:
      return 'b-gray';
  }
}

export const DONATION_METHOD_LABELS: Record<string, string> = {
  [DonationMethod.Cash]: '现金',
  [DonationMethod.BankTransfer]: '银行转账',
  [DonationMethod.Card]: '刷卡',
  [DonationMethod.Online]: '线上',
  [DonationMethod.Other]: '其他',
};

export const DONATION_METHOD_OPTIONS = [
  DonationMethod.Cash,
  DonationMethod.BankTransfer,
  DonationMethod.Card,
  DonationMethod.Online,
];

/* -------------------------------------------------------------------------
 * Trainings & enrollment
 * ---------------------------------------------------------------------- */

export const TRAINING_CATEGORIES = ['门徒', '栽培', '事奉'];

export function categoryBadgeClass(cat: string | null): string {
  switch (cat) {
    case '门徒':
      return 'b-brand';
    case '栽培':
      return 'b-good';
    case '事奉':
      return 'b-warn';
    default:
      return 'b-accent';
  }
}

export const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  [EnrollmentStatus.Pending]: '待审核',
  [EnrollmentStatus.Approved]: '已通过',
  [EnrollmentStatus.InProgress]: '进行中',
  [EnrollmentStatus.Completed]: '已完成',
  [EnrollmentStatus.Dropped]: '已退出',
};

export function enrollmentStatusClass(status: string): string {
  switch (status) {
    case EnrollmentStatus.Completed:
    case EnrollmentStatus.Approved:
      return 'b-good';
    case EnrollmentStatus.InProgress:
      return 'b-warn';
    case EnrollmentStatus.Dropped:
      return 'b-crit';
    default:
      return 'b-gray';
  }
}

/* -------------------------------------------------------------------------
 * Discipleship
 * ---------------------------------------------------------------------- */

export const PAIR_STATUS_LABELS: Record<string, string> = {
  [PairStatus.Active]: '进行中',
  [PairStatus.Completed]: '已完成',
  [PairStatus.Paused]: '已暂停',
};

export function pairStatusClass(status: string): string {
  switch (status) {
    case PairStatus.Completed:
      return 'b-good';
    case PairStatus.Paused:
      return 'b-gray';
    default:
      return 'b-warn';
  }
}

/* -------------------------------------------------------------------------
 * Accounts (用户管理)
 * ---------------------------------------------------------------------- */

export const ACCOUNT_ROLE_ZH = ACCOUNT_ROLE_LABELS;

export const ACCOUNT_ROLE_OPTIONS = [
  AccountRole.SuperAdmin,
  AccountRole.Admin,
  AccountRole.Coworker,
  AccountRole.ReadOnly,
];

export function accountRoleClass(role: string): string {
  switch (role) {
    case AccountRole.SuperAdmin:
      return 'b-brand';
    case AccountRole.Admin:
      return 'b-accent';
    case AccountRole.Coworker:
      return 'b-good';
    default:
      return 'b-gray';
  }
}

export function accountStatusLabel(status: string): string {
  return status === AccountStatus.Active ? '启用' : '停用';
}

export function accountStatusClass(status: string): string {
  return status === AccountStatus.Active ? 'b-good' : 'b-gray';
}

/* -------------------------------------------------------------------------
 * Formatting helpers
 * ---------------------------------------------------------------------- */

export function initialOf(name: string | null | undefined): string {
  if (!name) return '?';
  return name.trim().slice(-2);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const date = `${d.getMonth() + 1}月${d.getDate()}日`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
  return `${date} ${time}`;
}

export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatMoneyShort(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString('en-MY');
}
