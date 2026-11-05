# DevPilot navigation and UX uplift

## Included
- The sidebar's **Your projects** list now renders every non-archived project and scrolls independently when the list grows.
- Tablet widths use a compact icon rail with native hover/focus tooltips and a rail toggle to expand the full sidebar.
- Mobile navigation is a floating, sticky rounded dock for Today, Projects, Tasks, Calendar and Settings. Inbox has moved to the top bar between notifications and the account avatar.
- Project cards expose a three-dot menu with Edit project and Pause/Resume actions. Editing updates the existing project record in the workspace state and uses the existing persistence pipeline.
- KPI, project and panel cards have restrained hover/lift feedback, with reduced-motion support.
- The initial workspace loading screen now includes animated skeleton placeholders.

## Preserved
- Existing Supabase schema and migrations.
- Existing auth/session and workspace save/sync flow.
- Existing task, planning, release and project data models.
- No new dependencies or environment variables.
