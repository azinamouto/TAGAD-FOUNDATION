# PR #47 drift qualification continuation

Starting commit: `07631da064cfa16aac9ff4010678eb540918d0b2`, branch `feat/gad-barangay-data-entry`. Verification date: 2026-10-17 (Asia/Shanghai). This is a focused continuation of the provisional MVP.

## Failure and exact differences

Both [Backend Qualification run 39045673449](https://github.com/azinamouto/TAGAD-FOUNDATION/actions/runs/39045673449) and [Database Integrity run 39045673475](https://github.com/azinamouto/TAGAD-FOUNDATION/actions/runs/39045673475) replayed all ten migrations and passed Data API isolation, then failed the exact SQL/Prisma diagnostic-diff comparison.

A disposable PostgreSQL replay reproduced the failure. A temporary diagnostic copy of the runner saved Prisma's generated text before the unchanged comparison; it still exited 1 and was removed afterward. Comparing that text with the committed WP03 baseline found exactly six additional DROP/ADD foreign-key pairs (12 statements):

| Provisional table | FK columns | Referenced table/columns |
| --- | --- | --- |
| tagad_provisional_gad_series | owning_office_id | tagad_offices(id) |
| tagad_provisional_gad_series | creator_id | tagad_users(id) |
| tagad_provisional_gad_references | barangay_id | tagad_barangays(id) |
| tagad_provisional_gad_entries | series_id, owning_office_id | tagad_provisional_gad_series(id, owning_office_id) |
| tagad_provisional_gad_entries | barangay_id | tagad_barangays(id) |
| tagad_provisional_gad_entries | creator_id | tagad_users(id) |

SQL omits `ON UPDATE`, which means `NO ACTION`; Prisma's omitted `onUpdate` means `Cascade`. Each generated ADD retained `ON DELETE RESTRICT` but requested `ON UPDATE CASCADE`. There were no additional column, default, timestamp, unique/index-name, enum or table differences beyond the historical baseline.

The fix explicitly sets `onUpdate: NoAction` on these six Prisma relations only. SQL remains authoritative and unchanged, including the composite ownership FK. The generated residual diff now exactly equals the original WP03 baseline under the existing newline/trailing-newline normalization. Neither the baseline nor the gate changed. No diagnostic SQL was executed, no `db push` ran, and no existing/production database was used.

## Additional failing check

The starting commit also had a separate [CodeQL check failure](https://github.com/azinamouto/TAGAD-FOUNDATION/runs/117433987447): authorization at `backend/server/routes/provisionalGad.ts:15` lacked rate limiting. The router now applies a 120-request/minute per-IP limit before database availability checks, authentication and upload parsing, consistent with existing dashboard/beneficiary limits. A real HTTP regression test exhausts the budget on `/context`, then verifies `/preview` and `/statistics` return 429, with Retry-After, before malformed upload parsing. No alert was suppressed.

## Local verification

Environment: Windows, Node 22.16.0, PostgreSQL 18.6. Both database runners initialize loopback-only clusters on generated ports, override DATABASE_URL/DIRECT_URL, use synthetic data, stop their clusters and clean up their own temporary directories.

| Command/check | Result |
| --- | --- |
| `node backend/scripts/run-qualification.mjs` with synthetic JWT secrets and a separate WP03_EVIDENCE_DIR; replay-only/backup-only flags unset | Exit 0; all ten migrations replayed; pre-existing-row preservation, RLS/privileges and unchanged exact drift gate passed. |
| Full qualification domain checks | CBMS, issue 16 import/governance, matrix/layout, feedback, GAD workflow, 21 audit rollback cases, scoped statistical search and durable token revocation passed. |
| Synthetic logical backup/restore | All 38 public/auth tables matched by row count/content fingerprint; catalog equality covered columns, constraints, indexes, policies, RLS, ACLs and triggers. Restore plus verification: 4171 ms. |
| `node backend/scripts/run-provisional-qualification.mjs` | Exit 0; all 20 provisional scenarios passed, including real HTTP CSV/XLSX flows, concurrency, atomic audit rollback, ownership/count constraints, authorization and Data API isolation. |
| `npm --prefix backend test` | Exit 0; 273 passed, zero failed/skipped; posttest TypeScript build passed. |
| Frontend test/typecheck/build | Exit 0; 19 tests passed, TypeScript passed, production build passed with the existing large-chunk advisory. |
| Edge browser suite | Exit 0; all 23 tests passed (45.6 seconds), including mobile/desktop provisional flows; HTTP responses are mocked, complemented by the real PostgreSQL HTTP qualification above. |
| `git diff --check` | Passed. |

Local Prisma client regeneration encountered an existing Windows query-engine DLL lock (EPERM); existing client APIs are unchanged by referential-action metadata and the installed client passed qualification/tests. Fresh client generation must also pass in CI. An initial generation command used the wrong schema working directory and was corrected. Browser verification initially timed out waiting for the development server; it was rerun from the frontend directory on a separate port with process-local proxy variables cleared.

Reproduction: run the commands above; set synthetic JWT_SECRET/JWT_REFRESH_SECRET for qualification. For backend unit tests, disable database probing and use a dummy loopback DATABASE_URL/DIRECT_URL. For browser checks, from `frontend`, use `PLAYWRIGHT_CHANNEL=msedge`, a free `PLAYWRIGHT_PORT`, no loopback proxy, and `node node_modules/@playwright/test/cli.js test --config playwright.config.ts --workers=2`.

No merge, deployment, production mutation, historical migration rewrite or MVP redesign is part of this fix. Unrelated local `docs/audits/` work is excluded.
