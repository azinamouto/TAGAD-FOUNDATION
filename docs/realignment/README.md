# Talibon GAD-SDD realignment audit

Audit date: 2026-10-13 (Asia/Shanghai). Repository baseline: `71623901de5a02f8eb10340b87ab9c5bc048b9ee`. Scope: documentation only; no implementation package has started.

The target is the **Talibon Gender and Development Database and Sex-Disaggregated Data System (GAD-SDD)**. Preserve the React, TypeScript, Express, Prisma, PostgreSQL and Supabase foundation. Reuse the existing GAD and statistical services, but reorganize them around the six proposal modules rather than expanding into a comprehensive CBMS platform.

## Requirements authority and provenance

The requested `docs/requirements/TALIBON_GAD_SDD_PROPOSAL.md` was absent at inspection. The user subsequently supplied the complete proposal, sections I–XIII, in this conversation on 2026-10-13. That supplied text is the primary requirements authority for this audit; its section numbers are used throughout. No requirement is inferred from the missing file. No file was created outside the eight authorized planning documents. A repository copy and version owner remain decision D01; missing on-disk provenance no longer prevents analysis of the supplied proposal.

Proposal sections: I Project Title; II Rationale; III Objectives; IV Project Description; V Project Components/System Modules (V.1–V.6); VI Target Beneficiaries; VII Implementation Strategy (five phases); VIII Budget Requirement; IX Expected Outputs; X Expected Outcomes; XI Implementing Office; XII Sustainability Mechanism; XIII Conclusion. Section VIII states PHP 300,000 total, with training/orientation and initial testing/deployment included. This audit makes no delivery-price or schedule commitment.

The interactive map of Talibon's 25 barangays is **additional stakeholder requirement S01**, from the task brief. Barangay-level data is explicit in the proposal; interactive geographic boundaries are not. The proposal's references to laws and guidelines state alignment intent, not proof that the current application complies.

## Assessment

There is a substantial reusable modular monolith: authenticated CRUD, office-scoped beneficiary operations, program/plan/accomplishment services, statistical metadata and observations, CSV ingestion, publication transitions, exports, transactional audit helpers, token revocation, and CI. Local typechecks and selected behavioral tests pass. No entire proposal module is declared complete from those results.

The implementation remains partly aligned. The four technical roles do not express all six proposal personas or enforce barangay scope throughout. Beneficiaries have binary sex, age and a single sector, but no persisted service-participation relation. Generic statistics can represent dimensions but are not a delivered GAD indicator dictionary or validated sector forms. The dashboard lacks age distributions, comparable trends and a geographic client. GPB/GAR exports exist but official templates and approval authority are unverified. Training, deployed recovery, operational ownership and outcomes require LGU evidence.

Priority findings (exact implementation evidence is indexed in [VERIFICATION_BASELINE.md](VERIFICATION_BASELINE.md)):

| ID | Finding and consequence | Evidence | Planned response |
| --- | --- | --- | --- |
| F01 | Mounted legacy dashboard routes omit the actor; admin dashboard scopes programs/plans but not recent beneficiary records, audit entries or all aggregates. Cross-office disclosure is a concrete code-path concern, not a demonstrated production incident. | E01, E04, E08 | WP02/WP05; scope all detail, aggregates and exports before returning data. |
| F02 | Legacy beneficiary create/update routes omit the body schemas used by admin routes; service defaults can convert missing sex to FEMALE and age to zero. | E03, E05 | WP02/WP07; shared validation, explicit missingness, parity tests. |
| F03 | `DataEncoding` has a program field but `Beneficiary` has no program/service relation. Counts cannot establish who received which service or distinguish unique beneficiaries from attendance. | E02, E05, E06 | WP04/WP07/WP08; model activity and participation grain. |
| F04 | Dashboard beneficiary counts ignore year while program totals use fiscal year; public demographics uses beneficiary creation year. Neither establishes historical participation. | E05, E08 | WP09; agree and expose period semantics. |
| F05 | Empty GPB plans generate generic issue/result/indicator text, including “Fully Implemented”; the reports UI claims official templates without supplied authority. | E09 | WP02/WP11; remove unsupported generated assertions and qualify templates. |
| F06 | GeoJSON supports missing/point/boundary geometry, but no interactive geographic client was found. Source-verified boundaries are not evidenced. | E10 | WP10 gated by D07; no invented geometry. |
| F07 | Prisma includes `RevokedToken`; no creation DDL for `tagad_revoked_tokens` was found in checked-in SQL migrations. CI follows SQL replay with `db push`, which can conceal schema drift. | E02, E12, E14 | WP03; fresh and upgrade replay without repair-by-push. |
| F08 | Service fallbacks can return empty or synthetic-looking results after database failure; dashboard fallback status counts and barangay detail counts are hardcoded. Availability and absence are not reliably distinct. | E08, E10, E15 | WP02; production unavailable state, explicit demo isolation. |
| F09 | Public key-based PII removal is not sufficient evidence of small-cell protection or confidential case handling. WCPD/VAWC collection has no dedicated policy-controlled workflow. | E11, E13 | WP06 before sensitive forms/public expansion. |

## Reading order and decisions

1. [REQUIREMENTS_TRACEABILITY.md](REQUIREMENTS_TRACEABILITY.md): all proposal sections, individual module requirements, acceptance and verification gaps.
2. [FEATURE_DISPOSITION.md](FEATURE_DISPOSITION.md): retain/refactor/defer/review boundaries.
3. [TARGET_ARCHITECTURE.md](TARGET_ARCHITECTURE.md): six modules, permissions, ingestion, analytics and reporting.
4. [DATA_MODEL_AND_MIGRATION_PLAN.md](DATA_MODEL_AND_MIGRATION_PLAN.md): additive changes and preservation controls.
5. [IMPLEMENTATION_WORK_PACKAGES.md](IMPLEMENTATION_WORK_PACKAGES.md): ordered WP01–WP14 with dependencies and rollback.
6. [OPEN_DECISIONS.md](OPEN_DECISIONS.md): MPDC/GFPS, LGU, DPO and operator inputs.
7. [VERIFICATION_BASELINE.md](VERIFICATION_BASELINE.md): code evidence, executed checks and limitations.

Recommend retaining security/audit primitives, reference identities and GAD/statistical storage; refactoring permissions, encoding, analytics and reporting; deferring general-purpose CBMS/household-survey expansion and public feedback enhancements; reviewing publication, sensitive data, official reports and geographic sources. No permanent deletion is proposed. Any later retirement requires caller, foreign-key, migration and retention analysis.

Implementation order: requirements/data dictionary → immediate boundary/data-integrity fixes → migration baseline → additive model → scoped permissions → confidentiality/release controls → encoding → service monitoring → analytics → stakeholder map → reports → workflow integration → operational pilot → training/rollout. Detailed dependencies allow independent work only after its prerequisites pass.

## Completion boundary

These eight documents deliver the requested audit and implementation plan against the supplied proposal. Source authenticity, deployed state and LGU decisions remain explicitly unverified. No code, migration, dependency, environment file or existing functionality was modified; no live database or hosting action was performed. The user accepted this as the initial planning baseline and authorized documentation publication on a dedicated branch with a draft PR targeting `main`. That acceptance does not resolve D01–D13 or authorize WP01. WP01 remains limited to requirements clarification and the data dictionary, with supporting documentation and stakeholder decisions. **Await explicit authorization before beginning WP01; do not merge automatically.**
