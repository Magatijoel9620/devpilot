# DevPilot

**DevPilot is a personal-first command centre for shipping software without losing track of the work around it.** It brings projects, task capture, realistic daily planning, focus sessions, project memory, release checklists and workload signals into one responsive workspace.

This repository contains the DevPilot MVP, built with Next.js, React, TypeScript, Tailwind CSS v4 and Supabase. It is designed to be used on a laptop and remain comfortable on a phone as an installable Progressive Web App (PWA).

## What changed in this uplift

- **Visual system:** a muted-teal / spruce palette informed by the supplied Coolors schemes, with warm off-white light surfaces and deep forest-charcoal dark surfaces. The intent is calm, focused and readable rather than high-saturation dashboard colour.
- **Typography:** an Inter / Geist / system sans-serif stack prioritising legibility, compact task scanning and clear hierarchy without depending on a remote font download at build time.
- **Hempon Group identity:** `public/HG.png` is used in the sign-in screen, sidebar, loading state, footer and PWA install icon.
- **Authentication gate:** when Supabase is configured, users must have a verified active session before the workspace renders. Sign-in and account creation are now first-class screens instead of being buried in Settings.
- **Account recovery:** the sign-in screen supports password-reset email requests and the recovery callback supports setting a new password.
- **Session handling:** auth state is checked on startup, auth events update the gate, sign-out returns to the sign-in screen, and a new account with no cloud snapshot starts from clean starter data rather than inheriting another account's browser cache.
- **Mobile navigation:** a fixed, safe-area-aware bottom navigation appears on small screens for Today, Inbox, Projects, Tasks and Settings.
- **PWA shell:** the manifest, theme colours, logo icon and service-worker cache have been updated together.
- **Documentation:** setup, authentication, deployment, data handling, verification and known MVP limitations are described below.

## Feature set

### Daily planning
- Today view with a ranked, explainable set of next tasks.
- Daily focused-work capacity and a protected interruption buffer.
- Overload warnings when scheduled estimates exceed usable capacity.
- Add/remove tasks from today's plan and mark work complete.

### Projects and tasks
- Project list, project status, next action and tracked task counts.
- Quick capture and inbox triage.
- Task board organised by status.
- Priority, stage, due date, estimate, description, next action, dependencies and checklists.
- Task search and project filtering.

### Focus and continuity
- Focus sessions with elapsed time.
- Session notes to record progress and a concrete resume point.
- Project memory for decisions, commands, blockers and handover context.
- Release tracking with target dates and verification checklists.

### Personalisation and portability
- Persistent dark/light appearance preference.
- Configurable daily capacity and buffer.
- JSON workspace export and import.
- Starter-data reset for testing; export first if you need to preserve current data.

### Navigation and installability
- Responsive desktop sidebar.
- Mobile bottom app navigation with device safe-area support.
- Keyboard shortcuts: `Ctrl/Cmd + N` for quick capture, `Ctrl/Cmd + K` for command search, and `Escape` to close overlays.
- Web app manifest and service-worker shell cache for installability and a basic offline fallback.

## Requirements

- Node.js 20.9 or later (Node.js 22 LTS recommended).
- npm.
- A Supabase project for authenticated/cloud mode. Supabase is optional for local demo mode.

## Run locally

From the repository root:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Local demo mode

If the Supabase environment variables are empty, DevPilot runs in local demo mode. Data is stored in this browser's `localStorage`; it is not an authenticated or multi-device workspace. Sample projects and tasks are illustrative starter content, not claims about the current state of any real project.

Before clearing browser storage, use **Settings → Data portability → Export workspace** to create a JSON backup.

## Configure Supabase

### 1. Set environment variables

In `.env.local`, set the project URL and the publishable key (or legacy anon key):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Restart `npm run dev` after changing environment variables. Do not put a Supabase service-role/secret key in a `NEXT_PUBLIC_*` variable or in browser code.

### 2. Apply the database migration

The current migration is:

```text
supabase/migrations/0001_devpilot_core.sql
```

For a first setup, either:

- Open the Supabase project → **SQL Editor** → create a query → paste the full migration file → **Run**; or
- Use the Supabase CLI, link the project, then run `npx supabase db push`.

Choose one initial method. If you applied the migration manually in SQL Editor, reconcile the CLI migration history before using `db push`; do not blindly apply the same migration twice.

After it runs, check the Table Editor for the expected tables, including `workspace_snapshots`. The migration includes row-level security (RLS), ownership rules, indexes and related-record checks. Test the policies against your own project before storing sensitive production data.

### 3. Configure Auth URLs

In Supabase, open **Authentication → URL Configuration**:

- Set the **Site URL** to your local URL while developing, such as `http://localhost:3000`.
- Add `http://localhost:3000/` to the redirect URL allow-list.
- When deployed, add the production origin and its root redirect URL too, for example `https://your-domain.example/`.
- Configure email delivery and confirmation according to your security requirements.

Email confirmation may mean account creation does not sign the user in immediately. Confirm the email, then return to DevPilot and sign in.

### 4. Authentication behaviour

- When Supabase is configured, the workspace is gated until the app verifies a signed-in user.
- Email/password sign-in and sign-up are provided on the dedicated entry screen.
- The password-reset flow sends a reset link and provides a screen for choosing the replacement password.
- Sign-out returns to the entry screen and clears the in-memory workspace to avoid exposing one user's workspace to the next account in the same browser.
- A newly created account with no cloud snapshot is seeded with starter data; it is not seeded from the browser's previously cached workspace.
- Supabase Auth manages the browser session and token refresh. Database access still depends on RLS; the visual sign-in gate is not a substitute for database policies.

**Important:** a Supabase-configured browser is authenticated mode. A deployment with empty Supabase variables is intentionally a local demo and has no server-side identity enforcement. Do not treat local demo mode as a private production deployment.

## Cloud sync and data model

The current MVP syncs the app's workspace as a single JSON record in `workspace_snapshots`, keyed by the authenticated Supabase user and protected by RLS. Writes are debounced.

This is a useful first cloud-sync path, but it is **not yet a conflict-aware multi-device database**. Simultaneous edits from two devices can overwrite one another (last-write-wins). The migration also defines normalized tables for a later repository-based implementation, but the current UI snapshot adapter is the active sync path.

Recommended before broader commercial release:

1. Move the UI's state operations to normalized per-table repositories.
2. Add conflict detection/versioning and a recovery path for sync errors.
3. Add automated auth/RLS and multi-device tests.
4. Verify backup restore and account deletion/data-retention behaviour.

## PWA behaviour

The manifest declares standalone display mode and uses the Hempon Group PNG as the app icon. The service worker caches the app shell and static same-origin assets and falls back to the cached root page for navigation while offline.

This is **not full offline-first operation yet**. Supabase sign-in, cloud sync, and uncached dynamic requests require connectivity; there is no durable offline mutation queue or cross-device conflict resolution. Use a secure connection (HTTPS) in production. For local development, service-worker installation may behave differently depending on the browser and whether the app is served from localhost.

## Verify the app

Run these checks from the repository root:

```bash
npm run typecheck
npm run lint
npm run build
```

Then test manually on both desktop and a narrow mobile viewport:

- Local demo opens and can create/edit tasks.
- With Supabase configured, an unauthenticated visitor sees the sign-in screen, not the workspace.
- Sign-in, sign-out, email-confirmation and password-reset flows work with the configured redirect allow-list.
- A signed-in user loads only their own snapshot; a new account does not inherit the previous account's browser data.
- Changes sync to `workspace_snapshots` and RLS prevents cross-user reads/writes.
- Bottom navigation does not cover page content or device safe-area controls.
- The manifest/icon load and the service worker provides its expected shell fallback.
- Export a JSON backup and import it into a test workspace.

## Deploy to Vercel

1. Push the project to a Git repository (use a private repository while the app is personal).
2. Import it into Vercel.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project's Environment Variables.
4. Apply the migration to the intended Supabase project.
5. Add the production origin to Supabase Auth's Site URL and redirect URL allow-list.
6. Deploy, then test authentication, RLS, sign-out, password recovery, snapshot sync, JSON backup and mobile navigation on the deployed URL.
7. Confirm the deployed app is served over HTTPS and that no service-role key is present in frontend environment variables or source.

Do not consider a deployment production-ready solely because the sign-in page is visible. Test RLS and authenticated data access against the actual Supabase project.

## Project structure

```text
src/
  app/
    layout.tsx                 App metadata, viewport and PWA registration
    page.tsx                   Main app entry
    manifest.ts                PWA manifest
    globals.css                Design tokens, responsive layout and components
  components/
    DevPilot.tsx               Workspace UI, auth gate and client-side state
    PwaRegister.tsx            Service-worker registration
  lib/
    planner.ts                 Explainable priority scoring and capacity planning
    supabase.ts                Browser Supabase client configuration
    types.ts                   Workspace/domain types
public/
  HG.png                       Hempon Group brand asset and PWA icon
  icon.svg                     Lightweight app-shell icon
  sw.js                        PWA shell service worker
supabase/
  migrations/
    0001_devpilot_core.sql     Schema, indexes, RLS and ownership checks
.env.example                  Environment-variable template
```

## Known limitations

- The cloud adapter currently stores a whole-workspace snapshot and is last-write-wins.
- The PWA does not yet queue offline edits for later sync.
- Normalized schema tables are present, but the UI currently uses the snapshot adapter.
- End-to-end automation, CI, security review and production deployment verification remain to be completed.
- Email/password is the current auth method; MFA, rate-limit tuning, account administration and account deletion workflows need explicit review before commercial release.
- The UI auth gate protects the app experience, while Supabase RLS is the data-access boundary. Both must be configured and tested.

## Development principle

Ship the useful core, test the actual app, and patch concrete issues in short iterations. Avoid adding complexity until real usage reveals the need. Before every significant schema or sync change, create a backup and test against a non-production Supabase project where possible.
