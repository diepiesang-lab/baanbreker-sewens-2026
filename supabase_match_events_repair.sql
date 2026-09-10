-- Baanbreker Sewens 2026 - match event emergency repair
-- Safe to run on an existing database.
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS period integer DEFAULT 1;
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS clock_seconds integer DEFAULT 0;
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.match_events ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
UPDATE public.match_events SET period=1 WHERE period IS NULL;
UPDATE public.match_events SET clock_seconds=0 WHERE clock_seconds IS NULL;
NOTIFY pgrst, 'reload schema';
