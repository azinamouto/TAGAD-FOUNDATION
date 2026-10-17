# Migration replay

Run from repository root with Node 22, installed backend dependencies/client and PostgreSQL server/client tools (Windows default `C:/Program Files/PostgreSQL/18/bin`; otherwise set `PG_BIN` to the installed bin directory). The runner binds a random loopback port and creates its own `.qualification-*` data directory. It never takes a database URL from the caller.

```powershell
npm --prefix backend ci
node backend/node_modules/prisma/build/index.js generate --schema backend/prisma/schema.prisma
$env:WP03_EVIDENCE_DIR="$PWD/docs/realignment/wp03/evidence"
$env:JWT_SECRET='wp03_synthetic_signing_secret_for_disposable_tests_only_2026'
$env:JWT_REFRESH_SECRET='wp03_synthetic_refresh_secret_for_disposable_tests_only_2026'
npm --prefix backend run test:qualification
```

Evidence output overwrites local generated artifacts; review changes before committing. The diagnostic drift baseline is compared before writing. To run only replay/catalog/drift verification, set `WP03_REPLAY_ONLY=1`; remove that variable for full qualification.

Exact internal sequence:

1. `initdb -D <scratch>/data -U postgres --auth=trust --encoding=UTF8 --no-locale`; `pg_ctl ... -o '-p <port> -h 127.0.0.1' -w start`; `createdb ... tagad_qualification`.
2. `psql -X ... -v ON_ERROR_STOP=1 -f scripts/qualification-platform.sql` creates disposable platform fixtures only.
3. For each sorted manifest entry: `psql -X ... -v ON_ERROR_STOP=1 --single-transaction -f supabase/migrations/<file>`. Each file commits separately, including the enum extension before downstream use. SHA-256 values are logged.
4. Before/after the additive migration, compare every existing public/auth table's count and deterministic row fingerprint. Existing seeded references must be unchanged.
5. Capture catalog, verify canonical Data API privilege isolation and compare `prisma migrate diff --from-schema-datasource <temporary-source> --to-schema-datamodel <temporary-target> --script` to the committed diagnostic baseline. This command reads the database; its output is never executed.
6. Run catalog, import, layout, GAD, audit, search and revocation qualifications; create a linked synthetic preservation graph; dump/restore and verify.
7. Stop only the created cluster with `pg_ctl -D <scratch>/data -m fast -w stop`; validate scratch is under backend before removing it.

Original eight migrations and final nine-migration chain both replayed. `RevokedToken` was the missing application table; no other missing scalar columns were found. Test fixture changes accommodate SQL reference seeds and enforce the existing feedback checks instead of bypassing them.

The SQL files are not generally rerunnable: policies/tables in historical migrations can already exist. Reproducibility means a fresh disposable cluster for each run, not blindly rerunning applied files. No migration ledger was fabricated. The manifest records file identity; deployment requires the actual operator ledger under D10. CI reuses this same isolated qualification workflow, without pushing Prisma schema into a database.
