-- Baanbreker Sewens 2026 - SAFE FINAL FIX
-- Run this ONCE in Supabase SQL Editor.
-- This patch is designed for both the original schema and the older
-- compatibility versions used during development.

create extension if not exists pgcrypto;

-- ---------- Admin table compatibility ----------
do $$
begin
  if to_regclass('public.admin_users') is null then
    create table public.admin_users (
      user_id uuid primary key references auth.users(id) on delete cascade,
      role text default 'admin',
      active boolean default true
    );
  else
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='admin_users' and column_name='id')
       and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='admin_users' and column_name='user_id') then
      alter table public.admin_users rename column id to user_id;
    end if;
    alter table public.admin_users add column if not exists active boolean default true;
    alter table public.admin_users add column if not exists role text default 'admin';
  end if;
end $$;

alter table public.admin_users enable row level security;

drop policy if exists "admins read own row" on public.admin_users;
create policy "admins read own row"
on public.admin_users for select to authenticated
using (auth.uid() = user_id);

create or replace function public.is_baanbreker_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and coalesce(active,true)=true
  );
$$;
revoke all on function public.is_baanbreker_admin() from public;
grant execute on function public.is_baanbreker_admin() to authenticated;

-- Make owner admin when Auth account exists.
insert into public.admin_users(user_id,role,active)
select id,'admin',true from auth.users where lower(email)=lower('jago@banies.co.za')
on conflict (user_id) do update set role='admin',active=true;

-- ---------- Match schema compatibility ----------
alter table public.matches add column if not exists age text;
alter table public.matches add column if not exists pool text;
alter table public.matches add column if not exists round text default 'Pool';
alter table public.matches add column if not exists match_time time;
alter table public.matches add column if not exists home_id uuid;
alter table public.matches add column if not exists away_id uuid;
alter table public.matches add column if not exists referee_id uuid;
alter table public.matches add column if not exists home_score integer default 0;
alter table public.matches add column if not exists away_score integer default 0;
alter table public.matches add column if not exists status text default 'scheduled';
alter table public.matches add column if not exists field text;
alter table public.matches add column if not exists match_date date;
alter table public.matches add column if not exists updated_at timestamptz default now();

-- Copy legacy match IDs/times if those columns exist.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='home_team_id') then
    execute 'update public.matches set home_id=coalesce(home_id,home_team_id) where home_team_id is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='away_team_id') then
    execute 'update public.matches set away_id=coalesce(away_id,away_team_id) where away_team_id is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='start_time') then
    execute 'update public.matches set match_time=coalesce(match_time,start_time) where start_time is not null';
  end if;
end $$;

update public.matches set age='O/11' where age is null or trim(age)='';
update public.matches set status='scheduled' where status is null or trim(status)='';
alter table public.matches alter column age set default 'O/11';

-- ---------- Safe match save RPC ----------
create or replace function public.save_baanbreker_match(
  p_id text,
  p_age text,
  p_pool text,
  p_round text,
  p_date text,
  p_time text,
  p_field text,
  p_home_id text,
  p_away_id text,
  p_referee_id text,
  p_home_score integer default 0,
  p_away_score integer default 0,
  p_status text default 'scheduled'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_home uuid;
  v_away uuid;
  v_ref uuid;
  v_date date;
  v_time time;
  has_home_legacy boolean;
  has_away_legacy boolean;
  has_start_legacy boolean;
begin
  if not public.is_baanbreker_admin() then raise exception 'Admin toegang benodig'; end if;
  if p_home_id is null or p_home_id='' or lower(p_home_id)='undefined' or p_home_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Ongeldige tuisspan UUID'; end if;
  if p_away_id is null or p_away_id='' or lower(p_away_id)='undefined' or p_away_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Ongeldige wegspan UUID'; end if;
  if p_referee_id is not null and p_referee_id<>'' and lower(p_referee_id)<>'undefined' and p_referee_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Ongeldige skeidsregter UUID'; end if;
  v_home:=p_home_id::uuid; v_away:=p_away_id::uuid;
  v_ref:=case when p_referee_id is null or p_referee_id='' or lower(p_referee_id)='undefined' then null else p_referee_id::uuid end;
  v_id:=case when p_id is null or p_id='' or lower(p_id)='undefined' then gen_random_uuid() else p_id::uuid end;
  v_date:=p_date::date; v_time:=p_time::time;

  if v_home=v_away then raise exception 'Die twee spanne kan nie dieselfde wees nie'; end if;
  if not exists(select 1 from public.teams where id=v_home) then raise exception 'Tuisspan bestaan nie'; end if;
  if not exists(select 1 from public.teams where id=v_away) then raise exception 'Wegspan bestaan nie'; end if;

  insert into public.matches(id,age,pool,round,match_date,match_time,field,home_id,away_id,referee_id,home_score,away_score,status,updated_at)
  values(v_id,p_age,p_pool,p_round,v_date,v_time,p_field,v_home,v_away,v_ref,coalesce(p_home_score,0),coalesce(p_away_score,0),coalesce(p_status,'scheduled'),now())
  on conflict(id) do update set
    age=excluded.age,pool=excluded.pool,round=excluded.round,match_date=excluded.match_date,match_time=excluded.match_time,
    field=excluded.field,home_id=excluded.home_id,away_id=excluded.away_id,referee_id=excluded.referee_id,
    home_score=excluded.home_score,away_score=excluded.away_score,status=excluded.status,updated_at=now();

  -- Keep old columns synchronized when they exist.
  has_home_legacy:=exists(select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='home_team_id');
  has_away_legacy:=exists(select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='away_team_id');
  has_start_legacy:=exists(select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='start_time');
  if has_home_legacy then execute 'update public.matches set home_team_id=$1 where id=$2' using v_home,v_id; end if;
  if has_away_legacy then execute 'update public.matches set away_team_id=$1 where id=$2' using v_away,v_id; end if;
  if has_start_legacy then execute 'update public.matches set start_time=$1 where id=$2' using v_time,v_id; end if;
  return v_id;
end;
$$;
revoke all on function public.save_baanbreker_match(text,text,text,text,text,text,text,text,text,text,integer,integer,text) from public;
grant execute on function public.save_baanbreker_match(text,text,text,text,text,text,text,text,text,text,integer,integer,text) to authenticated;

-- ---------- Live scoring fields/events ----------
alter table public.matches add column if not exists period integer default 0;
alter table public.matches add column if not exists clock_seconds integer default 0;
alter table public.matches add column if not exists clock_running boolean default false;
alter table public.matches add column if not exists clock_started_at timestamptz;
alter table public.matches add column if not exists completed_at timestamptz;

create table if not exists public.match_events(
 id uuid primary key default gen_random_uuid(),match_id uuid not null references public.matches(id) on delete cascade,
 team_id uuid not null references public.teams(id) on delete cascade,event_type text not null check(event_type in ('try','conversion','penalty','drop_goal')),
 points integer not null check(points in (2,3,5)),period integer not null default 1 check(period in(1,2)),
 clock_seconds integer not null default 0 check(clock_seconds between 0 and 420),created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now()
);
alter table public.match_events enable row level security;
drop policy if exists "public read match events" on public.match_events;
drop policy if exists "admin write match events" on public.match_events;
create policy "public read match events" on public.match_events for select using(true);
create policy "admin write match events" on public.match_events for all to authenticated using(public.is_baanbreker_admin()) with check(public.is_baanbreker_admin());

-- Storage admin policy uses the same safe helper.
insert into storage.buckets(id,name,public) values('team-logos','team-logos',true) on conflict(id) do update set public=true;
drop policy if exists "Baanbreker team logos public read" on storage.objects;
drop policy if exists "Baanbreker team logos admin upload" on storage.objects;
drop policy if exists "Baanbreker team logos admin update" on storage.objects;
drop policy if exists "Baanbreker team logos admin delete" on storage.objects;
create policy "Baanbreker team logos public read" on storage.objects for select to public using(bucket_id='team-logos');
create policy "Baanbreker team logos admin upload" on storage.objects for insert to authenticated with check(bucket_id='team-logos' and public.is_baanbreker_admin());
create policy "Baanbreker team logos admin update" on storage.objects for update to authenticated using(bucket_id='team-logos' and public.is_baanbreker_admin()) with check(bucket_id='team-logos' and public.is_baanbreker_admin());
create policy "Baanbreker team logos admin delete" on storage.objects for delete to authenticated using(bucket_id='team-logos' and public.is_baanbreker_admin());

notify pgrst,'reload schema';
