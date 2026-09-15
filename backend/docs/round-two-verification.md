# Backend follow-up verification — 2026-09-16

This records the follow-up requested in attachment
`6d793870-efca-476a-8d4c-19ad2135dcf6/pasted-text.txt` and the user-confirmed
Talibon CBMS CSV. It supersedes the earlier audit's local-fix status, without
claiming production readiness.

## Scope and frontend provenance

No frontend file was changed in this pass or in the preceding backend-fix
range beginning at `62f4cd4`. The catalog browser, dataset creation/status UI,
and GAD approval controls were already present at that baseline. Git history
records the statistical frontend merge as `ec37e29` (2026-09-11), an ancestor
of `62f4cd4`; earlier GAD/frontend files were present by `05a5101` (2026-08-30).
These existing files are not evidence of frontend work during this backend-only
phase. Their original authorization cannot be inferred from Git history alone.
They were neither reverted nor expanded and do not satisfy backend acceptance.

## Fixes and measured results

| Item | Change | Verification |
| --- | --- | --- |
| BE-6 raw URL privacy | Shared logger parses URL queries and redacts sensitive keys, including repeated/encoded/nested keys, before serializing the path. | HTTP requests at INFO/WARN/ERROR and limiter-style logging contain none of the synthetic private values; non-sensitive parameters remain. Full suite after fix: 201/201. |
| DATA-3 dataset history | AuditService filters entityId in the Prisma WHERE clause and before fallback pagination. | 150 entries, with 3 target records older than 147 others, return all 3 in DB-query and fallback regressions. Full suite: 203/203. |
| GAD-6 fallback aggregation | Explicit item linkage takes precedence; program linkage is used only without an item link and with a real program ID. | Undefined/null/shared program fixtures keep each item's accomplishment separate and preserve totals/quarter filtering. Full suite: 206/206. |
| Startup revocation hydration | Existing retry fix retained; it was not the remaining durability defect. | Rerun: late DB availability and initial query failure both recover automatically, hydrate, and reject a pre-restart revoked JTI. 2/2 targeted tests. |
| BE-1 rate limits | Added enforcement tests on actual login/feedback routers. | Both return 429 and Retry-After after exceeding configured limits. Full suite: 207/207. |
| BE-2 CORS/Helmet | Strengthened actual production-startup HTTP test. | Blocked origins rejected for GET/OPTIONS; allowed origin receives credentials/allow-origin headers; Helmet headers verified. Full suite: 207/207. |
| CMS-1 source reconciliation | All identities now derive from the confirmed CSV; seed updates existing definitions and handles obsolete entries atomically. | Independent CSV regression checks all 69 rows. Real PostgreSQL verifies 74 legacy entries -> 69 source entries, custom preservation, repeatability, and linked-data protection. Full suite: 208/208. |
| BE-5 CI build | Backend npm posttest hook runs npm run build after successful tests, including the existing Actions npm test step. | Local execution shows 208 passing tests followed by posttest/build/tsc and exit 0. Root workflow unchanged; no remote Actions run claimed. |
| Governance documentation | Correct contract documented in backend/docs/statistical-data-status.md. | Data-status regression passes. Root-doc correction is prepared and passes git apply --check, but awaits the folder exception. |
| Local recovery drill | pg_dump custom archive restored into a second disposable PostgreSQL database. | All 19 public tables match source counts/content fingerprints; restore plus comparison 3,019 ms. This uses synthetic fixtures, not production backups. |

Final local checks: `npm run typecheck` passed; `npm test` passed **208/208**
in 64 suites with no skipped tests and then successfully ran `npm run build`.
`npm run test:qualification` passed the catalog qualification, all **8/8**
statistical-import criteria, and the synthetic restore drill. Temporary clusters
and dump were cleaned up. Each defect has its own commit; no changes were pushed.

## CBMS identity changes

The original checked-in catalog had 69 definitions, not 74. Against the user's
CSV: 68 existing titles and codes changed, the non-source Table 68 was removed,
and Table 70 was added. The source has 69 rows numbered 1–67, 69, and 70.
Codes are uppercase underscore-normalized Tab Names because the CSV has no
table_code column. Exact title/number/code changes and source hash are in
[the reconciliation report](cbms-reconciliation.md). Deployed database content
has not been changed or independently counted.

## Live verification still open

- **Storage:** local service-key configuration exists, but the configured URL
  does not match the connected TAGAD project and the bucket access probe failed
  with DNS ENOTFOUND. The connected TAGAD project still reports INACTIVE. No
  successful upload, signed download, or production office-scope round trip is
  claimed. Supply a working project/bucket configuration for that verification.
- **Backup/PITR:** the local logical restore passed. Deployed backup freshness,
  PITR enablement/retention, restoration of a real protected backup, production
  recovery targets, and MOV object recovery still require operator verification.
- **Sentry:** SENTRY_DSN and SENTRY_AUTH_TOKEN are absent; no Sentry dashboard
  connector is available. Local transport tests pass, but no externally received
  event is claimed. A configured staging project and dashboard receipt are needed.
- **Remaining security findings:** startup recovery is fixed. Cross-process
  revocation visibility, failed revocation writes, logout/session behavior, and
  generic production error responses remain the separate findings in the prior
  audit. LAUNCH-1 is not signed off.
- **Root governance document:** the latest user instruction explicitly restricts
  writes to backend/. The pending exception question was not answered by the
  CSV confirmation or continuation requests. The prepared patch changes only
  the incorrect GOV-3 section of docs/STATISTICAL_DATA_GOVERNANCE.md. It has not
  been applied. The CI requirement was completed without needing its exception.
