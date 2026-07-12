/**
 * Shared domain types & enums for the Church Management System (tog).
 * Mirrors the Supabase schema in /supabase/migrations.
 */

// ---------------------------------------------------------------------------
// Members & roles
// ---------------------------------------------------------------------------

/** Church member roles (ordered from most senior to newest). */
export enum MemberRole {
  Pastor = 'pastor', // 牧师
  GroupLeader = 'group_leader', // 小组长
  AssistantLeader = 'assistant_leader', // 副组长
  InternLeader = 'intern_leader', // 实习组长
  CoreMember = 'core_member', // 核心成员
  RegularMember = 'regular_member', // 普通成员
  NewMember = 'new_member', // 新成员
}

/** Human readable labels (English + Chinese) for each role. */
export const MEMBER_ROLE_LABELS: Record<MemberRole, { en: string; zh: string }> = {
  [MemberRole.Pastor]: { en: 'Pastor', zh: '牧师' },
  [MemberRole.GroupLeader]: { en: 'Group Leader', zh: '小组长' },
  [MemberRole.AssistantLeader]: { en: 'Assistant Leader', zh: '副组长' },
  [MemberRole.InternLeader]: { en: 'Intern Leader', zh: '实习组长' },
  [MemberRole.CoreMember]: { en: 'Core Member', zh: '核心成员' },
  [MemberRole.RegularMember]: { en: 'Regular Member', zh: '普通成员' },
  [MemberRole.NewMember]: { en: 'New Member', zh: '新成员' },
};

export const MEMBER_ROLE_ORDER: MemberRole[] = [
  MemberRole.Pastor,
  MemberRole.GroupLeader,
  MemberRole.AssistantLeader,
  MemberRole.InternLeader,
  MemberRole.CoreMember,
  MemberRole.RegularMember,
  MemberRole.NewMember,
];

export enum MemberStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export enum Gender {
  Male = 'male',
  Female = 'female',
  Other = 'other',
}

export interface Member {
  id: string;
  full_name: string;
  chinese_name: string | null;
  email: string | null;
  phone: string | null;
  gender: Gender | null;
  date_of_birth: string | null;
  role: MemberRole;
  status: MemberStatus;
  group_id: string | null;
  household_id: string | null;
  joined_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Groups (小组) & households
// ---------------------------------------------------------------------------

export interface Group {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  created_at: string;
}

export interface Household {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Events & attendance
// ---------------------------------------------------------------------------

export enum EventType {
  Service = 'service', // 主日崇拜
  Meeting = 'meeting', // 聚会
  Prayer = 'prayer', // 祷告会
  Fellowship = 'fellowship', // 团契
  Other = 'other',
}

export interface ChurchEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

export enum AttendanceStatus {
  Present = 'present',
  Absent = 'absent',
  Excused = 'excused',
}

export interface EventAttendance {
  id: string;
  event_id: string;
  member_id: string;
  status: AttendanceStatus;
  checked_in_at: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Donations
// ---------------------------------------------------------------------------

export enum DonationMethod {
  Cash = 'cash',
  BankTransfer = 'bank_transfer',
  Card = 'card',
  Online = 'online',
  Other = 'other',
}

export interface Donation {
  id: string;
  member_id: string | null; // null = anonymous
  amount: number;
  currency: string;
  fund: string; // e.g. tithe, offering, building, mission
  method: DonationMethod;
  donated_at: string;
  notes: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Training catalog, sessions, enrollment & attendance
// ---------------------------------------------------------------------------

export interface Training {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  trainer_id: string | null;
  total_sessions: number;
  is_enrollable: boolean;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
}

export interface TrainingSession {
  id: string;
  training_id: string;
  session_number: number;
  title: string | null;
  scheduled_at: string | null;
  location: string | null;
  notes: string | null;
}

export enum EnrollmentStatus {
  Pending = 'pending', // requested, awaiting admin approval
  Approved = 'approved', // admin approved / enrolled
  InProgress = 'in_progress',
  Completed = 'completed',
  Dropped = 'dropped',
}

export interface TrainingEnrollment {
  id: string;
  training_id: string;
  member_id: string;
  status: EnrollmentStatus;
  progress: number; // 0-100
  enrolled_at: string;
  completed_at: string | null;
  notes: string | null;
}

export interface TrainingAttendance {
  id: string;
  session_id: string;
  member_id: string;
  attended: boolean;
  checked_at: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Discipleship: 四十天一对一守望 (Forty Days one-on-one)
// ---------------------------------------------------------------------------

export interface DiscipleshipProgram {
  id: string;
  name: string;
  description: string | null;
  total_days: number; // default 40
  created_at: string;
}

export enum PairStatus {
  Active = 'active',
  Completed = 'completed',
  Paused = 'paused',
}

/**
 * A one-to-one mentoring pair inside a program. The cascade is captured by
 * parent_pair_id: a trainee of one pair becomes the mentor of the next.
 */
export interface DiscipleshipPair {
  id: string;
  program_id: string;
  mentor_id: string;
  trainee_id: string;
  parent_pair_id: string | null;
  status: PairStatus;
  start_date: string | null;
  created_at: string;
}

/** One daily form entry filled in by the mentor for a pair. */
export interface DiscipleshipProgress {
  id: string;
  pair_id: string;
  day_number: number; // 1..total_days
  entry_date: string | null;
  completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
