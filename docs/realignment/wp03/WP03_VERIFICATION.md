# WP03 verification

Date: 2026-10-17, Asia/Shanghai. Base: `5e75fff0400c563743b7a77c5d04fdfa418bc2e3`; branch: `feat/gad-wp03-database-readiness`. PR #44 was verified merged into main before fetching that main and creating the branch. Existing untracked audit documents were preserved. No production/shared database or external storage was accessed.

## Commands and results

Commands below were executed from repository root with installed dependencies, Node v22.16.0, Prisma 5.22.0 and local PostgreSQL 18. Exact migration file order/checksums and SQL catalog are in `evidence/`. Database URLs in validation/test shell were explicitly set to `postgresql://postgres@127.0.0.1:1/wp03_no_connection`; the database runner independently overrides both URLs with its newly created loopback cluster.

| Command | Result |
| --- | --- |
| `gh pr view 44 --repo azinamouto/TAGAD-FOUNDATION --json state,mergedAt,baseRefName,mergeCommit,url` | MERGED, base main, merged 2026-10-16T23:44:36Z, merge SHA above. |
| `git fetch https://github.com/azinamouto/TAGAD-FOUNDATION.git main` then `git switch -c feat/gad-wp03-database-readiness FETCH_HEAD` | PASS; no unrelated tracked changes; `docs/audits/` untouched. |
| `npm --prefix backend run db:validate` | PASS. Runner also validates before replay. |
| `npm --prefix backend test` | PASS: 267 tests, 70 suites, zero failures/skips; posttest backend `tsc` build passed. |
| `npm --prefix backend run typecheck` | PASS. |
| `npm --prefix frontend run typecheck` | PASS. |
| `npm run build` | PASS: Vite frontend build and backend typecheck. Existing >500 kB chunk-size warning remains. |
| `node backend/scripts/run-qualification.mjs` with `WP03_REPLAY_ONLY=1` | Original eight SQL migrations replayed; generated before-drift evidence. Initial single-schema introspection hit P4002; temporary multi-schema comparison fixtures resolved the tooling limitation. |
| `node backend/scripts/run-qualification.mjs` with synthetic JWT environment values and `WP03_EVIDENCE_DIR` | PASS, exit 0: nine-migration replay, pre-existing-row preservation, Data API isolation, exact reviewed drift, all domain qualifications and full logical restore. Same executable is exposed as `npm --prefix backend run test:qualification`. |
| `node backend/scripts/run-qualification.mjs` with `WP03_BACKUP_ONLY=1` and a separate evidence directory | PASS: independent fresh-cluster replay, synthetic graph, full dump/restore and count/content/catalog equality. Domain scenarios are not rerun in this mode. |
| `git diff --check` | PASS. |

## Qualification coverage and failures investigated

SQL replay replaces Prisma push in the existing runner; database CI reuses the same qualification workflow. Catalog reconciliation tests run only on synthetic disposable records. Fixture office codes are isolated from migration-seeded references; barangays reuse existing reference codes without updates. Feedback audit fixtures now satisfy the existing SQL minimum message length and allowed status checks.

The full suite covers catalog identity/reconciliation guards, eight statistical import scenarios, import layouts and feedback, GAD transition/budget/audit controls, 21 forced audit-failure rollbacks across every public table, 1001-observation statistical search with role/scope/publication/suppression controls, cross-process/restarted token revocation and atomic refresh consumption. A preservation graph exercises all Prisma scalar columns and linked beneficiary, GAD and statistical records.

Restore investigation found identical rows but two equivalent catalog representations: implicit versus explicit default owner ACLs, and a varchar-array-to-text-array cast expanded per literal by PostgreSQL dump/reparse. The catalog comparator normalizes these forms only, retaining allowed values/operators, normalized effective ACL entries, ownership, RLS and all other constraint definitions. No DDL was weakened to make the comparison pass.

## Boundaries and blockers

Full-run restore: **35/35 public/auth tables match**, all column/constraint/index/owner/ACL/RLS/policy/trigger/function/enum metadata matches after the documented normalization; restore plus verification **8004 ms**. Independent repeat: **35/35 match**, **6955 ms**. The repeat uses only its own smaller synthetic graph; timestamps/UUIDs and row counts are expected to differ between separate source databases. Reproducibility means each restored destination equals its own source.

Evidence: [full qualification](evidence/qualification-output.txt), [267-test output](evidence/backend-tests-output.txt), [build output](evidence/build-output.txt), [full restore](evidence/restore.json), [repeat restore](evidence/restore-repeat.json), [repeat output](evidence/restore-repeat-output.txt). Backend/frontend typechecks and validation completed successfully as recorded above. No production recovery-time claim follows from local timings.

The SQL/Prisma baseline intentionally retains documented nonzero drift; unexpected changes fail the exact diagnostic-diff gate. No existing migration was edited, no historical data was deleted, and no Prisma push was executed. The single new migration adds the durable revocation table and access protections.

D10 deployed ledger/schema/grants, managed Auth/storage/global-role recovery and agreed RPO/RTO remain unknown. Existing manually created revocation tables require explicit operator reconciliation; the migration fails rather than skipping unverified DDL. D01-D13 institutional decisions remain open and gate dependent WP04 functionality. Local test success does not authorize deployment or establish LGU acceptance. GitHub CI status must be assessed separately from local results. Deliver as a draft PR; do not merge.
