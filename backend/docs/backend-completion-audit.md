# Backend completion audit — 2026-09-15

Status: the requested local fixes have regression coverage, but the whole
backend is **not signed off for production**. CMS-1 reconciliation, live-service
verification, and the remaining security findings below are open. Frontend
implementation remains deferred under the backend-first instruction.

## Verified checkpoint

- `npm run typecheck`: passed.
- `npm test`: **200 passed, 0 failed, 64 suites**, with no skipped tests.
- Targeted dependency regression: **5 passed, 0 failed** across MOV multipart
  parsing/scope, beneficiary reports, and grid exports.
- `npm run test:qualification`: **8/8 passed** against a disposable local
  PostgreSQL 18 cluster using the current Prisma schema. The runner stopped and
  removed that cluster after the run. This is not a deployed Supabase test.
- `npm audit --omit=dev`: **0 reported vulnerabilities** after the dependency
  updates. An advisory scan does not establish application security.

## Requested fixes and behavioral evidence

| Requirement | Result and evidence |
| --- | --- |
| Beneficiary office scope | DB, memory, and DB-error fallback deny foreign-office encoder reads; missing office is denied. `beneficiaryScope.test.ts`. XLSX/PDF controllers now pass the actor; `beneficiaryReports.test.ts` checks scoped report output/calls. |
| Revocation startup recovery | Hydration retries unavailable/failed DB reads and becomes ready only after success. Production authentication waits for initial hydration. `revocationRecovery.test.ts`. This addresses startup recovery, not the remaining session findings below. |
| MOV fail-closed scope | Unavailable DB returns 503; unresolved, missing, or foreign encoder office is denied. `movScope.test.ts`. Multipart bytes/metadata reach the upload service and unexpected file fields are rejected in `movMultipart.test.ts`. |
| Canonical table RLS | New `20260914141827_deny_tagad_data_api_access.sql` enables RLS, revokes anon/authenticated grants, and adds a restrictive deny policy across public `tagad_*` tables. PGlite regression verifies denial even after grants are restored, existing-policy preservation, idempotency, and service-role bypass. Migration is **not deployed**. |
| Grid export | Specific route precedes observation-ID route. CSV/XLSX stream successive 500-row pages. HTTP regression exports all 1,201 fixture observations in both formats and denies unauthorized access. `gridExport.test.ts`. |
| Issue 16 qualification | Setup now resolves `dimensionId` from dictionary data and uses real persisted observations rather than the removed memory API. Local PostgreSQL qualification verifies discovery, preview, unpivot, provenance/hash, duplicate handling, official-data lock, office scope, and atomicity. |
| GOV-2 fallback lock | Fallback dimension removal respects official/published dataset locks and existing observations. `dimensionLock.test.ts`. |
| Database recovery | Real `SELECT 1` probes replace hostname heuristics; failed probes retry with bounded exponential backoff. `databaseRecovery.test.ts`. |
| Shared PII redaction | Logger and sanitizer reference the same sensitive-key set. Regression asserts private values disappear from captured nested log output. `loggerRedaction.test.ts`. |
| GOV-3 backend data status | Status derives from persisted observation counts, not catalog verification. Empty verified tables remain NO DATA; populated unverified tables report real data. `statisticalDataStatus.test.ts`. |
| GIS backend | Nullable lat/lng, optional polygon GeoJSON, source and verification fields; public/admin GeoJSON endpoints. All 25 seed barangays have no verified location. Tests verify null geometry, longitude/latitude order, and SQL constraints. `barangayGeo.test.ts`. Migration is **not deployed**. |
| LAUNCH-2 backup/DR | [Recovery runbook](backup-and-recovery.md) documents backup and restore steps, proposed recovery targets, and proof required. PITR and restore evidence remain unverified. |
| LAUNCH-3 monitoring | Sentry captures sanitized server errors when configured. Real SDK transport regression checks 5xx capture and sensitive-data removal. `errorTracking.test.ts`. External delivery is unverified. See [error tracking](error-tracking.md). |
| LAUNCH-4 backend deployment | Explicitly manual deployment; CI validates. Production command honors PORT, starts without frontend files, and reports 503 readiness before DB/auth hydration. `productionStartup.test.ts`. See [manual deployment](manual-deployment.md). |
| Dependency security | Express 4.22.3, Multer 2.4.0, UUID 11.1.1, and patched body-parser/qs resolution. UUID is a direct dependency with an override for ExcelJS's transitive use. XLSX regressions pass. |

Existing table/dimension CRUD, inline creation, binding/reordering, observation
create/list/update, DRAFT defaults, validation, and governance are exercised by
the table-builder HTTP, grid, observation, and governance suites. Statistical
import discover/preview/execute routes exist; service behavior also passes the
real-database qualification. HGDG scoring and budget validation are called by
GADPlanService; the GAR variance route calls GarReportService. The prior
DATA-1/catalog documentation exists in repository `docs/`; this audit does not
convert its explicitly deferred source reconciliation into a completion claim.

## Security re-audit: sign-off remains open

The targeted Tier 1/Tier 2 fixes above pass their local regressions. Dashboard
authentication, role/office enforcement, explicit demo-mode configuration,
revocation checks, logger redaction, and proxy behavior also have passing
coverage. Helmet, CORS, and request controls are wired in the backend. The
original SEC-001 checklist was not found in the checked local documentation,
so this report cannot certify an exact checklist match.

Additional source-review findings require follow-up before security sign-off:

1. **Revocation across processes and failed writes:** JWT verification uses the
   local cache; hydration runs once after startup. A revocation made by another
   running process is not continuously synchronized. `revokeToken` catches DB
   write errors and the synchronous wrapper persists in the background, so a
   successful logout/rotation response is not proof of durable revocation.
   Require durable failure handling and a shared/authoritative revocation check,
   with multiple-process and DB-write-failure tests. Initial hydration recovery
   does not resolve these cases.
2. **Logout/session contract:** backend logout revokes the refresh token only
   when supplied; the current frontend sends an empty logout body. Access and
   refresh signing generate separate session IDs unless one is provided.
   Session-wide invalidation needs a defined contract and regression coverage.
3. **Error responses:** `server/lib/response.ts` can return raw unexpected error
   messages/codes to clients. Sentry sanitization does not sanitize the HTTP
   response. Production unexpected-error responses need a generic public
   message and a regression that includes simulated DB/private error text.

These are source-review findings, not demonstrated attacks against production.
LAUNCH-1 remains **open**, rather than being inferred complete from green tests.

## External prerequisites and deferred work

- **CMS-1 is blocked by missing authoritative input.** No LGU CSV path/URL was
  provided. The 69 seeded rows and their tests establish count/behavior only;
  they do not establish correct Table Number, Title, and Tab Name-derived code.
  Reconcile against the actual source, recording provenance and differences.
- **Supabase:** connected account access is available. On 2026-09-15 the project
  `eznhimiwzeobcxcqscgf` (TAGAD) still reported `INACTIVE`. The earlier deployed
  grant query timed out. Data API exposure, actual Prisma role privileges,
  deployed migrations, PITR, and a completed restore cannot be certified.
- **Storage/Sentry:** a live private-bucket upload, authorized signed download,
  wrong-office denial, and external Sentry event receipt are still required.
  Local service/parser/transport tests do not substitute for these checks.
- **GIS:** no invented coordinates were seeded. Real source data is needed to
  display actual barangay locations; the approved null/optional-GeoJSON
  contract is implemented.
- **Frontend:** the auth service uses relative `/api/auth/*` requests rather
  than the configured API-base client. The separate-origin finding is accurate
  unless an external same-origin proxy supplies those routes. Its fix remains
  deferred, together with FE/UI tickets, CMS-5, GRID-3/4, SIMP-5, GOV-3 badges,
  the MOV widget, catalog browser, GIS map, and frontend deployment work.

LAUNCH-5 has a passing **backend-only** checkpoint. Full application launch
regression and production readiness remain pending the open items above.
