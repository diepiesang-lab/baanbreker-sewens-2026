-- Run this ONCE in Supabase SQL Editor after the original Baanbreker Sewens schema.
-- It adds the fields used by the live app.

alter table public.tournament_settings
  add column if not exists tournament_dates text default '16–17 Oktober 2026';

alter table public.teams
  add column if not exists school text;

-- Optional privacy improvement: keep referee contact details private.
-- The app only needs referee names/qualifications publicly.
drop policy if exists "Public can view referees" on public.referees;
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
