# Synchro

A campus activity app: students discover and register for events, staff create and run them, and the principal approves and tracks them. Built from the Figma file "Campus Activity — Product Prototype".

**Stack:** Vite, React 19, TypeScript, react-router, Supabase (Postgres, Auth, row-level security). Free tier only.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint
```

Create `.env.local` (git-ignored; see `.env.example`):

```
VITE_SUPABASE_URL=https://kapgqcvqliqoawvjrojh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key from the Supabase dashboard>
```

## Roles

| Role | Can do |
|---|---|
| student | Discover, register/cancel, QR pass, calendar, announcements, portfolio |
| coordinator | Everything a student can, plus event check-in |
| teacher | Plus create/edit/withdraw own events, see registrants, check-in |
| principal | Plus approve/decline events (with reason), analytics, post announcements, manage people & roles |

New sign-ups are students. The principal changes roles on **People & roles**.

## What you asked for (history)

1. Review the Figma mockup, suggest improvements, then start coding it.
2. Connect Claude Code to OpenPencil (ACP + MCP packages, login). Done.
3. Build the app from the `.fig` file. Done: all 9 screens.
4. Add a Supabase backend. Done: new project `campusly` (ap-south-1, free), auth, schema, RLS, check-in logic.
5. Your account `akshithraobompelli@gmail.com` is the principal.
6. Split the work into phases that fit 6 hours, and after each phase say what changed and how to test it.
7. No paid API keys, so no real AI. Done: the Studio uses a free template planner.

## Phases

| # | Phase | Status |
|---|---|---|
| 1 | Calendar and Announcements | Built |
| 2 | Event management (edit, withdraw, registrants, decline reasons) | Built |
| 3 | Live analytics + CSV export | Built |
| 4 | AI Copilot | Dropped (no paid keys); template planner instead |
| 5 | People & roles, git, deploy config | Built |
| 6 | Portfolio (attended events, print/PDF) | Built |

## Database (Supabase)

Tables: `profiles`, `activities`, `registrations`, `announcements`. All have row-level security. Functions: `check_in`, `event_registrants`, `analytics_summary`, `list_users`, `set_user_role` (each checks the caller's role inside). Capacity is enforced by a trigger. Migrations are recorded in the Supabase project.

## What's left

- [ ] **Browser testing.** Everything was built and type-checked, and the database rules were tested with rolled-back SQL, but the signed-in screens have not been clicked through end to end. Walk through each phase's test steps.
- [ ] **Camera QR scanning** is untested on a real device (manual code entry works).
- [ ] **Deploy** (free): push to GitHub, import on Vercel, set the two env vars, add the Vercel URL under Supabase Authentication → URL Configuration.
- [ ] **Turn on leaked-password protection** (Supabase dashboard → Authentication).
- [ ] **Decide on email confirmation** (Authentication → Providers → Email). Production should keep it on.
- [ ] **Delete the unused `copilot-plan` Edge Function** in the dashboard (Edge Functions). Nothing calls it.
- [ ] **Clean test data:** two "Annual Sports Day" events exist from testing.
- [ ] **Portfolio shows event counts only**; the database has no duration, so no hours.
- [ ] **Push the repo** to a remote (only a local commit exists).
- [ ] No automated tests yet; lint reports style warnings only.

## Known notes

- Event times are campus-local wall-clock stored as UTC and shown as UTC, so they don't shift with the viewer's timezone.
- Supabase's security advisor lists the role-checking functions above as "callable by signed-in users". That is intentional.
