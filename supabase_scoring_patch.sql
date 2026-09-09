-- Laerskool Baanbreker Sewens 2026
-- LIVE SCORING MIGRATION
-- Run this after your existing Supabase schema/patch.

alter table public.admin_users add column if not exists active boolean default true;

alter table public.matches add column if not exists period integer default 0;
alter table public.matches add column if not exists clock_seconds integer default 0;
alter table public.matches add column if not exists clock_running boolean default false;
alter table public.matches add column if not exists clock_started_at timestamptz;
alter table public.matches add column if not exists completed_at timestamptz;
alter table public.matches add column if not exists round text default 'Pool';
alter table public.matches add column if not exists match_time time;

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  event_type text not null check (event_type in ('try','conversion','penalty','drop_goal')),
  points integer not null check (points in (2,3,5)),
  period integer not null default 1 check (period in (1,2)),
  clock_seconds integer not null default 0 check (clock_seconds between 0 and 420),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.match_events enable row level security;
alter table public.match_events replica identity full;

create or replace function public.is_baanbreker_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and coalesce(active,true) = true
  );
$$;
revoke all on function public.is_baanbreker_admin() from public;
grant execute on function public.is_baanbreker_admin() to authenticated;


drop policy if exists "public read match events" on public.match_events;
drop policy if exists "admin write match events" on public.match_events;
create policy "public read match events"
on public.match_events for select using (true);
create policy "admin write match events"
on public.match_events for all to authenticated
using (public.is_baanbreker_admin())
with check (public.is_baanbreker_admin());

create or replace function public.record_match_event(
  p_match_id uuid,
  p_team_id uuid,
  p_event_type text,
  p_points integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.matches%rowtype;
  current_clock integer;
begin
  if not public.is_baanbreker_admin() then
    raise exception 'Admin toegang benodig';
  end if;

  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'Wedstryd nie gevind nie'; end if;
  if m.status <> 'live' then raise exception 'Wedstryd is nie LIVE nie'; end if;
  if p_team_id is null or p_team_id not in (m.home_id, m.away_id) then
    raise exception 'Span behoort nie aan hierdie wedstryd nie';
  end if;
  if p_event_type not in ('try','conversion','penalty','drop_goal') then
    raise exception 'Ongeldige telling tipe';
  end if;
  if p_points not in (2,3,5) then raise exception 'Ongeldige puntwaarde'; end if;

  current_clock := greatest(0, least(420,
    coalesce(m.clock_seconds,0) + case
      when coalesce(m.clock_running,false) and m.clock_started_at is not null
      then floor(extract(epoch from (now()-m.clock_started_at)))::integer
      else 0
    end
  ));

  insert into public.match_events(match_id,team_id,event_type,points,period,clock_seconds,created_by)
  values(p_match_id,p_team_id,p_event_type,p_points,greatest(1,least(2,coalesce(m.period,1))),current_clock,auth.uid());

  if p_team_id = m.home_id then
    update public.matches
      set home_score = coalesce(home_score,0)+p_points,
          clock_seconds = current_clock,
          clock_started_at = case when clock_running then clock_started_at else null end,
          updated_at = now()
      where id=p_match_id;
  else
    update public.matches
      set away_score = coalesce(away_score,0)+p_points,
          clock_seconds = current_clock,
          clock_started_at = case when clock_running then clock_started_at else null end,
          updated_at = now()
      where id=p_match_id;
  end if;
end;
$$;
revoke all on function public.record_match_event(uuid,uuid,text,integer) from public;
grant execute on function public.record_match_event(uuid,uuid,text,integer) to authenticated;

create or replace function public.undo_last_match_event(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.match_events%rowtype;
  m public.matches%rowtype;
begin
  if not public.is_baanbreker_admin() then raise exception 'Admin toegang benodig'; end if;
  select * into e from public.match_events where match_id=p_match_id order by created_at desc limit 1 for update;
  if not found then return; end if;
  select * into m from public.matches where id=p_match_id for update;
  if e.team_id=m.home_id then
    update public.matches set home_score=greatest(0,coalesce(home_score,0)-e.points),updated_at=now() where id=p_match_id;
  elsif e.team_id=m.away_id then
    update public.matches set away_score=greatest(0,coalesce(away_score,0)-e.points),updated_at=now() where id=p_match_id;
  end if;
  delete from public.match_events where id=e.id;
end;
$$;
revoke all on function public.undo_last_match_event(uuid) from public;
grant execute on function public.undo_last_match_event(uuid) to authenticated;

do $$
begin
  begin alter publication supabase_realtime add table public.match_events; exception when duplicate_object then null; end;
end $$;

-- Make sure your admin account is active if it already exists.
update public.admin_users au
set active=true, role=coalesce(role,'admin')
where au.user_id in (select id from auth.users where lower(email)=lower('jago@banies.co.za'));
