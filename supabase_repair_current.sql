-- Baanbreker Sewens 2026 - FINAL database repair
-- Run this ONCE in Supabase SQL Editor.
-- It safely adds missing live-clock and match-event columns to an existing installation.

-- Admin helper: works with installations using either admin_users.id or admin_users.user_id.
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'admin',
  active boolean DEFAULT true
);
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS role text DEFAULT 'admin';

CREATE OR REPLACE FUNCTION public.is_baanbreker_admin()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=public
AS $$
DECLARE ok boolean := false;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_users' AND column_name='id') THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE id = $1 AND active = true)' INTO ok USING auth.uid();
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='admin_users' AND column_name='user_id') THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = $1 AND active = true)' INTO ok USING auth.uid();
  END IF;
  RETURN coalesce(ok,false);
END; $$;
REVOKE ALL ON FUNCTION public.is_baanbreker_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_baanbreker_admin() TO authenticated;

-- Match clock fields (snake_case = database convention used by the app)
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS period integer DEFAULT 0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS clock_seconds integer DEFAULT 0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS clock_running boolean DEFAULT false;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS clock_started_at timestamptz;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS round text DEFAULT 'Pool';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_time time;

-- Existing match_events tables are NOT recreated. Missing columns are added.
CREATE TABLE IF NOT EXISTS public.match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  points integer NOT NULL,
  period integer NOT NULL DEFAULT 1,
  clock_seconds integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS period integer DEFAULT 1;
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS clock_seconds integer DEFAULT 0;
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS event_type text;
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS points integer;

-- Fill safe defaults for any old rows before making event fields NOT NULL.
UPDATE public.match_events SET period=1 WHERE period IS NULL;
UPDATE public.match_events SET clock_seconds=0 WHERE clock_seconds IS NULL;
UPDATE public.match_events SET created_at=now() WHERE created_at IS NULL;

ALTER TABLE public.match_events ALTER COLUMN period SET DEFAULT 1;
ALTER TABLE public.match_events ALTER COLUMN clock_seconds SET DEFAULT 0;
ALTER TABLE public.match_events ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read match events" ON public.match_events;
DROP POLICY IF EXISTS "admin write match events" ON public.match_events;
CREATE POLICY "public read match events" ON public.match_events FOR SELECT USING (true);
CREATE POLICY "admin write match events" ON public.match_events FOR ALL TO authenticated
  USING (public.is_baanbreker_admin()) WITH CHECK (public.is_baanbreker_admin());

-- Record a scoring event and update the match atomically.
CREATE OR REPLACE FUNCTION public.record_match_event(
  p_match_id uuid,
  p_team_id uuid,
  p_event_type text,
  p_points integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  m public.matches%rowtype;
  s integer;
  pts integer;
BEGIN
  IF NOT public.is_baanbreker_admin() THEN RAISE EXCEPTION 'Admin toegang benodig'; END IF;
  IF p_points NOT IN (2,3,5) THEN RAISE EXCEPTION 'Ongeldige puntetelling'; END IF;
  IF p_event_type NOT IN ('try','conversion','penalty','drop_goal') THEN RAISE EXCEPTION 'Ongeldige telling'; END IF;

  SELECT * INTO m FROM public.matches WHERE id=p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wedstryd nie gevind nie'; END IF;
  IF m.status <> 'live' THEN RAISE EXCEPTION 'Wedstryd is nie LIVE nie'; END IF;
  IF p_team_id IS NULL OR p_team_id NOT IN (m.home_id,m.away_id) THEN RAISE EXCEPTION 'Span behoort nie aan hierdie wedstryd nie'; END IF;

  s:=greatest(0,least(420,coalesce(m.clock_seconds,0)+CASE
    WHEN coalesce(m.clock_running,false) AND m.clock_started_at IS NOT NULL
    THEN floor(extract(epoch from(now()-m.clock_started_at)))::integer ELSE 0 END));

  INSERT INTO public.match_events(match_id,team_id,event_type,points,period,clock_seconds,created_by)
  VALUES(p_match_id,p_team_id,p_event_type,p_points,greatest(1,least(2,coalesce(m.period,1))),s,auth.uid());

  IF p_team_id=m.home_id THEN
    UPDATE public.matches SET home_score=coalesce(home_score,0)+p_points,clock_seconds=s,updated_at=now() WHERE id=p_match_id;
  ELSE
    UPDATE public.matches SET away_score=coalesce(away_score,0)+p_points,clock_seconds=s,updated_at=now() WHERE id=p_match_id;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.record_match_event(uuid,uuid,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_match_event(uuid,uuid,text,integer) TO authenticated;

-- Undo the latest scoring event.
CREATE OR REPLACE FUNCTION public.undo_last_match_event(p_match_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  e public.match_events%rowtype;
  m public.matches%rowtype;
BEGIN
  IF NOT public.is_baanbreker_admin() THEN RAISE EXCEPTION 'Admin toegang benodig'; END IF;
  SELECT * INTO e FROM public.match_events WHERE match_id=p_match_id ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO m FROM public.matches WHERE id=p_match_id FOR UPDATE;
  IF e.team_id=m.home_id THEN
    UPDATE public.matches SET home_score=greatest(0,coalesce(home_score,0)-e.points),updated_at=now() WHERE id=p_match_id;
  ELSE
    UPDATE public.matches SET away_score=greatest(0,coalesce(away_score,0)-e.points),updated_at=now() WHERE id=p_match_id;
  END IF;
  DELETE FROM public.match_events WHERE id=e.id;
END; $$;

REVOKE ALL ON FUNCTION public.undo_last_match_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.undo_last_match_event(uuid) TO authenticated;

-- Ensure Realtime can publish match/event changes.
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.matches; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.match_events; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

NOTIFY pgrst, 'reload schema';
