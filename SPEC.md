# Ombre — Spec

> Read this file at the start of every session. Update the checklist whenever a step is finished.

## What we're building

A simple, mobile-first web app where a man tracks his health progress.

1. **Sign in with Google**
2. **Morning check-in:** erection yes/no, how I feel (1–5), a short written reflection, then a motivational quote after submitting
3. **Progress view:** streak count and a simple chart of check-ins over time
4. **Oura Ring connection:** pull sleep, readiness and HRV and show them next to check-in answers
5. **Morning reminder** by email or push notification

**Later:** Apple Health through a native iPhone app.

## Tech

- **Next.js** (App Router, TypeScript, Tailwind CSS) — the app itself
- **Supabase** — Google login and the database
- **Vercel** — hosting

## Rules

- Build one step at a time. Don't start the next step until the current one works and the owner says go.
- This app holds sensitive health data:
  - Never put secret keys in the code. Keys live in `.env.local`, which git ignores.
  - Every database table must have row-level security (RLS) so each user can only see their own rows.
- Design: mobile-first, simple, calm, large tap targets. It must look good on a phone before anything else.
- Commit to git after each working piece so mistakes can be undone.
- The owner has no coding experience: explain in plain language, give exact clicks/commands, and wait for confirmation before moving on.

## Checklist

- [ ] **Step 1 — Sign in with Google:** landing page with "Continue with Google", home screen that greets the user by first name, sign-out button
  - [x] Code written (landing page, Google sign-in, home screen, sign-out)
  - [ ] Software installed on owner's computer, app running locally
  - [ ] Supabase project created, Google sign-in configured
  - [ ] Owner has signed in and out successfully
- [ ] **Step 2 — Morning check-in**
- [ ] **Step 3 — Progress view**
- [ ] **Step 4 — Oura Ring connection**
- [ ] **Step 5 — Morning reminder**

## Notes

- The earlier prototype (local SQLite dashboard with Apple Health/CSV import) lives in the `prototype/` folder (also tagged `prototype-v0` in git). It was replaced by this Next.js app and is not used.
