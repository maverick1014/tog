-- ===========================================================================
-- Groups: structured meeting schedule instead of a single free-text field.
-- Additive only — `description` stays as a general blurb; meeting_day /
-- meeting_time / location are new, independently nullable columns.
-- ===========================================================================
create type weekday as enum (
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
);

alter table groups
  add column meeting_day  weekday,
  add column meeting_time time,
  add column location     text;
