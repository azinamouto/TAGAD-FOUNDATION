# Mandatory audit policy and qualification

## Mutation inventory

All persisted business mutations below require an audit insert in the same
Prisma interactive transaction. Errors must reach the caller and roll back the
transaction; a log line or memory record cannot substitute for a database audit.

| Mutation class | Owning service / transactional boundary |
| --- | --- |
| Office create/edit | OfficeService |
| User create, profile/role/password changes and deactivation | UserService; password hashes excluded from audit payloads |
| Program create/edit/delete | ProgramService |
| Beneficiary create/edit/archive | BeneficiaryService |
| GAD plan and item create/edit/delete, submit/revise/approve and override | GADPlanService |
| Accomplishment create/edit/delete, including program totals | AccomplishmentService |
| MOV attachment metadata | MOVAttachmentService |
| Table create/edit/archive/delete, dimension definitions/bindings, indicators | TableBuilderService |
| Dataset create and publication/governance transitions | StatisticalDatasetService |
| Observation create/edit/delete and grid batches | ObservationService |
| Statistical CSV import, provenance and results | StatisticalObservationIngestionService |
| Registry/program/household/accomplishment CSV ingestion | CsvIngestionService, one transaction and audit per 250-row chunk |
| Legacy catalog dataset/indicator/observation helpers | StatisticalCatalogService |
| Canonical catalog reconciliation | reconcileCbmsCatalog; system audit only when something changes |
| Citizen feedback submission/review; private detail access | FeedbackService |

Mounted legacy API routes delegate to the admin services. The old controllers
under `server/controllers` with direct Prisma writes are not mounted by these
routes and must not be reintroduced as write handlers.

## Guarantees and boundaries

`AuditService.logActionTx` requires a transaction in connected mode and propagates
insert failures. Production cannot fall back to in-memory audit storage.
Standalone `logAction` remains for login/logout event recording and demo fixtures.
Session revocation and expired-token cleanup are security-store operations;
revocation must remain effective even if a later logout event audit fails.
Database fixture setup and migration/seed scripts are operational tooling.

CSV imports retain their existing chunk commit semantics: if a later chunk fails,
earlier chunks remain committed with their audit records. The failed chunk leaves
neither its rows nor its audit. Each record contains the batch ID, chunk offset,
row count, mode and cumulative counters, without citizen row contents. The error
propagates even in tolerant mode. A failed multi-chunk import is not an all-file
rollback; check its batch audits before retrying.

MOV binary uploads are external Storage operations and cannot participate in a
PostgreSQL transaction. The metadata and its audit are atomic; external orphan
cleanup remains a separate operational concern.

## Evidence

Run `npm --prefix backend run test:qualification`. The runner creates an isolated
loopback PostgreSQL cluster, pushes the Prisma schema, runs qualification and
verifies a synthetic backup/restore. It never targets a configured production DB.
`PG_BIN` selects the PostgreSQL installation (Windows defaults to PostgreSQL 18).

`qualify-audit-integrity.ts` injects a PostgreSQL BEFORE INSERT trigger that rejects
audit writes, invokes actual services, verifies the failure reaches the caller,
and compares row counts/content fingerprints of every public table before and
after each failure. It also verifies successful mutations persist audits. Existing
GAD qualification verifies the HTTP 500 and unchanged plan status on audit failure.
Unit rollback simulations remain fast coverage, not proof of database rollback.

## CI and release qualification

- Backend PostgreSQL qualification runs on PRs to main/master/develop, relevant
  pushes, manual dispatch and reusable workflow calls; logs are retained as artifacts.
- Frontend CI installs development tools explicitly, typechecks, runs auth/form
  behavior tests and creates a production build. It runs on PRs to the same branches,
  relevant pushes, manual dispatch and reusable calls.
- Release readiness depends on backend unit/build, real PostgreSQL qualification
  and frontend qualification. Frontend tests run through the locked local `tsx`
  dependency and Node test runner; they do not require backend or cloud credentials.

Local frontend verification: `npm --prefix frontend ci --include=dev`,
`npm run typecheck:frontend`, `npm --prefix frontend test`,
`npm --prefix frontend run build`. These are service/form tests, not browser E2E.

Local verification on 2026-09-20 (Windows, Node 24.18, PostgreSQL 18):

- Backend: 247 tests passed; backend typecheck/build passed.
- PostgreSQL: 21 injected audit-failure cases preserved all public table contents;
  successful audited writes and later CSV chunk rollback passed. The complete
  qualification suite and 20-table synthetic backup/restore comparison passed.
- Frontend: clean install, typecheck, seven tests and production build passed.
  Vite still reports the existing large bundle warning.
- GitHub-hosted Node 22 workflow execution remains to be verified on a PR run.
