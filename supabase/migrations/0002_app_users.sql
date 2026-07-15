-- ===========================================================================
-- App users / login accounts (用户管理)
-- ---------------------------------------------------------------------------
-- Every login account is tied to exactly one member profile. Auth itself is
-- NOT wired up yet (no Supabase Auth in v1) — this table models the accounts,
-- permission role, security & preference settings shown on the 用户管理 screen,
-- leaving room to attach Supabase Auth (auth.users) later.
-- ===========================================================================

-- Permission role, distinct from the church/group identity. A person's church
-- rank is derived from their member profile; this is what they may DO in the app.
create type account_role as enum (
  'super_admin', -- 超级管理员
  'admin',       -- 管理员
  'coworker',    -- 同工
  'readonly'     -- 只读
);

create type account_status as enum ('active', 'disabled');

create table app_users (
  id             uuid primary key default gen_random_uuid(),
  -- Each account is linked to one member profile (one account per member).
  member_id      uuid not null unique references members(id) on delete cascade,
  email          text not null unique,
  account_role   account_role not null default 'coworker',
  status         account_status not null default 'active',
  -- Placeholder for later Supabase Auth integration; unused in v1.
  password_hash  text,
  two_factor     boolean not null default false,
  language       text not null default 'zh-CN',
  notify_discipleship boolean not null default true,
  notify_donation     boolean not null default false,
  notify_weekly       boolean not null default false,
  last_sign_in_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index app_users_member_idx on app_users(member_id);

create trigger app_users_set_updated_at
  before update on app_users
  for each row execute function set_updated_at();
