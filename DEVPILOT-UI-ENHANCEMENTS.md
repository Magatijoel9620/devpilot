# DevPilot UI enhancements

This update is additive and keeps the existing Supabase workspace model and task-capture flow.

- Projects: expanded preset colour palette and native custom colour picker.
- Calendar: interactive current-month calendar before Upcoming deadlines; deadline dates are highlighted with project-colour dots. Selecting a date opens the existing task capture modal with that date prefilled as the due date.
- All tasks: shows at most 10 tasks across the status columns by default, with Show more / Show fewer controls.
- Dashboard and Insights: task-status donut charts, open/completed project comparisons, and a seven-day deadline activity chart.

## Validation
The source and CSS were updated in the supplied ZIP. A full TypeScript/build validation could not complete in this environment because `npm ci` timed out and the local dependency installation was incomplete. Run `npm ci`, `npm run lint`, and `npm run build` in the DevPilot repository before committing/deploying.
