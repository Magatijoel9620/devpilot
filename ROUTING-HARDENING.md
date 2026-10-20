# DevPilot mobile back-navigation hardening

## What changed

- In-app view changes are now represented in the browser history while keeping the existing URL and Next.js route unchanged.
- The initial view replaces the current history entry; subsequent view changes add entries only when the view actually changes.
- Browser/Android back (`popstate`) restores the previous DevPilot view rather than immediately leaving the app.
- Returning through history closes transient menus/forms/search overlays and resets the mobile navigation state.
- The handler validates stored view names before using them and does not create another history entry when handling Back.

## Files changed

- `src/components/DevPilot.tsx`

## Verify before release

1. Open DevPilot on a mobile browser and as an installed PWA if applicable.
2. Tap **Inbox**, then **Projects**, then **Tasks**.
3. Press Android/system Back once: it should return to **Projects**; press again to return to **Inbox**; press again to return to **Today**.
4. Tap **Settings**, then Back: it should return to the previous view.
5. Test desktop browser Back/Forward and verify that view navigation follows history.
6. Refresh on each view and confirm that the app still starts normally (the app intentionally keeps its existing URL; the current view is session-history state, not a shareable deep link).
7. Test sign-in, sign-out, and cloud sync as usual.

## Notes

This is a client-side history fix for the current single-route app. It does not change Supabase, migrations, authentication, or workspace data. It also does not make each view a distinct URL; shareable deep links would require a separate App Router route design.
