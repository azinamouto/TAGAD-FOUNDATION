# WP02 validation ? PR #42 merge blockers

Date: 2026-10-17 (Asia/Shanghai). Branch: `work/gad-sdd-scope-reduction`.
This evidence supersedes the earlier skipped-browser validation. No migrations,
records, institutional policies, or CBMS functionality were added or removed.
Untracked `docs/audits/` is excluded from this change.

## CodeQL investigation and correction

Alert [20](https://github.com/azinamouto/TAGAD-FOUNDATION/security/code-scanning/20)
(`js/missing-rate-limiting`, high) flagged `requireAuth` at the standalone
beneficiary test mount in `backend/tests/scopeReduction.test.ts:123`.
The harness listens only on loopback with synthetic records. However, the same
limitation exists in production: `backend/server.ts` mounts legacy beneficiaries
and the admin router; legacy beneficiaries call `requireAuth`, and the admin
router calls `requireAuth` before mounting beneficiaries. Neither beneficiary
path had a limiter. The dashboard limiter is scoped to `/dashboard`, and the
login limiter does not protect bearer-token verification or its database work.
Helmet and CORS do not provide rate limiting. Classification: a real production
resource-exhaustion gap represented by the test harness, not a test-only false
positive. No alert dismissal or query exclusion was used.

A shared `beneficiaryRateLimiter` now allows 120 requests per minute per IP across
both beneficiary aliases, before authentication. The harness mirrors the
production ordering. The regression mounts the actual admin and legacy routers,
consumes a combined budget, and checks 429/Retry-After on both aliases without
entering the authentication database lookup. Existing authorization, validation,
scoping, and audit behavior remain intact. The limiter uses process-local memory;
replicas have independent budgets and proxy configuration must represent real
client IPs. This is technical load protection, not an institutional access policy.

## Public disclosure safeguard

The public accomplishments query selected unrestricted `actualOutput`,
`outputSummary`, and linked activity/office labels without publication review.
`enforcePIISafety` strips known field names, not identifying content embedded in
ordinary text. A synthetic identifying-text regression confirms that exposure
path; no confidential production records were inspected.

The interim public projection no longer selects these text fields or relations.
It retains compatible string keys with empty text and an explicit withheld-detail
label. Numeric source values remain unchanged. Authenticated records, exports,
storage, and provenance are unchanged. A regression asserts the exact query
allowlist and that even unexpected identifying text returned by a mock cannot
reach the anonymous HTTP response.

Remaining D05 review: active/completed public programs still have descriptions;
approved public plans still have narrative items; public aggregate data may
permit small-group inference. Workflow approval is not evidence of privacy
approval. This pass does not certify those feeds or define publication eligibility,
small-cell thresholds, retention, or confidential-domain policy. These are
remaining disclosure risks requiring review, not newly approved policy.

## Automated verification

Environment: Windows PowerShell, Node 22.16.0, npm 10.9.2, headless Microsoft Edge
155.0.4283.60, Playwright 1.63.0. Synthetic fixtures only.

| Check | Result |
| --- | --- |
| `npm --prefix backend test` (includes build via posttest) | 264 passed, 70 suites, 0 failed/skipped |
| `npm --prefix frontend test` | 20 passed, 0 failed/skipped |
| `npm --prefix backend run typecheck` | PASS |
| `npm --prefix frontend run typecheck` | PASS |
| `npm --prefix frontend run build` | PASS; existing 605.99 kB chunk warning |
| `git diff --check` | PASS |

Backend tests used the following process-only environment before the command:

```powershell
$env:DATABASE_URL='postgresql://fixture:fixture@127.0.0.1:1/tagad_test'
$env:DIRECT_URL=$env:DATABASE_URL
$env:DATABASE_PROBE_DISABLED='true'
$env:DOTENV_CONFIG_PATH='__pr42_no_env__'
npm --prefix backend test
```

## Browser verification

Ports 3000 and 5173 were already occupied and their processes were left alone.
The committed Playwright config now accepts `PLAYWRIGHT_PORT` and starts Vite
with a strict port. Run from the repository root:

```powershell
$env:VITE_API_BASE_URL='http://127.0.0.1:3100/api'
$env:PLAYWRIGHT_CHANNEL='msedge'
$env:PLAYWRIGHT_PORT='5273'
$env:CI='true'
Set-Location frontend
node node_modules/@playwright/test/cli.js test --workers=1
```

Playwright starts and stops Vite at `http://127.0.0.1:5273`. Both existing suites
use synthetic API interception, not real LGU records. These are browser/UI
regressions, not a live-database end-to-end certification. Backend HTTP tests
separately exercise real route middleware with mocked storage.

Coverage: authenticated GAD navigation at 390px/1280px; hidden CBMS links and
retained direct URLs; anonymous denial and viewer restrictions; incomplete and
unavailable dashboard output; report limitations and failed exports; session
401/403/503; logout; plan transitions; MOV upload; statistical search and mapping.
The new report outage test checks that a 503 produces an error and no download.

Initial invocation via npm lost CLI flags on this shell and was cancelled;
calling the Playwright CLI directly resolved this. An isolated temporary config
run passed all 19 tests in 59.6s. The final committed-config run passed 19/19 in 37.3s (8 scope-reduction and
11 security/workflow tests), with no skips.

An isolated backend smoke server was also started with the same disabled probe,
nonexistent dotenv path, and unreachable synthetic database URL, plus:

```powershell
$env:PORT='3100'
$env:NODE_ENV='development'
$env:DEMO_MODE='false'
$env:SENTRY_DSN=''
npm --prefix backend run dev
```

Live HTTP smoke results: health 200; readiness 503; both anonymous beneficiary
aliases 401; public accomplishments 503. Backend Vite attachment warned that
Vite was unavailable in the backend package; the separate frontend Vite server
served the browser tests successfully. Database readiness failure was expected.

## Final remote verification

Pending push and CodeQL re-analysis. Merge recommendation remains BLOCKED until
the actual alert and final-head checks have been verified. No automatic merge.
