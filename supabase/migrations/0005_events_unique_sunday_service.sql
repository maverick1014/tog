-- ===========================================================================
-- Prevent duplicate auto-created Sunday services
-- ---------------------------------------------------------------------------
-- The API auto-creates the upcoming Sundays' 主日崇拜 event on every GET
-- /api/events (see ensureSundayServices in the route handler) so pastors never
-- have to add it by hand. That check-then-insert has a narrow race window if
-- two requests land at the same instant with the same Sunday missing; this
-- partial unique index makes a same-timestamp duplicate insert fail instead
-- of silently creating a second identical event. The route handler already
-- tolerates that failure (does not fail the request over it).
-- ===========================================================================

create unique index if not exists events_unique_sunday_service
  on events (starts_at)
  where event_type = 'service';
