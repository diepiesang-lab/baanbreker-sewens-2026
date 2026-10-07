ALTER TABLE public.referees
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.save_baanbreker_match(
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
  p_home_score integer DEFAULT 0,
  p_away_score integer DEFAULT 0,
  p_status text DEFAULT 'scheduled'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_home uuid;
  v_away uuid;
  v_ref uuid;
  v_date date;
  v_time time;
  has_home_legacy boolean;
  has_away_legacy boolean;
  has_start_legacy boolean;
BEGIN
  IF NOT public.is_baanbreker_admin() THEN RAISE EXCEPTION 'Admin toegang benodig'; END IF;
  IF p_home_id IS NULL OR p_home_id='' OR lower(p_home_id)='undefined' OR p_home_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Ongeldige tuisspan UUID'; END IF;
  IF p_away_id IS NULL OR p_away_id='' OR lower(p_away_id)='undefined' OR p_away_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Ongeldige wegspan UUID'; END IF;
  IF p_referee_id IS NOT NULL AND p_referee_id<>'' AND lower(p_referee_id)<>'undefined' AND p_referee_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Ongeldige skeidsregter UUID'; END IF;

  v_home:=p_home_id::uuid;
  v_away:=p_away_id::uuid;
  v_ref:=CASE WHEN p_referee_id IS NULL OR p_referee_id='' OR lower(p_referee_id)='undefined' THEN NULL ELSE p_referee_id::uuid END;
  v_id:=CASE WHEN p_id IS NULL OR p_id='' OR lower(p_id)='undefined' THEN gen_random_uuid() ELSE p_id::uuid END;
  v_date:=p_date::date;
  v_time:=p_time::time;

  IF v_home=v_away THEN RAISE EXCEPTION 'Die twee spanne kan nie dieselfde wees nie'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.teams WHERE id=v_home) THEN RAISE EXCEPTION 'Tuisspan bestaan nie'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.teams WHERE id=v_away) THEN RAISE EXCEPTION 'Wegspan bestaan nie'; END IF;
  IF v_ref IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.referees r
    WHERE r.id=v_ref AND r.team_id IN (v_home,v_away)
  ) THEN
    RAISE EXCEPTION 'Skeidsregter kan nie hul eie span se wedstryd blaas nie';
  END IF;

  INSERT INTO public.matches(id,age,pool,round,match_date,match_time,field,home_id,away_id,referee_id,home_score,away_score,status,updated_at)
  VALUES(v_id,p_age,p_pool,p_round,v_date,v_time,p_field,v_home,v_away,v_ref,COALESCE(p_home_score,0),COALESCE(p_away_score,0),COALESCE(p_status,'scheduled'),now())
  ON CONFLICT(id) DO UPDATE SET
    age=EXCLUDED.age,pool=EXCLUDED.pool,round=EXCLUDED.round,match_date=EXCLUDED.match_date,match_time=EXCLUDED.match_time,
    field=EXCLUDED.field,home_id=EXCLUDED.home_id,away_id=EXCLUDED.away_id,referee_id=EXCLUDED.referee_id,
    home_score=EXCLUDED.home_score,away_score=EXCLUDED.away_score,status=EXCLUDED.status,updated_at=now();

  has_home_legacy:=EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='matches' AND column_name='home_team_id');
  has_away_legacy:=EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='matches' AND column_name='away_team_id');
  has_start_legacy:=EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='matches' AND column_name='start_time');
  IF has_home_legacy THEN EXECUTE 'UPDATE public.matches SET home_team_id=$1 WHERE id=$2' USING v_home,v_id; END IF;
  IF has_away_legacy THEN EXECUTE 'UPDATE public.matches SET away_team_id=$1 WHERE id=$2' USING v_away,v_id; END IF;
  IF has_start_legacy THEN EXECUTE 'UPDATE public.matches SET start_time=$1 WHERE id=$2' USING v_time,v_id; END IF;
  RETURN v_id;
END;
$function$;