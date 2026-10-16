# GAD-first retirement delivery

2026-10-17 (Asia/Shanghai). Base: `c47b2a39f9f25e77082b46002146e8b98d1ead78`.
Branch: `refactor/gad-first-legacy-retirement`. Proposal authority and pre-change
dependency evidence are in [PLAN.md](PLAN.md). No new GAD module is delivered.

## Actual changes

Deleted all 39 files in [retired-files.txt](retired-files.txt): 33 frontend source
files, one obsolete frontend unit-test file, and five unmounted backend controllers.
Removed generic table authoring, catalog/search, grid/dataset/summary and generic
statistical CSV UI rather than hiding their navigation. Removed unreferenced old
layout/navbar, dashboard, login/auth wrappers and duplicate catalog wrapper.
Mounted admin controllers remain the sole active implementations for those domains.
No backend HTTP handler that is reachable from server.ts was deleted.

Removed ten unique UI route patterns (eleven registrations due to catalog duplicate):

- `/statistical-catalog`, `/admin/statistical-catalog`
- `/statistical-data`, `/statistical-data/:tableId`
- `/admin/statistical-data`, `/admin/statistical-data/:tableId`
- `/table-builder`, `/table-builder/:id`
- `/admin/table-builder`, `/admin/table-builder/:id`

Those URLs now reach the existing Page Not Found screen, including detail IDs,
query parameters and fragments. They are not redirects and do not load statistical
APIs or code chunks. The SPA server may return HTTP 200 for its shell; this is
application route retirement, not an HTTP 410 contract.

The sidebar now has five groups: sex-disaggregated barangay statistics; GAD data
management; programs/services; GAD planning/reports; administration. Eight existing
links remain. The existing barangay chart anchor and map-unavailable notice stay
prominent. This consolidates overlapping dashboard/analytics headings, not data
models or institutional roles. The 599.43 kB main chunk retains a size warning;
retired catalog, grid and table-builder chunks are absent from the production build.

## Preserved dependencies and limitations

All API route files, mounted controllers, services, middleware, core libraries,
source rows, Prisma/Supabase data and migration artifacts are unchanged. Statistical
catalog, table builder, datasets, observation/import/search endpoints remain for
unknown external consumers and approved future source reuse. See the exact
[backend route inventory](backend-route-inventory.csv). Their continued API
availability is deliberate compatibility, not a claim that the entire backend
statistical platform has been retired. Data history and provenance are untouched.

GAD registry, beneficiary CSV import, programs/services, plan/accomplishment
transitions, MOV, working exports, account administration, authentication and audit
remain. Existing public portal/feedback remain; no publication audience changes.
PR42 rate limits, scoped queries, strict export outages, dashboard completeness
checks and public accomplishment narrative withholding remain byte-identical.

Generic manual observation entry/import is intentionally unavailable in the web
app after this pass; backend contracts remain. There is no claimed replacement
GAD aggregate form. Approved source/template selection is still D03/D08/WP07.
Some CBMS indicators can be relevant to GAD; no catalog entry was declared
irrelevant solely by its sector, and none was deleted.

All D01-D13 remain open. Mapping (S01) is still incomplete pending D05/D07 and
verified geography. Official reports remain working exports (D06/D09). Public
program/plan free text and small-group inference remain D05 risks recorded in
PR42. API decommissioning needs external consumer/owner evidence. No legal-hold,
retention, role or institutional workflow policy was invented.

## Verification

Local environment: Windows PowerShell, Node 22.16.0, npm 10.9.2, Playwright 1.63.0,
headless Microsoft Edge 155.0.4283.60. Only synthetic fixtures; no real LGU data.

| Check | Result |
| --- | --- |
| `npm --prefix backend test` (posttest includes build) | 264/264 pass, 70 suites, zero skipped |
| `npm --prefix frontend test` | 19/19 pass, zero skipped |
| `npm --prefix backend run typecheck` | PASS |
| `npm --prefix frontend run typecheck` | PASS |
| `npm --prefix frontend run build` | PASS; existing large-chunk warning |
| Browser suites, command below | 18/18 pass, zero skipped, about 1 minute |
| `git diff --check` | PASS |
| Exact deletion/remaining import check | PASS: 39 planned files deleted; no remaining frontend references to retired modules/routes |
| Schema/data/security/API preservation | PASS: no diff in protected directories versus base; no database writes/migrations performed |
| October audit SHA-256 comparison | PASS: all 11 untracked audit files unchanged |
| Production asset check | PASS: retired page chunks absent |
| Package/lockfile comparison | PASS: unchanged versus main |
| `npm --prefix backend audit --json` | FINDINGS: 1 moderate, 1 high, 1 critical |
| `npm --prefix frontend audit --json` | FINDINGS: 1 low, 3 moderate, 11 high, 1 critical |

Backend test process configuration:

```powershell
$env:DATABASE_URL='postgresql://fixture:fixture@127.0.0.1:1/tagad_test'
$env:DIRECT_URL=$env:DATABASE_URL
$env:DATABASE_PROBE_DISABLED='true'
$env:DOTENV_CONFIG_PATH='__retirement_no_env__'
npm --prefix backend test
```

Browser command (repository root):

```powershell
$env:VITE_API_BASE_URL='http://127.0.0.1:3100/api'
$env:PLAYWRIGHT_CHANNEL='msedge'
$env:PLAYWRIGHT_PORT='5273'
$env:CI='true'
Set-Location frontend
node node_modules/@playwright/test/cli.js test --workers=1
```

Playwright starts/stops its own Vite server on 5273. Tests intercept API requests
with fixtures, so these are UI regressions, not live-database end-to-end tests.
Existing servers on 3000/5173 were not reused or stopped. Backend tests independently
exercise actual middleware/routes, scoped services, auth and audit rollback.

Browser coverage: 390px/1280px GAD navigation with no horizontal overflow;
retired URLs for anonymous/authenticated visitors with no statistical requests;
viewer administration denial; anonymous GAD and admin route protection; registry
CSV upload wizard on all four retained aliases; dashboard incomplete/outage states;
report limitations and outage/no-download; session failures; plan revision and
resubmission; MOV upload; logout success/failure.

Three obsolete browser cases (generic search, grid summary, generic measure
mapping) and the importMapping unit test were removed with their implementation.
Their backend contracts retain statisticalSearch, statisticalDataEntryGrid,
statisticalCsvImport, tableBuilderHttpIntegration, statisticalWorkspaceAccess,
statisticalGovernanceIssue17 and statisticalCatalog tests. All passed. Frontend
count changes reflect retired UI, not skipped or disabled active GAD checks.

A first asset check ran before the build completed and saw old chunks; after build
completion, the asset check passed. The preservation script also needed explicit
UTF-8 source and UTF-16 PowerShell audit-log decoding; final checks passed. No
application fixes or test suppressions were needed after the retirement edits.

## Security findings and review recommendation

[dependency-audit.json](dependency-audit.json) records npm package-level advisories.
Backend high/critical packages: brace-expansion and proxy-addr. Frontend also has
transitive tooling advisories including shadcn, MCP SDK, ts-morph, glob utilities
and undici. Both package manifests/lockfiles are identical to main; these findings
were not introduced by retirement. No automatic dependency upgrade is included.

Retirement behavior and local regression checks PASS. **Merge/deployment readiness
is BLOCKED on dependency-security review/remediation**, separate from the completed
retirement pass. Do not infer a clean audit from the existing GitHub workflow:
its dependency-audit command explicitly swallows vulnerability failures. Remote
CI/CodeQL evidence will be recorded in the draft PR after it runs. D01-D13 and
production privacy/operations acceptance are not satisfied by passing tests.

No automatic merge. Stop after the draft PR and await review. Restore code only
through a reviewed Git revert if necessary; do not restore/remove database data.
