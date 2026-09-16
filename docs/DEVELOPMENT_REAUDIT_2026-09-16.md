# TAGAD development re-audit

Date: September 16, 2026. Version: 2.0.0. Reviewed commit: `de9a03a18686bbbd42a4dfc807ed31b340eef9f6`.

Scope: reassess the supplied development audit and Sprints 8–19 against the current
repository. Application code was not changed. Launch systems were not accessed or
deployed. Frontend findings use source inspection, compilation and isolated service
probes; this was not a browser accessibility or visual acceptance test.

## Assessment

The specific backend revocation, session invalidation, production-error and import
gaps in the earlier audit now have passing behavioral evidence. Backend capability
has progressed further than frontend integration. The whole system and all sprints
are **not complete**. New findings below prevent treating the passing test suite as
evidence that every workflow or security property is finished.

The earlier percentages, “production-ready” claims and 4–6 week estimate were not
based on a defined acceptance checklist. This report does not repeat them.

| Area | Current assessment |
| --- | --- |
| Backend foundation | Original BE-1 through BE-6 implemented and locally verified; audit durability across other modules still needs work. |
| Statistics | Source identities for all 69 mother tables, governance, editing/import APIs, search and descriptive summaries implemented; detailed layouts, semantic rules and frontend integration remain incomplete. |
| GAD | Enforced basic approval state machine, budget validation, HGDG and GAR services; named multi-actor chain awaits approved policy; UI revision action is incompatible with backend. |
| Frontend | Typechecks/builds, with catalog, editing and import components; authentication edge cases, workflow integration, performance and several sprint features remain open. |
| Public portal | Existing information pages and durable feedback submission; admin review backend exists, corresponding UI and citizen tracking are missing. |
| Privacy/compliance | Technical controls and a draft PIA exist; approved processing/retention/deletion rules and compliance integrations remain waiting. No compliance certification. |
| Launch | Excluded from execution. Repository artifacts and local checks do not establish deployed readiness. |

## Verification rerun

| Check | Result |
| --- | --- |
| Backend TypeScript | Pass |
| Backend tests | **229 passed, 0 failed, 64 suites; none skipped** |
| Backend build | Pass through npm posttest |
| Frontend TypeScript | Pass |
| Frontend production build | Pass, with large-chunk warning |
| Frontend main JavaScript | **2,124.85 kB minified; 469.91 kB gzip** |
| npm production-dependency audit, both apps | 0 reported vulnerabilities at audit time; not an application security certification |
| Disposable PostgreSQL qualification | Pass: original eight import scenarios, 69-table reconciliation, header/matrix imports, feedback persistence/review, GAD rollback, scoped search and multiprocess revocation |
| Existing synthetic restore regression | All 20 table counts/content fingerprints matched; not a production backup test |

Qualification explicitly checks another running process and a fresh process reject
revoked tokens, concurrent refresh consumption, bearer-only logout, invalid-import
atomicity, GAD audit-failure rollback, and 1,001-observation summaries with scope and
suppression filtering. This is stronger than mock-only evidence, but not a load test.

Three additional isolated probes reproduced the authentication and audit findings
below. They mocked HTTP/database operations and performed no live writes.

## Findings requiring action

### F-1 — High: ordinary mutations can succeed without durable audit history

`backend/server/services/AuditService.ts:95` swallows insert errors in `logAction`.
`backend/server/services/OfficeService.ts:103` updates an office before calling that
helper at line 113. A probe made the update succeed and audit insertion throw; the
service still returned success. This confirms the audit is best-effort for this
path, not guaranteed history.

`logActionTx` also catches errors at line 53; its callers require individual
transaction-failure verification. A caught PostgreSQL statement error can still
abort its transaction, so this review does not assume every such caller commits.
The newer GAD transition and feedback paths have separate passing rollback evidence.

Required closure: define mutations that require durable auditing, write change and
audit in the same transaction, propagate failure, and verify rollback under injected
audit failure. Do not describe application-wide audit trails as immutable from the
presence of an audit table.

### F-2 — High: failed logout is hidden by the frontend

`frontend/src/modules/auth/authService.ts:92` ignores all logout errors and clears
local credentials. An injected backend 503 produced a successfully resolved logout.
If durable revocation failed, removing local storage alone does not invalidate an
already copied access/refresh token. The backend correctly rejects failed durable
logout; the UI currently hides that distinction.

Required closure: distinguish local sign-out from confirmed server revocation,
provide an actionable failed-revocation state, and test network/storage failure.
Do not falsely announce session revocation when the server did not confirm it.

### F-3 — Medium: rejected sessions can restore cached frontend identity

`frontend/src/modules/auth/authService.ts:181` handles all `/auth/me` failures as
possible offline recovery. With a cached identity, an injected HTTP 401 returned
that cached user and retained the bearer token. AuthContext can therefore present
an authenticated workspace after the server rejected the session.

Backend authorization still protects API data; this is not proof of an API bypass.
Required closure: clear identity on authentication rejection, distinguish network
failure from 401/403, and explicitly design any offline display state.

### F-4 — Medium: GAD revision/resubmission UI does not match the enforced workflow

`frontend/src/pages/GADPlan.tsx:223` sends SUBMITTED → DRAFT with no remarks. The
backend allows SUBMITTED → REVISED with required remarks instead. The frontend
submission button at line 216 only handles DRAFT, so a REVISED plan also lacks that
resubmission action. Approval override justification is not collected by this page.
Admin edit/delete controls can still be offered on states the backend locks.

Required closure: use REVISED plus required remarks; permit resubmission from
DRAFT/REVISED; expose authorized justification where applicable; align available
actions with the backend state machine. Keep backend rejection intact.

### F-5 — Medium: API origin configuration is inconsistent

`frontend/src/api/axios.ts:4` uses `VITE_API_BASE_URL`, without startup validation.
Authentication uses separate raw Axios calls to `/api/auth/*` in `authService.ts`
(login line 10, refresh line 118, profile line 142). A configured cross-origin API
therefore affects ordinary requests but not authentication unless an external proxy
also handles those paths. This is a source-confirmed configuration defect; a deployed
cross-origin environment was not exercised.

Required closure: share one validated API base configuration across authentication
and all other requests; test same-origin and separate-origin configurations.

### F-6 — Medium: audit IP attribution trusts a raw forwarded header

`backend/server/services/AuditService.ts:19` and line 61 read `x-forwarded-for`
directly, ahead of the socket address. This bypasses Express's configured trusted
proxy interpretation for these audit fields. A caller-controlled header can produce
misleading audit IP attribution when it reaches the app unnormalized.

Required closure: derive attribution from the configured trusted proxy mechanism
and test both trusted-proxy and direct-client requests. Do not change proxy trust
to accept arbitrary clients merely to populate an IP field.

### F-7 — Medium: automated frontend and database qualification gates are incomplete

Only `.github/workflows/backend-ci.yml` exists. It runs backend validation,
typecheck and tests; npm posttest builds. It does not run the separate real-PostgreSQL
qualification command. Frontend has no test script or frontend CI workflow.

Required closure: add frontend typecheck/build CI and a portable disposable-database
qualification job, plus targeted frontend authentication/workflow tests. Existing
backend CI satisfies its original ticket; this is additional regression coverage.

### F-8 — Medium: frontend performance ticket remains open

The actual build produces one 2.12 MB main JavaScript bundle. `AppRouter.tsx`
statically imports the page modules; no route lazy-loading was found. This exceeds
the earlier 1.1 MB baseline cited in FE-2. The build warning is not a build failure.

Required closure: split routes/heavy features and compare output/load behavior
against an agreed budget. No production-volume latency claim is made here.

## Sprint-by-sprint disposition

“Verified” below means locally supported for that ticket's scope, not deployed.
“Partial” means some implementation exists but the ticket should remain open.

| Sprint / tickets | Disposition and evidence |
| --- | --- |
| 8: STAB-1 dashboard auth | Verified: protected route and security regressions. |
| 8: STAB-2 orphan root server/tests directories | Met: neither root directory remains. Root `server.ts` is a separate file, not the deleted directory ticket. |
| 8: STAB-3 roles | Canonical four-role model documented and implemented. Historical documents still contain stale descriptions; documentation should not be read as runtime authority. |
| 8: STAB-4 SUPER_ADMIN approval | Verified for valid submitted plans. It intentionally cannot skip the state machine. |
| 8: STAB-5 ingestion role gate | Verified by role-denial regressions. |
| 8: STAB-6 demo credentials | Explicit demo opt-in and environment-provided secrets exist. This does not eliminate the separate frontend session findings above. |
| 8: STAB-7 frontend TS errors | Verified: frontend typecheck passes. |
| 9: BE-1 rate limiting | Implemented; security tests pass. |
| 9: BE-2 Helmet/CORS | Implemented; allowlist/security tests pass. |
| 9: BE-3 durable revocation | Verified across processes/restart and concurrent refresh; old audit finding closed locally. |
| 9: BE-4 governance tests in CI | Implemented through backend test suite. |
| 9: BE-5 backend CI | Implemented; remote job result not checked in this audit. Real-DB qualification is an additional missing gate. |
| 9: BE-6 structured/redacted logging | Logger and regressions exist. AuditService still uses raw console warning on one failure path; audit durability is a separate open finding. |
| 10: FE-1 frontend CI | Missing. |
| 10: FE-2 code splitting | Missing; current measured main bundle 2.12 MB. |
| 10: FE-3 dead Auth/Layout cleanup | Incomplete: duplicate `src/context/AuthContext.tsx` and `src/components/layout/Layout.tsx` remain without matched active imports in the inspected source. |
| 10: FE-4 API URL startup validation | Incomplete, with inconsistent auth API origin (F-5). |
| 11: UI-1 real asset | A Talibon seal file exists in `resources/images`; provenance/approval not independently verified. |
| 11: UI-2 logo wiring | Missing: shared Logo still renders “TG”. |
| 11: UI-3 design tokens | Partial: CSS tokens exist, but pages still use hardcoded colors and typography declarations overlap. |
| 11: UI-4/5/6 state, validation, accessibility pass | Partial/unverified as whole-app acceptance; compilation cannot establish responsive behavior, focus handling, contrast or ARIA correctness. |
| 12: DATA-1 workflow screens | Partial: dataset creation/selection and status badges exist; full validate/official/publish/withdraw/history controls were not found in the inspected UI. |
| 12: DATA-2 module docs | Documentation exists; reconcile stale lifecycle wording with current contracts. |
| 12: DATA-3 history/withdraw audit | Focused governance/history tests pass; do not extend this to every module's audit durability (F-1). |
| 13–15: GAD-1 approval design | Partial: basic workflow documented, named actor chain awaiting LGU policy. |
| 13–15: GAD-2 approval backend | Verified basic workflow; not the full named multi-actor chain. |
| 13–15: GAD-3 approval UI | Partial and currently incompatible for revision/resubmission (F-4). |
| 13–15: GAD-4/5/6 HGDG, budget, GAR | Implemented services/routes with passing domain tests; not certification of every PCW requirement. |
| 16: STOR-1/2 upload/download backend | Implemented; multipart and office-scope tests pass. Live storage environment not reverified. |
| 16: STOR-3 attachment widget | Missing: no MOV upload/download UI integration found. |
| 17–18: STATS-1 catalog documentation | Exists; 69 source identities reconciled. Detailed tabulations remain separate missing data. |
| 17–18: STATS-2 catalog browser | Basic browser exists; new mother-table/data search and summary backend are not wired into it. |
| 17–18: GIS-1 map UI | Missing. Nullable backend geography exists; verified coordinates/boundaries still needed. |
| 19: LAUNCH-1 security re-audit | This is a local development re-audit with open findings, not completed pre-launch approval. |
| 19: LAUNCH-2/3/4/5 | Not closed: separate deployment validation, real backup recovery, live monitoring and full regression/UAT are outside this execution scope. Existing docs/local artifacts are not operational proof. |

## Main statistical workspace

The system already has table definitions, dimensions, indicators, observation
editing, bulk save, spreadsheet-paste handling, CSV import and dataset locking.
It is more than a static 69-row catalog. However, it is not yet a fully integrated
Excel-like statistical workspace with smart summaries.

Backend search restricts results to the 69 mother tables and accessible unsuppressed
data. Descriptive summaries cover all matching dataset observations and separate
period/indicator/unit, rather than summarizing one grid page. Counts are stored
observation counts, not population totals; means are unweighted. The frontend does
not yet consume these new search/summary endpoints.

Backend import supports banner/multi-row headers and per-measure dimensions/periods.
The current import modal still uses shared period/dimension mappings and does not
expose the new explicit header layout or per-measure overrides. This limits the
end-to-end usefulness of the backend improvement until UI work is completed.

The supplied CSV establishes 69 identities (1–67, 69 and 70; no 68), not all actual
data layouts or mathematical relationships. Detailed layouts, approved aggregation
rules and representative source observations remain required. The local catalog
grouping has eight categories, correcting the old report's nine-domain claim.

## Policy/data waiting and privacy

The user's approved waiting approach remains appropriate for unavailable LGU facts.
It is not a claim that a configurable CMS has already been implemented.

- Named GAD Focal/MPDC/Mayor authority, delegates and separation of duties.
- Processing purposes, approved privacy notices, retention/deletion/legal holds.
- PSA metadata and PCW submission contracts, authorized credentials and owners.
- Detailed CBMS schemas, reconciliation/scoring rules, denominator definitions.
- Verified GIS coordinates and boundaries, impact baselines and benchmarking data.

Plan versioning, report builders, templates, collaboration, notifications and
integration/synchronization features remain specification/implementation backlog,
not automatically “done” because they are in a register. The technical PIA is a
draft for LGU/DPO review. Feedback storage has a locally tested migration; no deployed
migration was applied or verified by this audit.

## Recommended order

1. Close F-1 and F-6 backend audit guarantees/attribution with failure-path tests.
2. Close F-2/F-3 session handling and F-4/F-5 integration defects in a formally scoped frontend phase.
3. Wire statistical search/summaries and new import mappings; finish dataset governance controls, MOV widget and logo.
4. Add frontend CI and database qualification coverage, then split the frontend bundle.
5. Continue policy-dependent work only with approved configuration or explicit waiting states; validate detailed statistics using real source examples.
6. Perform browser accessibility/responsiveness and LGU workflow acceptance before calling frontend tickets complete. Launch remains a separate phase.

The present defects are concrete contract, audit and integration issues. They do
not, by themselves, justify replacing Express with NestJS as part of this audit.
No framework migration or application fix was performed.

Related records: [backend verification](../backend/docs/backend-security-verification-2026-09-16.md),
[remaining feature register](../backend/docs/backend-feature-register.md),
[API notes](../backend/docs/backend-hardening-api-notes.md),
[technical PIA draft](../backend/docs/privacy-impact-assessment-draft.md).
