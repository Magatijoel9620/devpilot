# DevPilot — MVP to MMP readiness review

## Scope of this pass

This review is based on the uploaded source archive. The target of this pass is the clean-start/account-isolation requirement and a practical hand-off for the next MMP hardening steps. No live Supabase project was accessed or modified.

## Findings from the source

### Already implemented in the uploaded app

- The app's initial in-memory workspace is empty (`emptyWorkspace()` in `src/components/DevPilot.tsx`).
- The authenticated user is retrieved from Supabase before the snapshot is loaded.
- Snapshot reads are filtered by the authenticated user's ID and are also subject to database RLS.
- If a user has no snapshot, the app initializes an empty workspace and calls `save_workspace_snapshot` with a null expected revision to create that user's first snapshot.
- The app does not hydrate project/task data from browser local storage; legacy workspace keys are removed.
- The supplied `0002_workspace_snapshot_concurrency.sql` RPC derives ownership from `auth.uid()` and does not accept a caller-supplied owner ID.
- The snapshot migration uses revision checks to reject stale writes instead of silently overwriting a newer revision.
- Sign-out clears the in-memory workspace.

### Change made in this package

- Removed the unused `src/lib/seed.ts` module, which contained hard-coded starter projects/tasks related to Farmora, Landlord Ledger, InvoiceEasy, Payment Engine, and Hempon Group. No imports or references to `starterData` were found elsewhere in the uploaded source archive.
- Updated repository documentation to remove the deleted seed module from the project structure.

This prevents the old starter dataset from being accidentally reintroduced through that dormant module. It does not delete any existing user's Supabase snapshot.

## Important caveats

- This is a source review, not proof that the deployed app or live Supabase policies are correct.
- The project uses a whole-workspace JSON snapshot adapter. The normalized domain tables in migration `0001` are not yet the active UI persistence path.
- The browser-side sync is revision-checked, but it is not an automatic multi-device merge engine.
- No live account-isolation test, browser E2E suite, Supabase policy inspection, or production deployment verification was possible from the uploaded archive alone.
- Existing accounts with saved starter/demo data will keep that data. Do not clear a live workspace unless you have exported a backup and intentionally chosen the correct account.

## Required verification before inviting MMP users

1. Apply migrations in order on a test Supabase project, then verify the `workspace_snapshots` RLS policies and the `save_workspace_snapshot(jsonb, integer)` function.
2. Create two independent test accounts. Confirm both start with no projects/tasks/notes/releases, then create distinct records and verify neither account can read or change the other's snapshot.
3. Test concurrent edits from two browsers for the same account. A stale writer should get a conflict and pause rather than silently overwrite the newer snapshot.
4. Test signup with email confirmation enabled and disabled, sign-in, sign-out, password reset, OAuth if enabled, and expired sessions.
5. Test import/export and the explicit clear-workspace flow. Confirm export is available before destructive clearing.
6. Run `npm ci`, `npm run typecheck`, `npm run lint`, and `npm run build` in the project environment.
7. Deploy to a staging URL first and verify auth redirect allow-lists, HTTPS, environment variables, PWA install/update behaviour, and mobile layouts.
8. Before broadening beyond a personal/small private release, plan normalized repositories, durable offline queue semantics, account deletion/data-retention handling, rate-limit review, monitoring, and automated browser tests.

## Recommended MMP sequence

**P0 — Release safety:** verify RLS and the two-account isolation test; run typecheck/lint/build; test backups and restore; validate deployed auth redirects.

**P1 — Reliability:** add automated tests for empty account initialization, sign-out isolation, import/export, stale revision conflicts, and network failures. Improve recovery copy so users know when to export before reloading.

**P2 — Product readiness:** add onboarding that starts with an empty workspace and explains the first actions (create a project, capture a task, plan today); add a useful empty state without creating demo records.

**P3 — Architecture:** move from whole-workspace snapshots to normalized per-table repositories only as a deliberate migration, with a backup, compatibility plan, and staging validation. Design offline edits and conflict handling before adding a durable offline queue.

## Database safety

Do not wipe the database and do not rerun migration `0001` against an existing live database. Migration `0002` is designed to add revision-based concurrency without rewriting existing snapshot data. Existing snapshots should remain untouched by this source-only package.
