# GAD barangay entry: persistence decision required

Date: 2026-10-17

Status: implementation stopped under the requested safe-persistence gate. This is an assessment, not a delivered MVP or an institutional policy approval.

## Prerequisite and scope

PR [#46](https://github.com/azinamouto/TAGAD-FOUNDATION/pull/46) was verified MERGED into `main`, with merge commit `3126a6678d65c03cd2a5de4a833d89d43049ac20`. Branch `feat/gad-barangay-data-entry` starts from that updated remote main. No application, schema, migration, seed, or production data was changed.

The requested provisional male/female workflow is narrower than the archived [proposal](../requirements/TALIBON_GAD_SDD_PROPOSAL.md). Its authorization does not establish population, beneficiary identities, an official dictionary, or public release approval. Existing WP04 decision dependencies are context; the stop here follows the user's explicit persistence condition.

## Findings from existing code

| Area inspected | Reuse opportunity and limitation |
| --- | --- |
| `frontend/src/pages/DataEncoding.tsx` | Existing authenticated form, feedback and import-modal patterns. It creates individual beneficiaries and has a hardcoded barangay fallback; neither behavior is appropriate for aggregate entry. |
| `backend/prisma/schema.prisma` | Statistical datasets, observations and provenance can represent numeric values with periods and dimensions. Observations require a table definition. There is no dedicated provisional-entry identity, immutable owning scope, or internal-only dataset discriminator. |
| `backend/server/services/ObservationService.ts` | Draft-only mutation and dimension validation are reusable. Barangay validation establishes reference existence, not roster verification. |
| `backend/server/services/StatisticalObservationIngestionService.ts` | Discovery, row preview, coordinate matching, provenance and transactional audit already exist. Execution reads existing coordinates before the write transaction. The transaction inserts observations without a coordinate uniqueness constraint; concurrent requests can pass the same duplicate check. `OVERWRITE` is also supported and must not be exposed by this workflow. |
| `backend/supabase/migrations/20260831000002_statistical_domain.sql` | Observation indexes are nonunique. A global unique constraint cannot safely be added without evaluating historical duplicates and determining the intended grain. |
| `backend/server/services/StatisticalDatasetService.ts` | Draft access uses importer identity/current office affiliation. Dataset ownership is not stored independently. Existing authorized transitions can promote draft datasets through validation and officialization to publication; setting a new dataset to DRAFT alone does not enforce a permanent internal-only boundary. |
| `backend/server/controllers/admin/statisticalImportController.ts`, `backend/server/routes/admin/statisticalImport.ts` | Existing role checks and error envelopes are reusable. Import actor context carries office identity but not barangay assignment; it cannot be assumed to enforce barangay-scoped entry. |
| `backend/server/services/BarangayService.ts`, `backend/prisma/seed.ts` | Persisted reference IDs can be reused, but `geoVerified` represents geometry verification. It is not a roster approval flag. Demo fallback records must not be used. No live database roster verification was performed. |
| `backend/server/lib/csvParser.ts`, `backend/package.json` | CSV parser preserves row numbers and handles quoted fields; ExcelJS is already installed. Both can feed a shared strict aggregate validator. |
| `backend/server/services/DashboardService.ts`, `frontend/src/pages/Dashboard.tsx` | Table/chart patterns can be reused. Existing sex totals count beneficiaries and cannot be relabeled as imported aggregate statistics. |

These are code-review findings, not reproduced concurrency incidents. Safe reuse would need additional controls across all applicable mutation and release paths, not just a new page calling the current importer.

## Smallest decision to resume

Confirm the provisional record's counting context and duplicate scope: **one male/female pair per identified source series, barangay and reporting period**, with repeated submissions rejected. A source series identifies what is counted and the responsible source; different series must not be summed together. Confirm whether this is the intended grain, or whether exactly one pair per barangay/period is required irrespective of source. Free-text source citations alone do not establish this identity.

Recommended additive option for review: an isolated provisional aggregate-entry model with a database-enforced unique key over the agreed source-series/barangay/period coordinates, required nonnegative integer male and female values, stable owning scope, creator, and a link to existing statistical provenance. Use the existing audit service in the same transaction. Do not add it to generic statistical publication routes. No backfill, reassignment, deduplication or rewrite of existing observations is proposed. The total is derived, and absent inputs are rejected rather than stored as zero.

This option requires agreement on the source-series identity and owning scope before a concrete migration can be safely specified. An alternative is to extend existing statistical datasets with durable scope and an internal-only discriminator, and harden every applicable observation writer and lifecycle route. That touches more shared behavior and needs explicit historical compatibility review. A special dataset name or a UI-only release restriction is insufficient.

Separately, identify the accepted persisted barangay reference records and evidence of roster verification. Do not infer roster approval from geometry verification or seed presence. An empty verified selection must remain unavailable, with a useful explanation.

Full D03/D05/D08 approval is not required merely to design this provisional workflow, but official semantics and release remain blocked. D02/D04 concern scope and grain; D07 concerns reference authority. This assessment does not resolve any institutional decision.

## Implementation and verification after the decision

Reuse CSV parsing, ExcelJS, authentication, response/error envelopes, transactional audit and existing UI/chart components. Use one server-side validator for manual, CSV and XLSX entry; preview uploads with row errors and require explicit confirmation. Revalidate references, authorization and duplicates at commit time. Commit the counts, provenance and audit atomically; reject conflicts without overwriting. Read persisted entries for the statistics view, filtered by a single source series and period; display missing barangays as missing rather than zero.

Required verification remains outstanding: manual save; CSV/XLSX preview and commit; malformed files; missing/negative/fractional/overflow counts; within-file, persisted and concurrent duplicates; office/barangay authorization; database and audit rollback; totals and missing-data behavior; exclusion from publication paths; existing GAD regressions; backend/frontend tests, typechecks, builds and browser checks.

No feature tests, builds or browser checks were run because implementation stopped before application changes. Documentation whitespace and repository diff checks are the only delivery checks. No claim of MVP acceptance or database qualification is made.
