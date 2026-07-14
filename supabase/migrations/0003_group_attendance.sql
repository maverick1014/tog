-- ===========================================================================
-- Life-group (小组) weekly attendance
-- ---------------------------------------------------------------------------
-- Each group holds a weekly meeting; attendance is tracked per member per week
-- (reusing the attendance_status enum: present / excused / absent).
-- ===========================================================================

create table group_meetings (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups(id) on delete cascade,
  meeting_date date not null,
  note         text,
  created_at   timestamptz not null default now(),
  unique (group_id, meeting_date)
);

create index group_meetings_group_idx on group_meetings(group_id);

create table group_attendance (
  id         uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references group_meetings(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  status     attendance_status not null default 'present',
  created_at timestamptz not null default now(),
  unique (meeting_id, member_id)
);

create index group_attendance_meeting_idx on group_attendance(meeting_id);
