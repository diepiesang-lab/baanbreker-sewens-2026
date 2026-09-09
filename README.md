# Laerskool Baanbreker Sewens 2026 — Online Tournament System

Tournament dates: **16–17 October 2026**.

## Live stack
- Static frontend: `index.html`, `styles.css`, `app.js`
- Supabase Auth for admin login
- Supabase Postgres for teams, matches, referees, allocations and settings
- Supabase Storage bucket `team-logos` for individual team logos
- Supabase Realtime for live score / fixture / referee updates
- Vercel-ready static deployment

## Supabase setup
1. Run the original `supabase.sql` if you have not already.
2. Run `supabase_patch.sql` once.
3. Confirm Storage buckets `team-logos` and `tournament-assets` exist.
4. Create your admin user in Supabase Authentication.
5. Insert that user's UUID into `admin_users` with role `super_admin` and `active=true`.

## Frontend configuration
Edit `config.js` with the Supabase project URL and **publishable** key only. Never put a service-role/secret key in the browser.

## Local test
Open `index.html` or serve the folder with a simple static web server.

## Vercel
Import this folder/repository into Vercel. No server-side runtime is required for the frontend.

## Admin capabilities
- Secure email/password admin login
- Team create/edit and individual logo upload
- Referee create/edit
- One referee per fixture (no assistant referees)
- Fixture create/edit/delete
- Live score/status updates
- Tournament branding and colours
- Public big-screen view
- Live multi-device sync through Supabase Realtime
