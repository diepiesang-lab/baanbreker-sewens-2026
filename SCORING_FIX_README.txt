BAANBREKER SEWENS 2026 - SCORING FIX

1. Deploy this website.
2. In Supabase SQL Editor run supabase_FINAL_SCORING_CLOCK_REPAIR.sql once.
3. Hard refresh the website (Ctrl+F5).

Important:
- Scoring never changes the match clock.
- Try = +5
- Conversion = +2
- Strafskop = +3
- Drop-doel = +3
- Undo removes the latest scoring event.
- The timer remains based on clock_seconds + clock_started_at and is not reset by scoring.
