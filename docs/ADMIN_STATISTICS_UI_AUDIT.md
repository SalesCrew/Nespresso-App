# Admin KPIs and Prämien: UI audit and alignment

Research completed before implementation on 13 October 2026. Local branch: `codex/admin-statistics-ui`, based on production source `059c9c7cb1ff8ecd54dca0e857a293a88584af33`. Requested scope: both KPIs and Prämien on `/admin/statistiken`; do not push or deploy.

This document records the initial UI alignment. The subsequent request changes monthly import and delivery behavior; its implementation, schema change and additional verification are documented in [Monthly KPI delivery workflow](MONTHLY_KPI_DELIVERY_WORKFLOW.md).

## Design authority

The existing admin interface is the reference. The user's clarification explicitly makes its appearance authoritative. Deslopify is used only to check polish, responsive behavior, custom-control interactions and finish. It supplies no replacement palette, typography, brand or navigation.

Inspected sources: `app/admin/team/page.tsx`, `app/admin/einsatzplan/page.tsx`, `app/admin/dashboard/page.tsx`, `components/AdminNavigation.tsx`, `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts`, the shared Button/Input/Select/Tabs/Switch/Popover/Command/DatePicker primitives, `app/admin/statistiken/page.tsx` and `components/statistiken/MonthlyMetricsAdmin.tsx`.

## Existing admin patterns

| Element | Established pattern and evidence | Apply to KPIs and Prämien |
| --- | --- | --- |
| Typography | Root layout loads Inter. Admin headings use `text-2xl font-semibold`; controls use `text-sm` and secondary labels `text-xs`. Controls inherit the page font. | Inherit Inter in controls, popups and feedback text. Keep current header hierarchy. |
| Secondary buttons | Team and Einsatzplan header actions use `rounded-lg`, white surfaces, gray borders/text, `px-3 py-2`, light gray hover. | Replace 4px/square monthly controls with the same 8px geometry, spacing and colors. |
| Primary actions | Navigation and admin import/save actions use `linear-gradient(135deg, #22C55E, #105F2D)` with white labels. | Apply that existing green treatment to save/confirm actions; preserve each action's meaning and disabled state. |
| View menus / tabs | Team's Promotoren/Bewerber and Einsatzplan's Einsatzplan/Märkte use rounded buttons; active state is gray-100, gray-900 text, gray-300 border and a small shadow. | Match monthly KPIs/Prämien tabs to these modes, with accessible keyboard tab behavior. |
| Dropdown triggers | Team region/status filters use white, rounded-lg, gray-200 borders, gray chevrons and 14px text. | Custom triggers and dropdown panels matching these surfaces and typography. |
| Dropdown panels | Existing admin custom panels use white, gray-200 borders, rounded-lg, shadow-lg, gray-50 hover and a distinct selected state. | Reuse available Radix/Command primitives with those local styles; support search/typeahead, Escape, focus return and long lists. |
| Dates / month selection | Shared DatePicker already uses a custom rounded white calendar. Monthly reporting chooses a whole month, not a day. | Use a custom month popover with localized month labels, year navigation and selection. Do not introduce an OS picker or day-level semantics. |
| Inputs | Team's shared Input and forms use white surfaces, gray borders, compact padding and rounded corners. | Align rate inputs, labels and focus treatment; keep euro precision and validation unchanged. |
| Switches / selection | Shared Switch is a rounded Radix switch; Team/Einsatzplan use checkboxes for independent choices and view buttons for modes. | Keep KPIs/Prämien as tabs. There is no new immediate setting that warrants a switch. Preserve existing selection semantics. |
| Containers / tables | Admin white cards use light borders, rounded corners; table labels are subdued, values are readable, details remain expandable. | Bring the monthly panel into this treatment, preserve data density, align numeric amounts and retain local table scrolling. |
| Focus / scrolling | Admin commonly suppresses large focus rings and hides scrollbar chrome. | Use a small visible keyboard-only inset/border treatment. Hide scrollbar chrome while preserving wheel/touch/keyboard access. |

## Observed mismatches and remedies

The pre-change rendered audit uses synthetic identities and actual Next UI/API routes with isolated PostgreSQL. Its evidence is in Mac project-context `ui-alignment-20261013/before-ui-audit.json` and `before-statistics-desktop.png`. The Team reference screenshot checks the existing header/filter styling; its business data is not modeled in that fixture and its list displays a loading error. Source review supplies the remaining references; no successful Team business workflow is claimed.

1. Monthly KPIs/Prämien tab buttons have a measured 0px radius and a black selected background. Most neighboring monthly actions/inputs have a measured 4px radius. These look unrelated to the rounded gray admin view controls. Reuse the admin geometry and selected treatment, preserving the view state and keyboard behavior.
2. The monthly form has one native employee select and one native `type=month` control before an employee is selected. Import assignment also uses native selects. Browser/OS popups differ from the custom admin menus and can use platform typography. Replace them with styled accessible custom controls, retaining identifiers, filtering and import assignments.
3. The body and monthly buttons already measure `Inter, "Inter Fallback"`; there is no separate monthly font to replace globally. Feedback editing and preview/history `pre` elements explicitly use Tailwind `font-sans`, overriding Inter. Remove those scoped overrides and unify the control scale/inheritance. Do not change the app font or all admin pages.
4. Monthly save/confirmation buttons use black or plain small outlined actions. Match the green primary actions already used elsewhere while retaining preview, confirmation, retry and concurrency protection.
5. Older feedback selectors have smaller corners and handmade pointer-only disclosure. Match their triggers/panels to the admin controls and use the existing accessible primitives for disclosure/selection. Preserve Magic Touch colors and matching logic.
6. The many statistics header actions and fixed five-column feedback grid can overflow a narrow viewport. Allow wrapping and responsive grid columns; retain all actions and horizontally scroll comparison tables within the panel.

## Implementation boundaries

- Scope reusable styling to statistics controls. Do not restyle global Button, Select, fonts, navigation or unrelated admin pages.
- Preserve monthly fetch/import/rate-save/calculation/correction contracts, stored quantities, snapshots and totals.
- Preserve feedback validation, both send modes, drafts, matching, category colors, history filters and read state.
- Add no dependency, database migration, backend feature or production configuration change.
- Keep the live-data server on localhost:3000 available. Run mutation checks only against a separate copied source tree, synthetic config and isolated PostgreSQL. Never send synthetic payroll or feedback to production.

## Verification plan

Inspect both modes and relevant open menus at desktop, intermediate, narrow and short viewports. Exercise keyboard tab switching, search, selection, Escape/outside dismissal and focus return; month/year navigation; long names and no matches; rate input/disabled states; correction preview/cancel/error/retry/reload; monthly import preview and assignment; feedback matching/category selection and both send paths/history. Run appropriate existing tests, compare TypeScript diagnostics with the same baseline/generated types, and build the isolated source copy. Leave the changes local and unpushed.

## Implemented

- Added scoped `AdminStatisticsControls.tsx` wrappers around existing Button/Input/Select/Popover/Command primitives. They inherit Inter, use the admin's 8px corners, gray secondary styling, green primary gradient and restrained keyboard focus. Global primitives and unrelated pages are unchanged.
- Monthly KPIs/Prämien now use accessible tabs, a localized custom month/year picker, searchable employee selection and searchable import assignment. Rate/save/correction controls share the established admin styling. Tables retain horizontal scrolling and visible keyboard focus.
- Feedback matching, Magic Touch and history filtering now use the same accessible custom menu treatments. Category colors and existing matching identifiers are preserved. Feedback text inherits Inter.
- Header actions wrap and the feedback grid adapts to narrower widths. Menus stay within the viewport, long names wrap in options, search has a no-results state, and scrollbar chrome is hidden without preventing scrolling.
- The initial UI alignment required only scoped interface changes. The later monthly delivery workflow adds API/schema behavior as documented separately. Dependencies, the global font and production configuration remain unchanged.

## Verification completed

30 browser/API/database checks and 11 existing unit tests passed. Browser mutations used a separate source copy with synthetic credentials and isolated PostgreSQL, including checked-in schemas, triggers and RLS. No test feedback, imports or payroll writes were sent to production. Paid text generation was stubbed in the existing message flow; reviewed text still passed through the actual save/read APIs and database.

| Checks | Result |
| --- | --- |
| Premium correction (10) | Special-rate save, preview/cancel, failed save/retry, exact employee update, unchanged source quantities/other statements, admin reload, employee amount/breakdown, authorization, stale-preview/rate/concurrent-update guards. |
| KPI feedback (10) | Actual XLSX import/validation, KPI-only send, failed save/retry, reviewed message send, admin history/reload, employee display, role/record checks, failed read/retry and persistent read/history state. |
| Controls and layout (7) | Keyboard tabs, search/no results, selection, Escape/outside dismissal/focus return, month/year navigation, empty-month state, feedback category/matching, history filter and long names. Viewports: 1600×1100, 1280×900, 768×800, 390×844, 360×740 and 800×450. No page-level horizontal overflow; tables still scroll. |
| Monthly imports (3) | Actual KPI and premium workbooks, preview without writes, custom manual employee assignment/recheck/save, default-rate save and KPI-based premium calculation with review. Persisted quantities, snapshots and totals checked in PostgreSQL. |
| Unit tests | Existing KPI feedback and premium correction suites: 11/11 pass. |
| Build | `next build` succeeded on the exact edited source copy with synthetic config. |
| TypeScript comparison | 152 baseline errors and 152 current errors; zero introduced errors and zero diagnostics in the three edited/new TSX files. The existing project suppresses TypeScript/lint failures during builds, so this is not a claim of a clean repository-wide type check. |
| Patch checks | `git diff --check` passed. Built/tested source hashes match the three live worktree files. |

Evidence and browser scripts are saved under project-context `ui-alignment-20261013/`: `verification-summary.json`, `premium-flow-evidence.json`, `feedback-flow-evidence.json`, `controls-flow-evidence.json`, `imports-flow-evidence.json`, `type-comparison.json` and `build.log`. Before/after desktop measurements and screenshots, custom month-menu screenshots, long-name and mobile import screenshots are included there. All inspected screenshots use synthetic employee data.

The production-connected local dev server remains available at <http://localhost:3000/admin/statistiken> (login page responds 200). Changes remain uncommitted on `codex/admin-statistics-ui`. Nothing was pushed or deployed.
