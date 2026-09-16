# Backend and security verification — 2026-09-16

Scope: the September 16 completion audit supplied by the user, restricted to
backend/security. Frontend and launch work are excluded. The user instructed
that unknown LGU rules be tracked as CMS features or awaiting data. See the
[feature register](backend-feature-register.md). Waiting is not completion.
Request/response changes and troubleshooting are in the
[backend API notes](backend-hardening-api-notes.md).

## Verified changes

| Finding | Implemented behavior | Behavioral evidence |
| --- | --- | --- |
| BE-3 revocation writes | Logout/refresh await shared database persistence; failed reads/writes fail closed. Runtime authentication checks the shared store; negative results are not cached. | `revocationDurability.test.ts`: DB read/write failure and HTTP 503. `qualify-revocation.ts`: separate running processes, a fresh process, and an atomic two-process refresh race. |
| Late startup hydration | Existing retry behavior retained. | `revocationRecovery.test.ts`: unavailable DB becomes ready; initial query failure recovers. |
| Session-wide logout | Access and refresh tokens share a session ID, preserved through rotation. Bearer-only logout durably revokes the session for the maximum refresh lifetime. | `sessionLogout.test.ts`; real PostgreSQL bearer-only logout rejects refresh in another process. |
| Error response privacy | Production unexpected errors return generic messages/codes; typed validation errors remain actionable. | `errorResponsePrivacy.test.ts`: private DB text/code/details do not appear in HTTP responses. |
| Banner/multi-row headers | Conservative banner recognition, parent/child heading flattening, explicit layout override, source record numbers, malformed/duplicate-header rejection. | `csvLayout.test.ts`; actual discover/preview/execute HTTP requests and persisted value in `qualify-import-layout.ts`. |
| Numeric corruption | Both import modes reject partial numeric strings, malformed thousands separators, blanks and nonfinite values. | `importNumbers.test.ts`; PostgreSQL qualification confirms invalid batches write nothing. |
| Matrix unpivot | Individual measure columns can supply dimensions and reporting periods while sharing one indicator. Existing vocabulary/coordinate validation applies. | Real PostgreSQL imports distinct MALE/FEMALE coordinates with distinct dimension hashes. |
| Feedback data loss/review | Public submission stores the message transactionally; admin review has bounded pagination, private detail access auditing and optimistic concurrency. | `feedback.test.ts`: unavailable storage, role denials, migration/RLS checks. PostgreSQL HTTP round trip confirms persistence, review and stale-write 409. |
| GAD approval bypass | Generic and dedicated status routes use the same state/budget checks. New plans start DRAFT. Generic edits cannot set status. Submitted/approved plans cannot be edited, deleted or extended. | `gadWorkflowBypass.test.ts`; real PostgreSQL HTTP tests cover legacy route rejection, budget checks, persistent override reason and rollback when audit insertion fails. |
| Statistical search/summaries | Search is restricted to the 69 source mother tables and accessible, unsuppressed observations. Summaries separate dataset/period/indicator/unit and aggregate beyond a grid page. | `qualify-statistical-search.ts`: 1,001 observations, foreign-office denial, published-only viewer access, suppression, literal query input and unit-separated summaries. |
| Partial-update data loss | Omitted status, budgets, reported counts and office activation remain unchanged; explicit zero/false remain valid. | `partialUpdateDefaults.test.ts`, GAD schema regression and PostgreSQL HTTP draft-budget edit preserve existing budget/status. Approved-plan edit denial still passes without an injected status field. |

The complete backend suite re-exercised prior office-scope, MOV, RLS, CSV/XLSX
export, dataset-history, fallback GAR, logger/query redaction, rate-limit and
CORS/Helmet regressions. Source-register reconciliation was rerun in the isolated
PostgreSQL qualification. The 69-register file is authoritative for identities,
not for detailed tabulations.

## Checkpoint

- Backend typecheck: pass.
- Backend tests: **229 passed, 0 failed, 64 suites**; none skipped.
- Backend build (npm posttest): pass.
- Local PostgreSQL qualification: original 8 import scenarios plus real HTTP
  header/matrix, feedback, GAD and search checks; separate-process revocation checks pass.
- Production dependency audit: **0 reported vulnerabilities**. This is not an
  application security certification.
- Existing qualification runner also restores its synthetic database and compares
  all 20 table fingerprints. This incidental regression is not deployed backup validation.

## Compatibility and limits

- Legacy refresh tokens without session contract version 2 require a fresh login.
  Existing access tokens retain their normal expiration. No signing keys changed.
- Synchronous revocation helpers are restricted to explicit offline demo mode;
  runtime code uses asynchronous durable APIs. Offline demo mode is not durability proof.
- New feedback storage requires `20260916041906_feedback_review.sql`. It was tested
  locally, not applied to a deployed database. The application fails instead of
  claiming feedback was saved when storage is unavailable.
- GAD `PUT` requests must omit `status`; use workflow endpoints. SUPER_ADMIN can
  approve submitted plans but can no longer skip the state machine. The full named
  GAD Focal/MPDC/Mayor chain is awaiting policy; the current workflow is not represented as that chain.
- Search/summary UI is not built here. Search counts are record counts, not
  population totals. Means are unweighted descriptive values, not inferred rates.
  Arbitrary cross-cell reconciliation/scoring still needs approved rules.
- No production migration, cloud deployment, external submission, notification,
  or launch sign-off was performed. Representative production-volume profiling
  remains necessary; the 1,001-row regression is not a load test.

JWT design reference: [OWASP REST security guidance](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).
