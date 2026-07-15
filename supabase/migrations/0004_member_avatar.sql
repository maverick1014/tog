-- ===========================================================================
-- Member profile picture
-- ---------------------------------------------------------------------------
-- avatar_url points at a public object in the `avatars` Storage bucket.
-- Uploads go through the server (service-role) route handler; the bucket is
-- public so the browser can render the image by URL.
-- ===========================================================================

alter table members add column if not exists avatar_url text;

-- Public storage bucket for avatars (id = name).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
