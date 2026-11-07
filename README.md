# Synchro

**One place for every campus event.** Synchro is a web app for schools and colleges: students discover and register for events, teachers create and run them, and the principal approves them and tracks how they go.

🥉 **3rd place and ₹6,000** at the inter-school and college hackathon hosted by Gatik Junior College.

<!-- Add a screenshot or GIF here, e.g. ![Synchro dashboard](docs/screenshot.png) -->

## Why

Event information on campus usually arrives in scattered WhatsApp forwards and notice-board posters. Students miss events, teachers track registrations by hand, and nobody has a clear record of who attended what. Synchro gives every event a single home, from proposal and approval through registration to check-in.

## Features

- **Discover and register:** browse upcoming events, register or cancel in one tap, and get a QR pass for entry.
- **Calendar and announcements:** see every event at a glance and keep up with campus-wide updates.
- **Event management:** teachers create, edit or withdraw events and see who has registered.
- **Approvals:** the principal approves or declines events and gives a reason when declining.
- **QR check-in:** coordinators and teachers check attendees in by scanning their pass or entering a code.
- **Live analytics:** registration and attendance numbers, with CSV export.
- **Student portfolio:** a printable record of the events each student has attended.
- **Capacity limits:** enforced in the database, so an event can never be overbooked.

## Roles

| Role | What they can do |
|---|---|
| Student | Discover events, register or cancel, QR pass, calendar, announcements, portfolio |
| Coordinator | Everything a student can, plus check attendees in |
| Teacher | Everything a coordinator can, plus create, edit and withdraw their own events and view registrants |
| Principal | Everything above, plus approve or decline events, view analytics, post announcements, and manage people and roles |

New sign-ups start as students. The principal assigns other roles from the **People & roles** page.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, React Router
- **Backend:** Supabase (Postgres, Auth, row-level security)
- **Security:** every table is protected by row-level security, and each database function checks the caller's role before running.

### Data model

- `profiles`: users and their roles
- `activities`: events
- `registrations`: who signed up for what, and check-in status
- `announcements`: campus-wide posts

## Getting started

**Requirements:** Node.js 18+ and a free [Supabase](https://supabase.com) project.

```bash
git clone https://github.com/akshithraob/synchro.git
cd synchro
npm install
```

Create a `.env.local` file in the project root (see `.env.example`):

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Then:

```bash
npm run dev      # start the dev server at http://localhost:5173
npm run build    # type-check and build for production
npm run lint     # lint the code
```

## Roadmap

- [ ] Deploy a live demo
- [ ] Test QR scanning with the camera on more devices
- [ ] Track event hours in the student portfolio
- [ ] Add automated tests

## Author

Built by **Akshith**, a first-year Intermediate (MPC) student at Excellencia Junior College, Hyderabad.
[LinkedIn](https://linkedin.com/in/your-handle) · [GitHub](https://github.com/akshithraob)
