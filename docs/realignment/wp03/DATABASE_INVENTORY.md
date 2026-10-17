# WP03 database inventory

Date: 2026-10-17 (Asia/Shanghai). Repository baseline: `5e75fff0400c563743b7a77c5d04fdfa418bc2e3`. PR #44 was confirmed MERGED into main at 2026-10-16T23:44:36Z before branch creation. Scope is repository evidence and isolated synthetic PostgreSQL only; deployed data counts and migration history are unknown.

## Authorities and configuration

`backend/prisma/schema.prisma` is the application client model (PostgreSQL; `DATABASE_URL`, `DIRECT_URL`; Prisma 5.22.0 installed). There is no Prisma migration directory or Prisma migration ledger in the repository. `backend/supabase/migrations/*.sql` is the executable historical DDL chain. `backend/package.json` still exposes `db:migrate` as `prisma migrate deploy`; it is **not** the deployment route for this SQL chain. Do not infer migration completeness from that command. No `prisma db push` is used by the revised qualification or database CI.

The replay runner creates a fresh loopback cluster and overrides both database URLs. `qualification-platform.sql` supplies only the `auth.users`/`auth.uid()`/`auth.role()` and role prerequisites needed to compile historical Supabase SQL. It is not a Supabase Auth implementation or deployable migration.

## Physical inventory

The replay has 34 public tables and one test auth table. [catalog.json](evidence/catalog.json) records all 364 columns, 388 PostgreSQL constraints (including PostgreSQL 18 not-null catalog entries), 94 indexes, 48 policies, nine user triggers, ten enums, 53 functions (including extension functions) and table ownership/ACL/RLS state. The [migration manifest](evidence/migration-manifest.json) records ordered files and SHA-256 values of local file bytes. Counts describe this local PostgreSQL version, not an LGU database.

| Domain | Tables / models | Relationships and preservation significance |
| --- | --- | --- |
| Canonical organization | Office, Barangay, Household | Household requires barangay; optional household linkage must not be expanded into person matching. Geography includes nullable point/boundary/source/verification. |
| Canonical identity | User, RevokedToken | Four role values; optional office/barangay. Token hash and optional JTI uniquely identify revoked/consumed tokens; user deletion sets revocation user reference null. |
| Beneficiaries | Beneficiary | Required barangay; optional household/office/encoder. Original sex, age, birthdate, free-text sector and archive state retained. |
| GAD | GADPlan, GADPlanItem, Program, GADAccomplishment, MOVAttachment | Office/year uniqueness, program/plan links, financial decimals, counters and evidence paths. Cascades exist and must not be invoked for retirement. |
| Statistics | StatisticalTableDefinition, StatisticalDataset, StatisticalIndicator, StatisticalDimension, TableDimensionBinding, StatisticalProvenance, StatisticalObservation | Dataset/table required for observation; indicator/barangay/provenance optional. JSON dimensions, hash, period, exact decimal and suppression metadata are inseparable from meaning. |
| Audit / retired surface | AuditLog, CitizenFeedback | Before/after JSON, actor, timestamps and reviewer linkage retained, regardless of current UI exposure. |
| Legacy foundation | roles, offices, barangays, users, user_roles, gad_programs, gad_projects, gad_activities, budgets, budget_allocations, expenditures, document_types, documents, audit_logs | Separate UUID namespace/data model; users reference Supabase auth.users. Not represented in Prisma. Preserve all tables, FKs, policies, triggers and records; no automatic mapping into canonical tables. |

Canonical SQL retains checks on age, budgets, percentages, HGDG, beneficiary counters, quarter, file size, feedback and geometry. SQL also retains updater FKs for plans/programs that Prisma models only as scalar UUIDs. Legacy roles and canonical roles are not equivalent authorization assignments.

## Seed and source artifacts

Historical SQL inserts reference offices/barangays, roles and document types. Names, codes and placeholder officer labels in those files are inherited fixtures, not newly verified official LGU data. They were replayed unchanged, never promoted as policy/source authority.

`backend/prisma/seed.ts` upserts office/barangay references, requires administrator password environment variables, creates/reactivates administrative accounts and reconciles the CBMS catalog. It is not a safe general-purpose production migration and was not run. The reconciliation service protects linked catalog entries but can delete obsolete **unlinked** catalog rows; WP03 does not run it on historical data.

`backend/prisma/data/talibon-2024-cbms-table-register.csv`, `backend/server/data/cbmsSourceRows.ts`, and `backend/docs/cbms-reconciliation.md` contain catalog identities and reconciliation history, not proof of loaded official observations. CSV SHA-256: `2581f42ddbac4e1258ace935231dda90a3b870caa2ef6c2ff99a7cfb1e565d95`.

Tracked `backend/prisma/dev.db` is retained without opening/importing its contents; SHA-256: `a5d8817a588750f0b330ed0258e4edd85530ad29820a8012eef155fc53f81b25`. No shared database, storage bucket or historical personal records were accessed. Untracked `docs/audits/` remains outside this delivery.
