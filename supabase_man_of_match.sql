-- Store the per-match player nomination used to calculate the tournament award.
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS man_of_match text;
