-- ===========================================================================
-- Church Management System (tog) - initial schema
-- ---------------------------------------------------------------------------
-- The database schema is the source of truth for the whole application.
-- Apply with: supabase db push   (or the Supabase MCP apply_migration tool)
-- ===========================================================================

create extension if not exists "pgcrypto";

-- Auto-update updated_at columns ------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ===========================================================================
-- Enums
-- ===========================================================================
-- Church-level standing (lives on the member; independent of any group).
create type church_role as enum (
  'pastor',  -- 牧师 (church leadership)
  'member'   -- 一般成员 (standing derived from group position)
);

-- A member's classification *within* their group. This is where the seven
-- ranks (minus 牧师) actually come from: allocated per member in the group
-- setup page. A member has at most one position in at most one group.
create type group_position as enum (
  'leader',           -- 小组长
  'assistant_leader', -- 副组长
  'intern_leader',    -- 实习组长
  'core_member',      -- 核心成员
  'regular_member',   -- 普通成员
  'new_member'        -- 新成员
);

create type member_status as enum ('active', 'inactive');
create type gender_type as enum ('male', 'female', 'other');

create type event_type as enum ('service', 'meeting', 'prayer', 'fellowship', 'other');
create type attendance_status as enum ('present', 'absent', 'excused');

create type donation_method as enum ('cash', 'bank_transfer', 'card', 'online', 'other');

create type enrollment_status as enum ('pending', 'approved', 'in_progress', 'completed', 'dropped');

create type pair_status as enum ('active', 'completed', 'paused');

-- ===========================================================================
-- Households (family units) & Groups (小组 / cell groups)
-- ===========================================================================
create table households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  address    text,
  phone      text,
  created_at timestamptz not null default now()
);

create table groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);
-- Note: the leadership team (小组长/副组长/实习组长) is NOT stored here.
-- It is derived from members.group_position, so there is a single source of
-- truth for who leads a group (see the members table + unique indexes below).

-- ===========================================================================
-- Members
-- ===========================================================================
create table members (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null,
  chinese_name   text,
  email          text,
  phone          text,
  gender         gender_type,
  date_of_birth  date,
  church_role    church_role not null default 'member',
  status         member_status not null default 'active',
  group_id       uuid references groups(id) on delete set null,
  -- classification within group_id; null when the member is not in a group.
  group_position group_position,
  household_id   uuid references households(id) on delete set null,
  joined_at      date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- a position only makes sense together with a group
  constraint members_position_needs_group
    check (group_position is null or group_id is not null)
  -- business rule: "only a core member may be promoted to a leadership post"
  -- is enforced in the application layer (it is a workflow rule, not a data one).
);

create index members_group_id_idx on members(group_id);
create index members_household_id_idx on members(household_id);
create index members_church_role_idx on members(church_role);
create index members_group_position_idx on members(group_id, group_position);

-- One 小组长 / 副组长 / 实习组长 per group (每职位一人).
create unique index members_one_leader_per_group
  on members(group_id) where group_position = 'leader';
create unique index members_one_assistant_per_group
  on members(group_id) where group_position = 'assistant_leader';
create unique index members_one_intern_per_group
  on members(group_id) where group_position = 'intern_leader';

create trigger members_set_updated_at
  before update on members
  for each row execute function set_updated_at();

-- ===========================================================================
-- Events & attendance
-- ===========================================================================
create table events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  event_type  event_type not null default 'service',
  location    text,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index events_starts_at_idx on events(starts_at);

create table event_attendance (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  member_id     uuid not null references members(id) on delete cascade,
  status        attendance_status not null default 'present',
  checked_in_at timestamptz default now(),
  notes         text,
  unique (event_id, member_id)
);

create index event_attendance_event_idx on event_attendance(event_id);
create index event_attendance_member_idx on event_attendance(member_id);

-- ===========================================================================
-- Donations / giving
-- ===========================================================================
create table donations (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid references members(id) on delete set null, -- null = anonymous
  amount     numeric(12,2) not null check (amount >= 0),
  currency   text not null default 'MYR',
  fund       text not null default 'offering',  -- tithe / offering / building / mission
  method     donation_method not null default 'cash',
  donated_at date not null default current_date,
  notes      text,
  created_at timestamptz not null default now()
);

create index donations_member_idx on donations(member_id);
create index donations_donated_at_idx on donations(donated_at);

-- ===========================================================================
-- Training catalog, sessions, enrollment & per-session attendance
-- ===========================================================================
create table trainings (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  category       text,
  trainer_id     uuid references members(id) on delete set null,
  total_sessions int not null default 1 check (total_sessions >= 1),
  is_enrollable  boolean not null default true,
  starts_on      date,
  ends_on        date,
  created_at     timestamptz not null default now()
);

-- A training may run at multiple times -> fully customisable sessions.
create table training_sessions (
  id             uuid primary key default gen_random_uuid(),
  training_id    uuid not null references trainings(id) on delete cascade,
  session_number int not null,
  title          text,
  scheduled_at   timestamptz,
  location       text,
  notes          text,
  unique (training_id, session_number)
);

create index training_sessions_training_idx on training_sessions(training_id);

-- Member enrolls (or is enrolled). Admin approves + tracks progress.
create table training_enrollments (
  id           uuid primary key default gen_random_uuid(),
  training_id  uuid not null references trainings(id) on delete cascade,
  member_id    uuid not null references members(id) on delete cascade,
  status       enrollment_status not null default 'pending',
  progress     int not null default 0 check (progress between 0 and 100),
  enrolled_at  timestamptz not null default now(),
  completed_at timestamptz,
  notes        text,
  unique (training_id, member_id)
);

create index training_enrollments_training_idx on training_enrollments(training_id);
create index training_enrollments_member_idx on training_enrollments(member_id);

-- Admin decides attended / not per session (used to generate the namelist).
create table training_attendance (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references training_sessions(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  attended   boolean not null default false,
  checked_at timestamptz default now(),
  notes      text,
  unique (session_id, member_id)
);

create index training_attendance_session_idx on training_attendance(session_id);

-- ===========================================================================
-- Discipleship: 四十天一对一守望 (Forty Days, one-on-one)
-- Cascade mentoring: pastor -> group leader -> assistant -> ... everyone.
-- ===========================================================================
create table discipleship_programs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  total_days  int not null default 40 check (total_days >= 1),
  created_at  timestamptz not null default now()
);

create table discipleship_pairs (
  id             uuid primary key default gen_random_uuid(),
  program_id     uuid not null references discipleship_programs(id) on delete cascade,
  mentor_id      uuid not null references members(id) on delete cascade,
  trainee_id     uuid not null references members(id) on delete cascade,
  -- The cascade lineage: the pair whose trainee is now this pair's mentor.
  parent_pair_id uuid references discipleship_pairs(id) on delete set null,
  status         pair_status not null default 'active',
  start_date     date default current_date,
  -- Unguessable token for the mentor's private daily-form link
  -- (/d/<form_token>): lets the mentor fill in progress without logging in.
  form_token     uuid not null default gen_random_uuid() unique,
  created_at     timestamptz not null default now(),
  unique (program_id, trainee_id),
  check (mentor_id <> trainee_id)
);

create index discipleship_pairs_program_idx on discipleship_pairs(program_id);
create index discipleship_pairs_mentor_idx on discipleship_pairs(mentor_id);
create index discipleship_pairs_trainee_idx on discipleship_pairs(trainee_id);

-- Daily form entry that the mentor fills to update the trainee's status.
create table discipleship_progress (
  id         uuid primary key default gen_random_uuid(),
  pair_id    uuid not null references discipleship_pairs(id) on delete cascade,
  day_number int not null check (day_number >= 1),
  entry_date date default current_date,
  completed  boolean not null default false,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pair_id, day_number)
);

create index discipleship_progress_pair_idx on discipleship_progress(pair_id);

create trigger discipleship_progress_set_updated_at
  before update on discipleship_progress
  for each row execute function set_updated_at();

-- ===========================================================================
-- Convenience view: discipleship pair progress summary (for pastor overview)
-- ===========================================================================
create view discipleship_pair_summary as
select
  p.id            as pair_id,
  p.program_id,
  prog.total_days,
  p.mentor_id,
  mentor.full_name  as mentor_name,
  p.trainee_id,
  trainee.full_name as trainee_name,
  p.status,
  count(dp.*) filter (where dp.completed) as days_completed,
  round(
    100.0 * count(dp.*) filter (where dp.completed) / nullif(prog.total_days, 0)
  )               as percent_complete
from discipleship_pairs p
join discipleship_programs prog on prog.id = p.program_id
join members mentor  on mentor.id = p.mentor_id
join members trainee on trainee.id = p.trainee_id
left join discipleship_progress dp on dp.pair_id = p.id
group by p.id, prog.total_days, mentor.full_name, trainee.full_name;
