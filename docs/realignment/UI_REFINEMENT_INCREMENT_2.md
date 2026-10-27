# UI refinement increment 2

Date: 2026-10-27. Branch: `feat/dashboard-barangay-refinement`.

Authority: [proposal](../requirements/TALIBON_GAD_SDD_PROPOSAL.md), [requirements traceability](REQUIREMENTS_TRACEABILITY.md), [open decisions](OPEN_DECISIONS.md). Builds on [increment 1](DASHBOARD_BARANGAY_INCREMENT.md). No institutional decision is resolved by this increment.

## Delivered changes

| Area / proposal reference | Implemented increment | Remaining scope |
| --- | --- | --- |
| Programs and service monitoring, V.3 | Replaced nested cards/progress claims with a wide comparison table. Search title/office/sector and filter recorded fiscal years; show target and actual sex counts separately, missing values explicitly, budget target, office and status. Actions remain visible for authorized roles. | Module remains PARTIAL. Program counts do not prove unique participants, service events or impact. Participation grain/linkage and approved workflows remain BLOCKED on D04/D09; sensitive services depend on D05. |
| Data encoding, V.2; DTA01-10 | Readable registry table, named filters/actions, responsive editors, retryable load errors, and latest-request handling for search/pagination. Missing office is no longer displayed as the viewer's office. Removed the hard-coded roster fallback; API-reference failure is explicit and retryable. Existing CSV entrypoint preserved. | Module remains PARTIAL. Categories and form fields are unchanged. Approved dictionary, roster/aliases, source review and activity linkage remain dependent on D03/D04/D07/D08. API roster availability does not establish geographic approval. |
| Reports, V.5; REP01-07 | Compact export catalog with format, period, source scope, working-export status and registry PDF limit. Accessible year selector, persistent failure/success status, busy controls and object URL cleanup. | Existing GPB/GAR Excel and registry PDF contracts unchanged. Registry PDF still covers up to 100 accessible records across all years. Official templates/signatures and report acceptance remain BLOCKED on D06/D09; full sector/barangay/M&E reports remain incomplete. |
| Administration, V.1; U01-07 | Search by name/email/role/office and filter stored active/inactive status. Accurate account counts, explicit unavailable state, visible named edit buttons, support for existing string/object office representations and fullName/name fields. Blank edit password remains omitted from requests. | Module remains PARTIAL. Existing technical roles are unchanged; six-persona designation and capability decisions remain BLOCKED on D02. Account state does not prove LGU authorization. |
| Cross-cutting usability and privacy, V.6; D11 | Reused emerald/neutral tokens and floating navigation. Targeted pages use readable labels, 44px-high controls and scrollable, viewport-bounded dialogs; portalled selects/editors retain the workspace theme. | Device checks are engineering evidence, not LGU usability acceptance. Confidentiality, operational recovery and pilot acceptance still require D05/D10-D12. |

No new dependencies, routes, endpoints, database fields, migrations or role grants. Existing write payload defaults and backend validation remain in place; this presentation increment does not redefine missing-count encoding rules. Verification/release metadata absent from APIs is explicitly described as unavailable. D01 and D13 scope/funding confirmation remain open alongside the other decisions.

## Files and preservation

- `frontend/src/pages/ProgramMonitoring.tsx`
- `frontend/src/pages/DataEncoding.tsx`
- `frontend/src/pages/Reports.tsx`
- `frontend/src/pages/UserManagement.tsx`
- `frontend/src/index.css` (appended scoped styles; increment 1 retained)
- `frontend/tests/browser/management-refinement.spec.ts`
- This report.

Preserved existing edits in `backend/server.ts`, `frontend/vite.config.ts`, `docs/audits/`, and all increment 1 files. No deployment, production-data modifications or live account changes. Browser tests intercept requests with synthetic fixtures; backend tests use isolated mocks.

## Verification

- Frontend `npm run typecheck`, `npm test` (19/19), and `npm run build`: passed. Final typecheck/build repeated after the filter-label fixes. Vite retains the >500 kB chunk warning.
- Backend `npm run typecheck` and `npm run build`: passed. Targeted `tsx --test` runs passed 21/21 across `scopeReduction.test.ts`, `dashboardAuth.test.ts`, `beneficiaryScope.test.ts` and `beneficiaryReports.test.ts`, including scope isolation and PDF/XLSX restrictions.
- Final browser command: `PLAYWRIGHT_CHANNEL=msedge npx playwright test tests/browser/management-refinement.spec.ts tests/browser/scope-reduction.spec.ts --workers=2`: 24/24 passed (14 new tests, 10 existing regressions).
- All four pages and three editor dialogs checked at 320/390/768/1024/1440px: no document overflow, dialogs within viewport, reachable footer controls, and no axe violations. Existing tests verify mobile navigation, protected routes and viewer restrictions. New interaction tests cover filters, explicit missing/zero values, source-reference outage, retry, out-of-order registry searches, edit payloads, pagination, password omission and export URLs/authentication.
- Initial new-test runs exposed an overly broad test interceptor, ambiguous filter names and a multi-page test timeout. Corrected the interceptor, named the controls explicitly and increased the per-viewport test budget; the final complete run passed.
- `git diff --check`: passed. Visually reviewed synthetic desktop Programs/Reports/Users and mobile Registry/Reports screenshots. Screenshots are local previews in `frontend/test-results/management-*.png`, not evidence of official data or live deployment.

## Remaining work

Institutional dependencies above remain open. Separate Accomplishments and GAD Plan editors, the CSV wizard internals, approved reporting templates and richer participation analytics are outside this four-page refinement. Full-volume export qualification, live persistence acceptance and representative LGU user testing are not claimed. The frontend build's existing large-chunk warning remains a performance follow-up.
