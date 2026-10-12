# Ombre

A calm, mobile-first app for men to track their health, one morning at a time.

**Start here:** [SPEC.md](SPEC.md) has the full plan and what's done so far.

## Run it on your computer

1. Install [Node.js](https://nodejs.org) (the "LTS" version).
2. In a terminal, inside this folder:
   ```sh
   npm install
   ```
3. Copy `.env.example` to a new file called `.env.local` and paste in your two Supabase values.
   `.env.local` is never uploaded to GitHub.
4. Start the app:
   ```sh
   npm run dev
   ```
5. Open http://localhost:3000.

## How the code is organised

- `src/app/page.tsx` — the landing page with "Continue with Google"
- `src/app/home/page.tsx` — the home screen after you sign in
- `src/app/actions.ts` — sign in and sign out
- `src/app/auth/callback/route.ts` — where Google sends you back after sign-in
- `src/proxy.ts` — runs before every page: keeps you signed in and sends you to the right screen
- `src/lib/supabase/` — the connection to Supabase

The `prototype/` folder is an earlier experiment and isn't used.
