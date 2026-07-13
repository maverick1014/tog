-- ===========================================================================
-- Seed data for local development / demo.
-- Run with: supabase db reset  (applies migrations + this seed)
-- ===========================================================================

-- Groups (小组)
insert into groups (id, name, description) values
  ('11111111-1111-1111-1111-111111111111', '恩典小组 (Grace Group)', 'Sunday cell group'),
  ('22222222-2222-2222-2222-222222222222', '青年小组 (Youth Group)', 'Youth fellowship');

-- Members. church_role is 'member' for everyone except the pastor; the seven
-- ranks come from group_position, allocated per member within their group.
insert into members (id, full_name, chinese_name, email, phone, church_role, group_id, group_position, joined_at) values
  ('a0000000-0000-0000-0000-000000000001', 'John Tan',   '陈约翰', 'john@example.com',  '0121000001', 'pastor', null, null,                                                                 '2018-01-05'),
  ('a0000000-0000-0000-0000-000000000002', 'Mary Lim',   '林玛丽', 'mary@example.com',  '0121000002', 'member', '11111111-1111-1111-1111-111111111111', 'leader',           '2019-03-10'),
  ('a0000000-0000-0000-0000-000000000003', 'Peter Wong', '黄彼得', 'peter@example.com', '0121000003', 'member', '11111111-1111-1111-1111-111111111111', 'assistant_leader', '2020-06-01'),
  ('a0000000-0000-0000-0000-000000000004', 'Grace Ng',   '吴恩慈', 'grace@example.com', '0121000004', 'member', '22222222-2222-2222-2222-222222222222', 'intern_leader',    '2021-02-14'),
  ('a0000000-0000-0000-0000-000000000005', 'Daniel Ong', '王但以理','daniel@example.com','0121000005', 'member', '22222222-2222-2222-2222-222222222222', 'core_member',      '2021-09-20'),
  ('a0000000-0000-0000-0000-000000000006', 'Ruth Chin',  '陈路得', 'ruth@example.com',  '0121000006', 'member', '11111111-1111-1111-1111-111111111111', 'core_member',      '2022-11-11'),
  ('a0000000-0000-0000-0000-000000000007', 'Samuel Lee', '李撒母耳','samuel@example.com','0121000007', 'member', '22222222-2222-2222-2222-222222222222', 'new_member',       '2024-05-01');

-- An event + attendance
insert into events (id, title, event_type, location, starts_at) values
  ('e0000000-0000-0000-0000-000000000001', '主日崇拜 Sunday Service', 'service', 'Main Hall', now() - interval '1 day');

insert into event_attendance (event_id, member_id, status) values
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'present'),
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'present'),
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'absent');

-- Donations
insert into donations (member_id, amount, fund, method) values
  ('a0000000-0000-0000-0000-000000000002', 200.00, 'tithe', 'bank_transfer'),
  ('a0000000-0000-0000-0000-000000000005', 50.00,  'offering', 'cash'),
  (null, 500.00, 'building', 'online');

-- A training with sessions
insert into trainings (id, name, description, category, trainer_id, total_sessions, is_enrollable) values
  ('c0000000-0000-0000-0000-000000000001', '门徒训练 Discipleship 101', 'Foundations of faith', 'discipleship',
   'a0000000-0000-0000-0000-000000000001', 3, true);

insert into training_sessions (training_id, session_number, title, scheduled_at) values
  ('c0000000-0000-0000-0000-000000000001', 1, 'Week 1: Assurance', now() + interval '7 days'),
  ('c0000000-0000-0000-0000-000000000001', 2, 'Week 2: Prayer',    now() + interval '14 days'),
  ('c0000000-0000-0000-0000-000000000001', 3, 'Week 3: The Word',  now() + interval '21 days');

insert into training_enrollments (training_id, member_id, status, progress) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'approved', 33),
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'pending', 0);

-- The 四十天一对一守望 program with a cascade of pairs
insert into discipleship_programs (id, name, description, total_days) values
  ('d0000000-0000-0000-0000-000000000001', '四十天一对一守望', 'Forty Days one-on-one watch', 40);

-- Cascade: Pastor -> Group Leader -> Assistant Leader
insert into discipleship_pairs (id, program_id, mentor_id, trainee_id, parent_pair_id, status) values
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', null, 'active'),
  ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003',
   'f0000000-0000-0000-0000-000000000001', 'active');

-- Some daily progress for the first pair
insert into discipleship_progress (pair_id, day_number, completed, notes) values
  ('f0000000-0000-0000-0000-000000000001', 1, true, 'Day 1 devotion done'),
  ('f0000000-0000-0000-0000-000000000001', 2, true, 'Day 2 devotion done'),
  ('f0000000-0000-0000-0000-000000000001', 3, false, 'Missed');

-- Login accounts (用户管理). Each is tied to a member profile.
insert into app_users (member_id, email, account_role, status, two_factor, last_sign_in_at) values
  ('a0000000-0000-0000-0000-000000000001', 'john@grace.org',  'super_admin', 'active',   true,  now() - interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000002', 'mary@grace.org',  'coworker',    'active',   false, now() - interval '1 day'),
  ('a0000000-0000-0000-0000-000000000003', 'peter@grace.org', 'readonly',    'disabled', false, now() - interval '11 days');
