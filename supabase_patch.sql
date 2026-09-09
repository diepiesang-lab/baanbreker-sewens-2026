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

-- Admin authentication + storage fix for the current schema.
-- admin_users uses user_id as the auth.users foreign key.

create or replace function public.is_baanbreker_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and active = true
  );
$$;

revoke all on function public.is_baanbreker_admin() from public;
grant execute on function public.is_baanbreker_admin() to authenticated;

-- Make sure the supplied owner account is an administrator if the Auth account already exists.
insert into public.admin_users (user_id, role, active)
select id, 'admin', true
from auth.users
where lower(email) = lower('jago@banies.co.za')
on conflict (user_id) do update set role='admin', active=true;

insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do update set public=true;

drop policy if exists "Baanbreker team logos admin upload" on storage.objects;
drop policy if exists "Baanbreker team logos admin update" on storage.objects;
drop policy if exists "Baanbreker team logos admin delete" on storage.objects;

drop policy if exists "Baanbreker team logos public read" on storage.objects;
create policy "Baanbreker team logos public read"
on storage.objects for select to public
using (bucket_id='team-logos');

create policy "Baanbreker team logos admin upload"
on storage.objects for insert to authenticated
with check (bucket_id='team-logos' and public.is_baanbreker_admin());

create policy "Baanbreker team logos admin update"
on storage.objects for update to authenticated
using (bucket_id='team-logos' and public.is_baanbreker_admin())
with check (bucket_id='team-logos' and public.is_baanbreker_admin());

create policy "Baanbreker team logos admin delete"
on storage.objects for delete to authenticated
using (bucket_id='team-logos' and public.is_baanbreker_admin());
