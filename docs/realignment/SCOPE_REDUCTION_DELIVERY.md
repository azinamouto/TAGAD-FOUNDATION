# GAD-SDD scope reduction delivery

2026-10-13 (Asia/Shanghai). Branch: `work/gad-sdd-scope-reduction`, based on merged WP01 at `b949c6a589986c6d057dd0067dbedfa49ba873a6`. The [pre-implementation assessment](SCOPE_REDUCTION_ASSESSMENT.md) records routes, dependencies, consumers, preserved relationships and decision gates. This is Phase A/B plus a policy-independent subset of WP02, not completion of the proposal or all WP02 acceptance criteria.

## Navigation before and after

| Before | Revised authenticated workspace |
| --- | --- |
| Dashboard; duplicate TopBar Overview | Dashboard and Barangay Statistics → Dashboard |
| Beneficiaries, Data Entry Grid | Data Encoding and Management → Beneficiary Registry; generic grid removed from normal navigation |
| GAD Programs, GAD Plans Matrix, Accomplishments | GAD Program and Service Monitoring → Programs and Services, GAD Plans and Budgets, Accomplishments |
| Statistical Catalog; duplicate admin catalog | Analytics and Barangay Mapping → existing Barangay and Sex Statistics chart; interactive mapping explicitly unavailable |
| Reports | Reports and Exports → Working Reports |
| Administration: Table Builder, Statistical Catalog, User Management | User and System Administration → User Management, under the existing admin visibility/route rules |

TopBar now contains identity and sign-out; Sidebar is the single workspace navigation on desktop and mobile. PublicLayout no longer promotes the catalog. All routes, aliases and query/deep-link contracts remain; none was removed or redirected. V.1–V.6 module traceability is in the assessment, including cross-cutting Data Security and Privacy. Mapping is not delivered; no WP09/WP10 work began.

## Retained, hidden and deferred

Hidden from normal navigation: catalog, generic statistical entry grid and table builder. Their pages, public metadata definitions, protected data paths, caller links, services, APIs, imports and exports remain. In particular, builder endpoints still support grid operations, TableDetailView still opens the grid, and StatisticalSearch still links to observations. Existing registry CSV ingestion remains accessible.

Comprehensive CBMS completion, household surveys/linkage, generic authoring expansion, new socioeconomic intake, ingestion/reconciliation expansion and public-portal enhancements are deferred. No source records, historical datasets, schema objects, API endpoints or database relationships were removed. External integrations/bookmarks cannot be fully discovered from repository evidence; unknown consumers are the reason compatibility paths remain.

## Separately reviewable security and integrity corrections

Presentation is commit `5ab96df`; security/output corrections are commit `61b1a5d`; browser verification is commit `e0ac087`. Assessment was committed first (`7b9edca`).

- Dashboard aliases pass the authenticated actor. The service rejects missing actors and unassigned encoders, scopes all beneficiary counts/groups/recent entries and program/plan/accomplishment queries to the existing encoder office boundary, and queries global audit summaries only for the existing admin roles. Response shapes remain compatible.
- Legacy/admin beneficiary writes share validation. Explicit zero age remains valid; omitted/blank/null/boolean/fractional/negative age and invalid or omitted sex on create are rejected. Updates preserve omitted values. Name-based barangay/office client fields remain compatible with existing service resolution as well as ID inputs. The form no longer silently converts blank age to zero. Existing binary categories/range are technical contracts, not approved D03 policy.
- GPB/GAR/variance report endpoints forward actors and request strict database reads; no missing encoder assignment or successful sample export during a source outage. Existing non-report service callers retain their compatibility behavior; this is not a repository-wide fallback retirement.
- Empty GPB plans and their page summaries no longer invent issues, outcomes, indicators, target groups or fund sources. Empty items are explicitly marked. GAR does not guess missing office/activity/budget or replace a real zero with another value. Variance output no longer guesses a reason for underspend. Workbook titles and column headers occupy separate rows so merged titles cannot overwrite headings.
- Dashboard source outages return 503 instead of synthetic totals, including the public dashboard service. Barangay reads return 503 on query errors or non-demo disconnection. Explicit nonproduction demo mode retains its unlocated reference roster, with unavailable detail counts represented as null instead of invented values.
- UI labels disclose registry versus population/participation, all-year registry versus fiscal-year budgets, pending official-template acceptance and the existing 100-record/all-year registry PDF limit. No map, source qualification or official report certification is claimed.

These changes do not create permissions. Hiding links is not authorization. Existing broader VIEWER/public access, confidential-service classification, suppression and release rules still need D02/D05 and later packages. No new sensitive records or statistics are exposed. Production privacy/compliance cannot be certified from mocked regression tests. Remaining service fallbacks, source semantics and full export pagination are not qualified by this package and must not be mistaken for complete WP02/WP09/WP11 delivery.

## Verification

| Check | Result |
| --- | --- |
| `npm --prefix frontend test` | 20/20 pass |
| `npm --prefix frontend run typecheck` | Pass |
| `npm --prefix frontend run build` | Pass; Vite warns about a bundle chunk over 500 kB |
| `npm --prefix backend test` (includes backend build) | 256/256 pass, 70 suites; no skipped tests |
| Final focused backend rerun: `node --import tsx --test tests/scopeReduction.test.ts tests/gadDomainCompletionIssue10.test.ts` | 37/37 pass after the additional empty-plan summary correction/test |
| `npm --prefix backend run typecheck` | Pass after final backend changes |
| Playwright with installed Edge (`PLAYWRIGHT_CHANNEL=msedge`, CLI `test --workers=1`) | Existing security/workflow suite 11/11 pass; final scope-reduction suite 6/6 pass |
| `git diff --check` | Pass |

Browser coverage includes 390px and 1280px navigation through all workspace links without horizontal overflow, chart anchor, retained catalog/grid/builder deep links, anonymous denial, viewer administration denial, report limitations and dashboard outage display. Existing browser tests cover plan transitions, session failures/logout, scoped statistical search, MOV upload, dataset summaries and CSV measure mapping.

Backend additions cover every dashboard alias's actor/auth behavior; office-scoped aggregate/detail query predicates and synthetic other-office records; strict report actor/office and outage behavior; legacy/admin demographic parity with valid zero and name-based input; GPB workbook headers/missing narratives; empty plan page summaries; and production barangay/GeoJSON failures. The full existing suite covers statistical authorization, imports, audit rollback and workflows. No deployed data or confidential fixtures were used. Existing migration tests run in disposable PGlite; no production migration, database qualification package or WP03 work was performed.

Initial failures were resolved: Playwright's bundled Chromium was absent (used installed Edge without dependency/config changes); new browser API mocks initially intercepted Vite source modules (restricted to root API URLs); the viewer test initially expected a redirect rather than the existing inline denial; two old backend tests expected successful synthetic dashboard/GAR output during disconnection (updated for intentional 503 behavior). Final results above supersede those attempts.

## Unresolved decisions and stop boundary

All D01–D13 remain OPEN, with only the previously recorded proposal archive subtask done. No institutional approvals were inferred. D02/D05 block new persona/confidential access rules; D03/D04 block new demographic/counting semantics; D06/D09 block certified templates and approval changes; D07 blocks map delivery; D08 blocks a guessed curated source subset; D10–D13 remain operations, targets, pilot/training and funding decisions. WP03–WP14 remain unstarted. No secrets, dependency manifests, deployment environment, schema or migration files changed. No deployment or merge is performed.

## Exact files modified

Frontend:

- `frontend/src/components/layout/AppLayout.tsx`
- `frontend/src/components/layout/PublicLayout.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/TopBar.tsx`
- `frontend/src/modules/statisticalData/components/StatisticalDataCatalog.tsx`
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/DataEncoding.tsx`
- `frontend/src/pages/Reports.tsx`
- `frontend/src/pages/StatisticalCatalog.tsx`
- `frontend/tests/browser/scope-reduction.spec.ts`

Backend:

- `backend/server/controllers/reportController.ts`
- `backend/server/lib/readScope.ts` (new)
- `backend/server/routes/beneficiaries.ts`
- `backend/server/routes/dashboard.ts`
- `backend/server/routes/reports.ts`
- `backend/server/services/AccomplishmentService.ts`
- `backend/server/services/BarangayService.ts`
- `backend/server/services/DashboardService.ts`
- `backend/server/services/GADPlanService.ts`
- `backend/server/services/GarReportService.ts`
- `backend/server/validation/schemas.ts`
- `backend/tests/dashboardAuth.test.ts`
- `backend/tests/gadDomainCompletionIssue10.test.ts`
- `backend/tests/scopeReduction.test.ts` (new)

Documentation:

- `docs/realignment/SCOPE_REDUCTION_ASSESSMENT.md` (new)
- `docs/realignment/SCOPE_REDUCTION_DELIVERY.md` (this new report)
- `docs/realignment/IMPLEMENTATION_WORK_PACKAGES.md` (execution status only)
- `docs/realignment/OPEN_DECISIONS.md` (execution status only; decisions remain open)

The final delivery commit SHA and draft PR URL are supplied in the handoff and PR metadata; a commit cannot embed its own SHA without changing it.
