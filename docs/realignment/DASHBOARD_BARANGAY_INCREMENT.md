# Dashboard and Barangay Statistics ? first refinement

Date: 2026-10-27. Branch: `feat/dashboard-barangay-refinement`.
Authority: [proposal](../requirements/TALIBON_GAD_SDD_PROPOSAL.md), [traceability](REQUIREMENTS_TRACEABILITY.md), [open decisions](OPEN_DECISIONS.md). This targeted update does not close institutional decisions or certify production readiness.

## Six-module audit

IMPLEMENTED describes a narrow existing capability; PARTIAL describes incomplete module coverage; MISSING describes absent inspected behavior; BLOCKED requires institutional evidence.

| Proposal module | Classification and inspected evidence | Remaining gap / dependency |
| --- | --- | --- |
| User management | PARTIAL. `UserManagement.tsx`, authenticated workspace and admin-only navigation implement existing account/role management. | Six-persona mapping and office/barangay designation remain BLOCKED on D02. |
| Data encoding | PARTIAL. `DataEncoding.tsx` registry CRUD; `BarangayStatistics.tsx` and `ProvisionalGadService.ts` implement scoped series, strict counts, preview/confirmation and CSV/XLSX intake. | Approved categories, indicators, sources and sensitive collection BLOCKED on D03/D05/D08. Provisional counts are not population or participation. |
| Program/service monitoring | PARTIAL. `ProgramMonitoring.tsx`, accomplishments and `DashboardService.ts` provide program targets and fiscal-year expenditure summaries. | Unique beneficiaries versus attendance/service episodes, sensitive service scope and approved workflows BLOCKED on D04/D05/D09. |
| Dashboard/analytics | PARTIAL. Scoped registry sex/barangay summaries, recent entries, fiscal-year programs/budgets and provisional period comparisons IMPLEMENTED. | Age bands, trends, approved gender-gap indicators and participation drill-downs MISSING in these views; definitions depend on D03/D04/D08. Verified geographic visualization BLOCKED on D07/D05. Freshness/latency acceptance depends on D11. |
| Reports | PARTIAL. `Reports.tsx` exposes GPB/GAR Excel and registry PDF working exports. | Official templates, rounding, signatures and acceptance BLOCKED on D06/D09; full sector/barangay/M&E coverage remains incomplete per traceability. |
| Security/privacy | PARTIAL. Dashboard authentication, read scope, provisional office/barangay scoping, viewer restrictions and confirmation integrity exist. | Institutional confidentiality/retention, deployed recovery and operational acceptance BLOCKED on D05/D10. No compliance claim. |

D01 scope confirmation and D12?D13 pilot, training, sustainability and funding evidence remain open. Existing software does not resolve them.

## Focused findings and changes

- Dashboard already separates all-year registry counts from fiscal-year budget/program summaries, provides unavailable/loading/empty states, and marks missing chart values as not recorded. Added a labeled barangay selector shared by the chart and table, leaving overall summaries unchanged.
- Barangay Statistics already preserves null versus zero and scopes one source/period. Results previously followed intake controls and source metadata was not visible. Results now precede encoding, expose the source reference and office identifier supplied by the existing API, mark verification as provisional, and explain unavailable update metadata. Tables reuse the Dashboard styling with numeric alignment and keyboard-accessible overflow.
- Reused the authenticated shell, drawer, navigation and chart components. Applied restrained emerald/gray tokens and a floating desktop sidebar; public theme and route permissions remain unchanged. No new dependencies, endpoints, migrations or business rules.
- Dashboard service initializes scoped registry counts to zero for roster entries; this represents a registry query count, not evidence of population/source coverage. Provisional missing rows remain null. No geographic authority is inferred from roster membership.

## Verification

Browser fixtures are synthetic and intercepted locally; they do not establish live data accuracy or institutional approval. No deployment or production-data changes authorized or performed.

- Frontend: `npm run typecheck`, `npm test` (19/19), `npm run build` passed. Vite reports a >500 kB chunk warning; bundle optimization is outside this increment.
- Backend: `npm run typecheck`, `npx tsx --test tests/dashboardAuth.test.ts tests/provisionalGad.test.ts tests/scopeReduction.test.ts` (22/22), `npm run build` passed.
- Browser: `PLAYWRIGHT_CHANNEL=msedge npx playwright test tests/browser/portal-refinement.spec.ts tests/browser/provisional-gad.spec.ts tests/browser/scope-reduction.spec.ts --workers=2` passed 24/24. Default launch initially failed because bundled Chromium was absent; installed Edge completed the suite.
- Dashboard checks cover widths 320/390/768/1024/1440, no page overflow, mobile focus/navigation, axe accessibility, outage/retry, empty/incomplete responses and filter scope. Provisional checks cover 390/1280 widths, preview/confirmation, viewer/session restrictions, provenance and null counts. Reviewed desktop/mobile Dashboard and desktop provisional screenshots in `frontend/test-results/` (synthetic data).
- `git diff --check` passed. Existing local edits to `backend/server.ts`, `frontend/vite.config.ts` and `docs/audits/` were preserved. No full production or live-database acceptance run performed.

Next increments: dedicated Programs, Data Encoding, Reports and Administration content refinement; richer analytics only where definitions and source evidence are sufficient. The shared shell colors apply now, but these page-specific redesigns are not claimed complete.
