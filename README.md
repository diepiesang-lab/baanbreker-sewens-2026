# Laerskool Baanbreker Sewens 2026

Online-ready tournament management app for 16–17 October 2026.

## Current features
- Public tournament dashboard
- O/11 and O/12
- Teams, pools, standings and fixtures
- Live score/status fields
- One referee per match (no assistant referees)
- Referee allocations and printable schedule
- Admin customization for tournament branding
- Baanbreker school logo included
- **Individual team logo upload** to Supabase Storage when online
- Local demo fallback when Supabase config is blank

## Supabase
`config.js` contains the project URL and browser-safe publishable key. Never put a service_role/secret key in frontend files.

The SQL creates the database tables, storage buckets and RLS policies. Team logos upload to the `team-logos` bucket.

## Run
Open `index.html` for a local test. For the online version, deploy this folder to Vercel or another static host.
