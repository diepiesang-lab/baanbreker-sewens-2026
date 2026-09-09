-- Laerskool Baanbreker Sewens 2026 - Supabase schema
create extension if not exists pgcrypto;
create table if not exists tournament_settings (id uuid primary key default gen_random_uuid(), name text not null, subtitle text, dates text, location text, logo_text text, primary_color text default '#123f2d', accent_color text default '#d6a83d', updated_at timestamptz default now());
create table if not exists teams (id uuid primary key default gen_random_uuid(), name text not null, school text, age text not null check(age in ('O/11','O/12')), pool text, short text, active boolean default true, created_at timestamptz default now());
create table if not exists referees (id uuid primary key default gen_random_uuid(), name text not null, level text, active boolean default true, created_at timestamptz default now());
create table if not exists matches (id uuid primary key default gen_random_uuid(), age text not null check(age in ('O/11','O/12')), pool text, round text default 'Pool', match_date date, match_time time, field text, home_id uuid references teams(id) on delete set null, away_id uuid references teams(id) on delete set null, home_score integer, away_score integer, status text default 'scheduled' check(status in ('scheduled','live','completed')), referee_id uuid references referees(id) on delete set null, notes text, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists admin_users (user_id uuid primary key references auth.users(id) on delete cascade, role text default 'admin');
insert into tournament_settings(name,subtitle,dates,location,logo_text) select 'Laerskool Baanbreker Sewens','2026 Rugby Sewens Toernooi','16–17 Oktober 2026','Laerskool Baanbreker','LB' where not exists(select 1 from tournament_settings);
-- Enable realtime for live scores/allocations.
alter table teams replica identity full; alter table referees replica identity full; alter table matches replica identity full; alter table tournament_settings replica identity full;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table referees;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table tournament_settings;
-- Basic RLS: public can read tournament data; authenticated admins can write.
alter table tournament_settings enable row level security; alter table teams enable row level security; alter table referees enable row level security; alter table matches enable row level security; alter table admin_users enable row level security;
create policy "public read settings" on tournament_settings for select using (true);
create policy "public read teams" on teams for select using (true);
create policy "public read refs" on referees for select using (true);
create policy "public read matches" on matches for select using (true);
create policy "admin settings write" on tournament_settings for all using (exists(select 1 from admin_users where user_id=auth.uid())) with check (exists(select 1 from admin_users where user_id=auth.uid()));
create policy "admin teams write" on teams for all using (exists(select 1 from admin_users where user_id=auth.uid())) with check (exists(select 1 from admin_users where user_id=auth.uid()));
create policy "admin refs write" on referees for all using (exists(select 1 from admin_users where user_id=auth.uid())) with check (exists(select 1 from admin_users where user_id=auth.uid()));
create policy "admin matches write" on matches for all using (exists(select 1 from admin_users where user_id=auth.uid())) with check (exists(select 1 from admin_users where user_id=auth.uid()));
create policy "admins read own row" on admin_users for select using (auth.uid()=user_id);
