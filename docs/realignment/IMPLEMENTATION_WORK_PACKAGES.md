# Implementation work packages

**Execution update, 2026-10-13:** the subsequent scope-reduction request authorized Phase A/B and policy-independent WP02 corrections. That limited subset is implemented and verified in the [scope-reduction delivery](SCOPE_REDUCTION_DELIVERY.md). WP02 is not fully accepted; D01–D13 remain open and WP03–WP14 remain unstarted. The original WP01 planning status below is retained as history.

**WP01 documentation authorized on 2026-10-13; candidate deliverables prepared, stakeholder agreement pending. WP02–WP14 remain planning only and unstarted.** See the [WP01 delivery report](wp01/DELIVERY_REPORT.md). Proposal IDs refer to [REQUIREMENTS_TRACEABILITY.md](REQUIREMENTS_TRACEABILITY.md); file evidence IDs resolve in [VERIFICATION_BASELINE.md](VERIFICATION_BASELINE.md). Future code/model names are proposals, not claims of existing files.

Each package should become a small PR or a short sequence of separately reviewable PRs with its own acceptance evidence. Do not bundle all packages into a rewrite. All packages preserve historical records, source values and IDs. Rollback never restores a known confidentiality defect or discards data written under a newer model.

| Order | Package | Prerequisites |
| --- | --- | --- |
| 01 | Requirements, dictionary and acceptance baseline | Explicit implementation authorization; supplied proposal; consultation |
| 02 | Close known access/validation/output integrity gaps | WP01 minimum policy decisions |
| 03 | Reproducible migration and preservation baseline | WP01; isolated database tooling and operator inventory |
| 04 | Additive scoped GAD data model | WP03; D02–05/08 |
| 05 | Six personas and complete scope enforcement | WP02/04; D02/05 |
| 06 | Confidentiality and release controls | WP05; D05 |
| 07 | Approved encoding forms and intake | WP04/05/06; D03/04/08 |
| 08 | Activity/service participation monitoring | WP07; D04/05 |
| 09 | Consistent analytics and data quality | WP07/08; D03/04/11 |
| 10 | Interactive barangay map (S01) | WP06/09; D07/11; verified geographic input |
| 11 | Reproducible reports and exports | WP06/09; D06; independent of map completion |
| 12 | GPB/GAR workflow and planning integration | WP08/11; D09 |
| 13 | Operational qualification and pilot | WP02–09/11/12; WP10 if included in agreed pilot; D10–12 |
| 14 | Training, phased rollout and sustainability | WP13; S01 acceptance before declaring full task scope delivered; D12/13 |

## WP01 — Requirements clarification and data dictionary

**Scope boundary:** WP01 is documentation and stakeholder clarification only. Its outputs are clarified requirements, a proposed/approved data dictionary, source and decision references, and acceptance scenarios derived from those requirements. Reviewing persona definitions, module labels, budget constraints and workflow questions supports that clarification; it does not authorize application design implementation, schema edits, migrations, data backfills, account provisioning, source imports, dependency changes, deployment or environment configuration. References to E02/E05/E07 are read-only evidence. The user has now explicitly authorized WP01 documentation and draft publication; no institutional approval is inferred.

- **Objective / requirements:** turn supplied I–XIII into a versioned, agreed scope (R01–05, L01/L06/L07); resolve contradictions before schema work.
- **Affected files/modules:** documentation only: these planning documents, supporting versioned WP01 artifacts under `docs/realignment/wp01/`, and the verbatim `docs/requirements/TALIBON_GAD_SDD_PROPOSAL.md`; inspect definitions in E02/E05/E07 without modifying them.
- **Dependencies:** explicit authorization, MPDC/GFPS consultation and D01–D13 owners; source samples/templates may remain tracked blockers for later packages.
- **Expected changes:** document the supplied source; clarify personas, data grain, field/category/indicator definitions, requested navigation/workflow and acceptance scenarios; record source provenance, budget constraints and unanswered questions. Detailed implementation design and delivery estimates remain later planning inputs, not WP01 coding tasks.
- **Acceptance:** every traceability row has a proposed owner and test/acceptance path; D02–05 answers are recorded with authority or explicitly remain unresolved with dependent work gated; dictionary entries distinguish confirmed definitions from proposals; scope/budget constraints and S01 identified; no unsupported policy defaults or implementation changes. Unanswered institutional decisions cannot be marked approved merely to close WP01.
- **Tests:** document/source coverage and cross-reference review; stakeholder walkthrough of representative office, barangay and sensitive-data scenarios.
- **Risk:** medium (scope/authority). **Rollback:** revert draft planning revisions while retaining decision history; no application/data rollback.

## WP02 — Known route and output integrity gaps

- **Objective / requirements:** fix F01/F02/F04/F05/F08 where possible before feature expansion; U03, SEC01/03, A02, REP01.
- **Affected:** `backend/server/routes/dashboard.ts`, `backend/server/services/DashboardService.ts`, `backend/server/routes/beneficiaries.ts`, `backend/server/controllers/reportController.ts`, `backend/server/routes/reports.ts`, `frontend/src/pages/Reports.tsx`; related services/fallbacks E05/E08/E10/E15.
- **Dependencies:** WP01 boundary/availability decisions; retain existing legitimate access until explicit policy is mapped.
- **Changes:** require actor on scoped dashboard/report queries; align legacy/admin body validation; remove fabricated GPB narrative/results; prevent production failure from becoming plausible data; label current metrics by actual period/grain pending WP09.
- **Acceptance:** no cross-office detail/aggregate/export bypass through either alias; omitted/invalid sex/age rejected consistently; unavailable database yields unavailable response; empty plans produce no invented results.
- **Tests:** HTTP alias parity and cross-office fixtures; invalid payloads; GPB workbook content; database-error cases for dashboard/barangay reads; regression of authorized workflows.
- **Risk:** high (access/API semantics). **Rollback:** disable affected unsafe endpoint/output or revert only non-security presentation changes; never reinstate disclosure or fabricated content.

## WP03 — Migration and preservation baseline

- **Objective / requirements:** qualify deployable schema and recovery foundation, SEC02/04, R01.
- **Affected:** `backend/prisma/schema.prisma`, `backend/supabase/migrations/`, `.github/workflows/database-ci.yml`, `backend/scripts/run-qualification.mjs`, backup/audit runbooks.
- **Dependencies:** WP01, D10 operator inventory, disposable PostgreSQL and approved representative data. No production database mutation implied.
- **Changes:** reconcile Prisma/SQL including revocation-table DDL; add reviewed additive migration where needed; replay/compare without repair-by-push; create schema/row/object manifest and restoration evidence.
- **Acceptance:** fresh install and upgrade reach expected schema/grants with no unexplained diff; all retained rows/references reconcile; revocation persistence works after restart; restore procedure demonstrated in isolation.
- **Tests:** chronological SQL replay, non-mutating schema comparison, RLS/grants for every canonical table, security persistence and database/storage reconciliation.
- **Risk:** high (schema divergence). **Rollback:** retain current deployment; halt on failed baseline; no destructive down migration or `db push` to repair production.

## WP04 — Additive scoped GAD model

- **Objective / requirements:** represent DTA01–09 and service grain while preserving history.
- **Affected:** Prisma/SQL, validators/types E02/E05/E07, reference/dataset services; proposed assignment, service activity, participation, dictionary and snapshot structures in the data-model plan.
- **Dependencies:** WP03, D02–05/08; verified backfill mappings.
- **Changes:** additive scope/ownership, category/age/sector definitions, event/participation relationships, missingness and source/version metadata; staged backfill and compatibility adapters. Split scope/dictionaries and activity/statistics migrations into reviewable increments.
- **Acceptance:** old IDs and reported totals retained; unknowns remain explicit; ambiguous owner/category/date records quarantined; importer transfer cannot move dataset ownership silently.
- **Tests:** fresh/upgrade and idempotent backfill, Decimal/count invariants, null handling, foreign keys, duplicate-grain detection, old/new client compatibility and full reconciliation.
- **Risk:** high (semantics/data). **Rollback:** stop new writes, keep additive tables and originals, reverse only mapped batches; do not collapse new values into binary legacy fields.

## WP05 — Personas and scope policy

- **Objective / requirements:** U01–07, SEC01/02; implement six proposal personas without broadening confidential access.
- **Affected:** auth/user services, middleware, route/controllers, frontend auth guards/UserManagement (E03); all scoped service entry points including E07/E09/E11.
- **Dependencies:** WP02/04, D02/05; reviewed account migration.
- **Changes:** capability-and-scope policy, explicit ownership checks, account assignment UI, deactivation/session handling; deny missing/unresolved scope.
- **Acceptance:** department/barangay users confined across list/detail/write/search/import/chart/export/attachment paths; viewer/report generator/focal person do not inherit admin; privileged confidentiality policy explicit.
- **Tests:** complete persona × action × office/barangay matrix, identifier tampering, role change during session, legacy/admin parity and emergency-access audit where approved.
- **Risk:** high (lockout/disclosure). **Rollback:** preserve assignments and audited recovery path; disable affected feature rather than restoring excessive access.

## WP06 — Confidentiality and publication controls

- **Objective / requirements:** SEC05/06, M03/04, U07; protect sensitive and public outputs.
- **Affected:** public routes/controllers, PII sanitizer, statistical services, MOV and audit services; privacy runbook E11/E13; proposed shared release policy.
- **Dependencies:** WP05, approved D05 classification, collection and release rules.
- **Changes:** minimum-field schemas and response allowlists, sensitive capability checks, aggregate release/suppression rules, audit of detail/exports, attachment controls and documented retention/incident procedures. No unapproved automatic deletion.
- **Acceptance:** approved WCPD/VAWC/health collection grain enforced; restricted data cannot leak via metadata, logs, search, small cells or complementary totals; publication policy applies to every output.
- **Tests:** denied detail/download/export, PII in free text/JSON, filter differencing and complementary suppression, audit failure paths and storage-access expiry.
- **Risk:** high (sensitive information). **Rollback:** suspend sensitive/public releases; preserve protected data and audit. No return to unrestricted output.

## WP07 — GAD encoding and import workflow

- **Objective / requirements:** DTA01–10, IV categories and IX.4 standardized forms.
- **Affected:** DataEncoding, ingestion wizard, statistical entry components, CSV/discovery/observation validators/services (E05/E07).
- **Dependencies:** WP04/05/06; D03/04/08 dictionaries and approved source samples.
- **Changes:** persona-friendly form templates for the approved category set; authoritative code selections, dated age/type/category fields, form/import parity, preview/correction feedback, batch provenance and retry handling. Deliver form families in small PRs under one shared contract.
- **Acceptance:** all required IV/V.2 fields round-trip; approved training, livelihood/employment, health/social welfare, consultation, protection-service, education, agriculture/fisheries and DRR source mappings present; no forced sensitive case detail; invalid/ambiguous values never become plausible values.
- **Tests:** dictionary fixtures, age/category boundaries, invalid IDs, malformed CSV, duplicate/retry/concurrent submissions, transactional rollback, correction audit and accessible form errors.
- **Risk:** medium/high (data quality). **Rollback:** keep historical submissions; disable new template version and restore compatible reader; quarantine uncommitted batches.

## WP08 — Service activity and participation monitoring

- **Objective / requirements:** M01–10, DTA06–08, A06.
- **Affected:** ProgramMonitoring/Accomplishments and E06 services; new activity/participation endpoints and views.
- **Dependencies:** WP07, D04/05 counting and confidentiality policies.
- **Changes:** activity/date/location/service capture, individual or aggregate outcome entry, unique-person versus event totals, source-based reconciliation and correction history.
- **Acceptance:** each approved service category supports permitted tracking; repeated attendance never masquerades as distinct beneficiaries; program targets, participation and expenditure remain separate; historical manual totals labeled.
- **Tests:** repeated participants, multi-activity/person/sector cases, missing dates, confidential-service aggregates, cross-office access, edit concurrency and target/actual reconciliation.
- **Risk:** high (double counting/linkage). **Rollback:** stop participation writes and retain ledger; continue read-only historical monitoring without replacing old totals.

## WP09 — Consistent analytics

- **Objective / requirements:** A01–09, R02; trustworthy sex/age/barangay/sector/program trends and gaps.
- **Affected:** DashboardService, BeneficiaryService aggregates, statistical query services; Dashboard/PublicDemographics (E05/E07/E08); proposed shared query layer.
- **Dependencies:** WP07/08, D03/04/11; WP06 applies to every audience.
- **Changes:** shared filter and grain contract, period/snapshot semantics, age bands, trend comparison, approved gap measures, provenance/freshness/quality indicators and no-data states.
- **Acceptance:** charts/tables match approved fixtures and authorized scope; current registry is not labeled population/historical service reach; changed definitions flagged; targets met at agreed scale.
- **Tests:** multidimensional totals, denominator/zero/missing/suppressed behavior, age/time boundaries, multi-period comparability, query performance and refresh after commit.
- **Risk:** medium/high (misleading decisions). **Rollback:** disable new metric version, retain snapshot definitions and valid previous queries; never replace missing data with zero.

## WP10 — Interactive barangay visualization (S01)

- **Objective / requirements:** additional stakeholder S01; complements A03 without misattributing map requirement to proposal.
- **Affected:** BarangayService/GeoJSON, geography metadata/migration, Dashboard barangay component (E10); proposed renderer.
- **Dependencies:** WP06/09; D07 authoritative geometry/roster and D11 usability targets. No geometry means map acceptance remains blocked.
- **Changes:** verified source ingestion/versioning, stable-ID metric joins, accessible interactive map and synchronized comparison table; evaluate minimal suitable renderer in authorized implementation.
- **Acceptance:** approved 25-barangay coverage, correctly rendered island/multipart boundaries, selectable male/female statistics, source/legend/status display; unlocated and suppressed values explicit.
- **Tests:** CRS/coordinate/topology/roster validation, unmatched IDs, absent geometry, privacy-safe joins, keyboard/table parity, responsive rendering and source-version regression.
- **Risk:** medium/high (source authenticity/accessibility). **Rollback:** return to clearly labeled table and retain source geometry versions; never substitute invented shapes.

## WP11 — Reports and reproducible exports

- **Objective / requirements:** REP01–07, III.3/IX.6/XII.5.
- **Affected:** Reports, reportController/GarReportService, statistical export services (E07/E09); proposed template/snapshot metadata.
- **Dependencies:** WP06/09, D06 template samples/format decisions; does not depend on map delivery.
- **Changes:** approved GPB/GAR, sector, barangay, M&E and planning templates, parameter/preview UI, complete-result pagination, snapshot provenance, export audit and shared suppression.
- **Acceptance:** template fields and totals reconcile to approved fixtures and dashboard; XLSX/PDF content valid; no invented narrative/status/signatures; permitted report generators export without CRUD authority.
- **Tests:** golden workbook/PDF contents, filtered totals, full-volume pagination, role/scope denial, missing/withdrawn source versions, formula-injection resistance and repeatable snapshots.
- **Risk:** high (official reporting/disclosure). **Rollback:** suspend affected template version; retain prior snapshots and audit; reissue corrected reports through agreed process.

## WP12 — GAD workflow and planning integration

- **Objective / requirements:** REP01/02, M10, A09, R03, L11.
- **Affected:** GADPlanService, GadBudgetValidator, HgdgScoringService, AccomplishmentService and related pages (E06).
- **Dependencies:** WP08/11, D09 delegated approval and applicable policy, D06 report versions.
- **Changes:** validate existing budget/scoring rules against supplied authority; link accepted statistics to gender issues/plans; enforce approved transitions, correction/revision handling and report lineage. No automatic official submission.
- **Acceptance:** authorized chain is reproducible and auditable; prohibited transition/edit bypass fails; plan/report uses traceable evidence; missing evidence flagged, not invented.
- **Tests:** concurrent transition, actor changes, approved-plan mutation attempts, Decimal rounding, target/actual lineage, revision after report export and approved policy examples.
- **Risk:** high (institutional authority). **Rollback:** freeze transitions at last accepted state, retain revisions/evidence and restore only policy-compatible behavior.

## WP13 — Operational qualification and pilot

- **Objective / requirements:** SEC04/06, VII.3/5, L03/05/12.
- **Affected:** CI/release workflows, deployment configs and runbooks E13/E14; all integrated modules.
- **Dependencies:** functional/security packages in ordering table, D10–12 and approved pilot data/users. Deployment remains a separately concrete reviewable action.
- **Changes:** verify current migrations/grants/private storage, backup and database+MOV restoration, privacy-safe telemetry, performance/accessibility, support runbook; run selected-office/barangay pilot and fix evidenced defects.
- **Acceptance:** no unresolved critical disclosure/data-integrity issues; measured recovery/latency meet approved targets; pilot users validate accuracy/usability; defects and acceptance recorded. A deferred map stays explicitly incomplete.
- **Tests:** full unit/integration/browser/disposable PostgreSQL suites, end-to-end role journeys, RLS and storage checks, outage/revocation recovery, load, restore and operator exercises; actual deployment smoke checks when authorized.
- **Risk:** high (operational exposure). **Rollback:** controlled traffic/cohort rollback to verified version; pause writes if needed, reconcile data/security state, never silently discard post-backup writes.

## WP14 — Training, rollout and sustainability

- **Objective / requirements:** VII.4/5, VIII included training, IX.7, XI/XII, L04–12 and outcome R02.
- **Affected:** future authorized user guides/templates, training/pilot records, support/maintenance plan and release checklist; account assignments E03.
- **Dependencies:** WP13 acceptance, D12/13 owners/funding, required S01 completion before declaring total agreed delivery.
- **Changes:** train all personas including barangay encoders/report generators; provide guides and privacy orientation; phase deployment by approved roster; schedule validation, access reviews, backup drills and usage/quality/outcome reviews; fund ongoing support.
- **Acceptance:** named administrators/encoders and support contacts; attendance plus task proficiency; all agreed offices/barangays onboarded; source-update cadence and review owners active; included versus recurring costs accepted; outcome baseline and follow-up recorded.
- **Tests/checks:** user task demonstrations, guide/template walkthroughs, access/quality review exercises and support escalation drill. Training attendance alone is insufficient.
- **Risk:** medium (adoption/continuity). **Rollback:** pause rollout for affected cohort, retain records/accounts under approved access, retrain and resolve defects before resumption.
