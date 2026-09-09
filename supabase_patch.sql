-- Run this ONCE in Supabase SQL Editor after the original Baanbreker Sewens schema.
-- It adds the fields used by the live app.

alter table public.tournament_settings
  add column if not exists tournament_dates text default '16–17 Oktober 2026';

alter table public.teams
  add column if not exists school text;

-- Optional privacy improvement: keep referee contact details private.
-- The app only needs referee names/qualifications publicly.
drop policy if exists "Public can view referees" on public.referees;
drop policy if exists "Public can view active referee names" on public.referees;
create policy "Public can view active referee names"
on public.referees
for select
using (active = true);

-- Make sure realtime can publish live changes.
alter table public.teams replica identity full;
alter table public.matches replica identity full;
alter table public.referees replica identity full;
alter table public.referee_allocations replica identity full;
alter table public.tournament_settings replica identity full;

-- If the tables are not already in the realtime publication, add them.
do $$
begin
  begin alter publication supabase_realtime add table public.teams; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.matches; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.referees; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.referee_allocations; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.tournament_settings; exception when duplicate_object then null; end;
end $$;

-- Admin authentication + storage fix.
-- This patch supports older installs where admin_users used "id" instead of "user_id".

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='admin_users' AND column_name='id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='admin_users' AND column_name='user_id'
  ) THEN
    ALTER TABLE public.admin_users RENAME COLUMN id TO user_id;
  END IF;
END $$;

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'admin';

-- Remove old policies that may already exist, then recreate them safely.
DROP POLICY IF EXISTS "admins read own row" ON public.admin_users;
CREATE POLICY "admins read own row"
ON public.admin_users FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_baanbreker_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
      AND admin_users.active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_baanbreker_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_baanbreker_admin() TO authenticated;

-- Make the supplied owner account an administrator if the Auth account exists.
INSERT INTO public.admin_users (user_id, role, active)
SELECT id, 'admin', true
FROM auth.users
WHERE lower(email) = lower('jago@banies.co.za')
ON CONFLICT (user_id) DO UPDATE
SET role='admin', active=true;

-- Storage bucket.
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-logos', 'team-logos', true)
ON CONFLICT (id) DO UPDATE SET public=true;

DROP POLICY IF EXISTS "Baanbreker team logos public read" ON storage.objects;
DROP POLICY IF EXISTS "Baanbreker team logos admin upload" ON storage.objects;
DROP POLICY IF EXISTS "Baanbreker team logos admin update" ON storage.objects;
DROP POLICY IF EXISTS "Baanbreker team logos admin delete" ON storage.objects;
DROP POLICY IF EXISTS "Public can view team logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload team logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update team logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete team logos" ON storage.objects;
DROP POLICY IF EXISTS "Team logos public read" ON storage.objects;
DROP POLICY IF EXISTS "Team logos admin upload" ON storage.objects;
DROP POLICY IF EXISTS "Team logos admin update" ON storage.objects;
DROP POLICY IF EXISTS "Team logos admin delete" ON storage.objects;

CREATE POLICY "Baanbreker team logos public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id='team-logos');

CREATE POLICY "Baanbreker team logos admin upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='team-logos' AND public.is_baanbreker_admin());

CREATE POLICY "Baanbreker team logos admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='team-logos' AND public.is_baanbreker_admin())
WITH CHECK (bucket_id='team-logos' AND public.is_baanbreker_admin());

CREATE POLICY "Baanbreker team logos admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='team-logos' AND public.is_baanbreker_admin());
