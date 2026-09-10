BAANBREKER SEWENS 2026 - SCORING LAYOUT UPDATE

This build changes ONLY the live scoring presentation while preserving the tournament/admin structure.

SCORING SCREEN
- Team identity in the scoring console shows LOGO + SHORT NAME only.
- Full team names are not displayed in the scoring console.
- Large home/away scores.
- Center 7-minute half timer.
- Start, pause, resume, second-half and end controls.
- Try +5, Conversion +2, Penalty +3, Drop-goal +3.
- Undo last event and reset.
- Responsive layout for desktop/tablet/mobile.

TIMER FIX
- Start is optimistic in the browser so the clock starts immediately.
- Supabase stores clock_running, clock_started_at, clock_seconds and period.
- The display timer updates locally every 500ms.
- At 07:00 the first half stops; admin can start the second half.
- At 07:00 of the second half the match is completed.

DATABASE
Run supabase_match_events_repair.sql in Supabase SQL Editor if the database still reports:
column "period" of relation "match_events" does not exist

Do not delete existing teams or matches.
