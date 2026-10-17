# Provisional GAD barangay statistics MVP

## Scope and authorization

The project owner authorized an isolated additive model and internal engineering tests after the [original persistence assessment](GAD_BARANGAY_ENTRY_PERSISTENCE_REVIEW.md). That assessment is preserved. This implementation does not approve an LGU dictionary, roster, source, privacy policy, or release workflow.

Open the authenticated workspace at **/barangay-statistics**, or use **Provisional Barangay Counts** in the sidebar.

## Implemented behavior

- Create a source series with a stable unique uppercase code, description/name and source reference. The server fixes ownership to the creator's explicitly assigned active office.
- Select a source series, an eligible barangay reference and an exact reporting period. Enter male/female counts and source reference; see the derived total, preview, then confirm.
- Upload CSV or XLSX using the downloadable CSV header template. Excel uses the same five columns on one worksheet. Both feed the same validator as manual entry.
- Preview every row, source citation, calculated total, validation errors and duplicate warnings. Invalid batches cannot be committed. Confirmation expires after 15 minutes and is bound to actor, series, normalized rows and source filename.
- Commit an entire batch and its per-record audits in one serializable transaction. Recheck account, office, barangay scope, reference eligibility and persisted duplicates at commit. Never overwrite.
- Display a table and male/female chart for one source series and one exact period. Totals sum persisted records only. Missing eligible barangays have null values displayed as “No data”; all-missing selections have no numerical totals.
- Report storage failures rather than returning demo records or fabricated zero totals. Source-series creation is also transactional with an audit record.

Period labels are YYYY, YYYY-Q1 through YYYY-Q4, or YYYY-MM. They are literal keys, not a declaration of LGU calendar/fiscal policy. No rollup combines these labels. Counts range from 0 to 2,147,483,647 each; their derived pair total remains safely representable. Missing counts are rejected.

Files are limited to 2 MB and 1,000 data rows. XLSX intake checks the ZIP directory and bounded actual decompression (10 MB total), rejects encrypted/unsupported archives, and disallows formulas, date objects, rich text and multiple worksheets. Raw uploads are not stored; records retain source citation, original sanitized filename, creator and batch ID.

## Additive database migration

Migration: `backend/supabase/migrations/20261017000002_provisional_gad_entries.sql`.

| Model/table | Purpose |
| --- | --- |
| ProvisionalGadSeries / tagad_provisional_gad_series | Stable source-series identity, source metadata, fixed owning office, creator and timestamps. |
| ProvisionalGadReference / tagad_provisional_gad_references | Explicit roster-evidence allowlist referencing existing barangay IDs, active flag, synthetic-test designation. Independent of geoVerified. |
| ProvisionalGadEntry / tagad_provisional_gad_entries | Male/female values, barangay, period, office, creator, source/file/batch provenance and timestamps. |

A unique constraint enforces **series + barangay + period**. A composite foreign key enforces that each record's owning office matches its series. Integer columns and nonnegative checks enforce count bounds independently of the API. Required references use restrictive deletion behavior. Total is not stored.

The migration only creates tables, constraints, indexes and security policies. It performs no backfill or historical mutation. RLS plus revoked public/anon/authenticated privileges and restrictive policies deny Data API access. The application server uses the existing server database connection and enforces authorization. These tables have no statistical-dataset publication relationship or public routes. No schema migration was deployed.

## Access and roster handling

All new endpoints are under authenticated `/api/provisional-gad`. Each data operation looks up the active persisted user and active assigned office; it does not trust a request-supplied owner or demo account. All roles, including administrators, are confined to their assigned office for this module. VIEWER can read but cannot create, preview or commit. An assigned barangay further restricts available references, input coordinates and statistics. Users lacking an active office receive a precise error; no arbitrary ownership is inferred.

Ownership is captured at creation and never recomputed from the creator's later affiliation. There are no edit, delete, officialize or publish endpoints.

No approved roster is manufactured or automatically seeded. Before real entry can be enabled, a designated custodian must identify existing barangay IDs and provide actual roster evidence for the allowlist. This sprint intentionally provides no self-approval UI/API. The current absence of such references produces an unavailable-entry message. Geometry verification and seed presence confer no eligibility.

Synthetic references are accepted only with NODE_ENV=test. The disposable qualification runner creates distinctly labeled synthetic barangays in its own temporary database; it never connects to an existing database. Browser fixtures also clearly label synthetic values. Outside test mode synthetic references and their statistics are excluded.

## Reused infrastructure and changed files

- Existing Prisma connection, authentication middleware, error/response envelopes and AuditService.logActionTx.
- Existing csvParser, ExcelJS dependency, UI Input/Button/Card components, protected application layout and Recharts.
- Generic statistical importer persistence is deliberately not reused: its overwrite/publication semantics do not fit the isolated model. CSV parsing and validation conventions are reused.

Application changes:
- `backend/prisma/schema.prisma` and the additive migration above.
- `backend/server/services/ProvisionalGadService.ts`: parsing, shared validation, scope, preview signatures, atomic persistence and statistics.
- `backend/server/routes/provisionalGad.ts` and `backend/server.ts`: authenticated API only.
- `frontend/src/pages/BarangayStatistics.tsx`: source series, entry/import preview and statistics.
- `frontend/src/app/router/AppRouter.tsx`, `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/api/axios.ts`: navigation, protected routing and session-expiry handling.

Verification:
- `backend/tests/provisionalGad.test.ts`
- `backend/scripts/run-provisional-qualification.mjs`
- `backend/scripts/qualify-provisional-gad.ts`
- `frontend/tests/browser/provisional-gad.spec.ts`
- `frontend/tests/browser/scope-reduction.spec.ts` (updated navigation link count)

## Verification evidence

All database work used a freshly initialized, loopback-only PostgreSQL 18 cluster with a generated port and synthetic fixtures. The runner overrides DATABASE_URL/DIRECT_URL, replays the complete SQL migration chain, runs qualification, stops the cluster, and removes only its verified temporary directory. It never consumes an existing database URL.

| Check | Result |
| --- | --- |
| Backend tests | 272 passed in the full suite, including existing GAD/statistical regressions and 5 new focused tests. |
| Frontend tests | 19 passed. |
| Backend/frontend TypeScript | Passed. |
| Prisma validation | Passed. |
| Backend/frontend builds | Passed; Vite reports its existing large-chunk advisory. |
| Complete migration replay + real PostgreSQL qualification | 20 scenarios passed. |
| Browser checks | 23 passed in installed Edge, including 5 new mobile/desktop workflow checks; focused checks rerun after final UI adjustments. The bundled Playwright browser is not installed. |

The 20 PostgreSQL scenarios cover manual persistence and audit content; actual totals and missing data; CSV and XLSX parser/commit and HTTP upload/commit paths; invalid counts/references; within-file and database duplicates; concurrent confirmation with exactly one insert/audit; tampered confirmation; role/office/barangay authorization; stable ownership after reassignment; rollback of both rows and earlier audits when the second row's audit fails; database-level count/ownership constraints; synthetic-data exclusion outside test mode; anonymous/public-route isolation; separate source series; reference revocation between preview and commit; duplicate HTTP status; malformed upload HTTP status; RLS/privileges; and explicit database outage handling.

Browser tests use mocked HTTP responses to inspect mobile/desktop rendering and interactions. They complement, rather than replace, real-database HTTP qualification. No production access, deployment, or merge was performed.

[Desktop screenshot with explicitly synthetic references and counts](evidence/provisional-gad-desktop.png).

[Captured test counts, migration replay list and qualification results](evidence/provisional-gad-verification.txt).

Reproduce from repository root:

```powershell
$env:DATABASE_PROBE_DISABLED = 'true'
$env:DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/tagad_isolated'
$env:DIRECT_URL = $env:DATABASE_URL
npm --prefix backend test
npm --prefix frontend test
npm --prefix backend run db:validate
npm --prefix backend run typecheck
npm --prefix frontend run typecheck
npm --prefix frontend run build
node backend/scripts/run-provisional-qualification.mjs
$env:NO_PROXY = '127.0.0.1,localhost'
$env:PLAYWRIGHT_CHANNEL = 'msedge'
node frontend/node_modules/@playwright/test/cli.js test --config frontend/playwright.config.ts --workers=2
```

## Remaining institutional and operational boundaries

### Completion audit

| Status | Scope |
| --- | --- |
| Completed and locally verified | Additive persistence; manual entry; CSV/XLSX parsing, preview and confirmed atomic commit; unique coordinates; stable office ownership; per-row transactional audit; authenticated statistics API; dashboard filters, chart, table, totals and missing-data behavior. Evidence includes real PostgreSQL HTTP calls, not only rendered UI. |
| Incomplete | No known unfinished item in the authorized foundational MVP. Corrections, owner transfer, formal release and multi-instance preview signing remain deferred extensions, not implemented features. |
| Blocked for real-data use | Approved roster evidence and actual active office assignments must be supplied. Institutional definitions, privacy, source review and publication approval remain open. No migration or data change was applied to an existing environment. |
| Untested | A browser connected end-to-end to the real database (browser tests use mocked HTTP; separate HTTP qualification uses real PostgreSQL); production deployment; multi-instance operation; maximum-volume performance and formal LGU acceptance. |

The continuation audit also found an in-progress local frontend-path fix in backend/server.ts. Its intent is retained with module-relative resolution, removing dependence on whether the process starts in the repository root or backend directory. Unrelated docs/audits work is excluded from this PR.

D03/D05/D08 definitions, privacy/source rules and release authority remain unresolved. Verified roster evidence (D07) and actual active office assignments must be supplied before real encoding. This MVP is not an official demographic dictionary, population estimate, beneficiary registry, or publication mechanism.

Corrections, source-series transfer, period rollups, formal provenance review and public release are deferred. A duplicate is rejected, not silently corrected. Preview signatures are process-local: a restart or another worker invalidates a preview and requires a new one; multi-instance deployment would require a shared signing-key design. Deployment and production qualification are outside this authorization.
