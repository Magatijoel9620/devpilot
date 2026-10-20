# DevPilot Command Center

**DevPilot is a personal-first command centre for shipping software without losing track of the work around it.** It brings projects, task capture, realistic daily planning, focus sessions, project memory, release checklists and workload signals into one responsive workspace.

This repository contains the cloud-backed DevPilot personal workspace (v0.2.0), built with Next.js, React, TypeScript, Tailwind CSS v4 and Supabase. It is designed to be used on a laptop and remain comfortable on a phone as an installable Progressive Web App (PWA).

## Current implementation

- **Visual system:** a muted-teal / spruce palette informed by the supplied Coolors schemes, with warm off-white light surfaces and deep forest-charcoal dark surfaces. The intent is calm, focused and readable rather than high-saturation dashboard colour.
- **Typography:** an Inter / Geist / system sans-serif stack prioritising legibility, compact task scanning and clear hierarchy without depending on a remote font download at build time.
- **Hempon Group identity:** `public/HG.png` is used in the sign-in screen, sidebar, loading state, footer and PWA install icon.
- **Authentication gate:** Supabase is required, and users must have a verified active session before the workspace renders. Sign-in and account creation are now first-class screens instead of being buried in Settings.
- **Account recovery:** the sign-in screen supports password-reset email requests and the recovery callback supports setting a new password.
- **Session handling:** auth state is checked on startup, auth events update the gate, sign-out returns to the sign-in screen, and a new account with no cloud snapshot starts with an empty workspace rather than inheriting another account's browser data. The account avatar opens a quick-navigation menu with a clearly separated sign-out action; Settings also keeps a conventional sign-out row under Account & sync.
- **GitHub OAuth:** a Continue with GitHub button starts Supabase OAuth and returns to the app origin. GitHub provider credentials and allowed redirect URLs must be configured in Supabase before this option can work.
- **Mobile top bar:** DevPilot name and Hempon Group mark remain visible on small screens alongside the mobile menu and account controls.
- **Mobile navigation:** a fixed, safe-area-aware bottom navigation appears on small screens for Today, Inbox, Projects, Tasks and Settings.
- **Mobile back navigation:** in-app view changes are tracked in browser history so Android/browser Back returns to the previous DevPilot view instead of immediately exiting the app. See `ROUTING-HARDENING.md` for verification steps.
- **PWA shell:** the manifest, theme colours, logo icon and service-worker cache have been updated together.
- **Documentation:** setup, authentication, deployment, data handling, verification and known limitations are described below.

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
- Persistent dark/light appearance preference (device-local).
- Configurable daily capacity and buffer, persisted in the cloud workspace.
- JSON workspace export and import.
- Explicitly confirmed cloud workspace clearing; JSON export/import for backup and restore.

### Navigation and installability
- Responsive desktop sidebar.
- Mobile bottom app navigation with device safe-area support.
- Keyboard shortcuts: `Ctrl/Cmd + N` for quick capture, `Ctrl/Cmd + K` for command search, and `Escape` to close overlays.
- Web app manifest and service-worker shell cache for installability and a basic offline fallback.

## Requirements

- Node.js 20.9 or later (Node.js 22 LTS recommended).
- npm.
- A Supabase project. DevPilot requires Supabase and has no browser-only fallback workspace.

## Run locally

From the repository root:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Cloud-only operation

DevPilot fails closed when Supabase credentials are missing: it displays a configuration screen instead of opening an unauthenticated workspace. Project, task, plan, session, note and release data is never loaded from or saved to browser `localStorage`. Only lightweight display preferences (such as light/dark appearance) may be stored locally. A new Supabase account starts with an empty cloud workspace.

If this account was previously used with the sample-data build, sign in after updating the app, open **Settings → Data portability → Clear workspace**, and type `CLEAR` to replace that account's current snapshot with an empty workspace. Export first if there is anything you need to keep. This is an explicit destructive action and should only be used for the intended account.

## Configure Supabase

### 1. Set environment variables

In `.env.local`, set the project URL and the publishable key (or legacy anon key):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Restart `npm run dev` after changing environment variables. Do not put a Supabase service-role/secret key in a `NEXT_PUBLIC_*` variable or in browser code.

### 2. Enable GitHub sign-in (OAuth)

DevPilot uses Supabase Auth for GitHub sign-in; it does not collect or store a GitHub password.

1. **Create a GitHub OAuth App.** In GitHub, open **Settings → Developer settings → OAuth Apps → New OAuth App** (for an organisation-owned app, use the appropriate organisation account). Set the application name to `DevPilot`, the homepage URL to your local app during testing (for example `http://localhost:3000`) or your production URL, and the authorization callback URL to the Supabase callback shown in the next step.
2. **Copy the Supabase callback URL.** In Supabase, open **Authentication → Sign In / Providers → GitHub**. Enable GitHub and copy the callback URL shown on that page. It normally looks like `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`. Paste that exact URL into the GitHub OAuth App's **Authorization callback URL** and save the app.
3. **Add GitHub credentials to Supabase.** Copy the GitHub OAuth App's **Client ID** and generate a **Client secret** in GitHub. Paste both into Supabase's GitHub provider settings and save. Keep the client secret in Supabase only; never put it in `.env.local`, client-side code, GitHub commits, or any `NEXT_PUBLIC_*` variable.
4. **Configure the Supabase return URLs.** Open **Authentication → URL Configuration**. Set the **Site URL** to the main deployed DevPilot origin (for local testing, use `http://localhost:3000`). Add the exact local and production app origins to **Redirect URLs**, for example:
   - `http://localhost:3000/`
   - `https://your-devpilot-domain.example/`
   Add any Vercel preview origins only if you intentionally test OAuth on those previews. Keep the allowlist as narrow as practical.
5. **Test locally.** Restart `npm run dev`, open DevPilot, click **Continue with GitHub**, approve the GitHub consent screen, and confirm you return to DevPilot signed in. Verify the correct account's private workspace loads. Then test sign-out and sign-in again.
6. **For production**, use your real HTTPS domain in the GitHub app homepage and Supabase Site URL, and add that exact HTTPS origin to Supabase Redirect URLs. The GitHub OAuth callback remains the Supabase callback URL—not the DevPilot website URL.

**Troubleshooting:** `redirect_uri` mismatch usually means GitHub's Authorization callback URL does not exactly match the callback URL displayed in Supabase. A redirect-not-allowed error usually means the final DevPilot origin is missing from Supabase's Redirect URLs. If the GitHub provider is disabled or its Client ID/secret are wrong, Supabase will reject the OAuth start or callback. Do not share OAuth client secrets in screenshots or chat.

### 3. Apply the database migration

The initial migration is `supabase/migrations/0001_devpilot_core.sql`. The cloud-hardening update adds a second migration:

```text
supabase/migrations/0002_workspace_snapshot_concurrency.sql
```

For a first setup, either:

- Open the Supabase project → **SQL Editor** → create a query → paste the full migration file → **Run**; or
- Use the Supabase CLI, link the project, then run `npx supabase db push`.

For a brand-new database, apply the migrations in order. If you already applied `0001_devpilot_core.sql`, **do not rerun it**. Apply only `0002_workspace_snapshot_concurrency.sql` in Supabase SQL Editor (paste the complete file and run it), or reconcile CLI migration history and use `npx supabase db push`. The second migration adds a `revision` column and a security-checked `save_workspace_snapshot` RPC; it preserves existing snapshot data and starts existing rows at revision 1. After it runs, confirm `workspace_snapshots.revision` exists and the `save_workspace_snapshot(jsonb, integer)` function is available. Existing RLS policies remain in place; the RPC derives ownership from `auth.uid()` and does not accept an owner ID from the browser.

### 4. Configure Auth URLs

In Supabase, open **Authentication → URL Configuration**:

- Set the **Site URL** to your local URL while developing, such as `http://localhost:3000`.
- Add `http://localhost:3000/` to the redirect URL allow-list.
- When deployed, add the production origin and its root redirect URL too, for example `https://your-domain.example/`.
- Configure email delivery and confirmation according to your security requirements.

Email confirmation may mean account creation does not sign the user in immediately. Confirm the email, then return to DevPilot and sign in.

### 5. Authentication behaviour

- When Supabase is configured, the workspace is gated until the app verifies a signed-in user.
- Email/password sign-in and sign-up are provided on the dedicated entry screen.
- The password-reset flow sends a reset link and provides a screen for choosing the replacement password.
- Sign-out returns to the entry screen and clears the in-memory workspace to avoid exposing one user's workspace to the next account in the same browser.
- A newly created account with no cloud snapshot is initialized with empty arrays and default planning preferences; it is never seeded from browser workspace data.
- Supabase Auth manages the browser session and token refresh. Database access still depends on RLS; the visual sign-in gate is not a substitute for database policies.

**Important:** a deployment with missing Supabase variables cannot open the workspace. There is no unauthenticated fallback mode. Supabase RLS remains the actual database access boundary.

## Cloud sync and data model

The current UI still uses one JSON workspace record in `workspace_snapshots`; normalized domain tables are not yet the active UI persistence path. Writes are debounced and serialized in the browser. Migration `0002_workspace_snapshot_concurrency.sql` adds optimistic concurrency: every write must include the revision that was loaded, and a stale revision is rejected instead of silently overwriting newer cloud data. The client pauses writes on a conflict or save error, exposes a clear sync state, and offers export-before-reload recovery.

This significantly reduces accidental last-write-wins data loss, but it is not a merge engine. If two devices edit at once, one device can hit a conflict and must export any unsynced changes before reloading the latest cloud version. A network error may have an ambiguous outcome; reload from the server before continuing. Do not assume that a conflict can be automatically merged.

Next hardening steps before broader commercial release:

1. Move UI operations to normalized per-table repositories, with transactions/RPCs for related changes.
2. Add automated browser tests for auth, RLS isolation, conflict handling, and multi-device edits.
3. Add durable offline mutation queue only after idempotency and conflict policy are designed.
4. Verify backup restore, account deletion/data retention, and recovery from network interruptions.

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

- With Supabase environment variables missing, DevPilot shows the configuration-required screen and never renders the workspace.
- With Supabase configured, an unauthenticated visitor sees the sign-in screen, not the workspace.
- Sign-in, sign-out, email-confirmation and password-reset flows work with the configured redirect allow-list.
- A signed-in user loads only their own snapshot; a new account starts empty and does not inherit another account's browser data. Workspace data is cloud-only and is never stored in browser `localStorage`.
- Daily capacity and buffer preferences persist inside the account's cloud snapshot and follow the account across devices.
- Changes sync through `save_workspace_snapshot`; confirm each successful save increments `workspace_snapshots.revision`.
- Open the same account in two browsers: make an edit in browser A, then edit stale data in browser B. Browser B should report a cloud conflict and pause writes rather than silently overwrite A. Export B's unsynced changes before choosing to reload the cloud version.
- RLS prevents cross-user reads/writes, and the RPC cannot write a snapshot for a caller-supplied owner ID.
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
    0002_workspace_snapshot_concurrency.sql  Revision-checked snapshot writes
.env.example                  Environment-variable template
```

## Known limitations

- The cloud adapter stores a whole-workspace snapshot with optimistic revision checks (migration 0002); it pauses writes on conflicts rather than silently merging or overwriting changes. New accounts start empty, and the UI includes an explicit, confirmation-protected clear-workspace action.
- The PWA does not yet queue offline edits for later sync.
- Normalized schema tables are present, but the UI currently uses the snapshot adapter.
- End-to-end automation, CI, security review and production deployment verification remain to be completed.
- Email/password is the current auth method; MFA, rate-limit tuning, account administration and account deletion workflows need explicit review before commercial release.
- The UI auth gate protects the app experience, while Supabase RLS is the data-access boundary. Both must be configured and tested.

## Development principle

Ship the useful core, test the actual app, and patch concrete issues in short iterations. Avoid adding complexity until real usage reveals the need. Before every significant schema or sync change, create a backup and test against a non-production Supabase project where possible.


## Startup and cloud-sync performance (MMP patch)

The startup path now reads the persisted Supabase browser session with `getSession()` rather than calling `getUser()` for a separate auth-network round trip. Workspace loading still queries the signed-in owner's snapshot and remains protected by Supabase Row Level Security. Autosaves rely on the `save_workspace_snapshot` RPC, which derives ownership from `auth.uid()` and performs revision checks; they no longer make an additional `getUser()` request before each save.

After loading a snapshot, DevPilot no longer immediately autosaves the same data just because cloud loading completed. Real edits still use the existing debounced, revision-checked cloud save. Workspace content remains cloud-first; this patch does not introduce local storage caching or weaken account isolation.

**Validation note:** run `npm ci`, `npm run typecheck`, `npm run lint`, and `npm run build` in a normal network-enabled project environment before deploying. The packaging environment could not complete dependency installation, so these checks were not certified by this patch.
