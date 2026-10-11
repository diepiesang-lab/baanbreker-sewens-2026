# Laerskool Baanbreker Sewens 2026

Tournament web app for Laerskool Baanbreker Sewens 2026.

## Deployment
Upload the CONTENTS of this folder to the GitHub repository root so `index.html` is at the deployed root.

## Supabase
Run **only** `supabase_repair_current.sql` once in Supabase SQL Editor. It safely adds the live-clock, match-event, and Man of the Match fields, including `match_events.period`.

Do not expose a Supabase service-role key in the browser.

## Match clock
- 6 minutes per half (360 seconds)
- Start / pause / resume
- First half automatically stops at 6:00
- Admin can manually enter halftime and start the second half
- Second half automatically ends the match at 6:00
- Live score events are stored with period and clock time
- Undo last scoring event
- Realtime updates across devices

## Scoring
- Try: 5
- Conversion: 2
- Penalty: 3
- Drop goal: 3
- Man of the Match: enter a player name for each match; the scoring screen totals nominations for the tournament award
- Pool-stage teams are not scheduled in consecutive match slots; this restriction does not apply to playoffs.

## Playoffs
- Cup: pool places 1–4 play quarterfinals, then the configured semifinals and final. The losing team is eliminated.
- Shield (places 5–6), Plate (7–8), and Bowl (9–10) semifinals and finals are generated only when both pools contain the required places.
- President Steyn matches can start at or after 15:00 on day one; there is no minimum start time on day two.

