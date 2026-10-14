# Monthly KPI and premium delivery workflow

Requested on 13 October 2026; keep work local and do not push/deploy. Existing admin UI remains the visual reference. KPI table and feedback cards must use the same history thresholds/colors: MC/ET ≥4.5 green, ≥4.0 orange, otherwise red; TMA ≥75 green, ≥65 orange, otherwise red; VL Share ≥10 green, ≥6 orange, otherwise red. Orange is #FD7E14.

The control and typography inventory is in [Admin UI audit](ADMIN_STATISTICS_UI_AUDIT.md). Colors use the value rounded to one decimal, matching the displayed metrics and stored history.

## User requirements

- Import, match and review KPIs early in the month; explicitly validate rows/cards before sending. Send only validated rows, preserving old behavior.
- Sending KPIs clears those rows from the KPI queue. It does not clear the premium queue: the same employee/month remains there waiting for premiums.
- A later premium import joins by employee ID plus reporting month. Review/validate complete rows, then explicitly send them. Completed rows leave the premium queue; rows missing premiums remain pending.
- Show a dedicated send button only when validated, eligible rows exist. Imports/preview/feedback generation must not publish data to employees.
- Feedback mode switches the KPI table to the existing card UI. Preserve individual and sequential “Alle generieren”, editable generated text, Magic Touch colors and explicit “Validieren”. Attach reviewed text where provided.
- Reporting month comes from the workbook month column. Display/filter employee-month identity rather than using import/send time as the KPI period. Add month filters to history.

## Current behavior / issue

`MonthlyMetricsAdmin` imports/upserts `kpi_monthly_sales` and `kpi_praemien`. Employee APIs read those tables immediately. There is no persisted distinction between imported, reviewed and sent, so hiding a row in React would not implement delivery or survive reloads. Monthly rows already have unique `(user_id,wave_month)` keys. Legacy feedback stores only `created_at`; its cards and generated text currently use the delivery/current month. The parent page already provides generation, editable cards, validation and draft persistence; these should be reused.

## Implementation

Add persisted sent state to monthly tables and a nullable reporting month to feedback; backfill existing monthly records as already delivered so existing published data stays available. Restrict employee reads to sent records. Stage imports and join the two queues by `(user_id,wave_month)`. An authenticated admin database function validates current row versions and publishes the selected batch atomically, including one history record per employee/month. Repeated/stale sends must not duplicate records. Never delete source rows when clearing a queue.

Keep workbook reporting month separate from genuine import/send timestamps. Use reporting month in titles, history grouping/filtering and feedback generation. Preserve legacy feedback without inventing an unknown period. Prevent reimports from silently changing already delivered records; retain explicit premium correction preview/confirmation.

Prepare the schema change and exercise it only against isolated local PostgreSQL. This initially left production untouched. The later explicit backfill request below authorizes the reporting-month schema and exact-match data updates only. Until that migration is deployed, production-connected localhost reads should remain compatible and clearly indicate that the new delivery workflow is unavailable there.

## Verification

Exercise actual workbook import → review/validation → early KPI send → reload/employee visibility → partial later premium import → matching → premium send → remaining pending rows → history by month. Check feedback mode/individual and bulk generation/edit/validation, monthly identity, colors, zero and missing values, unauthorized/stale/duplicate/failed sends and transaction rollback. Verify RLS hides drafts and only admins publish. Check small-screen layouts, relevant existing tests, type diagnostics and a build. Append actual evidence after completion.

## Implemented and verified

- Imports stage source rows. `sent_at` records explicit publication independently in the KPI and premium tables. Sending changes visibility and history; it does not delete source rows.
- Premium rows join by employee UUID and reporting month. Missing premiums/quantities/rates stay pending. A legitimate zero amount is eligible. Saved quantities and recalculated cent amounts must agree before publication.
- Table and card validation determine the exact send batch. Generation, editing and category changes require another validation. Reimports invalidate previously reviewed versions. A database transaction checks all versions before committing the batch; failure rolls back history and delivery changes together.
- Feedback mode reuses the existing cards, Magic Touch, editing, individual generation and sequential “Alle generieren”. Draft text and reviewed versions survive reloads and month changes in the existing session storage. Sending a premium later preserves already reviewed feedback in the single employee/month history record.
- The row month overrides the workbook title. German/Austrian names, Excel dates and explicit month/year formats are supported; combined files require an explicit month selection in the import column mapping. Bare month names use the workbook year or selected reporting year. Known reporting periods drive history labels/filters, employee history and feedback prompts/comparisons; genuine creation/send timestamps are preserved. Unknown legacy feedback periods remain unassigned.
- Existing published premiums retain the explicit correction preview/confirmation. History refreshes after a confirmed correction. Shared KPI colors cover both queues, cards, history and employee monthly values.
- Before migration, existing monthly KPI/premium values remain visible as previous published data. New import commits, feedback mode and delivery actions are disabled with a clear status. Employee reads retain a compatibility fallback.

| Boundary / check | Result |
| --- | --- |
| Browser → import API → PostgreSQL | 16 main workflow checks pass: actual workbook parsing/matching/preview/staging, selected validation, early KPI sends, failure rollback/retry, delayed partial premiums, reloads, exact queue clearing, month history, feedback editing/generation and preserved premium correction. |
| Edge cases and employee view | 8 additional checks pass: draft calculation, stale premium versions, invalid rates/amounts, valid zero amounts, immutable published rows, stale/impossible KPI values, employee reporting-month notifications and amounts, draft/version restoration and actual login. |
| Actual generation endpoint | Checked the real route with a local model-provider stub. The provider receives the reporting period; historical context excludes current/later periods; placeholder replacement works; generation writes no delivery/history data. Browser generation becomes sendable only after validation. |
| Compatibility / visual finish | Prior-schema KPI and premium values remain visible with delivery actions disabled. Shared green/orange/red thresholds verified in the browser. Screenshots inspected at 360, 390, 768 and 1600 pixels; no page overflow. Zero prior-period comparisons display a missing comparison instead of Infinity/NaN. |
| Database | Checked-in migration compiles against the existing schemas. Invoker functions, empty search path, authenticated execution/admin guard, employee draft visibility, partial pending indexes and employee/month history with serialized send operations verified in PostgreSQL. Null delivery kind and percentages exceeding 100 before rounding are rejected. |
| Unit tests | 18/18 pass across KPI feedback, premium correction and the new monthly delivery suite. |
| TypeScript | 152 existing baseline diagnostics; 152 current diagnostics, zero introduced errors and zero diagnostics in changed/new source. The project suppresses type/lint failures during build, so this is not a clean repository-wide typecheck claim. |
| Build / patch | Optimized Next.js build succeeds, including 123 static pages. `git diff --check` passes. Tests/build use an isolated copy of the edited source. |

Evidence, runnable browser/fixture scripts, SQL checks and screenshots are under the local project-context directory `workflow-20261013/`: `delivery-flow-evidence.json`, `delivery-edge-evidence.json`, `actual-generation-evidence.json`, `migration-evidence.json`, `type-comparison.json`, `build.log` and `verification-summary.json`. The fixture uses real PostgreSQL with the checked-in migration/RLS/transaction and a small REST/auth adapter; model responses are stubbed. These workflow tests used only isolated data. The separately authorized reporting-month backfill is described below.

## Local review and deployment boundary

Implementation remains uncommitted on `codex/admin-statistics-ui` in the existing managed worktree. The separate original migration checkout was not edited.

- Production-connected local UI: <http://localhost:3000/admin/statistiken>. Production has the reporting-month column but no delivery state yet, so the new delivery workflow stays disabled there until migration.
- Interactive workflow demo: <http://127.0.0.1:33662/admin/statistiken>. Login: `admin@fixture.invalid` / `fixture-local`. Uses synthetic September/October rows and a local draft-generation provider; it can be freely reviewed without publishing to real employees.
- Required schema change is prepared locally in `supabase/migrations/20261014081938_monthly_delivery_workflow.sql`. It preserves old publication state and adds known monthly history without creating new unread notifications for legacy imports.

No app code has been pushed or deployed. Only the explicitly requested reporting-month migration and verified backfill have been applied to production.

## Follow-up: fresh ranks and exact reporting-month backfill (13 October 2026)

Admin and promotor leaderboards now share reporting-period rankings. Admins include sent and draft monthly KPIs; promotors include published monthly KPIs only. Monthly sales supersede duplicate legacy feedback, unknown reporting months stay out of ranks, and all employees in a leaderboard use the same period. Existing leaderboard visuals remain unchanged. Opening/focusing the leaderboard and admin import/send refresh the data; feedback generation also fetches the full month ranks. Equal values receive equal ranks.

The real workbook `00_Gesamt_KPI.xlsx` contains 590 data rows (January–August 2026) in `Tabelle1!A1:R591`, with reporting dates in column D. The importer now exposes custom column selectors including **Monat**, recognizes `Coffee Advisor` and `VL Pop+/UP`, and previews one explicitly selected reporting month. All eight partitions were parsed and reconciled to the 590 source rows.

Production `kpi_feedback` had 416 rows uploaded on 7 October and no reporting month. Applied `20261013145403_feedback_reporting_month.sql` to add nullable `wave_month` with a first-day-of-month constraint and a nonunique employee/month index. Historical duplicates are preserved. The prepared delivery migration tolerates that column and preserves existing duplicates; its sales-row lock and existence checks serialize new delivery records.

Backfilled **363 exact matches**; **53 rows remain unassigned** (six have identical metrics in multiple source months; 47 lack an exact identity/metric match). Identities require unique exact normalized names or a stored matching email; workbook work emails are linked only through those exact anchors. All three KPI values must match at the database's existing one-decimal precision and identify one source month. No fuzzy name matching, approximate numeric comparison, inferred import month, or guesses were used.

The guarded SQL was tested against a copy of all 416 original feedback records before execution. It checks the entire original row, locks the feedback table in one short transaction, and aborts if any selected record changed. Post-write comparison verified every assigned month, all 53 unchanged rows, original upload timestamps, values, text, categories and read status. Existing profiles and monthly sales were unchanged. Standard `updated_at` triggers ran for the selected rows. Backup, match/exception analysis, transaction SQL and verification evidence remain in the private local project-context folder, outside Git.

Final follow-up verification: **25 domain unit tests pass**, both rank UIs and fresh database values are verified in the browser, the actual combined workbook's month mapping is verified on desktop/mobile, older schemas retain published reads while blocking new writes, and the final Next build passes. Type comparison remains 152 pre-existing diagnostics with zero introduced or changed-source diagnostics. Production's backfill verification reports 363 assigned / 53 untouched and preserves all original content and creation timestamps. Registered application names provide no additional exact identities for the 53 exceptions.

## Production activation — 14 October 2026

The user authorized the production push and activation after the local review. Applied `20261014081938_monthly_delivery_workflow.sql` to project `mgrnbobprevtxpxyxjqc`, after confirming the migration against an isolated copy of the live data. Existing 349 monthly sales rows and 216 premium rows remain published with their original values/amounts. All 416 original feedback rows remain unchanged, including the 53 unassigned exceptions. The migration adds 49 missing historical entries as already read and creates no new unread notifications. Invoker function settings, execution grants and employee draft visibility were verified in the live database. Production delivery is now enabled for new imports; historical published months remain out of the pending queue.

The authorized release supersedes the earlier local-only/no-push status above. The tested source is being released through the existing `origin/master` Vercel integration; source/deployment/alias verification is recorded in project-context `release-20261014/`.
