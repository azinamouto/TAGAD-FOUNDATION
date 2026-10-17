# Schema drift assessment

## Confirmed findings and disposition

The original eight SQL files replay successfully when their Supabase platform prerequisites exist. No historical SQL was rewritten. The existing database CI provisioned roles but omitted `auth` prerequisites, and its later Prisma push could not establish a preservation-safe baseline. Both database CI and the qualification runner now use isolated SQL replay.

| Confirmed difference | Evidence / disposition |
| --- | --- |
| Missing `tagad_revoked_tokens` DDL | Present in Prisma and TokenRevocationService, absent from original SQL and replay. Added `20261017000001_revoked_tokens.sql`; required columns, JTI/hash uniqueness, indexes, FK, RLS, restrictive policy and service role grant included. |
| SQL `timestamptz` versus Prisma implicit `timestamp(3)` | Existing canonical/statistical dates retain timezone-aware SQL storage and precision. No conversion or historical timestamp rewrite. Feedback and new revocation dates use timestamp(3), matching their models. |
| SQL UUID defaults versus Prisma client-side `uuid()` | Preserve `gen_random_uuid()` defaults. Both accept client-generated IDs. New table also has a server default. |
| SQL updated_at defaults versus Prisma `@updatedAt` | Preserve SQL defaults and existing legacy triggers. Application timestamp behavior is unchanged. |
| SQL FK update actions versus Prisma default CASCADE | Most historical FKs use NO ACTION on update. Preserve identity protection; no bulk FK rewrite. New revocation FK explicitly matches Prisma CASCADE on update. |
| Updater foreign keys not modeled as Prisma relations | SQL retains plan/program `updated_by` FKs. No removal. |
| Index/unique names and extra indexes | Preserve SQL names and extra office/system/archive/dimension indexes. No destructive rename/drop merely to match client metadata. |
| Legacy tables and enum types absent from Prisma | Preserve all 14 public legacy tables and three legacy enums, plus the platform auth relationship. No inferred mapping or removal. |
| SQL checks, RLS, ACLs, policies and triggers outside Prisma's complete representation | Capture separately in the catalog and verify restoration. Prisma diff alone is insufficient. |

[Before diff](evidence/schema-diff-before.sql.txt) and [final diff](evidence/schema-diff.sql.txt) are **diagnostic text, never executable migration plans**. Applying them would drop legacy tables and alter historical timestamp semantics. Temporary comparison-only schemas annotate public/auth explicitly to avoid Prisma P4002 on the cross-schema legacy auth FK; the application schema is unchanged.

The complete residual diff is committed and compared byte-for-byte (newline-normalized) on every qualification. This establishes a reviewed SQL/Prisma coexistence baseline, **not zero drift**. All Prisma models' scalar fields are read through the generated client, and domain qualification runs against the SQL-created database. A changed residual diff fails qualification and requires explicit review; it is never automatically applied.

## Safe reconciliation boundary

The additive migration fails if the revocation table already exists. Do not replace that failure with `IF NOT EXISTS`, drop the table, clear revocations, or mark it applied blindly. D10 must supply the deployed ledger, DDL, grants and protected backup before an operator can establish whether prior `db push`/manual DDL created it. Compare every column, index, uniqueness rule, FK, RLS/policy and existing row before proposing a separate adoption procedure. If reconciliation cannot be proved, stop deployment. This WP03 delivers local evidence only.

TokenRevocationService and JWT/authentication code are unchanged. Cross-process revocation, restart durability, concurrent refresh consumption and bearer-session logout are verified by the existing database qualification. No token, privacy or audit protection was weakened.
