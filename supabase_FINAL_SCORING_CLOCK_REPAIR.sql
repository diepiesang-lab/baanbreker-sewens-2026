-- LAERSKOOL BAANBREKER SEWENS 2026
-- FINAL SCORING + MATCH CLOCK REPAIR
-- Run once in Supabase SQL Editor.
-- This does not delete teams, matches or existing scores.

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS period integer DEFAULT 0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS clock_seconds integer DEFAULT 0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS clock_running boolean DEFAULT false;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS clock_started_at timestamptz;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  points integer NOT NULL,
  period integer DEFAULT 1,
  clock_seconds integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS period integer DEFAULT 1;
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS clock_seconds integer DEFAULT 0;
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS event_type text;
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS points integer;

UPDATE public.match_events SET period=1 WHERE period IS NULL;
UPDATE public.match_events SET clock_seconds=0 WHERE clock_seconds IS NULL;
UPDATE public.match_events SET created_at=now() WHERE created_at IS NULL;

-- The scoring RPC records the event clock, but NEVER changes the running timer.
CREATE OR REPLACE FUNCTION public.record_match_event(
  p_match_id uuid,
  p_team_id uuid,
  p_event_type text,
  p_points integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  m public.matches%rowtype;
  event_clock integer;
  event_period integer;
BEGIN
  IF NOT public.is_baanbreker_admin() THEN RAISE EXCEPTION 'Admin toegang benodig'; END IF;
  IF p_points NOT IN (2,3,5) THEN RAISE EXCEPTION 'Ongeldige puntetelling'; END IF;
  IF p_event_type NOT IN ('try','conversion','penalty','drop_goal') THEN RAISE EXCEPTION 'Ongeldige telling'; END IF;

  SELECT * INTO m FROM public.matches WHERE id=p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wedstryd nie gevind nie'; END IF;
  IF m.status <> 'live' THEN RAISE EXCEPTION 'Wedstryd is nie LIVE nie'; END IF;
  IF p_team_id IS NULL OR p_team_id NOT IN (m.home_id,m.away_id) THEN RAISE EXCEPTION 'Span behoort nie aan hierdie wedstryd nie'; END IF;

  event_clock:=greatest(0,least(420,coalesce(m.clock_seconds,0)+CASE
    WHEN coalesce(m.clock_running,false) AND m.clock_started_at IS NOT NULL
    THEN floor(extract(epoch from(now()-m.clock_started_at)))::integer ELSE 0 END));
  event_period:=greatest(1,least(2,coalesce(m.period,1)));

  INSERT INTO public.match_events(match_id,team_id,event_type,points,period,clock_seconds,created_by)
  VALUES(p_match_id,p_team_id,p_event_type,p_points,event_period,event_clock,auth.uid());

  IF p_team_id=m.home_id THEN
    UPDATE public.matches SET home_score=coalesce(home_score,0)+p_points,updated_at=now() WHERE id=p_match_id;
  ELSE
    UPDATE public.matches SET away_score=coalesce(away_score,0)+p_points,updated_at=now() WHERE id=p_match_id;
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.record_match_event(uuid,uuid,text,integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
