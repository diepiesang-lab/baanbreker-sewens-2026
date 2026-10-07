CREATE OR REPLACE FUNCTION public.guard_match_referee_team()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_home uuid;
  v_away uuid;
BEGIN
  v_home:=COALESCE(NEW.home_id,NEW.home_team_id);
  v_away:=COALESCE(NEW.away_id,NEW.away_team_id);
  IF NEW.referee_id IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.referees r
    WHERE r.id=NEW.referee_id AND r.team_id IN (v_home,v_away)
  ) THEN
    RAISE EXCEPTION 'Skeidsregter kan nie hul eie span se wedstryd blaas nie';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS matches_referee_team_guard ON public.matches;
CREATE TRIGGER matches_referee_team_guard
BEFORE INSERT OR UPDATE OF referee_id,home_id,away_id,home_team_id,away_team_id
ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.guard_match_referee_team();

CREATE OR REPLACE FUNCTION public.guard_referee_team_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.team_id IS NOT DISTINCT FROM OLD.team_id OR NEW.team_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS(
    SELECT 1 FROM public.matches m
    WHERE m.referee_id=NEW.id
      AND NEW.team_id IN (COALESCE(m.home_id,m.home_team_id),COALESCE(m.away_id,m.away_team_id))
  ) THEN
    RAISE EXCEPTION 'Skeidsregter is reeds vir hul eie span se wedstryd aangewys; verander eers die wedstrydtoewysing';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS referees_team_link_guard ON public.referees;
CREATE TRIGGER referees_team_link_guard
BEFORE UPDATE OF team_id ON public.referees
FOR EACH ROW EXECUTE FUNCTION public.guard_referee_team_link();