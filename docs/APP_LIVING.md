# SalesCrew / Nespresso app — living engineering reference

Last updated: 7 October 2026. Owner of this change: KPI delivery without a message.

## Read this first

The repository is SalesCrew/Nespresso-App. The primary Mac checkout is a preserved migration checkpoint at `7d64ea7d59c2d0b71455283069532a167583b0aa`, with 41 modified tracked files and 32 restored source files, plus the local startup note. It must retain that work. The fetched `origin/master` is `5b41f2135db647b62062351be6a791b192c2bb84` and is the feature release baseline.

Vercel project `nespresso-app` (`prj_NPl8DvBxlpufBCp7acMYYdeMe175`) belongs to team `team_1jxKZGLAXPKrEyvgqajh8OQc`. The verified KPI feature production deployment on 7 October is `dpl_ENqUec87YnqpjXvgro2TbqkBrUZF`, source `14594a04585a182e0f08d243b677a2e47a091abd`, state READY. Its stable public alias is `nespresso-app-three.vercel.app`. This release includes the existing monthly KPI/premium commit from the release baseline. The prior production source was `78f9041e6ee6382191d70760cafec677677bdad6`.

The configured and connected Supabase project is **Nespresso App**, ref `mgrnbobprevtxpxyxjqc`, in eu-central-1. This match was checked against the local configuration without printing credentials. Other connected projects are outside this task. Local configuration lives in `.env.local`, ignored by Git with mode 600. The existing migration startup note and reports remain dated evidence; their original source hashes must remain intact.

## Index coverage and how to maintain this file

The inventory includes every Git-tracked and restored untracked project entry, and every tracked entry at the fetched release tip. The scanner read all file bytes; decoded text records include imports, exported API methods, database/storage references, RPCs, environment-variable names, mutation operations, symbols and line anchors. Every JavaScript/TypeScript file was parsed as an AST; there were no syntax parse diagnostics. Binary assets and lockfiles are inventoried and fingerprinted. Focused source review follows the cross-module app flows and fully traces the KPI delivery/read workflow. Secrets and generated dependencies/build output are excluded from documentation.

The machine index and source inventories are retained under the Mac project-context folder `app-index-20261007`. The initial snapshots cover 416 preserved-checkout entries and 421 release entries. The final feature snapshot covers 425 entries and 143 API routes. This document contains the portable architecture map and the complete release file/API catalogs below. Keep the behavior sections, feature status and acceptance evidence current when a workflow changes; regenerate the catalogs after adding routes or modules. Current source and inspected live metadata take precedence over historical setup instructions.

## Runtime, entry points and layouts

Next.js App Router 15.5.24 in the current release lockfile (the preserved migration uses 15.2.8), React 19, TypeScript, Tailwind, Radix/shadcn primitives, lucide icons, Recharts, Supabase JS/SSR, OpenAI, Socket.IO, XLSX and PDF/image tools make up the app. The npm lockfile drives the verified Mac dependency install. The pnpm lockfile also exists and represents a different dependency resolution; keep the release's chosen install behavior consistent.

`app/layout.tsx` sets German HTML and the Inter font. `ConditionalLayout` routes public/auth content and the shared site layout. Admin and promotor layouts validate the authenticated user, database role and deleted flag, and redirect between role-specific areas. Admin pages get their socket and notification providers; promotor pages get SiteLayout, socket notifications, unread bridge and daily check-in provider.

`middleware.ts` refreshes auth cookies and protects admin, API and promotor paths. Admin-only API patterns include assignment mutations, admin statistics, AI tools, scheduled messages and provisioning. Dynamic promotor IDs enforce self/admin access. `lib/auth/routeGuards.ts` supplies `requireUser`, `requireAdmin` and `requireSelfOrAdmin`, reading the database-backed role/deleted flag through the service client. Never replace these release protections with the older migration versions.

`lib/supabase/server.ts` has legacy synchronous and asynchronous cookie helpers; Next 15 route work should use the async helper. The browser uses the public client, while `lib/supabase/service.ts` is server-only in practice and uses privileged credentials. Service-backed APIs must enforce role or ownership before querying or mutating user data. Recovery uses a separate implicit-flow browser client. Password-reset, forgotten-password, session clearing and force-reset pages support auth lifecycle recovery.

`next.config.mjs` skips type and lint checks during builds and disables image optimization. A successful build is not proof of strict type correctness. There is no pre-existing checked-in test suite or ESLint configuration in the preserved snapshot. Previous strict checks found 145 diagnostics in 46 files; fresh release-baseline checks must distinguish existing failures from this feature's changes.

## Product areas and persistence

| Area | Main UI and shared modules | Persisted workflow |
| --- | --- | --- |
| Public applications | `app/page.tsx`, landing/auth pages, OnboardingModal | Applicants submit to applications; admin approval provisions auth/profile/onboarding data. |
| Admin operations | `admin/dashboard`, AdminNavigation, AdminEddieAssistant | Scheduled messages and history, assignment/tracking status, special-status requests, daily checks, KPI aggregates, operational AI summary. |
| Team/master data | `admin/team`, personalData, socialSecurityNumber, recomputeOnboarding | user_profiles, promotor_profiles, applications, onboarding_steps, notes, availability, bank/clothing details, credentials, contracts/documents; deletion is soft deletion. |
| Planning/markets | `admin/einsatzplan`, marketMatcher, assignment location map | assignments, markets, participants, invitations, history/process state, acceptance addresses, market photos, preferences, notes and buddy tags. Imports support matching and region/time validation. |
| Promotor dashboard | `promotors/dashboard` | Calendar/work status, derived to-dos, persistent todo_history, normal/confirmation-required messages and document response uploads. |
| Promotor assignments | `promotors/einsatz`, assignmentTimeStatus, automaticConfirmation, browserGeolocation | Invitation acceptance/rejection/replacements, buddy tags, daily check-in, start/pause/end tracking, deviations and location checks, photos and unread admin notes. |
| KPI feedback/statistics | admin/promotor statistics pages; KPI feedback APIs | kpi_feedback stores MC/ET, TMA, VL Share, feedback text, recipient, magic-touch category, read status and sent/updated timestamps. |
| Monthly sales and premiums | MonthlyMetricsAdmin/Promotor, statistics/monthlyKpi/premium/resolvePromotors | kpi_monthly_sales holds calendar-month sales/targets; kpi_premium_rates stores monthly rate configuration; kpi_praemien holds accounting amounts. These are separate from CA feedback waves. |
| Chat | admin/promotor chat, useChatIntegration, SocketContext, poll/notification components | Conversations, participants, messages, hidden/deleted states, pinning, read/unread/clear markers, attachments, reactions and polls/votes. |
| Profile/onboarding | `promotors/profil`, OnboardingModal, recomputeOnboarding | Documents/contracts, contact and personal data, bank/clothing details, availability and access credentials; profile stats/payroll countdown. |
| Training/demo | Admin Schulungen/Demotool/Sales Challenge; promotor Schulungen-Videos | Video/PDF/quiz components, progress and UI demos. Several training, mystery-shop and challenge displays contain mock/client-generated state; do not present them as verified persisted business data. |
| Privacy | Datenschutz pages, privacy APIs, audit/storage helpers, DSGVO docs | Requests/events, exports, legal holds, data-access evidence, private signed/proxied files, role/ownership boundaries and retention preview. |

### Assignments and automatic jobs

Assignment invitations and participants serve different stages: invitations carry invitation/buddy/replacement statuses, participants establish actual assignment membership. Tracking captures work start/pause/end and evidence. Daily-checkin and acknowledgments are separate persisted facts. Special statuses (holiday, illness/emergency) can release participants and mark assignment availability; freed_assignments_log records that history.

Two GET paths have operational side effects: assignment-today calls `check_and_update_tracking_status`, and special-status/apply-daily modifies assignment/status data. The schedule UI also automatically calls auto-match. Those paths require isolation during verification. Existing migration tooling blocks known jobs for public-only previews; that Node guard does not intercept direct browser-to-Supabase writes and is not an authenticated feature test harness.

### Messages, chat and notification delivery

Scheduled admin messages use messages/message_recipients, then promotor dashboard normal or two-step confirmation cards; uploads use message_responses and storage. Reading a message also completes its derived to-do. Chat is a separate realtime subsystem, with room membership and database-backed APIs, Socket.IO events, toast stacks and unread counts. Polls, reactions, edits and deletion are chat features, not scheduled-message delivery.

The Next frontend/API deploys to Vercel. `server.js` runs the separate Socket.IO service on Railway and authenticates socket sessions with Supabase. SocketContext connects using configured endpoint/fallback behavior. This KPI change should work via authenticated HTTP without requiring a Railway release or paid OpenAI call. Socket setup and historical chat runbooks are context, not a requirement to redeploy unrelated services.

### Storage and sensitive access

Contracts, identity/employment documents, profile pictures, assignment photos, market photos, chat attachments/group pictures and message responses use separate bucket/workflow paths. Signed upload/confirm and signed download/proxy routes are distinct. Release storage helpers authorize access and translate legacy paths. Existing DSGVO migrations move sensitive content behind ownership/member/admin restrictions and include audit/privacy structures. Preserve those restrictions when adding UI or APIs.

## KPI flow before this change

1. Admin statistics imports CA rows and matches each card to an actual promotor. Draft cards, matches, generated/edited text and validation state survive navigation using bounded sessionStorage state.
2. The validation button is currently shown only after text generation. `handleSendToHistory` filters for validated, generated and matched cards, attaches generated/fallback text, POSTs feedbackItems, then moves successful cards to local history and removes their draft state.
3. Admin POST inserts one kpi_feedback row per card, with read=false. Admin GET joins display names for history. Admin dashboards/team KPI endpoints and charts consume these same metric rows.
4. Promotor statistics GETs the newest unread feedback and all history. Its orange/yellow/red notification shows feedback text and PATCHes read=true. History and leaderboard aggregate metric values, independent of read status. The promotor dashboard currently has normal message cards but no KPI-delivery card.
5. History popovers assume feedback text exists, so a KPI-only delivery must render a metric-only history view instead of an empty/loading message.

Live schema inspection confirms feedback_text is NOT NULL but has no non-empty constraint; metric fields are numeric, recipient has an auth-users foreign key, and read defaults to false. Live RLS permits admins and restricts promotor reads/updates to their own recipient rows. The current API PATCH checks ownership but does not verify that a row was actually updated; improve this feature path so failed or foreign acknowledgments do not appear successful. The live policy allows own-row updates broadly; avoid introducing direct browser KPI mutations.

## Requested feature and implementation/acceptance status

Requirements: validate imported KPI cards without generating a message; add **Senden ohne Nachricht** next to the existing send action; persist values and move successful cards to admin history; display a dedicated KPI-only notification on the promotor dashboard in the existing feedback-card visual style; persist a read acknowledgment; preserve the ordinary message-send flow and metric history/aggregations; verify and push to production.

- [x] Whole-project file/AST index and initial living reference written before feature implementation.
- [x] Remote source, current production deployment and scoped Supabase identity/schema inspected.
- [x] Choose and record the delivery representation and validation rules.
- [x] Implement independent KPI validation, both send buttons and successful-send history transition.
- [x] Implement server-side delivery validation and ownership-aware acknowledgment.
- [x] Implement dashboard KPI-only card and consistent statistics/history handling.
- [x] Verify normal feedback and KPI-only flows, failures, refresh persistence and authorization.
- [x] Review changed React code, run applicable type/build/diff checks and inspect browser rendering.
- [x] Push the reviewed commit and verify the intended production deployment/alias.

The initial index preceded feature implementation. Feature code was implemented and reviewed in the managed `codex/kpi-without-message` worktree, based on the fetched release tip, then pushed to master and deployed with the user's explicit production authorization. All acceptance boxes have inspected evidence. Verification used isolated fixtures; no fabricated KPI data or test credentials were sent to production.

### Current delivery representation

`deliveryMode` in the admin request is either `feedback` (default for existing clients) or `kpis-only`. KPI-only records store an empty feedback_text and null magic_touch, with the same recipient, numeric metrics, timestamps and read=false fields. The inspected existing NOT NULL text column permits this exact representation, so no schema or data migration is required. Shared Zod validation rejects missing recipients, nonfinite/negative metrics, percentages outside 0–100, MC/ET outside database precision, empty/oversized batches and missing text in message mode.

Admin validation is independent of generation. Both send actions operate on all validated cards; missing matches or messages are explained rather than silently dropping cards. The request is guarded against concurrent sends. The UI removes drafts only after a complete successful response and uses the saved database IDs, times and read flags for history. Failed saves keep the cards available.

Unread text feedback and unread KPI-only deliveries are fetched independently from the same recipient-scoped table. The dedicated dashboard/statistics card displays the metrics, polls and refreshes on focus, and PATCHes the record's read flag before showing acknowledgment. Failed acknowledgments remain visible and retryable; absent or foreign rows return 404. History/leaderboards continue to include all metric rows, regardless of text or read status. Pure schema/serialization regression tests are in `tests/kpi-feedback.test.cjs` (`npm run test:kpi`). All six pass. Both history UIs normalize persisted numeric values before rendering or aggregating.

### Verification evidence — 7 October 2026

The complete browser flow uses the actual Next app, authenticated API routes and a separate PGlite PostgreSQL database loaded with the checked-in KPI schema, trigger and RLS. All names, users and credentials are synthetic. A real XLSX workbook is uploaded in Chromium. Only paid feedback generation is stubbed; delivery and read mutations execute actual SQL. The fixture serializes numeric columns as PostgREST JSON numbers. No fabricated KPI records were sent to production and no paid model call was made.

Ten scenarios pass: validation without text; failed save retains drafts; KPI-only retry stores numbers/blank text/null category/unread status and moves to history; admin history survives reload; ordinary reviewed-message delivery still works; a 390px dashboard shows the dedicated metrics card; anonymous/wrong-role/deleted/foreign-record requests are rejected; failed read stays visible and retry persists; read status survives reload while metric history remains; statistics show ordinary feedback and a message-free KPI history detail. There are no browser page exceptions. Desktop buttons and mobile dashboard/history screenshots were visually inspected.

The optimized Next 15.5.24 build passes using isolated configuration. Existing project settings skip type/lint checks during builds; a separate compiler-host comparison of the same generated build types finds 196 baseline diagnostics and 196 current diagnostics, with none introduced and none in changed source (the pre-build comparison was 104/104). Existing Supabase Edge Runtime warnings remain. Lockfiles are unchanged. Git diff whitespace checks and every JS/TS AST parse pass. All 415 source hashes and the ignored, mode-600 configuration in the preserved migration checkout still match their restoration evidence.

Local evidence and reproducible fixture scripts are in project-context `salescrew-app/verification-20261007`; the final source index and type comparison are in `app-index-20261007`. The feature requires no database migration or Railway release. The exact pushed feature source and production alias have been confirmed in Vercel. Public HTTP checks pass for the landing page and both login pages (200), unauthenticated admin/promotor redirects (307), and both KPI API access barriers (401). Vercel reports no alias error. The deploy URL retains Vercel SSO protection; the public production alias is the end-user URL. A final documentation commit records this verified feature release.

## Known limits and operations

The migration retained missing-note/attachment/spreadsheet/worktree gaps documented in START-HERE and its context index. Supabase/OpenAI configuration was restored exactly on 1 October. Maps settings and an explicit socket endpoint were absent locally; inspect configured deployment metadata rather than assuming production has the same omissions. Production source contains DSGVO, soft-delete, social-security formatting and master-data changes unavailable in the old checkout.

Monthly import math and feedback-wave aggregates are different units and sources; do not mix them. Feedback generation uses a paid OpenAI route and must remain optional. XLSX default imports warn in the preserved snapshot; release baseline behavior must be checked before attributing such warnings to this feature. Several screens contain mock/placeholder content; verify a workflow's persistence rather than inferring it from rendering.

## Complete release API catalog

The table lists actual exported methods and literal database/storage/RPC references. Middleware, shared guards and helpers also enforce access. Dynamically constructed references require reading their associated implementation.

| API path | Methods | Database/storage references | RPCs |
| --- | --- | --- | --- |
| /api/admin/assignments/[id]/outside-breaks | GET | assignment_outside_breaks |  |
| /api/admin/auslastung | GET | user_profiles, promotor_profiles, assignment_participants, active_special_status |  |
| /api/admin/contracts/confirm | POST | contracts |  |
| /api/admin/contracts | POST, PATCH, DELETE | dienstvertrag_files, dienstvertraege, promotor_profiles | activate_dienstvertrag_file |
| /api/admin/contracts/send-dienstvertrag | POST, GET | sent_dienstvertrag |  |
| /api/admin/contracts/upload-url | POST | dienstvertraege |  |
| /api/admin/daily-checkin-status | GET | user_profiles, assignment_daily_checkin |  |
| /api/admin/documents | POST, PATCH, DELETE | documents |  |
| /api/admin/kpi-feedback | GET, POST | user_profiles, kpi_feedback |  |
| /api/admin/kpi-praemien/from-kpis | POST | user_profiles, kpi_monthly_sales, kpi_premium_rates, kpi_praemien |  |
| /api/admin/kpi-praemien/import | POST | user_profiles, kpi_premium_rates, kpi_monthly_sales, kpi_praemien |  |
| /api/admin/kpi-praemien/latest-summary | GET | user_profiles, kpi_monthly_sales, kpi_praemien |  |
| /api/admin/kpi-praemien | GET | user_profiles, kpi_praemien |  |
| /api/admin/maps/config | GET | user_profiles |  |
| /api/admin/markets/[id]/acceptance-addresses | POST, DELETE | user_profiles, markets, assignments |  |
| /api/admin/markets/[id]/photos | DELETE | user_profiles, markets, market-photos |  |
| /api/admin/markets/[id]/photos/upload | POST | user_profiles, markets, market-photos |  |
| /api/admin/markets/[id] | PATCH, DELETE | user_profiles, markets |  |
| /api/admin/markets/import | POST | user_profiles, markets |  |
| /api/admin/markets | GET, POST | user_profiles, markets, market_visits, assignments |  |
| /api/admin/monthly-kpis | GET, POST | user_profiles, kpi_monthly_sales, kpi_praemien |  |
| /api/admin/premium-rates | GET, PUT | user_profiles, kpi_premium_rates |  |
| /api/admin/privacy-requests/[id]/export | GET | privacy_requests, user_profiles, promotor_profiles, documents, dienstvertrag_files, access_credentials, assignment_participants, assignment_daily_checkin, special_status_requests, active_special_status, onboarding_steps, kpi_feedback, kpi_praemien, todo_history, chat_messages, chat_participants, chat_message_reactions, message_recipients, applications, assignments, assignment_tracking, messages, privacy_request_events |  |
| /api/admin/privacy-requests | GET, PATCH | privacy_requests, user_profiles, privacy_request_events |  |
| /api/admin/privacy/legal-holds | GET, POST, DELETE | legal_holds |  |
| /api/admin/privacy/retention-preview | GET |  | get_retention_preview |
| /api/admin/promotor-kpi-history/[userId] | GET | user_profiles, kpi_feedback |  |
| /api/admin/promotors-list | GET | user_profiles |  |
| /api/admin/promotors/[id]/contracts/signed-url | GET | dienstvertrag_files, dienstvertraege |  |
| /api/admin/promotors/[id]/freed-assignments | GET | user_profiles, freed_assignments_log, assignments |  |
| /api/admin/promotors/[id]/kpi | GET | user_profiles, kpi_feedback |  |
| /api/admin/promotors/[id]/profile-stats | GET | user_profiles, assignment_tracking, freed_assignments_log, assignments_with_buddy_info |  |
| /api/admin/statistiken/generate-email | POST | kpi_feedback |  |
| /api/admin/team/access-credentials-import | POST | user_profiles, promotor_profiles, applications, access_credentials |  |
| /api/admin/team/anmeldestatus | GET, POST | user_profiles, anmeldestatus_entries |  |
| /api/admin/whats-todo | GET | assignments, assignment_participants, assignment_invitations, special_status_requests, promotor_profiles, dienstvertrag_files, applications, user_profiles |  |
| /api/ai/eddie-chat | POST | eddie_chat_messages, assignment_participants, assignments, documents, promotor_profiles |  |
| /api/ai/enhance-message | POST |  |  |
| /api/ai/recommend-promotors | POST | assignments, markets, user_profiles, promotor_profiles, assignment_participants |  |
| /api/applications | GET, POST, PATCH, DELETE | applications |  |
| /api/assignments/[id]/applications/decline | POST | assignment_invitations |  |
| /api/assignments/[id]/applications | GET | assignment_invitations, user_profiles |  |
| /api/assignments/[id]/invites/accept | POST | assignment_invitations |  |
| /api/assignments/[id]/invites/acknowledge | POST | assignment_invitations |  |
| /api/assignments/[id]/invites/respond | POST | assignment_invitations |  |
| /api/assignments/[id]/invites/status | GET | assignment_invitations |  |
| /api/assignments/[id]/match-market | POST | assignments, markets |  |
| /api/assignments/[id]/participants/choose | POST, DELETE | assignment_participants, assignments |  |
| /api/assignments/[id] | PATCH, DELETE | assignments, markets |  |
| /api/assignments/[id]/tracking | GET | assignments_with_buddy_info, assignment_tracking, assignment_daily_checkin, assignment_outside_breaks |  |
| /api/assignments/auto-match | POST | user_profiles, markets, assignments |  |
| /api/assignments/buddy-tags | GET | assignment_invitations, assignments, assignment_participants, user_profiles |  |
| /api/assignments/bulk-invite | POST | assignment_invitations, invitation_history |  |
| /api/assignments/import | POST | user_profiles, assignments, assignment_participants, markets |  |
| /api/assignments/invitation-history | GET | invitation_history, assignments, user_profiles |  |
| /api/assignments/invites/acknowledge-all | POST | assignment_invitations |  |
| /api/assignments/invites/counts | GET | assignment_invitations |  |
| /api/assignments/invites/details | GET | assignment_invitations, user_profiles |  |
| /api/assignments/invites/process-state | GET | assignment_invitations |  |
| /api/assignments/invites | GET | assignment_invitations, assignments, assignment_participants, user_profiles |  |
| /api/assignments/invites/unacknowledged-accepted | GET | assignment_invitations, assignment_acknowledgments, assignments |  |
| /api/assignments/invites/unacknowledged-rejected | GET | assignment_invitations, assignment_acknowledgments, assignments |  |
| /api/assignments/process | GET, POST, DELETE | assignment_processes |  |
| /api/assignments/promotor-notes/mark-read | POST | einsatznotiz_promotor |  |
| /api/assignments/promotor-notes | POST, GET | einsatznotiz_promotor, assignment_participants |  |
| /api/assignments/release-multiple | POST | user_profiles, assignment_participants, assignments, freed_assignments_log |  |
| /api/assignments | GET, POST | assignment_participants, assignment_invitations, assignments_with_buddy_info, assignments, assignment_tracking, markets |  |
| /api/assignments/sync-import-promotors | POST | user_profiles, assignments, assignment_participants |  |
| /api/assignments/today | GET, PATCH | markets, user_profiles, todays_assignments, assignments, assignment_participants, assignment_tracking | check_and_update_tracking_status |
| /api/auth/create-promotor | POST | user_profiles, applications, promotor_profiles, onboarding_steps |  |
| /api/chat/admins | GET | user_profiles |  |
| /api/chat/attachments | GET | chat_participants |  |
| /api/chat/conversations/[conversationId]/clear-for-me | POST | chat_participants |  |
| /api/chat/conversations/[conversationId]/mark-read | POST | chat_participants |  |
| /api/chat/conversations/[conversationId]/mark-unread | POST | chat_participants |  |
| /api/chat/conversations/[conversationId]/picture | PATCH | user_profiles, chat_conversations |  |
| /api/chat/conversations/[conversationId]/pin | POST | chat_participants, chat_conversations |  |
| /api/chat/conversations/[conversationId] | GET | chat_conversations, chat_participants, promotor_profiles |  |
| /api/chat/conversations/[conversationId]/unpin | POST | chat_participants, chat_conversations |  |
| /api/chat/conversations | GET, POST | user_profiles, chat_participants, chat_conversations, promotor_profiles, chat_messages |  |
| /api/chat/messages/[conversationId] | GET | chat_participants, chat_messages, chat_message_hidden, user_profiles, chat_message_reactions, chat_polls, chat_poll_options, chat_poll_votes |  |
| /api/chat/messages/delete | POST | chat_participants, chat_messages, user_profiles, chat-attachments, chat_message_hidden |  |
| /api/chat/messages/edit/[messageId] | PUT | chat_messages, user_profiles, chat_message_reactions |  |
| /api/chat/messages/send | POST | chat_participants, chat_messages, chat_conversations |  |
| /api/chat/participants/add | POST | chat_conversations, user_profiles, chat_participants, chat_messages |  |
| /api/chat/participants/remove | POST | chat_conversations, user_profiles, chat_messages, chat_participants |  |
| /api/chat/polls/[pollId]/vote | POST, DELETE | chat_polls, chat_participants, chat_poll_votes |  |
| /api/chat/polls/[pollId]/votes | GET | chat_polls, chat_participants, chat_poll_options, chat_poll_votes |  |
| /api/chat/polls | POST | user_profiles, chat_participants, chat_polls, chat_poll_options, chat_messages, chat_conversations |  |
| /api/chat/promotors | GET | user_profiles, promotor_profiles |  |
| /api/chat/reactions/[messageId] | POST, DELETE | chat_messages, chat_participants, chat_message_reactions |  |
| /api/chat/reactions/[messageId]/users | GET | chat_messages, chat_participants, chat_message_reactions, user_profiles |  |
| /api/debug-auth | GET |  |  |
| /api/diagnostics/auth | GET |  |  |
| /api/me/assignment-tracking | GET | todays_assignments |  |
| /api/me/calendar-assignments | GET | assignment_participants, assignments_with_buddy_info, assignment_tracking |  |
| /api/me/documents | GET | promotor_profiles, applications, documents |  |
| /api/me/einsatz-photos/upload | POST, PATCH | assignment_participants, assignment_tracking |  |
| /api/me/kpi-feedback-history | GET | kpi_feedback |  |
| /api/me/kpi-feedback | GET, PATCH | kpi_feedback |  |
| /api/me/kpi-praemien/average | GET | kpi_praemien |  |
| /api/me/kpi-praemien/best | GET | kpi_praemien |  |
| /api/me/kpi-praemien | GET | kpi_praemien |  |
| /api/me/kpi-praemien/total | GET | kpi_praemien |  |
| /api/me/leaderboard | GET | kpi_feedback |  |
| /api/me/markets/resolve | POST | markets |  |
| /api/me/messages/[id] | PATCH | message_recipients |  |
| /api/me/messages/[id]/upload | POST, PATCH | message_recipients, message-responses, message_responses |  |
| /api/me/messages | GET | message_recipients, messages |  |
| /api/me/monthly-kpis | GET | kpi_monthly_sales |  |
| /api/me/next-assignment | GET | assignment_participants, assignments |  |
| /api/me/privacy-requests | GET, POST | privacy_requests, privacy_request_events |  |
| /api/me/profile-stats | GET | assignment_tracking, freed_assignments_log, assignments_with_buddy_info |  |
| /api/me | GET | user_profiles |  |
| /api/me/todos/complete | POST | todo_history |  |
| /api/me/todos/history | GET | todo_history |  |
| /api/me/work-status | GET | promotor_profiles, assignment_participants |  |
| /api/messages/[id] | DELETE | messages |  |
| /api/messages | POST, GET | messages, message_recipients, messages_with_recipients |  |
| /api/promotors/[id]/access-credentials | GET, PATCH | access_credentials |  |
| /api/promotors/[id]/contracts/confirm | POST | contracts |  |
| /api/promotors/[id]/contracts | GET | dienstvertrag_files, promotor_profiles |  |
| /api/promotors/[id]/contracts/signed-url | GET | dienstvertrag_files, dienstvertraege |  |
| /api/promotors/[id]/contracts/upload-url | POST | contracts |  |
| /api/promotors/[id]/documents/confirm | POST | documents |  |
| /api/promotors/[id]/documents | GET | documents |  |
| /api/promotors/[id]/documents/signed-url | GET | documents |  |
| /api/promotors/[id]/documents/upload-url | POST | documents |  |
| /api/promotors/[id]/notes | GET, POST | promotor_notes |  |
| /api/promotors/[id]/onboarding | GET, PATCH | onboarding_steps |  |
| /api/promotors/[id] | GET, PATCH, DELETE | promotor_profiles, applications, user_profiles |  |
| /api/promotors/[id]/upcoming-assignments | GET | user_profiles, assignment_participants, assignments_with_buddy_info |  |
| /api/promotors/assignment-history | POST | assignment_participants |  |
| /api/promotors/assignments/daily-checkin/pending | GET | assignment_participants, assignment_daily_checkin |  |
| /api/promotors/assignments/daily-checkin | POST | assignment_participants, assignment_daily_checkin |  |
| /api/promotors/assignments/notes/unread | GET | einsatznotiz_promotor, assignments_with_buddy_info |  |
| /api/promotors/assignments/outside-break | POST, GET | assignment_outside_breaks |  |
| /api/promotors/list | GET | user_profiles |  |
| /api/promotors | GET | user_profiles, promotor_profiles, applications |  |
| /api/special-status/active | GET, DELETE | active_special_status, assignment_participants, assignments |  |
| /api/special-status/apply-daily | GET | active_special_status, assignment_participants, assignments |  |
| /api/special-status/requests/[id] | PATCH | user_profiles, special_status_requests, active_special_status, assignment_participants, assignments |  |
| /api/special-status/requests | POST, GET | special_status_requests, user_profiles |  |

## Complete release file catalog

Generated dependencies, build artifacts and credential files are excluded. Entries were byte-read and fingerprinted in the final feature index. This living file is updated after each index checkpoint.

- `.cursor/rules/backendrules.mdc` — text, 7 lines, 168 bytes.
- `.gitignore` — text, 30 lines, 373 bytes.
- `.npmrc` — text, 3 lines, 23 bytes.
- `BuildLogs.md` — text, 14 lines, 577 bytes.
- `PERFECT_MATCH_IMPROVEMENTS.md` — text, 111 lines, 4566 bytes.
- `RAILWAY_UPDATE_INSTRUCTIONS.md` — text, 112 lines, 3727 bytes.
- `To Dos Nespresso App.txt` — text, 28 lines, 507 bytes.
- `app/ConditionalLayout.tsx` — text, 31 lines, 950 bytes.
- `app/SiteLayout.tsx` — text, 605 lines, 28014 bytes.
- `app/admin/chat/page.tsx` — text, 5138 lines, 254776 bytes.
- `app/admin/dashboard/page.tsx` — text, 4682 lines, 235922 bytes.
- `app/admin/datenschutz/page.tsx` — text, 205 lines, 9618 bytes.
- `app/admin/demotool-agent/page.tsx` — text, 3144 lines, 152121 bytes.
- `app/admin/einsatzplan/page.tsx` — text, 8274 lines, 433851 bytes.
- `app/admin/layout.tsx` — text, 51 lines, 1610 bytes.
- `app/admin/sales-challenge/page.tsx` — text, 1263 lines, 60255 bytes.
- `app/admin/schulungen/page.tsx` — text, 3079 lines, 169077 bytes.
- `app/admin/statistiken/page.tsx` — text, 3541 lines, 168043 bytes.
- `app/admin/team/page.tsx` — text, 6022 lines, 300519 bytes.
- `app/api/admin/assignments/[id]/outside-breaks/route.ts` — text, 38 lines, 1193 bytes.
- `app/api/admin/auslastung/route.ts` — text, 163 lines, 6096 bytes.
- `app/api/admin/contracts/confirm/route.ts` — text, 29 lines, 1292 bytes.
- `app/api/admin/contracts/route.ts` — text, 163 lines, 6416 bytes.
- `app/api/admin/contracts/send-dienstvertrag/route.ts` — text, 88 lines, 2849 bytes.
- `app/api/admin/contracts/upload-url/route.ts` — text, 29 lines, 1468 bytes.
- `app/api/admin/daily-checkin-status/route.ts` — text, 53 lines, 1682 bytes.
- `app/api/admin/documents/route.ts` — text, 96 lines, 3581 bytes.
- `app/api/admin/kpi-feedback/route.ts` — text, 115 lines, 4241 bytes.
- `app/api/admin/kpi-praemien/from-kpis/route.ts` — text, 57 lines, 3456 bytes.
- `app/api/admin/kpi-praemien/import/route.ts` — text, 121 lines, 6047 bytes.
- `app/api/admin/kpi-praemien/latest-summary/route.ts` — text, 44 lines, 2293 bytes.
- `app/api/admin/kpi-praemien/route.ts` — text, 45 lines, 2386 bytes.
- `app/api/admin/maps/config/route.ts` — text, 29 lines, 1112 bytes.
- `app/api/admin/markets/[id]/acceptance-addresses/route.ts` — text, 144 lines, 6025 bytes.
- `app/api/admin/markets/[id]/photos/route.ts` — text, 101 lines, 3359 bytes.
- `app/api/admin/markets/[id]/photos/upload/route.ts` — text, 115 lines, 3688 bytes.
- `app/api/admin/markets/[id]/route.ts` — text, 121 lines, 4506 bytes.
- `app/api/admin/markets/import/route.ts` — text, 54 lines, 1931 bytes.
- `app/api/admin/markets/route.ts` — text, 185 lines, 6642 bytes.
- `app/api/admin/monthly-kpis/route.ts` — text, 118 lines, 5892 bytes.
- `app/api/admin/premium-rates/route.ts` — text, 74 lines, 3927 bytes.
- `app/api/admin/privacy-requests/[id]/export/route.ts` — text, 143 lines, 7412 bytes.
- `app/api/admin/privacy-requests/route.ts` — text, 96 lines, 3822 bytes.
- `app/api/admin/privacy/legal-holds/route.ts` — text, 81 lines, 3047 bytes.
- `app/api/admin/privacy/retention-preview/route.ts` — text, 20 lines, 799 bytes.
- `app/api/admin/promotor-kpi-history/[userId]/route.ts` — text, 50 lines, 1568 bytes.
- `app/api/admin/promotors-list/route.ts` — text, 45 lines, 1362 bytes.
- `app/api/admin/promotors/[id]/contracts/signed-url/route.ts` — text, 43 lines, 1617 bytes.
- `app/api/admin/promotors/[id]/freed-assignments/route.ts` — text, 84 lines, 2768 bytes.
- `app/api/admin/promotors/[id]/kpi/route.ts` — text, 56 lines, 1998 bytes.
- `app/api/admin/promotors/[id]/profile-stats/route.ts` — text, 83 lines, 2833 bytes.
- `app/api/admin/statistiken/generate-email/route.ts` — text, 286 lines, 18601 bytes.
- `app/api/admin/team/access-credentials-import/route.ts` — text, 398 lines, 15175 bytes.
- `app/api/admin/team/anmeldestatus/route.ts` — text, 337 lines, 12864 bytes.
- `app/api/admin/whats-todo/route.ts` — text, 69 lines, 4125 bytes.
- `app/api/ai/eddie-chat/route.ts` — text, 168 lines, 6606 bytes.
- `app/api/ai/enhance-message/route.ts` — text, 75 lines, 2680 bytes.
- `app/api/ai/recommend-promotors/route.ts` — text, 261 lines, 10242 bytes.
- `app/api/applications/route.ts` — text, 140 lines, 6076 bytes.
- `app/api/assignments/[id]/applications/decline/route.ts` — text, 27 lines, 983 bytes.
- `app/api/assignments/[id]/applications/route.ts` — text, 49 lines, 1752 bytes.
- `app/api/assignments/[id]/invites/accept/route.ts` — text, 49 lines, 1531 bytes.
- `app/api/assignments/[id]/invites/acknowledge/route.ts` — text, 35 lines, 1235 bytes.
- `app/api/assignments/[id]/invites/respond/route.ts` — text, 44 lines, 1732 bytes.
- `app/api/assignments/[id]/invites/status/route.ts` — text, 30 lines, 1060 bytes.
- `app/api/assignments/[id]/match-market/route.ts` — text, 105 lines, 4107 bytes.
- `app/api/assignments/[id]/participants/choose/route.ts` — text, 84 lines, 3140 bytes.
- `app/api/assignments/[id]/route.ts` — text, 205 lines, 8159 bytes.
- `app/api/assignments/[id]/tracking/route.ts` — text, 74 lines, 2750 bytes.
- `app/api/assignments/auto-match/route.ts` — text, 136 lines, 4855 bytes.
- `app/api/assignments/buddy-tags/route.ts` — text, 109 lines, 4101 bytes.
- `app/api/assignments/bulk-invite/route.ts` — text, 84 lines, 3122 bytes.
- `app/api/assignments/import/route.ts` — text, 992 lines, 34927 bytes.
- `app/api/assignments/invitation-history/route.ts` — text, 88 lines, 3156 bytes.
- `app/api/assignments/invites/acknowledge-all/route.ts` — text, 41 lines, 1475 bytes.
- `app/api/assignments/invites/counts/route.ts` — text, 67 lines, 2159 bytes.
- `app/api/assignments/invites/details/route.ts` — text, 86 lines, 2860 bytes.
- `app/api/assignments/invites/process-state/route.ts` — text, 132 lines, 4674 bytes.
- `app/api/assignments/invites/route.ts` — text, 134 lines, 5035 bytes.
- `app/api/assignments/invites/unacknowledged-accepted/route.ts` — text, 97 lines, 3190 bytes.
- `app/api/assignments/invites/unacknowledged-rejected/route.ts` — text, 83 lines, 3149 bytes.
- `app/api/assignments/process/route.ts` — text, 124 lines, 3921 bytes.
- `app/api/assignments/promotor-notes/mark-read/route.ts` — text, 43 lines, 1360 bytes.
- `app/api/assignments/promotor-notes/route.ts` — text, 89 lines, 2669 bytes.
- `app/api/assignments/release-multiple/route.ts` — text, 172 lines, 5519 bytes.
- `app/api/assignments/route.ts` — text, 209 lines, 8599 bytes.
- `app/api/assignments/sync-import-promotors/route.ts` — text, 198 lines, 7522 bytes.
- `app/api/assignments/today/route.ts` — text, 560 lines, 21617 bytes.
- `app/api/auth/create-promotor/route.ts` — text, 101 lines, 3884 bytes.
- `app/api/chat/admins/route.ts` — text, 43 lines, 1583 bytes.
- `app/api/chat/attachments/route.ts` — text, 50 lines, 1834 bytes.
- `app/api/chat/conversations/[conversationId]/clear-for-me/route.ts` — text, 55 lines, 1888 bytes.
- `app/api/chat/conversations/[conversationId]/mark-read/route.ts` — text, 42 lines, 1446 bytes.
- `app/api/chat/conversations/[conversationId]/mark-unread/route.ts` — text, 41 lines, 1356 bytes.
- `app/api/chat/conversations/[conversationId]/picture/route.ts` — text, 75 lines, 2539 bytes.
- `app/api/chat/conversations/[conversationId]/pin/route.ts` — text, 54 lines, 1786 bytes.
- `app/api/chat/conversations/[conversationId]/route.ts` — text, 108 lines, 3706 bytes.
- `app/api/chat/conversations/[conversationId]/unpin/route.ts` — text, 54 lines, 1778 bytes.
- `app/api/chat/conversations/route.ts` — text, 342 lines, 14140 bytes.
- `app/api/chat/messages/[conversationId]/route.ts` — text, 258 lines, 9738 bytes.
- `app/api/chat/messages/delete/route.ts` — text, 132 lines, 4325 bytes.
- `app/api/chat/messages/edit/[messageId]/route.ts` — text, 183 lines, 5568 bytes.
- `app/api/chat/messages/send/route.ts` — text, 75 lines, 2510 bytes.
- `app/api/chat/participants/add/route.ts` — text, 102 lines, 3312 bytes.
- `app/api/chat/participants/remove/route.ts` — text, 97 lines, 3167 bytes.
- `app/api/chat/polls/[pollId]/vote/route.ts` — text, 106 lines, 3884 bytes.
- `app/api/chat/polls/[pollId]/votes/route.ts` — text, 62 lines, 2292 bytes.
- `app/api/chat/polls/route.ts` — text, 107 lines, 3485 bytes.
- `app/api/chat/promotors/route.ts` — text, 58 lines, 2203 bytes.
- `app/api/chat/reactions/[messageId]/route.ts` — text, 191 lines, 6141 bytes.
- `app/api/chat/reactions/[messageId]/users/route.ts` — text, 118 lines, 3765 bytes.
- `app/api/debug-auth/route.ts` — text, 23 lines, 559 bytes.
- `app/api/diagnostics/auth/route.ts` — text, 53 lines, 1323 bytes.
- `app/api/me/assignment-tracking/route.ts` — text, 65 lines, 2069 bytes.
- `app/api/me/calendar-assignments/route.ts` — text, 101 lines, 4279 bytes.
- `app/api/me/documents/route.ts` — text, 87 lines, 3226 bytes.
- `app/api/me/einsatz-photos/upload/route.ts` — text, 240 lines, 7712 bytes.
- `app/api/me/kpi-feedback-history/route.ts` — text, 32 lines, 999 bytes.
- `app/api/me/kpi-feedback/route.ts` — text, 50 lines, 2744 bytes.
- `app/api/me/kpi-praemien/average/route.ts` — text, 36 lines, 1794 bytes.
- `app/api/me/kpi-praemien/best/route.ts` — text, 17 lines, 835 bytes.
- `app/api/me/kpi-praemien/route.ts` — text, 31 lines, 1227 bytes.
- `app/api/me/kpi-praemien/total/route.ts` — text, 20 lines, 920 bytes.
- `app/api/me/leaderboard/route.ts` — text, 95 lines, 3348 bytes.
- `app/api/me/markets/resolve/route.ts` — text, 81 lines, 3553 bytes.
- `app/api/me/messages/[id]/route.ts` — text, 54 lines, 1812 bytes.
- `app/api/me/messages/[id]/upload/route.ts` — text, 198 lines, 6925 bytes.
- `app/api/me/messages/route.ts` — text, 84 lines, 2900 bytes.
- `app/api/me/monthly-kpis/route.ts` — text, 14 lines, 755 bytes.
- `app/api/me/next-assignment/route.ts` — text, 118 lines, 4219 bytes.
- `app/api/me/privacy-requests/route.ts` — text, 79 lines, 2683 bytes.
- `app/api/me/profile-stats/route.ts` — text, 64 lines, 2200 bytes.
- `app/api/me/route.ts` — text, 23 lines, 665 bytes.
- `app/api/me/todos/complete/route.ts` — text, 51 lines, 1657 bytes.
- `app/api/me/todos/history/route.ts` — text, 36 lines, 1245 bytes.
- `app/api/me/work-status/route.ts` — text, 85 lines, 2918 bytes.
- `app/api/messages/[id]/route.ts` — text, 36 lines, 1210 bytes.
- `app/api/messages/route.ts` — text, 106 lines, 3082 bytes.
- `app/api/promotors/[id]/access-credentials/route.ts` — text, 124 lines, 3956 bytes.
- `app/api/promotors/[id]/contracts/confirm/route.ts` — text, 57 lines, 2240 bytes.
- `app/api/promotors/[id]/contracts/route.ts` — text, 42 lines, 1467 bytes.
- `app/api/promotors/[id]/contracts/signed-url/route.ts` — text, 47 lines, 1737 bytes.
- `app/api/promotors/[id]/contracts/upload-url/route.ts` — text, 23 lines, 1088 bytes.
- `app/api/promotors/[id]/documents/confirm/route.ts` — text, 33 lines, 1551 bytes.
- `app/api/promotors/[id]/documents/route.ts` — text, 20 lines, 781 bytes.
- `app/api/promotors/[id]/documents/signed-url/route.ts` — text, 39 lines, 1480 bytes.
- `app/api/promotors/[id]/documents/upload-url/route.ts` — text, 26 lines, 1372 bytes.
- `app/api/promotors/[id]/notes/route.ts` — text, 80 lines, 2290 bytes.
- `app/api/promotors/[id]/onboarding/route.ts` — text, 39 lines, 1834 bytes.
- `app/api/promotors/[id]/route.ts` — text, 303 lines, 11552 bytes.
- `app/api/promotors/[id]/upcoming-assignments/route.ts` — text, 96 lines, 3321 bytes.
- `app/api/promotors/assignment-history/route.ts` — text, 40 lines, 1632 bytes.
- `app/api/promotors/assignments/daily-checkin/pending/route.ts` — text, 98 lines, 3185 bytes.
- `app/api/promotors/assignments/daily-checkin/route.ts` — text, 73 lines, 2422 bytes.
- `app/api/promotors/assignments/notes/unread/route.ts` — text, 79 lines, 2918 bytes.
- `app/api/promotors/assignments/outside-break/route.ts` — text, 61 lines, 2216 bytes.
- `app/api/promotors/list/route.ts` — text, 32 lines, 1015 bytes.
- `app/api/promotors/route.ts` — text, 97 lines, 4402 bytes.
- `app/api/special-status/active/route.ts` — text, 128 lines, 4455 bytes.
- `app/api/special-status/apply-daily/route.ts` — text, 94 lines, 3498 bytes.
- `app/api/special-status/requests/[id]/route.ts` — text, 145 lines, 4796 bytes.
- `app/api/special-status/requests/route.ts` — text, 143 lines, 4795 bytes.
- `app/auth/clear-session/page.tsx` — text, 59 lines, 1769 bytes.
- `app/auth/force-reset/page.tsx` — text, 56 lines, 2039 bytes.
- `app/auth/forgot-password/page.tsx` — text, 27 lines, 693 bytes.
- `app/auth/passwort-vergessen/page.tsx` — text, 135 lines, 5288 bytes.
- `app/auth/promotors/login/page.tsx` — text, 196 lines, 7641 bytes.
- `app/auth/reset-password/page.tsx` — text, 254 lines, 9916 bytes.
- `app/auth/salescrew/login/page.tsx` — text, 179 lines, 7168 bytes.
- `app/dashboard_backup.tsx` — text, 1479 lines, 83027 bytes.
- `app/datenschutz/page.tsx` — text, 111 lines, 7517 bytes.
- `app/globals.css` — text, 332 lines, 6951 bytes.
- `app/landing.tsx` — text, 227 lines, 11501 bytes.
- `app/layout.tsx` — text, 28 lines, 708 bytes.
- `app/page.tsx` — text, 418 lines, 20910 bytes.
- `app/promotors/chat/page.tsx` — text, 4344 lines, 205823 bytes.
- `app/promotors/dashboard/page.tsx` — text, 2552 lines, 129944 bytes.
- `app/promotors/datenschutz/page.tsx` — text, 169 lines, 7519 bytes.
- `app/promotors/einsatz/page.tsx` — text, 4132 lines, 194800 bytes.
- `app/promotors/layout.tsx` — text, 53 lines, 1645 bytes.
- `app/promotors/onboarding-demo/page.tsx` — text, 54 lines, 1840 bytes.
- `app/promotors/page.tsx` — text, 14 lines, 267 bytes.
- `app/promotors/profil/page.tsx` — text, 2337 lines, 106952 bytes.
- `app/promotors/schulungen-videos/page.tsx` — text, 886 lines, 32967 bytes.
- `app/promotors/statistiken/page.tsx` — text, 2324 lines, 122056 bytes.
- `components.json` — text, 21 lines, 443 bytes.
- `components/AIPromotorRecommendations.tsx` — text, 169 lines, 5687 bytes.
- `components/AdminEddieAssistant.tsx` — text, 203 lines, 7465 bytes.
- `components/AdminNavigation.tsx` — text, 253 lines, 10336 bytes.
- `components/DienstvertragTemplate.tsx` — text, 258 lines, 24275 bytes.
- `components/OnboardingModal.tsx` — text, 1649 lines, 74417 bytes.
- `components/PDFReader.tsx` — text, 300 lines, 12531 bytes.
- `components/Quiz.tsx` — text, 851 lines, 36458 bytes.
- `components/TagesCheckModal.tsx` — text, 306 lines, 10287 bytes.
- `components/TagesCheckProvider.tsx` — text, 53 lines, 1359 bytes.
- `components/VideoPlayer.tsx` — text, 471 lines, 17879 bytes.
- `components/admin/promotors/KrankenstandHistoryPopover.tsx` — text, 366 lines, 15112 bytes.
- `components/assignment/AssignmentLocationMap.tsx` — text, 211 lines, 8081 bytes.
- `components/chat/PollCreateModal.tsx` — text, 285 lines, 12491 bytes.
- `components/chat/PollMessage.tsx` — text, 157 lines, 6949 bytes.
- `components/chat/PollVotesDrawer.tsx` — text, 161 lines, 6276 bytes.
- `components/notifications/AdminMessageToast.tsx` — text, 237 lines, 7537 bytes.
- `components/notifications/AdminNotificationStack.tsx` — text, 29 lines, 671 bytes.
- `components/notifications/AdminToastListener.tsx` — text, 14 lines, 310 bytes.
- `components/notifications/PromotorMessageToast.tsx` — text, 257 lines, 8571 bytes.
- `components/notifications/PromotorNotificationStack.tsx` — text, 31 lines, 780 bytes.
- `components/notifications/PromotorToastListener.tsx` — text, 15 lines, 329 bytes.
- `components/promotors/PromotorUnreadBridge.tsx` — text, 30 lines, 909 bytes.
- `components/statistiken/KpiDeliveryNotifications.tsx` — text, 118 lines, 6113 bytes.
- `components/statistiken/MonthlyMetricsAdmin.tsx` — text, 373 lines, 21248 bytes.
- `components/statistiken/MonthlyMetricsPromotor.tsx` — text, 111 lines, 6186 bytes.
- `components/theme-provider.tsx` — text, 12 lines, 292 bytes.
- `components/ui/accordion.tsx` — text, 59 lines, 1991 bytes.
- `components/ui/alert-dialog.tsx` — text, 142 lines, 4434 bytes.
- `components/ui/alert.tsx` — text, 60 lines, 1584 bytes.
- `components/ui/aspect-ratio.tsx` — text, 8 lines, 154 bytes.
- `components/ui/avatar.tsx` — text, 51 lines, 1419 bytes.
- `components/ui/badge.tsx` — text, 30 lines, 1088 bytes.
- `components/ui/breadcrumb.tsx` — text, 116 lines, 2712 bytes.
- `components/ui/button.tsx` — text, 57 lines, 1901 bytes.
- `components/ui/calendar.tsx` — text, 67 lines, 2587 bytes.
- `components/ui/card.tsx` — text, 80 lines, 1858 bytes.
- `components/ui/carousel.tsx` — text, 263 lines, 6224 bytes.
- `components/ui/chart.tsx` — text, 366 lines, 10480 bytes.
- `components/ui/checkbox.tsx` — text, 31 lines, 1070 bytes.
- `components/ui/collapsible.tsx` — text, 12 lines, 329 bytes.
- `components/ui/command.tsx` — text, 154 lines, 4899 bytes.
- `components/ui/context-menu.tsx` — text, 201 lines, 7260 bytes.
- `components/ui/date-picker.tsx` — text, 191 lines, 6826 bytes.
- `components/ui/dialog.tsx` — text, 123 lines, 3374 bytes.
- `components/ui/drawer.tsx` — text, 119 lines, 3021 bytes.
- `components/ui/dropdown-menu.tsx` — text, 201 lines, 7433 bytes.
- `components/ui/form.tsx` — text, 179 lines, 4099 bytes.
- `components/ui/hover-card.tsx` — text, 30 lines, 1198 bytes.
- `components/ui/input-otp.tsx` — text, 72 lines, 2168 bytes.
- `components/ui/input.tsx` — text, 23 lines, 791 bytes.
- `components/ui/label.tsx` — text, 27 lines, 724 bytes.
- `components/ui/menubar.tsx` — text, 237 lines, 7988 bytes.
- `components/ui/navigation-menu.tsx` — text, 129 lines, 5046 bytes.
- `components/ui/pagination.tsx` — text, 118 lines, 2751 bytes.
- `components/ui/popover.tsx` — text, 32 lines, 1244 bytes.
- `components/ui/progress.tsx` — text, 26 lines, 773 bytes.
- `components/ui/radio-group.tsx` — text, 45 lines, 1481 bytes.
- `components/ui/resizable.tsx` — text, 46 lines, 1723 bytes.
- `components/ui/scroll-area.tsx` — text, 41 lines, 1605 bytes.
- `components/ui/select.tsx` — text, 161 lines, 5629 bytes.
- `components/ui/separator.tsx` — text, 23 lines, 706 bytes.
- `components/ui/sheet.tsx` — text, 141 lines, 4281 bytes.
- `components/ui/sidebar.tsx` — text, 764 lines, 23381 bytes.
- `components/ui/skeleton.tsx` — text, 16 lines, 261 bytes.
- `components/ui/slider.tsx` — text, 29 lines, 1091 bytes.
- `components/ui/sonner.tsx` — text, 32 lines, 894 bytes.
- `components/ui/switch.tsx` — text, 30 lines, 1153 bytes.
- `components/ui/table.tsx` — text, 118 lines, 2765 bytes.
- `components/ui/tabs.tsx` — text, 56 lines, 1897 bytes.
- `components/ui/textarea.tsx` — text, 23 lines, 689 bytes.
- `components/ui/time-picker.tsx` — text, 172 lines, 6187 bytes.
- `components/ui/toast.tsx` — text, 130 lines, 4859 bytes.
- `components/ui/toaster.tsx` — text, 36 lines, 786 bytes.
- `components/ui/toggle-group.tsx` — text, 62 lines, 1753 bytes.
- `components/ui/toggle.tsx` — text, 46 lines, 1541 bytes.
- `components/ui/tooltip.tsx` — text, 31 lines, 1159 bytes.
- `components/ui/use-mobile.tsx` — text, 20 lines, 565 bytes.
- `components/ui/use-toast.ts` — text, 195 lines, 3948 bytes.
- `components/ux/AdminTooltipAuto.tsx` — text, 115 lines, 3699 bytes.
- `docs/APP_LIVING.md` — text, 679 lines, 61326 bytes.
- `docs/CHAT_FINAL_STATUS.md` — text, 272 lines, 9692 bytes.
- `docs/CHAT_IMPLEMENTATION_STATUS.md` — text, 274 lines, 11840 bytes.
- `docs/CHAT_INTEGRATION_GUIDE.md` — text, 419 lines, 13491 bytes.
- `docs/CHAT_QUICK_START.md` — text, 139 lines, 4167 bytes.
- `docs/DELETION_IMPLEMENTATION_SUMMARY.md` — text, 84 lines, 3680 bytes.
- `docs/DEPLOYMENT_SETUP.md` — text, 292 lines, 7651 bytes.
- `docs/DSGVO_AUSTRIA_LIVING.md` — text, 310 lines, 17442 bytes.
- `docs/DSGVO_OPERATIONS.md` — text, 166 lines, 8564 bytes.
- `docs/GROUP_PICTURES_STORAGE_SETUP.md` — text, 101 lines, 2769 bytes.
- `docs/MESSAGE_EDIT_IMPLEMENTATION_SUMMARY.md` — text, 267 lines, 7331 bytes.
- `docs/POLLS-DEPLOY-CONFIG.md` — text, 25 lines, 948 bytes.
- `docs/PROMOTER_ONBOARDING.md` — text, 2039 lines, 66901 bytes.
- `docs/QA-POLLS.md` — text, 32 lines, 1283 bytes.
- `docs/SOCKET_FIX_SUMMARY.md` — text, 137 lines, 3698 bytes.
- `docs/SOCKET_IO_EDIT_MESSAGE_PROMPT.md` — text, 132 lines, 3837 bytes.
- `docs/SOCKET_IO_REACTIONS_PROMPT.md` — text, 139 lines, 4083 bytes.
- `docs/STORAGE_SETUP_INSTRUCTIONS.md` — text, 87 lines, 1997 bytes.
- `docs/access-credentials-schema.sql` — text, 56 lines, 1790 bytes.
- `docs/add-all-status-values.sql` — text, 2 lines, 1 bytes.
- `docs/add-buddy-tag-field.sql` — text, 11 lines, 425 bytes.
- `docs/add-early-start-end-fields.sql` — text, 80 lines, 2772 bytes.
- `docs/add-foto-extra-to-view.sql` — text, 67 lines, 2444 bytes.
- `docs/add-markets-opening-hours.sql` — text, 21 lines, 757 bytes.
- `docs/add-notes-field.sql` — text, 24 lines, 937 bytes.
- `docs/add-notfall-status.sql` — text, 5 lines, 146 bytes.
- `docs/add-personal-fields-to-promotor-profiles.sql` — text, 33 lines, 1317 bytes.
- `docs/add-rejected-handled-status.sql` — text, 33 lines, 1960 bytes.
- `docs/add-special-status-column.sql` — text, 36 lines, 1539 bytes.
- `docs/add-verstanden-status.sql` — text, 28 lines, 1606 bytes.
- `docs/add-working-days-to-promotor-profiles.sql` — text, 40 lines, 1613 bytes.
- `docs/admin-edit-permissions.sql` — text, 58 lines, 1881 bytes.
- `docs/assignment-acknowledgments-schema.sql` — text, 35 lines, 1548 bytes.
- `docs/assignment-invitations-v2-schema.sql` — text, 67 lines, 2767 bytes.
- `docs/assignment-process-schema.sql` — text, 64 lines, 2673 bytes.
- `docs/assignment-tracking-schema.sql` — text, 181 lines, 6502 bytes.
- `docs/buddy-tag-system-schema-step2.sql` — text, 145 lines, 5667 bytes.
- `docs/buddy-tag-system-schema.sql` — text, 10 lines, 457 bytes.
- `docs/chat-deletion-schema.sql` — text, 132 lines, 4476 bytes.
- `docs/chat-group-pictures-schema.sql` — text, 30 lines, 1038 bytes.
- `docs/chat-polls-schema.sql` — text, 215 lines, 6995 bytes.
- `docs/chat-reactions-schema.sql` — text, 83 lines, 2860 bytes.
- `docs/chat-storage-setup.sql` — text, 67 lines, 2066 bytes.
- `docs/chat-system-schema.sql` — text, 297 lines, 10364 bytes.
- `docs/check-todays-assignments.sql` — text, 51 lines, 1496 bytes.
- `docs/complete-debug.sql` — text, 32 lines, 966 bytes.
- `docs/complete-special-status-implementation.sql` — text, 91 lines, 3727 bytes.
- `docs/create-einsatz-photos-bucket.sql` — text, 50 lines, 1481 bytes.
- `docs/create-krankenstand-system-complete.sql` — text, 157 lines, 5493 bytes.
- `docs/create-market-photos-bucket-instructions.md` — text, 90 lines, 2126 bytes.
- `docs/debug-todays-assignments.sql` — text, 49 lines, 1491 bytes.
- `docs/debug-user-profile.sql` — text, 18 lines, 528 bytes.
- `docs/debug-view-problem.sql` — text, 47 lines, 1611 bytes.
- `docs/eddie-chat-messages-schema.sql` — text, 53 lines, 1811 bytes.
- `docs/einsatznotiz-promotor-schema.sql` — text, 55 lines, 2297 bytes.
- `docs/einsatzplan-schema.sql` — text, 216 lines, 8784 bytes.
- `docs/final-fix-todays-assignments.sql` — text, 101 lines, 3689 bytes.
- `docs/fix-assignment-tracking-view.sql` — text, 49 lines, 1695 bytes.
- `docs/fix-buddy-tag-display-name.sql` — text, 50 lines, 2126 bytes.
- `docs/fix-buddy-tag-lead-preservation-v2.sql` — text, 79 lines, 2632 bytes.
- `docs/fix-buddy-tag-lead-preservation.sql` — text, 75 lines, 2659 bytes.
- `docs/fix-chat-rls-policies.sql` — text, 172 lines, 5281 bytes.
- `docs/fix-replacement-invitations.sql` — text, 36 lines, 2074 bytes.
- `docs/fix-special-status-final.sql` — text, 57 lines, 1741 bytes.
- `docs/fix-user-profiles-rls-recursion.sql` — text, 70 lines, 2189 bytes.
- `docs/fix-user-profiles-rls.sql` — text, 64 lines, 1860 bytes.
- `docs/fixed-special-status-implementation.sql` — text, 83 lines, 3299 bytes.
- `docs/invitation-history-schema.sql` — text, 34 lines, 1280 bytes.
- `docs/kpi_feedback_schema.sql` — text, 91 lines, 2964 bytes.
- `docs/krankenstand-notfall-cron-setup.md` — text, 70 lines, 2004 bytes.
- `docs/markets-schema.sql` — text, 131 lines, 5752 bytes.
- `docs/message-responses-storage-remove-all-policies.sql` — text, 24 lines, 682 bytes.
- `docs/message-responses-storage-setup-fixed.sql` — text, 30 lines, 1248 bytes.
- `docs/message-responses-storage-setup.sql` — text, 49 lines, 1848 bytes.
- `docs/message-responses-storage-simple-fix.sql` — text, 8 lines, 427 bytes.
- `docs/messages-system-schema.sql` — text, 142 lines, 6026 bytes.
- `docs/must-run-this-sql.sql` — text, 31 lines, 1315 bytes.
- `docs/openai-setup.md` — text, 57 lines, 1611 bytes.
- `docs/profilbilder-promotoren-schema.sql` — text, 74 lines, 2411 bytes.
- `docs/promotor-notes-schema.sql` — text, 82 lines, 2419 bytes.
- `docs/refresh-buddy-view-with-notes.sql` — text, 24 lines, 1065 bytes.
- `docs/sent-dienstvertrag-schema.sql` — text, 59 lines, 2357 bytes.
- `docs/sql_migrations/add_chat_conversations_pinning.sql` — text, 20 lines, 848 bytes.
- `docs/sql_migrations/add_chat_participants_cleared_at.sql` — text, 15 lines, 565 bytes.
- `docs/sql_migrations/add_chat_participants_marked_unread.sql` — text, 20 lines, 846 bytes.
- `docs/sql_migrations/add_freed_assignments_log.sql` — text, 15 lines, 509 bytes.
- `docs/sql_migrations/add_markets_acceptance_addresses.sql` — text, 6 lines, 177 bytes.
- `docs/sql_migrations/add_read_field_to_einsatznotiz.sql` — text, 16 lines, 610 bytes.
- `docs/sql_migrations/create_assignment_daily_checkin.sql` — text, 66 lines, 2689 bytes.
- `docs/sql_migrations/create_kpi_praemien.sql` — text, 58 lines, 1780 bytes.
- `docs/sql_migrations/replace_dienstvertrag_with_admin_import.sql` — text, 223 lines, 7312 bytes.
- `docs/todo-history-schema.sql` — text, 33 lines, 1477 bytes.
- `docs/update-todays-assignments-view.sql` — text, 48 lines, 1823 bytes.
- `docs/working-todays-assignments-update.sql` — text, 46 lines, 1705 bytes.
- `h origin master` — text, 2 lines, 290 bytes.
- `hooks/use-mobile.tsx` — text, 20 lines, 565 bytes.
- `hooks/use-toast.ts` — text, 195 lines, 3948 bytes.
- `html2pdf.d.ts` — text, 1 lines, 30 bytes.
- `lib/audit/dataAccess.ts` — text, 24 lines, 784 bytes.
- `lib/auth/routeGuards.ts` — text, 67 lines, 1834 bytes.
- `lib/chat/uploadChatFile.ts` — text, 65 lines, 2162 bytes.
- `lib/chat/uploadGroupPicture.ts` — text, 75 lines, 2052 bytes.
- `lib/chat/useChatIntegration.ts` — text, 997 lines, 30022 bytes.
- `lib/einsatz/preparePhoto.ts` — text, 150 lines, 4023 bytes.
- `lib/identity/socialSecurityNumber.ts` — text, 92 lines, 2941 bytes.
- `lib/location/browserGeolocation.ts` — text, 81 lines, 2500 bytes.
- `lib/location/distance.ts` — text, 36 lines, 1217 bytes.
- `lib/location/googleGeocoding.ts` — text, 79 lines, 2656 bytes.
- `lib/matchers/marketMatcher.ts` — text, 136 lines, 5044 bytes.
- `lib/notifications/NotificationCenterContext.tsx` — text, 132 lines, 3873 bytes.
- `lib/notifications/useAdminMessageToasts.ts` — text, 171 lines, 5151 bytes.
- `lib/notifications/usePromotorMessageToasts.ts` — text, 126 lines, 3941 bytes.
- `lib/onboarding/recompute.ts` — text, 128 lines, 5056 bytes.
- `lib/promotors/personalData.ts` — text, 66 lines, 2571 bytes.
- `lib/socket/SocketContext.tsx` — text, 140 lines, 4271 bytes.
- `lib/statistics/kpiFeedback.ts` — text, 54 lines, 1826 bytes.
- `lib/statistics/monthlyKpi.ts` — text, 224 lines, 9445 bytes.
- `lib/statistics/premium.ts` — text, 46 lines, 2327 bytes.
- `lib/statistics/resolvePromotors.ts` — text, 59 lines, 2542 bytes.
- `lib/storage/chatAttachments.ts` — text, 30 lines, 965 bytes.
- `lib/storage/einsatzPhotos.ts` — text, 64 lines, 1945 bytes.
- `lib/supabase/client.ts` — text, 30 lines, 930 bytes.
- `lib/supabase/queries.ts` — text, 30 lines, 999 bytes.
- `lib/supabase/server.ts` — text, 58 lines, 2059 bytes.
- `lib/supabase/service.ts` — text, 18 lines, 484 bytes.
- `lib/templates/dienstvertrag.ts` — text, 250 lines, 23790 bytes.
- `lib/utils.ts` — text, 7 lines, 166 bytes.
- `middleware.ts` — text, 115 lines, 4260 bytes.
- `next.config.mjs` — text, 15 lines, 228 bytes.
- `package-lock.json` — text, 5738 lines, 208567 bytes.
- `package.json` — text, 87 lines, 2788 bytes.
- `pnpm-lock.yaml` — text, 4133 lines, 160601 bytes.
- `postcss.config.mjs` — text, 9 lines, 135 bytes.
- `public/contracts/README.md` — text, 20 lines, 765 bytes.
- `public/contracts/signature-stamp.png` — binary, 0 lines, 1117786 bytes.
- `public/icons/16._Mai_2025__09_20_17-removebg-preview 1.svg` — text, 10 lines, 123198 bytes.
- `public/icons/ChatGPT_Image_16._Mai_2025_10_59_08-removebg-preview_1.svg.svg` — text, 10 lines, 199283 bytes.
- `public/icons/ChatGPT_Image_16._Mai_2025__10_27_42-removebg-preview 1.svg` — text, 10 lines, 108707 bytes.
- `public/icons/ChatGPT_Image_16._Mai_2025__10_31_35-removebg-preview 1.svg` — text, 10 lines, 113823 bytes.
- `public/icons/Sommer Get-Together BSH.pdf` — binary, 0 lines, 43529777 bytes.
- `public/icons/apple-maps-icon.svg` — text, 10 lines, 156233 bytes.
- `public/icons/google-maps-icon.svg` — text, 10 lines, 43201 bytes.
- `public/icons/robot 1.svg` — text, 10 lines, 32943 bytes.
- `public/placeholder-logo.png` — binary, 0 lines, 958 bytes.
- `public/placeholder-logo.svg` — text, 1 lines, 3208 bytes.
- `public/placeholder-user.jpg` — binary, 0 lines, 2615 bytes.
- `public/placeholder.jpg` — binary, 0 lines, 1596 bytes.
- `public/placeholder.svg` — text, 1 lines, 3253 bytes.
- `server.js` — text, 505 lines, 17722 bytes.
- `styles/globals.css` — text, 95 lines, 2428 bytes.
- `supabase/migrations/20260810101807_add_assignment_location_verification.sql` — text, 59 lines, 3266 bytes.
- `supabase/migrations/20260828123318_harden_dsgvo_access_boundaries.sql` — text, 519 lines, 23520 bytes.
- `supabase/migrations/20260828145540_revoke_legacy_is_user_admin_execute.sql` — text, 9 lines, 300 bytes.
- `supabase/migrations/20260914130950_promotor_soft_delete.sql` — text, 14 lines, 447 bytes.
- `supabase/migrations/20260914133752_correct_social_security_number_format.sql` — text, 97 lines, 3899 bytes.
- `supabase/migrations/20260925112649_monthly_kpis_and_premium_rates.sql` — text, 87 lines, 3382 bytes.
- `tailwind.config.ts` — text, 80 lines, 2221 bytes.
- `tests/kpi-feedback.test.cjs` — text, 56 lines, 3530 bytes.
- `tsconfig.json` — text, 28 lines, 595 bytes.
- `vercel.json` — text, 16 lines, 201 bytes.
