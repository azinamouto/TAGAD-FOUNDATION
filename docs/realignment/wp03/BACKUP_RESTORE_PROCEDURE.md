# Synthetic backup and restore procedure

The full qualification builds a local source database from SQL, runs domain scenarios and inserts a linked synthetic graph spanning all application model families. The graph includes exact decimal values, beneficiary/household references, GAD plan/program/item/accomplishment/MOV metadata, statistical dataset/table/indicator/dimension/binding/provenance/observation, suppression metadata, audit JSON, feedback and a persistent synthetic token revocation. Historical SQL reference seeds are inherited test inputs, not verified LGU records.

The runner executes:

```text
pg_dump -h 127.0.0.1 -p <ephemeral-port> -U postgres -d tagad_qualification --format=custom --file <scratch>/synthetic-backup.dump
createdb -h 127.0.0.1 -p <ephemeral-port> -U postgres tagad_restore_qualification
pg_restore -h 127.0.0.1 -p <ephemeral-port> -U postgres -d tagad_restore_qualification --exit-on-error <scratch>/synthetic-backup.dump
```

The complete logical database dump includes public/auth schema, data, functions, constraints, indexes, policies, owners and ACLs. Source and restore use the same disposable cluster, so required roles already exist. No `--clean`, shared destination, production credentials, or historical deletion is involved. Scratch dump and cluster are removed after verification.

Verification compares every public/auth table's count and MD5 of lexically ordered JSON rows; comparison includes UUIDs, decimals, nulls, dimensions, suppression, timestamps, source paths and revocations. This is a reproducibility fingerprint, not a cryptographic authenticity claim. Catalog comparison additionally covers all columns, validated constraints/FKs, indexes, ownership, effective ACLs, RLS, policies, user triggers, functions and enums. It normalizes equivalent implicit/default ACLs and lossless literal-array casts produced by PostgreSQL restore, without removing checks or changing privileges. `pg_restore --exit-on-error` must rebuild relationships successfully. Evidence is in [restore.json](evidence/restore.json). For an independent fresh-cluster replay and preservation-graph restore without rerunning the domain scenarios, set `WP03_BACKUP_ONLY=1`; the repeat result is recorded separately.

## Operational boundary

This is a complete **database** logical restore rehearsal, not a full deployed Supabase disaster-recovery certification. The auth table/functions are test shims; real Auth, Storage object bytes, WAL/PITR, secrets, cluster-global roles and managed platform configuration were not backed up or restored. MOV paths/metadata are verified but do not stand in for object bytes. A real operator must separately inventory and restore those assets, validate role grants, reconnect storage, and verify external-object checksums in an authorized isolated environment.

D10 must establish backup custody, encryption/access, retention, restore owner, deployed migration ledger and RPO/RTO; D05 governs sensitive data and retention/holds. Recorded local elapsed time is not an agreed RTO. Stop any operational rollout lacking these decisions or a successful protected restore. Never use a production restore as a test destination.
