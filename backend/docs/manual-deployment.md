# Backend deployment: manual, CI validates

Deployment is **manual for now**. No automatic production promotion is enabled.
The existing repository CI installs from backend/package-lock.json, validates
Prisma, generates the client, typechecks and runs backend tests. It does not
deploy or establish production database readiness.

The backend `posttest` npm lifecycle hook runs `npm run build` after the test
suite succeeds. Thus the existing GitHub Actions `npm test` step now performs
tests followed by the build check and fails if either fails. Local `npm test`
has the same behavior. Calling
tsx directly bypasses npm lifecycle hooks and is only a targeted test command.

## Automated qualification gates

`backend-qualification-ci.yml` runs on every pull request targeting `main`,
`master`, or `develop`, including PRs that only change workflows. It also runs
on relevant pushes to those branches and supports manual dispatch. PRs have
no path filter so this check can be required without remaining pending on
unrelated changes.

The runner provisions a disposable local PostgreSQL cluster and checks CBMS
catalog reconciliation, statistical data governance, HTTP import/layout,
GAD workflow and statistical search, multi-process token revocation, and a
synthetic backup/restore with table-count and content-fingerprint comparison.
A failing command fails the job; piping output to the retained log does not
hide its exit status. Qualification logs are uploaded even after test failures
and retained for 14 days.

`release-readiness.yml` calls the same backend test/build and PostgreSQL
qualification workflows at the release commit. Both must pass before the
production build, artifact upload, and tag-triggered GitHub release can run.
Release installs explicitly include development dependencies needed for builds.

Repository administrators should require the check
`Full Database Qualification (CBMS, GAD, Statistical, Snapshot DR)` in the
branch protection/ruleset for each protected branch. Workflow YAML runs the
check but does not itself enforce merge protection. Before a manual deployment,
confirm successful backend CI and qualification runs for the exact commit
being deployed; these synthetic checks do not certify production migrations.

## Prepare and validate

Use Node 22+ and run from backend/:

```sh
npm ci
npx prisma generate
npm run typecheck
npm test
npm run test:qualification
```

The qualification runner requires local PostgreSQL tools. Set `PG_BIN` to their
bin directory where needed; the runner creates/stops/removes its own isolated
cluster. Its data is synthetic. Tests with a mocked/unavailable DB are not proof
of deployed migrations or Storage behavior.

The current runtime uses tsx from devDependencies, so retain development
dependencies in this deployment model (`npm ci`, not `npm ci --omit=dev`).
`npm run build` currently validates TypeScript with no emitted JS; do not expect
a dist/ server artifact. Use the source runtime below.

## Database preparation

Take and verify a backup first. SQL changes live in backend/supabase/migrations/;
`npm run db:migrate` invokes Prisma's migration engine and is NOT a substitute
for applying these Supabase SQL files. Compare actual deployed schema/history
before applying new migrations. Existing legacy migrations and the current
Prisma schema must not be assumed interchangeable.

Apply the new deny_tagad_data_api_access and barangay_geography migrations through
the deployment's reviewed SQL migration procedure, in timestamp order, then
verify them against the deployed project. The geography migration preserves
existing rows and leaves missing locations null. It is not intended for repeated
manual execution after its migration has already been recorded.

Check that the Prisma database account is the intended trusted backend account:

```sql
select current_user, rolbypassrls, rolsuper from pg_roles where rolname=current_user;
select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace
  and left(relname,6)='tagad_';
select table_name, grantee, privilege_type from information_schema.role_table_grants
  where table_schema='public' and left(table_name,6)='tagad_'
  and grantee in ('anon','authenticated');
```

The RLS safety net does not grant Prisma privileges or change its database role.
Supabase service-role HTTP credentials and a Prisma PostgreSQL login are separate
credentials. Confirm each independently. Test denied Data API access and allowed
backend access before routing production traffic.

## Configure and start

Set DATABASE_URL/DIRECT_URL, strong distinct JWT_SECRET/JWT_REFRESH_SECRET,
DEMO_MODE=false, CORS_ORIGINS to the real frontend origin, and TRUST_PROXY to match
the deployed proxy topology. Configure private MOV Storage and SENTRY_DSN/release
when those services are available. Keep all secrets in the backend environment.

```sh
npm start
```

This command sets production mode on Windows and Unix. PORT defaults to 3000 and
can be overridden with a valid integer. It starts the API from backend/; no
frontend build is required. Use a process manager/container to restart failures.

- Liveness: GET /api/health returns 200 while the HTTP process is serving.
- Readiness: GET /api/ready returns 503 until database connectivity and revocation
  hydration are ready; configure the load balancer to require 200 here.
- Smoke checks: valid login, wrong-office denial, revoked-token denial, >500-row
  CSV/XLSX export, public barangay GeoJSON, scoped MOV upload/download.

Record the deployed commit and smoke evidence. Roll back application code by
redeploying the previous reviewed commit; do not blindly reverse database
migrations. Use the backup/recovery runbook for any data restore.

Outstanding external release gates: active Supabase project, actual API grants,
PITR/backup evidence, private bucket integration checks and Sentry delivery.
