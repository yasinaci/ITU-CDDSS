# ITU-CDDSS

Next.js 14 implementation for the ITU Campus Density & Noise Decision Support System.

## Local setup

1. Install dependencies with npm, pnpm, or yarn.
2. Copy `.env.example` values into `.env.local` and replace the placeholders with Supabase credentials.
3. In Supabase Auth test settings, create the seed Auth users described in the project prompt.
4. Run `supabase/registration_fix.sql` before testing registration.
5. Start the app with `npm run dev`.

`.env.local` is ignored by Git and must not be committed.
