-- Laerskool Baanbreker Sewens 2026
-- COMPATIBILITY FIX for existing databases that use age_group_id/pool_id/team IDs.
-- Run this once before using the current web app.

create extension if not exists pgcrypto;

-- TEAMS: make the columns used by the web app available.
alter table public.teams add column if not exists school text;
alter table public.teams add column if not exists age text;
alter table public.teams add column if not exists pool text;
alter table public.teams add column if not exists short text;
alter table public.teams add column if not exists logo_url text;
alter table public.teams add column if not exists active boolean default true;

-- Copy age from an existing age_groups table when the older schema has age_group_id.
do $$
begin
  if to_regclass('public.age_groups') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='teams' and column_name='age_group_id') then
    execute $q$
      update public.teams t
      set age = coalesce(nullif(t.age,''), ag.name)
      from public.age_groups ag
      where t.age_group_id = ag.id
        and (t.age is null or t.age = '')
    $q$;
  end if;
exception when others then
  raise notice 'Could not copy age from age_groups: %', SQLERRM;
end $$;

-- If the older age-group table uses a code/label rather than name, try common columns.
do $$
begin
  if to_regclass('public.age_groups') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='teams' and column_name='age_group_id') then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='age_groups' and column_name='code') then
      execute $q$
        update public.teams t
        set age = coalesce(nullif(t.age,''), ag.code)
        from public.age_groups ag
        where t.age_group_id = ag.id
          and (t.age is null or t.age = '')
      $q$;
    end if;
  end if;
exception when others then
  raise notice 'Could not copy age from age_groups.code: %', SQLERRM;
end $$;

-- Normalize obvious age labels.
update public.teams
set age = case
  when upper(trim(age)) in ('U11','UNDER 11','O/11','U/11') then 'O/11'
  when upper(trim(age)) in ('U12','UNDER 12','O/12','U/12') then 'O/12'
  else age
end
where age is not null;

-- If no age was available, keep the column usable and default new records to O/11.
alter table public.teams alter column age set default 'O/11';
update public.teams set age='O/11' where age is null or trim(age)='';
alter table public.teams alter column age set not null;

-- POOL: copy from pools.name when the older schema has pool_id.
do $$
begin
  if to_regclass('public.pools') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='teams' and column_name='pool_id') then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='pools' and column_name='name') then
      execute $q$
        update public.teams t
        set pool = coalesce(nullif(t.pool,''), p.name)
        from public.pools p
        where t.pool_id = p.id
          and (t.pool is null or t.pool = '')
      $q$;
    elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='pools' and column_name='code') then
      execute $q$
        update public.teams t
        set pool = coalesce(nullif(t.pool,''), p.code)
        from public.pools p
        where t.pool_id = p.id
          and (t.pool is null or t.pool = '')
      $q$;
    end if;
  end if;
exception when others then
  raise notice 'Could not copy pool from pools: %', SQLERRM;
end $$;

-- MATCHES: add the simple column names expected by the current app.
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
alter table public.matches add column if not exists notes text;
alter table public.matches add column if not exists updated_at timestamptz default now();

-- Copy common old-schema values into the current app columns.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='home_team_id') then
    execute 'update public.matches set home_id = coalesce(home_id, home_team_id) where home_team_id is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='away_team_id') then
    execute 'update public.matches set away_id = coalesce(away_id, away_team_id) where away_team_id is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='start_time') then
    execute 'update public.matches set match_time = coalesce(match_time, start_time) where start_time is not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='current_minute') then
    execute 'update public.matches set clock_seconds = coalesce(clock_seconds, greatest(0,current_minute)::integer * 60) where current_minute is not null';
  end if;
exception when others then
  raise notice 'Could not copy old match fields: %', SQLERRM;
end $$;

-- Copy age/pool for matches from age_groups/pools when those IDs exist.
do $$
begin
  if to_regclass('public.age_groups') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='age_group_id') then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='age_groups' and column_name='name') then
      execute $q$
        update public.matches m set age = coalesce(nullif(m.age,''), ag.name)
        from public.age_groups ag where m.age_group_id=ag.id and (m.age is null or m.age='')
      $q$;
    end if;
  end if;
  if to_regclass('public.pools') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='pool_id') then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='pools' and column_name='name') then
      execute $q$
        update public.matches m set pool = coalesce(nullif(m.pool,''), p.name)
        from public.pools p where m.pool_id=p.id and (m.pool is null or m.pool='')
      $q$;
    end if;
  end if;
exception when others then
  raise notice 'Could not copy match age/pool: %', SQLERRM;
end $$;

update public.matches set age='O/11' where age is null or trim(age)='';
update public.matches set status='scheduled' where status is null or status='';
alter table public.matches alter column age set default 'O/11';

-- Add foreign keys only when the simple IDs are valid UUID columns.
do $$
begin
  if not exists (select 1 from pg_constraint where conname='matches_home_id_fkey') then
    alter table public.matches add constraint matches_home_id_fkey foreign key (home_id) references public.teams(id) on delete set null;
  end if;
exception when duplicate_object then null;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='matches_away_id_fkey') then
    alter table public.matches add constraint matches_away_id_fkey foreign key (away_id) references public.teams(id) on delete set null;
  end if;
exception when duplicate_object then null;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='matches_referee_id_fkey') then
    alter table public.matches add constraint matches_referee_id_fkey foreign key (referee_id) references public.referees(id) on delete set null;
  end if;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
