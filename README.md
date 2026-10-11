# Laerskool Baanbreker Sewens 2026

Tournament web app for Laerskool Baanbreker Sewens 2026.

## Deployment
Upload the CONTENTS of this folder to the GitHub repository root so `index.html` is at the deployed root.

## Supabase
Run **only** `supabase_repair_current.sql` once in Supabase SQL Editor. It adds the live-clock and match-event columns safely, including `match_events.period`.

Do not expose a Supabase service-role key in the browser.

## Match clock
- 6 minutes per half (360 seconds)
- Start / pause / resume
- First half automatically stops at 6:00
- Admin starts the second half
- Second half automatically ends the match at 6:00
- Live score events are stored with period and clock time
- Undo last scoring event
- Realtime updates across devices

## Scoring
- Try: 5
- Conversion: 2
- Penalty: 3
- Drop goal: 3
