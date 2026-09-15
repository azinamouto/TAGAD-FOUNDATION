# Backend backup and disaster recovery

## Current evidence and release gate

On 2026-09-14, the connected Supabase account listed project TAGAD
(`eznhimiwzeobcxcqscgf`) as INACTIVE. A read-only query of table grants timed out.
PITR enablement, retention, latest successful backup, Data API settings and
restore availability could not be verified. **Do not claim PITR is enabled or
production recovery is qualified.** An operator with project access must record
those values here before launch; do not resume/restore a production project as
part of a routine test.

The local qualification runner also performs a logical backup/restore drill:
it dumps synthetic application data with pg_dump, restores it into a second
disposable database with pg_restore, and compares every public table's row count
and row-content fingerprint. Run `npm run test:qualification` with local
PostgreSQL tools installed. The dump and both databases remain inside the
runner's temporary cluster and are removed afterward. This verifies the local
procedure; it does not verify deployed backups, Supabase PITR, or MOV objects.

Local drill evidence, 2026-09-16: PostgreSQL 18 custom-format dump and restore
passed; all 19 public tables matched by count and content fingerprint. Restore
plus comparison took 3,019 ms for synthetic fixtures. This is not a production
RTO measurement. The cluster and dump were removed after verification.

## Ownership and objectives

The backend service owner maintains backups; the LGU data custodian approves a
production recovery point and resumption of writes. Proposed targets pending
operator acceptance: RPO <=24 hours with daily logical backups, RTO <=4 hours.
PITR can lower RPO only after coverage and retention are confirmed. Measure actual
restore duration in a drill; these targets are not achieved guarantees.

## Backup coverage

1. In Supabase Database > Backups, inspect scheduled backup success, retention,
   and PITR status/earliest/latest restorable times. Save dated evidence without
   credentials. Follow the current project dashboard if labels change.
2. Keep a daily encrypted logical PostgreSQL backup in access-controlled storage
   outside the project. Use the direct database connection (not a transaction
   pooler). Test the process with a least-privileged backup account that can read
   all canonical tables despite RLS. Never commit a dump or credentials.
3. Supabase database backups contain Storage metadata, **not the stored MOV
   file objects**. Back up the private MOV bucket separately, with object paths,
   sizes/checksums and timestamps, and reconcile against attachment metadata.
4. Record the deployed Git commit, applied SQL migration versions, bucket
   configuration, role grants and environment-variable names. Keep secrets in
   the deployment secret store, separately recoverable; do not put them here.
5. Keep 7 daily and 4 weekly encrypted backup copies as an initial retention
   target, subject to LGU retention requirements and confirmed storage capacity.

Example PowerShell commands (operator supplies protected connection variables):

```powershell
pg_dump --format=custom --no-owner --no-acl --file=tagad-backup.dump $env:BACKUP_DATABASE_URL
if ($LASTEXITCODE -ne 0) { throw 'Backup failed' }
pg_restore --list tagad-backup.dump
Get-FileHash -Algorithm SHA256 tagad-backup.dump
```

Encrypt the dump immediately, restrict access, and upload it to the designated
backup store. Treat it as sensitive beneficiary and authentication data.

## Restore drill (isolated target first)

1. Select a successful backup and record timestamp, checksum and source commit.
2. Provision an isolated empty PostgreSQL/Supabase target. Verify its project ID
   and hostname differ from production. Disable outbound mail and external jobs.
3. Verify the encrypted archive and checksum, then decrypt inside the restricted
   restore environment. Restore using compatible PostgreSQL tooling:

```powershell
pg_restore --exit-on-error --no-owner --no-acl --dbname=$env:RESTORE_DATABASE_URL tagad-backup.dump
if ($LASTEXITCODE -ne 0) { throw 'Restore failed; do not switch traffic' }
```

4. Re-establish reviewed grants/RLS and private Storage bucket settings. Restore
   MOV objects; validate file counts, checksums and metadata references. Do not
   apply production credentials to a publicly reachable drill environment.
5. Compare table counts and selected aggregates, validate foreign keys, run
   backend typecheck/tests and the import qualification runner. Test login,
   office isolation, dataset locks, CSV/XLSX exports and a scoped MOV download.
6. Record actual RPO/RTO, failures and remediation. Destroy the isolated target
   only after the evidence is retained and its identity has been rechecked.

## Production incident recovery

1. Stop application writes and isolate the incident. Preserve current logs and,
   where feasible, a current database snapshot before restoring.
2. Obtain approval of the recovery point from the data custodian. Use Supabase's
   supported restore/PITR flow only if its coverage was confirmed, otherwise use
   the tested logical restore procedure to a separately verified target.
3. Reconcile any post-backup MOV objects and records rather than assuming the
   database and object store share an atomic recovery point.
4. Restored revocation data can be older than live sessions: rotate both JWT
   signing secrets before reopening authentication, then verify old access and
   refresh tokens are rejected and fresh logins work.
5. Start the backend, wait for database and revocation readiness, run smoke checks,
   and switch traffic only after validation. Retain the former target for a
   controlled rollback window. Document any lost writes and required re-entry.

## Monitoring and required follow-up

Alert on failed/missing daily backups, restore-drill failure, database readiness,
5xx errors and private-bucket misconfiguration. Validate recovery quarterly and
after schema/storage changes. The operator must still confirm actual PITR status,
backup destination/retention, alert routing, and a successful deployed-data drill.

Sources: [Supabase backups](https://supabase.com/docs/guides/platform/backups),
[PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html),
[PostgreSQL pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html).
